// Agent Compass — In-Browser Neural Semantic Guide
// Computes 384-dimensional cosine similarity embeddings in real-time

let CATALOG = window.CATALOG_ITEMS || [];
let EMBEDDINGS_MATRIX = null;
let EXTRACTOR = null;
let IS_EXTRACTOR_READY = false;
let CURRENT_QUERY = '';
let ACTIVE_TYPE_FILTER = 'all';
let ACTIVE_CAT_FILTER = 'all';
let ACTIVE_SOURCE_FILTER = 'all';
let ACTIVE_SORT = 'relevance';
let RANKED_RESULTS = [];

const DIMENSION = 384;

// Decode Base64 Embeddings
function initEmbeddingsMatrix() {
  if (!window.EMBEDDINGS_BASE64) {
    console.warn('EMBEDDINGS_BASE64 not found in window.');
    return;
  }
  try {
    const binary = atob(window.EMBEDDINGS_BASE64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    EMBEDDINGS_MATRIX = new Float32Array(bytes.buffer);
    console.log(`[Neural] Loaded ${EMBEDDINGS_MATRIX.length / DIMENSION} item embeddings (${(bytes.length / (1024*1024)).toFixed(2)} MB).`);
  } catch (err) {
    console.error('[Neural] Failed to decode embeddings matrix:', err);
  }
}

// Initialize In-Browser Transformers.js
async function initNeuralPipeline() {
  const badgeDot = document.getElementById('engine-status-dot');
  const badgeText = document.getElementById('engine-status-text');

  if (badgeDot && badgeText) {
    badgeText.textContent = 'Loading Neural ONNX Model...';
    badgeDot.style.background = '#f59e0b'; // amber
  }

  try {
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    env.allowLocalModels = false;
    
    // all-MiniLM-L6-v2 ONNX quantized
    EXTRACTOR = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true
    });
    IS_EXTRACTOR_READY = true;

    if (badgeDot && badgeText) {
      badgeText.textContent = 'Neural Vectors Active (all-MiniLM-L6-v2)';
      badgeDot.style.background = '#10b981'; // green
    }
    console.log('[Neural] ONNX feature-extraction pipeline ready in browser.');

    // If user already typed a query before model finished loading, re-run with true neural vectors
    if (CURRENT_QUERY.trim()) {
      executeSemanticSearch(CURRENT_QUERY);
    }
  } catch (err) {
    console.warn('[Neural] CDN Transformers.js could not load (possibly offline). Falling back to hybrid semantic scoring.', err);
    if (badgeDot && badgeText) {
      badgeText.textContent = 'Hybrid Semantic Active';
      badgeDot.style.background = '#06b6d4'; // cyan
    }
  }
}

// Fallback Term Relevance & Concept Expansion
function computeConceptScore(query, item) {
  const qTerms = query.toLowerCase().split(/[\s,.;:!?/()]+/).filter(w => w.length > 2);
  if (qTerms.length === 0) return 0.5;

  const title = (item.name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const summary = (item.summary || '').toLowerCase();
  const tags = (item.tags || []).join(' ').toLowerCase();
  const category = (item.category || '').toLowerCase();

  let score = 0;
  for (const term of qTerms) {
    if (title.includes(term)) score += 0.35;
    if (tags.includes(term)) score += 0.25;
    if (desc.includes(term)) score += 0.15;
    if (summary.includes(term)) score += 0.10;
    if (category.includes(term)) score += 0.15;
  }
  return Math.min(score, 0.95);
}

// True Vector Cosine Dot Product
async function executeSemanticSearch(query) {
  const startTime = performance.now();
  CURRENT_QUERY = query.trim();

  const latencyElem = document.getElementById('search-latency-text');

  if (!CURRENT_QUERY) {
    // Show default initial view
    RANKED_RESULTS = CATALOG.map(item => ({ item, score: 0.5 }));
    renderFourPillarsDefault();
    renderCatalogGrid();
    if (latencyElem) latencyElem.textContent = 'Showing full catalog';
    return;
  }

  if (IS_EXTRACTOR_READY && EXTRACTOR && EMBEDDINGS_MATRIX) {
    // 1. Compute Query Vector
    try {
      const qOutput = await EXTRACTOR(CURRENT_QUERY, { pooling: 'mean', normalize: true });
      const qVec = qOutput.data;

      const scored = [];
      const numItems = CATALOG.length;

      for (let i = 0; i < numItems; i++) {
        const item = CATALOG[i];
        let dot = 0;
        const offset = i * DIMENSION;

        for (let k = 0; k < DIMENSION; k++) {
          dot += qVec[k] * EMBEDDINGS_MATRIX[offset + k];
        }

        // Hybrid boost: if query has direct keyword in name or tags, give slight bonus
        const qLower = CURRENT_QUERY.toLowerCase();
        let hybridBonus = 0;
        if (item.name.toLowerCase().includes(qLower)) hybridBonus += 0.12;
        else if (item.tags && item.tags.some(t => qLower.includes(t))) hybridBonus += 0.05;

        const finalScore = Math.min(Math.max((dot + hybridBonus), 0), 1);
        scored.push({ item, score: finalScore });
      }

      scored.sort((a, b) => b.score - a.score);
      RANKED_RESULTS = scored;

      const elapsed = (performance.now() - startTime).toFixed(1);
      if (latencyElem) {
        latencyElem.innerHTML = `<span>⚡ Matched in <strong>${elapsed}ms</strong> via ONNX neural embeddings</span>`;
      }
    } catch (err) {
      console.error('[Neural] Error during query vector extraction:', err);
      fallbackSearch(CURRENT_QUERY);
    }
  } else {
    fallbackSearch(CURRENT_QUERY);
  }

  renderFourPillars(CURRENT_QUERY);
  renderCatalogGrid();
}

function fallbackSearch(query) {
  const scored = CATALOG.map(item => {
    const score = computeConceptScore(query, item);
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  RANKED_RESULTS = scored;

  const latencyElem = document.getElementById('search-latency-text');
  if (latencyElem) {
    latencyElem.innerHTML = `<span>⚡ Hybrid semantic match active</span>`;
  }
}

// Render the 4 Required Pillars Bento Grid
function renderFourPillars(query) {
  const summaryTitle = document.getElementById('summary-title');
  const summaryText = document.getElementById('summary-text');

  if (summaryTitle && summaryText) {
    summaryTitle.textContent = `Pillars Tailored for: "${query}"`;
    summaryText.innerHTML = `Based on deep conceptual similarity, we extracted the most relevant <strong>Rules</strong>, <strong>Agents</strong>, <strong>Workflows</strong>, and <strong>Skills</strong> required to execute this project reliably without regressions.`;
  }

  // Filter top matches per pillar
  const topRules = RANKED_RESULTS.filter(r => r.item.type === 'rule').slice(0, 4);
  const topAgents = RANKED_RESULTS.filter(r => r.item.type === 'agent').slice(0, 4);
  const topWorkflows = RANKED_RESULTS.filter(r => r.item.type === 'workflow').slice(0, 4);
  const topSkills = RANKED_RESULTS.filter(r => r.item.type === 'skill').slice(0, 4);

  document.getElementById('count-rules').textContent = topRules.length;
  document.getElementById('count-agents').textContent = topAgents.length;
  document.getElementById('count-workflows').textContent = topWorkflows.length;
  document.getElementById('count-skills').textContent = topSkills.length;

  renderPillarColumn('pillar-rules-list', topRules, 'rule');
  renderPillarColumn('pillar-agents-list', topAgents, 'agent');
  renderPillarColumn('pillar-workflows-list', topWorkflows, 'workflow');
  renderPillarColumn('pillar-skills-list', topSkills, 'skill');
}

function renderFourPillarsDefault() {
  const summaryTitle = document.getElementById('summary-title');
  const summaryText = document.getElementById('summary-text');

  if (summaryTitle && summaryText) {
    summaryTitle.textContent = 'Semantic Need Analysis';
    summaryText.innerHTML = `Enter your project need above (e.g. <em>"Flaky CI tests"</em>, <em>"HIPAA healthcare security"</em>, <em>"Glassmorphism iOS UI"</em>) to see the exact 4 pillars matched in real-time.`;
  }

  // Pick balanced prominent default recommendations
  const defaultRules = CATALOG.filter(i => ['react-patterns', 'typescript-coding-style', 'common-security', 'common-testing'].includes(i.name.replace(/\.md$/, ''))).slice(0, 4).map(item => ({ item, score: 0.88 }));
  const defaultAgents = CATALOG.filter(i => ['code-reviewer', 'architect', 'planner', 'build-error-resolver'].includes(i.name)).slice(0, 4).map(item => ({ item, score: 0.91 }));
  const defaultWorkflows = CATALOG.filter(i => ['/plan', '/orch-add-feature', '/code-review', '/quality-gate'].includes(i.name)).slice(0, 4).map(item => ({ item, score: 0.89 }));
  const defaultSkills = CATALOG.filter(i => ['test-driven-development', 'api-and-interface-design', 'security-and-hardening', 'frontend-ui-engineering'].includes(i.name)).slice(0, 4).map(item => ({ item, score: 0.94 }));

  document.getElementById('count-rules').textContent = defaultRules.length;
  document.getElementById('count-agents').textContent = defaultAgents.length;
  document.getElementById('count-workflows').textContent = defaultWorkflows.length;
  document.getElementById('count-skills').textContent = defaultSkills.length;

  renderPillarColumn('pillar-rules-list', defaultRules, 'rule');
  renderPillarColumn('pillar-agents-list', defaultAgents, 'agent');
  renderPillarColumn('pillar-workflows-list', defaultWorkflows, 'workflow');
  renderPillarColumn('pillar-skills-list', defaultSkills, 'skill');
}

function renderPillarColumn(containerId, scoredItems, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (scoredItems.length === 0) {
    container.innerHTML = `<div class="pillar-empty">No direct matches for this pillar.</div>`;
    return;
  }

  container.innerHTML = scoredItems.map(({ item, score }) => {
    const pct = Math.round(score * 100);
    const scoreColor = pct >= 80 ? 'var(--accent-emerald)' : (pct >= 50 ? 'var(--accent-cyan)' : 'var(--accent-purple)');
    const simpleWhat = item.simple_english ? item.simple_english.what : item.description;

    return `
      <div class="pillar-card card-${type}" data-id="${item.id}">
        <div class="pillar-card-top">
          <span class="pillar-item-name" title="${item.name}">${escapeHtml(item.name)}</span>
          <span class="score-badge" style="color: ${scoreColor}; border-color: ${scoreColor}33;">${pct}% Match</span>
        </div>
        <div class="pillar-card-cat">${escapeHtml(item.category)} · <span class="source-tag">${escapeHtml(item.source)}</span></div>
        <p class="pillar-card-desc">${escapeHtml(simpleWhat)}</p>
        <div class="pillar-card-footer">
          <span class="action-hint">Click for full playbook ↗</span>
          <button class="mini-copy-btn" data-copy="${escapeHtml(item.antigravity ? item.antigravity.syntax : item.name)}" title="Copy trigger syntax">Copy</button>
        </div>
      </div>
    `;
  }).join('');
}

// Render the Catalog Explorer Grid
function renderCatalogGrid() {
  const grid = document.getElementById('catalog-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid) return;

  let items = RANKED_RESULTS.length > 0 ? RANKED_RESULTS : CATALOG.map(item => ({ item, score: 0.5 }));

  // Filter by Type
  if (ACTIVE_TYPE_FILTER !== 'all') {
    items = items.filter(r => r.item.type === ACTIVE_TYPE_FILTER);
  }

  // Filter by Source
  if (ACTIVE_SOURCE_FILTER !== 'all') {
    items = items.filter(r => r.item.source === ACTIVE_SOURCE_FILTER);
  }

  // Filter by Category Tag
  if (ACTIVE_CAT_FILTER !== 'all') {
    const catMap = {
      testing: ['test', 'quality'],
      security: ['security', 'compliance'],
      frontend: ['frontend', 'ui', 'web'],
      architecture: ['architecture', 'design', 'api'],
      databases: ['database', 'data', 'storage'],
      devops: ['devops', 'ci-cd', 'pipeline'],
      science: ['scientific', 'bio', 'genomic'],
      agentic: ['agentic', 'autonomous', 'harness'],
      languages: ['language', 'specialist']
    };
    const keywords = catMap[ACTIVE_CAT_FILTER] || [ACTIVE_CAT_FILTER];
    items = items.filter(r => {
      const c = (r.item.category || '').toLowerCase();
      return keywords.some(k => c.includes(k));
    });
  }

  // Sort
  if (ACTIVE_SORT === 'name') {
    items.sort((a, b) => a.item.name.localeCompare(b.item.name));
  } else if (ACTIVE_SORT === 'category') {
    items.sort((a, b) => (a.item.category || '').localeCompare(b.item.category || ''));
  } // 'relevance' is already default

  if (items.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Limit explorer to top 60 items for blazing fast DOM rendering
  const displayItems = items.slice(0, 60);

  grid.innerHTML = displayItems.map(({ item, score }) => {
    const pct = Math.round(score * 100);
    const typeLabel = item.type.toUpperCase();
    const typeClass = `badge-${item.type}`;
    const scoreColor = pct >= 80 ? 'var(--accent-emerald)' : (pct >= 50 ? 'var(--accent-cyan)' : 'var(--text-muted)');

    return `
      <div class="catalog-card card-border-${item.type}" data-id="${item.id}">
        <div class="card-header-row">
          <span class="card-type-badge ${typeClass}">${typeLabel}</span>
          <span class="card-score" style="color: ${scoreColor};">${pct}%</span>
        </div>
        <h4 class="card-title">${escapeHtml(item.name)}</h4>
        <div class="card-category">${escapeHtml(item.category)} <span class="card-source">• ${escapeHtml(item.source)}</span></div>
        <p class="card-summary">${escapeHtml(item.simple_english ? item.simple_english.what : item.description)}</p>
        <div class="card-footer-tags">
          ${(item.tags || []).slice(0, 3).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Generate Ready-to-Paste AGENTS.md Blueprint
function generateBlueprint() {
  const query = CURRENT_QUERY || 'General Project Stack';

  const topRules = RANKED_RESULTS.filter(r => r.item.type === 'rule').slice(0, 3);
  const topAgents = RANKED_RESULTS.filter(r => r.item.type === 'agent').slice(0, 3);
  const topWorkflows = RANKED_RESULTS.filter(r => r.item.type === 'workflow').slice(0, 3);
  const topSkills = RANKED_RESULTS.filter(r => r.item.type === 'skill').slice(0, 4);

  let md = `# AGENTS.md - Tailored Project Blueprint\n`;
  md += `> Automatically synthesized by Agent Compass for: "${query}"\n\n`;

  md += `## 📋 1. Enforced Rules\n`;
  topRules.forEach(({ item }) => {
    md += `- **${item.name}** (${item.category}): ${item.simple_english ? item.simple_english.what : item.description}\n`;
    if (item.antigravity && item.antigravity.rule) {
      md += `  \`\`\`markdown\n  ${item.antigravity.rule.replace(/\n/g, '\n  ')}\n  \`\`\`\n`;
    }
  });

  md += `\n## 🤖 2. Specialist Delegated Agents\n`;
  topAgents.forEach(({ item }) => {
    md += `- **${item.name}** (${item.category}): ${item.simple_english ? item.simple_english.what : item.description}\n`;
    md += `  *Invocation prompt*: "${item.antigravity ? item.antigravity.prompt : item.name}"\n`;
  });

  md += `\n## ⚡ 3. Recommended Workflows\n`;
  topWorkflows.forEach(({ item }) => {
    md += `- **${item.name}**: ${item.description}\n`;
  });

  md += `\n## 🎯 4. Required Skills\n`;
  topSkills.forEach(({ item }) => {
    md += `- \`@skill:${item.name}\`: ${item.simple_english ? item.simple_english.what : item.description}\n`;
  });

  return md;
}

// Open Detail Modal
function openDetailModal(itemId) {
  const item = CATALOG.find(i => i.id === itemId);
  if (!item) return;

  const modal = document.getElementById('detail-modal');
  if (!modal) return;

  document.getElementById('modal-title').textContent = item.name;
  document.getElementById('modal-type-badge').textContent = item.type.toUpperCase();
  document.getElementById('modal-type-badge').className = `type-pill badge-${item.type}`;
  document.getElementById('modal-category').textContent = item.category;
  document.getElementById('modal-source').textContent = item.source;

  const foundRanked = RANKED_RESULTS.find(r => r.item.id === itemId);
  const pct = foundRanked ? Math.round(foundRanked.score * 100) : 85;
  document.getElementById('modal-score').textContent = `${pct}% Semantic Match`;

  document.getElementById('modal-desc').textContent = item.description || item.summary;

  if (item.simple_english) {
    document.getElementById('modal-what').textContent = item.simple_english.what;
    document.getElementById('modal-when').textContent = item.simple_english.when;
    document.getElementById('modal-benefit').textContent = item.simple_english.benefit;
  }

  // Antigravity code snippet
  const agCode = item.antigravity ? `${item.antigravity.prompt}\n\n${item.antigravity.rule}` : `@skill:${item.name}`;
  document.getElementById('modal-ag-code').textContent = agCode;

  // CLI snippet
  let cliCode = '';
  if (item.type === 'skill') cliCode = `/skill ${item.name}`;
  else if (item.type === 'agent') cliCode = `claude --agent ${item.name}`;
  else if (item.type === 'workflow') cliCode = item.name;
  else cliCode = `cat .agents/rules/${item.name}.md`;
  document.getElementById('modal-cli-code').textContent = cliCode;

  const sourceLink = document.getElementById('modal-source-link');
  if (sourceLink) {
    sourceLink.href = item.source.includes('ECC')
      ? `https://github.com/affaan-m/ECC`
      : (item.source.includes('Agent Skills') ? `https://github.com/addyosmani/agent-skills` : `https://github.com/K-Dense-AI/scientific-agent-skills`);
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(successMsg);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Setup Event Listeners
function setupEvents() {
  const taskInput = document.getElementById('task-input');
  const btnAnalyze = document.getElementById('btn-analyze');
  const clearSearch = document.getElementById('clear-search');

  let debounceTimer = null;

  taskInput.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearch.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      executeSemanticSearch(val);
    }, 250);
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      executeSemanticSearch(taskInput.value);
    }
  });

  btnAnalyze.addEventListener('click', () => {
    executeSemanticSearch(taskInput.value);
  });

  clearSearch.addEventListener('click', () => {
    taskInput.value = '';
    clearSearch.style.display = 'none';
    executeSemanticSearch('');
    taskInput.focus();
  });

  // Shortcut key '/' to focus search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== taskInput) {
      e.preventDefault();
      taskInput.focus();
      taskInput.select();
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Prompt chips
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      taskInput.value = prompt;
      clearSearch.style.display = 'block';
      executeSemanticSearch(prompt);
      taskInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // Explorer Tabs
  document.querySelectorAll('.explorer-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.explorer-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE_TYPE_FILTER = btn.getAttribute('data-type');
      renderCatalogGrid();
    });
  });

  // Category Pills
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      ACTIVE_CAT_FILTER = pill.getAttribute('data-cat');
      renderCatalogGrid();
    });
  });

  // Filters
  const sourceFilter = document.getElementById('source-filter');
  if (sourceFilter) {
    sourceFilter.addEventListener('change', (e) => {
      ACTIVE_SOURCE_FILTER = e.target.value;
      renderCatalogGrid();
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      ACTIVE_SORT = e.target.value;
      renderCatalogGrid();
    });
  }

  // Copy Blueprint Button
  const btnCopyBlueprint = document.getElementById('btn-copy-blueprint');
  if (btnCopyBlueprint) {
    btnCopyBlueprint.addEventListener('click', () => {
      const blueprint = generateBlueprint();
      copyToClipboard(blueprint, '📋 Copied full AGENTS.md Blueprint!');
    });
  }

  const btnResetView = document.getElementById('btn-reset-view');
  if (btnResetView) {
    btnResetView.addEventListener('click', () => {
      taskInput.value = '';
      clearSearch.style.display = 'none';
      executeSemanticSearch('');
    });
  }

  // Pillar Card Clicks & Explorer Card Clicks
  document.addEventListener('click', (e) => {
    // Mini copy button on pillar card
    const miniCopy = e.target.closest('.mini-copy-btn');
    if (miniCopy) {
      e.stopPropagation();
      const textToCopy = miniCopy.getAttribute('data-copy');
      copyToClipboard(textToCopy, `Copied "${textToCopy}"!`);
      return;
    }

    // Card click -> open detail modal
    const card = e.target.closest('.pillar-card, .catalog-card');
    if (card) {
      const id = card.getAttribute('data-id');
      if (id) openDetailModal(id);
    }
  });

  // Modal Closures
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(elem => {
    elem.addEventListener('click', (e) => {
      if (e.target === elem || e.target.classList.contains('modal-close')) {
        elem.closest('.modal-overlay').classList.remove('open');
      }
    });
  });

  // Harness tab switches in Modal
  document.querySelectorAll('.harness-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.harness-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.harness-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`tab-content-${tabId}`).classList.add('active');
    });
  });

  // Copy buttons in Modal
  document.getElementById('btn-copy-ag')?.addEventListener('click', () => {
    const code = document.getElementById('modal-ag-code').textContent;
    copyToClipboard(code, 'Copied Antigravity instruction!');
  });

  document.getElementById('btn-copy-cli')?.addEventListener('click', () => {
    const code = document.getElementById('modal-cli-code').textContent;
    copyToClipboard(code, 'Copied CLI command!');
  });

  // Header Modals
  document.getElementById('btn-open-apikey')?.addEventListener('click', () => {
    document.getElementById('apikey-modal').classList.add('open');
  });

  document.getElementById('btn-open-deploy')?.addEventListener('click', () => {
    document.getElementById('deploy-modal').classList.add('open');
  });

  document.getElementById('btn-copy-deploy-cmd')?.addEventListener('click', () => {
    copyToClipboard('git add .\ngit commit -m "feat: neural semantic search for rules, agents, workflows & skills"\ngit push origin main', 'Copied git push command!');
  });
}

// App Initialization
async function initApp() {
  console.log('[Agent Compass] Initializing app...');
  initEmbeddingsMatrix();
  setupEvents();

  // Populate counts in tabs
  const rulesCount = CATALOG.filter(i => i.type === 'rule').length;
  const agentsCount = CATALOG.filter(i => i.type === 'agent').length;
  const wfCount = CATALOG.filter(i => i.type === 'workflow').length;
  const skillsCount = CATALOG.filter(i => i.type === 'skill').length;

  document.getElementById('tab-all-count').textContent = CATALOG.length;
  document.getElementById('tab-rule-count').textContent = rulesCount;
  document.getElementById('tab-agent-count').textContent = agentsCount;
  document.getElementById('tab-wf-count').textContent = wfCount;
  document.getElementById('tab-skill-count').textContent = skillsCount;

  // Render initial views
  renderFourPillarsDefault();
  renderCatalogGrid();

  // Load ONNX pipeline in background
  initNeuralPipeline();
}

document.addEventListener('DOMContentLoaded', initApp);
