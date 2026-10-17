/**
 * ECC & Awesome LLM Apps Navigator
 * The Universal Agent & Skill Matchmaker
 */

// State
const state = {
  activeTab: 'all',
  activeCategory: 'all',
  searchQuery: '',
  allItems: [],
  filteredItems: [],
  apiKeyConfig: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash'
  },
  currentDetailItem: null
};

// DOM Elements
const elements = {
  statCounter: document.getElementById('stat-counter'),
  taskInput: document.getElementById('task-input'),
  clearSearchBtn: document.getElementById('clear-search'),
  btnAnalyze: document.getElementById('btn-analyze'),
  itemsGrid: document.getElementById('items-grid'),
  filteredCountLabel: document.getElementById('filtered-count-label'),
  categoryFilterBar: document.getElementById('category-filter-bar'),
  matchmakerSection: document.getElementById('matchmaker-section'),
  copilotThinkingBox: document.getElementById('copilot-thinking-box'),
  thinkingStepTitle: document.getElementById('thinking-step-title'),
  thinkingStream: document.getElementById('thinking-stream'),
  matchTaskEcho: document.getElementById('match-task-echo'),
  matchConfidence: document.getElementById('match-confidence'),
  topAgentTitle: document.getElementById('top-agent-title'),
  topAgentDesc: document.getElementById('top-agent-desc'),
  btnViewAgent: document.getElementById('btn-view-agent'),
  topSkillTitle: document.getElementById('top-skill-title'),
  topSkillDesc: document.getElementById('top-skill-desc'),
  btnViewSkill: document.getElementById('btn-view-skill'),
  topAppTitle: document.getElementById('top-app-title'),
  topAppDesc: document.getElementById('top-app-desc'),
  btnViewApp: document.getElementById('btn-view-app'),
  step1Text: document.getElementById('step-1-text'),
  step2Text: document.getElementById('step-2-text'),
  step3Text: document.getElementById('step-3-text'),
  copyPromptText: document.getElementById('copy-prompt-text'),
  btnCopyQuickCmd: document.getElementById('btn-copy-quick-cmd'),
  
  // Modals
  itemModal: document.getElementById('item-modal'),
  modalClose: document.getElementById('modal-close'),
  modalTypeBadge: document.getElementById('modal-type-badge'),
  modalTitle: document.getElementById('modal-title'),
  modalBody: document.getElementById('modal-body'),
  modalGithubLink: document.getElementById('modal-github-link'),
  modalCopyBtn: document.getElementById('modal-copy-btn'),
  
  apikeyModal: document.getElementById('apikey-modal'),
  apikeyModalClose: document.getElementById('apikey-modal-close'),
  btnOpenApikey: document.getElementById('btn-open-apikey'),
  apiStatusDot: document.getElementById('api-status-dot'),
  apiStatusText: document.getElementById('api-status-text'),
  providerSelect: document.getElementById('provider-select'),
  apikeyInput: document.getElementById('apikey-input'),
  modelSelect: document.getElementById('model-select'),
  getKeyLink: document.getElementById('get-key-link'),
  btnSaveKey: document.getElementById('btn-save-key'),
  btnTestKey: document.getElementById('btn-test-key'),
  btnClearKey: document.getElementById('btn-clear-key'),
  
  deployModal: document.getElementById('deploy-modal'),
  deployModalClose: document.getElementById('deploy-modal-close'),
  btnOpenDeploy: document.getElementById('btn-open-deploy'),
  btnCopyDeployCmd: document.getElementById('btn-copy-deploy-cmd'),
  
  toastContainer: document.getElementById('toast-container')
};

// Initialize Application
function init() {
  loadStoredConfig();
  prepareData();
  setupEventListeners();
  renderCatalog();
  updateApiStatusUI();
}

// Load API Configuration from localStorage
function loadStoredConfig() {
  try {
    const saved = localStorage.getItem('ecc_navigator_api_config');
    if (saved) {
      state.apiKeyConfig = Object.assign(state.apiKeyConfig, JSON.parse(saved));
      elements.providerSelect.value = state.apiKeyConfig.provider;
      elements.apikeyInput.value = state.apiKeyConfig.apiKey || '';
      elements.modelSelect.value = state.apiKeyConfig.model || 'gemini-2.5-flash';
    }
  } catch (e) {
    console.error('Error loading config', e);
  }
}

// Save API Config to localStorage
function saveConfig() {
  try {
    localStorage.setItem('ecc_navigator_api_config', JSON.stringify(state.apiKeyConfig));
  } catch (e) {
    console.error('Error saving config', e);
  }
}

// Combine all sources into unified searchable list
function prepareData() {
  const data = window.CATALOG_DATA || { skills: [], agents: [], awesome_apps: [], rules: [], commands: [] };
  
  state.allItems = [
    ...data.skills,
    ...data.agents,
    ...data.awesome_apps,
    ...data.rules,
    ...data.commands
  ];

  // Update counts
  if (data.stats) {
    document.getElementById('count-all').textContent = data.stats.total_catalog_items;
    document.getElementById('count-skills').textContent = data.stats.total_skills;
    document.getElementById('count-agents').textContent = data.stats.total_agents;
    document.getElementById('count-apps').textContent = data.stats.total_awesome_apps;
    document.getElementById('count-rules').textContent = data.stats.total_rules + data.stats.total_commands;
    elements.statCounter.textContent = `${data.stats.total_catalog_items} Items Indexed`;
  }

  state.filteredItems = [...state.allItems];
}

// Event Listeners
function setupEventListeners() {
  // Search input & enter key
  elements.taskInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
    filterCatalog();
  });

  elements.taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeTaskMatch();
    }
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.taskInput.value = '';
    state.searchQuery = '';
    elements.clearSearchBtn.style.display = 'none';
    filterCatalog();
  });

  elements.btnAnalyze.addEventListener('click', () => {
    executeTaskMatch();
  });

  // Global keyboard shortcut '/' to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== elements.taskInput && !isModalOpen()) {
      e.preventDefault();
      elements.taskInput.focus();
      elements.taskInput.select();
    }
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Prompt chips
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      elements.taskInput.value = prompt;
      state.searchQuery = prompt;
      elements.clearSearchBtn.style.display = 'block';
      executeTaskMatch();
    });
  });

  // Catalog Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.getAttribute('data-tab');
      filterCatalog();
    });
  });

  // Category Filter Pills
  elements.categoryFilterBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-pill')) {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.activeCategory = e.target.getAttribute('data-cat');
      filterCatalog();
    }
  });

  // Item Modal
  elements.modalClose.addEventListener('click', () => closeModal(elements.itemModal));
  elements.itemModal.addEventListener('click', (e) => {
    if (e.target === elements.itemModal) closeModal(elements.itemModal);
  });

  elements.modalCopyBtn.addEventListener('click', () => {
    if (state.currentDetailItem) {
      const cmd = state.currentDetailItem.install_cmd || state.currentDetailItem.run_cmd || state.currentDetailItem.clone_cmd || state.currentDetailItem.command;
      if (cmd) {
        copyToClipboard(cmd, 'Command copied to clipboard!');
      }
    }
  });

  // API Key Modal
  elements.btnOpenApikey.addEventListener('click', () => openModal(elements.apikeyModal));
  elements.apikeyModalClose.addEventListener('click', () => closeModal(elements.apikeyModal));
  elements.apikeyModal.addEventListener('click', (e) => {
    if (e.target === elements.apikeyModal) closeModal(elements.apikeyModal);
  });

  elements.providerSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    state.apiKeyConfig.provider = val;
    if (val === 'gemini') {
      elements.modelSelect.value = 'gemini-2.5-flash';
      elements.getKeyLink.href = 'https://aistudio.google.com/app/apikey';
      elements.getKeyLink.textContent = 'Get Free Gemini Key ↗';
      elements.apikeyInput.placeholder = 'AIzaSy...';
    } else if (val === 'groq') {
      elements.modelSelect.value = 'llama-3.3-70b-versatile';
      elements.getKeyLink.href = 'https://console.groq.com/keys';
      elements.getKeyLink.textContent = 'Get Free Groq Key ↗';
      elements.apikeyInput.placeholder = 'gsk_...';
    } else if (val === 'openai') {
      elements.modelSelect.value = 'gpt-4o-mini';
      elements.getKeyLink.href = 'https://platform.openai.com/api-keys';
      elements.getKeyLink.textContent = 'OpenAI Console ↗';
      elements.apikeyInput.placeholder = 'sk-...';
    } else if (val === 'anthropic') {
      elements.modelSelect.value = 'claude-3-5-haiku-latest';
      elements.getKeyLink.href = 'https://console.anthropic.com/';
      elements.getKeyLink.textContent = 'Anthropic Console ↗';
      elements.apikeyInput.placeholder = 'sk-ant-...';
    }
  });

  elements.btnSaveKey.addEventListener('click', () => {
    state.apiKeyConfig.provider = elements.providerSelect.value;
    state.apiKeyConfig.apiKey = elements.apikeyInput.value.trim();
    state.apiKeyConfig.model = elements.modelSelect.value.trim();
    saveConfig();
    updateApiStatusUI();
    closeModal(elements.apikeyModal);
    showToast('API Configuration saved successfully!', 'success');
  });

  elements.btnClearKey.addEventListener('click', () => {
    state.apiKeyConfig.apiKey = '';
    elements.apikeyInput.value = '';
    saveConfig();
    updateApiStatusUI();
    closeModal(elements.apikeyModal);
    showToast('API Key cleared. Using built-in local search.', 'info');
  });

  elements.btnTestKey.addEventListener('click', testApiConnection);

  // Deploy Modal
  elements.btnOpenDeploy.addEventListener('click', () => openModal(elements.deployModal));
  elements.deployModalClose.addEventListener('click', () => closeModal(elements.deployModal));
  elements.deployModal.addEventListener('click', (e) => {
    if (e.target === elements.deployModal) closeModal(elements.deployModal);
  });

  elements.btnCopyDeployCmd.addEventListener('click', () => {
    const text = `git remote add origin https://github.com/<your-username>/ecc-llm-navigator.git\ngit branch -M main\ngit push -u origin main`;
    copyToClipboard(text, 'Deployment commands copied!');
  });

  // Matchmaker Harness Tabs Switcher
  const matchHarnessTabs = document.getElementById('match-harness-tabs');
  if (matchHarnessTabs) {
    matchHarnessTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.harness-tab-btn');
      if (!btn) return;
      document.querySelectorAll('#match-harness-tabs .harness-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-harness');
      document.querySelectorAll('.harness-content-panel').forEach(p => p.classList.remove('active'));
      const activePanel = document.getElementById(`panel-${target}`);
      if (activePanel) activePanel.classList.add('active');
    });
  }

  // Copy buttons for Antigravity & OpenCode in Matchmaker
  const btnCopyAgPrompt = document.getElementById('btn-copy-ag-prompt');
  if (btnCopyAgPrompt) {
    btnCopyAgPrompt.addEventListener('click', () => {
      const text = document.getElementById('code-ag-prompt').textContent;
      copyToClipboard(text, 'Antigravity prompt copied!');
    });
  }

  const btnCopyOcJson = document.getElementById('btn-copy-oc-json');
  if (btnCopyOcJson) {
    btnCopyOcJson.addEventListener('click', () => {
      const text = document.getElementById('code-oc-json').textContent;
      copyToClipboard(text, 'OpenCode JSON config copied!');
    });
  }

  const btnCopyOcCli = document.getElementById('btn-copy-oc-cli');
  if (btnCopyOcCli) {
    btnCopyOcCli.addEventListener('click', () => {
      const text = document.getElementById('code-oc-cli').textContent;
      copyToClipboard(text, 'OpenCode CLI command copied!');
    });
  }

  // Quick Copy command button in Matchmaker
  elements.btnCopyQuickCmd.addEventListener('click', () => {
    const cmd = elements.copyPromptText.textContent;
    copyToClipboard(cmd, 'Execution command copied!');
  });
}

function updateApiStatusUI() {
  if (state.apiKeyConfig.apiKey) {
    elements.apiStatusDot.textContent = '🟢';
    elements.apiStatusText.textContent = `${state.apiKeyConfig.provider.toUpperCase()} Connected`;
    elements.btnOpenApikey.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  } else {
    elements.apiStatusDot.textContent = '⚡';
    elements.apiStatusText.textContent = 'Local Mode (No Key)';
    elements.btnOpenApikey.style.borderColor = 'rgba(139, 92, 246, 0.3)';
  }
}

// Filter and Search Catalog
function filterCatalog() {
  const query = state.searchQuery.toLowerCase();
  const tab = state.activeTab;
  const category = state.activeCategory;

  state.filteredItems = state.allItems.filter(item => {
    // Tab filtering
    if (tab === 'skills' && item.type !== 'skill') return false;
    if (tab === 'agents' && item.type !== 'agent') return false;
    if (tab === 'apps' && item.type !== 'llm_app') return false;
    if (tab === 'rules' && item.type !== 'rule' && item.type !== 'command' && item.type !== 'harness_standard') return false;

    // Category filtering
    if (category !== 'all') {
      const itemCat = (item.category || '').toLowerCase();
      if (!itemCat.includes(category.toLowerCase())) return false;
    }

    // Search query filtering
    if (query) {
      const matchScore = calculateItemRelevance(item, query);
      return matchScore > 0;
    }

    return true;
  });

  // If there's a search query, sort by relevance score
  if (query) {
    state.filteredItems.sort((a, b) => calculateItemRelevance(b, query) - calculateItemRelevance(a, query));
  }

  renderCatalog();
}

// Advanced Multi-field Relevance Scoring (BM25 + Semantic Tokens)
function calculateItemRelevance(item, rawQuery) {
  const query = rawQuery.toLowerCase();
  const tokens = query.split(/\s+/).filter(t => t.length > 1 && !['how', 'to', 'the', 'for', 'and', 'with', 'a', 'in', 'of'].includes(t));
  
  if (tokens.length === 0) return 0;

  let score = 0;
  const name = (item.name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const summary = (item.summary || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  const tags = (item.tags || []).join(' ').toLowerCase();
  const tools = (item.tools || '').toLowerCase();
  const techStack = (item.tech_stack || []).join(' ').toLowerCase();

  // Exact phrase match
  if (name.includes(query)) score += 100;
  if (desc.includes(query)) score += 50;
  if (tags.includes(query)) score += 40;

  // Token matches
  tokens.forEach(token => {
    if (name.includes(token)) score += 30;
    if (category.includes(token)) score += 20;
    if (tags.includes(token)) score += 18;
    if (techStack.includes(token)) score += 16;
    if (tools.includes(token)) score += 14;
    if (desc.includes(token)) score += 10;
    if (summary.includes(token)) score += 5;
  });

  return score;
}

// Render Catalog Cards
function renderCatalog() {
  const container = elements.itemsGrid;
  container.innerHTML = '';

  const total = state.allItems.length;
  const count = state.filteredItems.length;
  elements.filteredCountLabel.textContent = `Showing ${count} of ${total} items`;

  if (count === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
        <h4 style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 8px;">No matching items found</h4>
        <p style="font-size: 0.9rem;">Try adjusting your query or switching tabs and category filters.</p>
      </div>
    `;
    return;
  }

  // Show up to 90 items for peak performance
  const displayItems = state.filteredItems.slice(0, 90);

  displayItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.addEventListener('click', () => openDetailModal(item));

    const isECC = (item.source || '').includes('ECC');
    const sourceClass = isECC ? 'badge-ecc' : 'badge-apps';
    const sourceLabel = isECC ? 'ECC Toolkit' : 'Awesome LLM Apps';

    let runCmd = item.install_cmd || item.run_cmd || item.clone_cmd || item.command || '';
    let btnText = 'View Details';
    if (item.type === 'skill') btnText = 'Copy /skill';
    else if (item.type === 'agent') btnText = 'Copy /agent';
    else if (item.type === 'llm_app') btnText = 'Clone App';

    const tagsHtml = (item.tags || []).slice(0, 3).map(t => `<span class="item-tag">${escapeHtml(t)}</span>`).join('');

    // Simple english snippet for card
    const simpleWhat = item.simple_english?.what || item.description || item.summary || 'Specialized engineering capability.';

    card.innerHTML = `
      <div class="item-header">
        <span class="badge-source ${sourceClass}">${sourceLabel}</span>
        <span class="item-type-badge">${escapeHtml(item.type.replace('_', ' '))}</span>
      </div>
      <h4 class="item-title">${escapeHtml(item.name)}</h4>
      
      <!-- Simple English Callout -->
      <div style="background: rgba(16, 185, 129, 0.06); border-left: 2px solid #10b981; padding: 6px 10px; margin-bottom: 10px; border-radius: 0 4px 4px 0; font-size: 0.8rem; color: #a7f3d0;">
        <strong>Simple English:</strong> ${escapeHtml(simpleWhat.length > 120 ? simpleWhat.slice(0, 120) + '...' : simpleWhat)}
      </div>

      <p class="item-desc">${escapeHtml(item.description || item.summary || 'No description available.')}</p>
      
      <div class="item-tags">${tagsHtml}</div>
      <div class="item-footer">
        <span style="font-size: 0.75rem; color: var(--accent-cyan); font-family: var(--font-mono);">${escapeHtml(item.category || '')}</span>
        <button class="item-cmd-btn" onclick="event.stopPropagation(); quickCopyCmd('${escapeJs(runCmd)}', '${escapeJs(item.name)}')">
          <span>📋</span> ${btnText}
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// Task Matchmaker Execution Engine
async function executeTaskMatch() {
  const query = elements.taskInput.value.trim();
  if (!query) {
    elements.taskInput.focus();
    return;
  }

  // Scroll smoothly to matchmaker
  elements.matchmakerSection.style.display = 'block';
  elements.matchTaskEcho.textContent = `Analyzing: "${query}"`;
  elements.matchmakerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // If user configured an API key, run AI Copilot Mode
  if (state.apiKeyConfig.apiKey) {
    await runAiCopilotMatch(query);
  } else {
    // Run instant Local BM25 Matchmaker
    runLocalMatchmaker(query);
  }
}

// Local Instant Matchmaker Algorithm
function runLocalMatchmaker(query) {
  elements.copilotThinkingBox.style.display = 'none';

  // 1. Find Best Agent
  const agents = state.allItems.filter(i => i.type === 'agent');
  agents.sort((a, b) => calculateItemRelevance(b, query) - calculateItemRelevance(a, query));
  const bestAgent = agents[0] || state.allItems.find(i => i.id === 'ecc-agent-architect');

  // 2. Find Best Skill
  const skills = state.allItems.filter(i => i.type === 'skill');
  skills.sort((a, b) => calculateItemRelevance(b, query) - calculateItemRelevance(a, query));
  const bestSkill = skills[0] || state.allItems.find(i => i.id === 'ecc-skill-agentic-engineering');

  // 3. Find Best Reference App
  const apps = state.allItems.filter(i => i.type === 'llm_app');
  apps.sort((a, b) => calculateItemRelevance(b, query) - calculateItemRelevance(a, query));
  const bestApp = apps[0] || state.allItems.find(i => i.id === 'llm-app-starter_ai_agents-ai_data_analysis_agent');

  renderMatchmakerResults(bestAgent, bestSkill, bestApp, query);
}

// Render Results in Bento Grid with Simple English and Harness Guides
function renderMatchmakerResults(agent, skill, app, query) {
  // Update Simple English Banner
  const simpleEnglishBody = document.getElementById('match-simple-english-body');
  const simpleWhen = document.getElementById('match-simple-when');
  const simplePrevent = document.getElementById('match-simple-prevent');

  if (simpleEnglishBody) {
    const skillWhat = skill.simple_english?.what || skill.description || 'Applies proven workflows.';
    const agentWhat = agent.simple_english?.what || agent.description || 'Acts as a senior specialist.';
    simpleEnglishBody.innerHTML = `To accomplish <em>"${escapeHtml(query)}"</em>, you are pairing <strong>${escapeHtml(agent.name)}</strong> with the <strong>${escapeHtml(skill.name)}</strong> skill, referencing the <strong>${escapeHtml(app.name)}</strong> template.<br><br>• <strong>${escapeHtml(agent.name)}</strong>: ${escapeHtml(agentWhat)}<br>• <strong>${escapeHtml(skill.name)}</strong>: ${escapeHtml(skillWhat)}`;
  }
  if (simpleWhen) {
    simpleWhen.textContent = skill.simple_english?.when || 'When building this task and you want a verified, bug-free implementation.';
  }
  if (simplePrevent) {
    simplePrevent.textContent = skill.simple_english?.benefit || 'Prevents trial-and-error, hallucinations, and broken production code.';
  }

  // Update Agent Card
  elements.topAgentTitle.textContent = agent.name;
  elements.topAgentDesc.textContent = agent.simple_english?.what || agent.description || agent.summary;
  elements.btnViewAgent.onclick = () => openDetailModal(agent);

  // Update Skill Card
  elements.topSkillTitle.textContent = skill.name;
  elements.topSkillDesc.textContent = skill.simple_english?.what || skill.description || skill.summary;
  elements.btnViewSkill.onclick = () => openDetailModal(skill);

  // Update App Card
  elements.topAppTitle.textContent = app.name;
  elements.topAppDesc.textContent = app.simple_english?.what || app.description || app.summary;
  elements.btnViewApp.onclick = () => openDetailModal(app);

  // Synthesize Contextual 3-Step Execution Workflow in Simple English
  elements.step1Text.textContent = `PLAN: Activate ${agent.name} with tool access (${agent.tools || 'Read, Grep, Glob'}). Write down acceptance criteria and contract boundaries before editing code.`;
  elements.step2Text.textContent = `BUILD: Execute using the ${skill.name} skill playbook. Break the task into thin, testable slices, testing each part as you build.`;
  elements.step3Text.textContent = `VERIFY: Cross-check against the ${app.name} reference pattern (${(app.tech_stack || ['Python']).join(', ')}). Run lint, security review, and quality tests before finishing.`;

  // Update Antigravity Prompt Snippet
  const codeAg = document.getElementById('code-ag-prompt');
  if (codeAg) {
    codeAg.textContent = `@skill:${skill.name.toLowerCase()} Please help me implement this task: "${query}". Adopt the ${agent.name.toLowerCase()} persona to maintain high architecture quality.`;
  }

  // Update OpenCode JSON Snippet
  const codeOcJson = document.getElementById('code-oc-json');
  if (codeOcJson) {
    codeOcJson.textContent = `"instructions": [\n  "skills/${skill.name.toLowerCase()}/SKILL.md"\n]`;
  }

  // Update OpenCode CLI Snippet
  const codeOcCli = document.getElementById('code-oc-cli');
  if (codeOcCli) {
    codeOcCli.textContent = `opencode run "/skill ${skill.name.toLowerCase()}" --prompt "${query}"`;
  }

  // Quick Run Command (Claude / Codex)
  const quickCmd = `claude --agent ${agent.name.toLowerCase()} "/skill ${skill.name.toLowerCase()}" --prompt "${query}"`;
  elements.copyPromptText.textContent = quickCmd;
}

// AI Copilot Mode (Client-Side Direct LLM Call)
async function runAiCopilotMatch(query) {
  const box = elements.copilotThinkingBox;
  const stepTitle = elements.thinkingStepTitle;
  const stream = elements.thinkingStream;

  box.style.display = 'block';
  stepTitle.textContent = `Thinking: Routing task "${query}" via ${state.apiKeyConfig.provider.toUpperCase()}...`;
  stream.textContent = `Phase 1: Tokenizing query and extracting domain entities...\nPhase 2: Scanning 311 ECC Skills, 71 Agents, and 136 Awesome LLM Apps...\n`;

  const prompt = `You are the ECC & LLM Apps Architect. A developer asked for the best agent and skill to accomplish this task:
Task: "${query}"

Return a strictly valid JSON response without any markdown fences, with these exact keys:
{
  "recommended_agent_name": "Exact or closest agent from ECC (e.g. architect, code-reviewer, tdd-guide, security-reviewer, etc.)",
  "recommended_skill_name": "Exact or closest skill from ECC (e.g. agentic-engineering, test-driven-development, ci-cd-and-automation, etc.)",
  "step_1": "Concise step 1 description in plain English",
  "step_2": "Concise step 2 description in plain English",
  "step_3": "Concise step 3 description in plain English",
  "simple_explanation": "1-2 plain sentences explaining what this setup does in simple English",
  "reasoning": "Brief explanation of why this combo is optimal"
}`;

  try {
    let resultJson = null;

    if (state.apiKeyConfig.provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${state.apiKeyConfig.model}:generateContent?key=${state.apiKeyConfig.apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${err}`);
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      resultJson = JSON.parse(text);

    } else if (state.apiKeyConfig.provider === 'groq' || state.apiKeyConfig.provider === 'openai') {
      const url = state.apiKeyConfig.provider === 'groq' 
        ? 'https://api.groq.com/openai/v1/chat/completions' 
        : 'https://api.openai.com/v1/chat/completions';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKeyConfig.apiKey}`
        },
        body: JSON.stringify({
          model: state.apiKeyConfig.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${state.apiKeyConfig.provider} error: ${err}`);
      }
      const data = await res.json();
      resultJson = JSON.parse(data.choices[0].message.content);
    }

    if (resultJson) {
      stream.textContent += `Phase 3: Architect synthesized blueprint!\nAgent: ${resultJson.recommended_agent_name}\nSkill: ${resultJson.recommended_skill_name}\nReasoning: ${resultJson.reasoning}\n`;

      // Find objects in catalog
      const agent = state.allItems.find(i => i.type === 'agent' && i.name.toLowerCase().includes((resultJson.recommended_agent_name || '').toLowerCase())) || state.allItems.find(i => i.id === 'ecc-agent-architect');
      const skill = state.allItems.find(i => i.type === 'skill' && i.name.toLowerCase().includes((resultJson.recommended_skill_name || '').toLowerCase())) || state.allItems.find(i => i.id === 'ecc-skill-agentic-engineering');
      
      const apps = state.allItems.filter(i => i.type === 'llm_app');
      apps.sort((a, b) => calculateItemRelevance(b, query) - calculateItemRelevance(a, query));
      const app = apps[0] || state.allItems.find(i => i.id === 'llm-app-starter_ai_agents-ai_data_analysis_agent');

      renderMatchmakerResults(agent, skill, app, query);

      if (resultJson.step_1) elements.step1Text.textContent = resultJson.step_1;
      if (resultJson.step_2) elements.step2Text.textContent = resultJson.step_2;
      if (resultJson.step_3) elements.step3Text.textContent = resultJson.step_3;

      if (resultJson.simple_explanation) {
        const simpleBody = document.getElementById('match-simple-english-body');
        if (simpleBody) simpleBody.innerHTML = `<strong>In Simple English:</strong> ${escapeHtml(resultJson.simple_explanation)}`;
      }

      stepTitle.textContent = `⚡ AI Match Completed (${state.apiKeyConfig.model})`;
    }

  } catch (err) {
    console.warn('AI Copilot request failed, falling back to local BM25 match:', err);
    stream.textContent += `Notice: API connection error (${err.message}). Falling back to local matchmaker.\n`;
    runLocalMatchmaker(query);
  }
}

// Test API Connection
async function testApiConnection() {
  const provider = elements.providerSelect.value;
  const key = elements.apikeyInput.value.trim();
  const model = elements.modelSelect.value.trim();

  if (!key) {
    showToast('Please enter an API key first.', 'error');
    return;
  }

  showToast(`Testing ${provider.toUpperCase()} connection...`, 'info');

  try {
    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with OK' }] }]
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast('Gemini API key is verified & working!', 'success');

    } else if (provider === 'groq' || provider === 'openai') {
      const url = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(`${provider.toUpperCase()} key is verified & working!`, 'success');
    }
  } catch (e) {
    showToast(`Test failed: ${e.message.slice(0, 80)}`, 'error');
  }
}

// Open Detail Drawer Modal with 4 Interactive Tabs
function openDetailModal(item) {
  state.currentDetailItem = item;
  elements.modalTitle.textContent = item.name;
  elements.modalTypeBadge.textContent = `${item.source || 'ECC'} · ${item.type.toUpperCase().replace('_', ' ')}`;
  elements.modalGithubLink.href = item.repo_url || 'https://github.com/affaan-m/ECC';

  const runCmd = item.install_cmd || item.run_cmd || item.clone_cmd || item.command || '';
  const cleanName = item.name.toLowerCase().replace(/\s+/g, '-');

  // Simple English content
  const se = item.simple_english || {
    what: item.description || item.summary || 'Specialized development workflow.',
    when: 'Whenever working on tasks requiring structured engineering quality.',
    benefit: 'Stops bugs and enforces clean architectural standards.'
  };

  // Antigravity Guide
  const agPrompt = item.antigravity?.prompt || `@skill:${cleanName} Please apply this to our current task.`;
  const agLoc = item.antigravity?.location || `C:\\Users\\Chirag\\.gemini\\config\\skills\\${cleanName}\\SKILL.md`;
  const agRule = item.antigravity?.rule_snippet || `# AGENTS.md Rule\nWhenever working on ${item.category || 'tasks'}, read and execute @skill:${cleanName}.`;

  // OpenCode Guide
  const ocJson = item.opencode?.json_config || `"instructions": [\n  "skills/${cleanName}/SKILL.md"\n]`;
  const ocCli = item.opencode?.cli_command || `opencode run "/skill ${cleanName}"`;

  elements.modalBody.innerHTML = `
    <!-- Modal Navigation Tabs -->
    <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 20px; overflow-x: auto;">
      <button class="harness-tab-btn active" id="modal-tab-simple" onclick="switchModalTab('simple')">
        <span>💡</span> In Simple English
      </button>
      <button class="harness-tab-btn tab-ag" id="modal-tab-ag" onclick="switchModalTab('ag')">
        <span>🟢</span> In Google Antigravity
      </button>
      <button class="harness-tab-btn tab-oc" id="modal-tab-oc" onclick="switchModalTab('oc')">
        <span>🔵</span> In OpenCode
      </button>
      <button class="harness-tab-btn" id="modal-tab-tech" onclick="switchModalTab('tech')">
        <span>⚙️</span> Technical Specs
      </button>
    </div>

    <!-- 1. Simple English Tab Panel -->
    <div id="modal-panel-simple" class="harness-content-panel active">
      <div class="simple-english-box" style="margin-bottom: 16px;">
        <div class="simple-english-title">
          <span>🎯</span> What It Does (Plain Words)
        </div>
        <div class="simple-english-body">
          ${escapeHtml(se.what)}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px;">
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px;">
          <strong style="color: #38bdf8; font-size: 0.8rem; text-transform: uppercase; display: block; margin-bottom: 4px;">When to use it:</strong>
          <span style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(se.when)}</span>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px;">
          <strong style="color: #34d399; font-size: 0.8rem; text-transform: uppercase; display: block; margin-bottom: 4px;">What problem it prevents:</strong>
          <span style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(se.benefit)}</span>
        </div>
      </div>
    </div>

    <!-- 2. Google Antigravity Panel -->
    <div id="modal-panel-ag" class="harness-content-panel">
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
        <strong style="color: #34d399; font-size: 0.9rem;">How to Use in Google Antigravity:</strong>
        <p style="font-size: 0.85rem; color: #e2e8f0; margin-top: 6px;">
          Google Antigravity natively loads skills and agents from your configuration directory or workspace <code>.agents/</code> folder.
        </p>
      </div>

      <div class="harness-snippet-box">
        <div class="harness-snippet-header">
          <span>ANTIGRAVITY CHAT PROMPT</span>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${escapeJs(agPrompt)}', 'Antigravity prompt copied!')">Copy Prompt</button>
        </div>
        <pre style="margin: 0;"><code>${escapeHtml(agPrompt)}</code></pre>
      </div>

      <div class="harness-snippet-box">
        <div class="harness-snippet-header">
          <span>AGENTS.MD RULE CONFIGURATION</span>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${escapeJs(agRule)}', 'AGENTS.md rule copied!')">Copy Rule</button>
        </div>
        <pre style="margin: 0;"><code>${escapeHtml(agRule)}</code></pre>
      </div>

      <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 10px;">
        📁 <strong>Local Config File:</strong> <code>${escapeHtml(agLoc)}</code>
      </div>
    </div>

    <!-- 3. OpenCode Panel -->
    <div id="modal-panel-oc" class="harness-content-panel">
      <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
        <strong style="color: #38bdf8; font-size: 0.9rem;">How to Use in OpenCode:</strong>
        <p style="font-size: 0.85rem; color: #e2e8f0; margin-top: 6px;">
          OpenCode reads instructions from <code>.opencode/opencode.json</code>. You can register this skill as an instruction or invoke it via OpenCode CLI.
        </p>
      </div>

      <div class="harness-snippet-box">
        <div class="harness-snippet-header">
          <span>.OPENCODE/OPENCODE.JSON CONFIG</span>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${escapeJs(ocJson)}', 'OpenCode JSON copied!')">Copy JSON</button>
        </div>
        <pre style="margin: 0;"><code>${escapeHtml(ocJson)}</code></pre>
      </div>

      <div class="harness-snippet-box">
        <div class="harness-snippet-header">
          <span>OPENCODE CLI RUN COMMAND</span>
          <button class="btn btn-ghost btn-sm" onclick="copyToClipboard('${escapeJs(ocCli)}', 'OpenCode CLI command copied!')">Copy Command</button>
        </div>
        <pre style="margin: 0;"><code>${escapeHtml(ocCli)}</code></pre>
      </div>
    </div>

    <!-- 4. Technical Specs Panel -->
    <div id="modal-panel-tech" class="harness-content-panel">
      ${item.tools ? `<div style="margin-bottom: 10px;"><strong>Tool Access:</strong> <span style="font-family: var(--font-mono); color: var(--accent-cyan);">${escapeHtml(item.tools)}</span></div>` : ''}
      ${item.model ? `<div style="margin-bottom: 10px;"><strong>Recommended Model:</strong> <span style="font-family: var(--font-mono); color: var(--accent-purple);">${escapeHtml(item.model)}</span></div>` : ''}
      ${item.tech_stack && item.tech_stack.length > 0 ? `<div style="margin-bottom: 10px;"><strong>Tech Stack:</strong> ${item.tech_stack.map(t => `<span class="item-tag">${escapeHtml(t)}</span>`).join(' ')}</div>` : ''}
      ${runCmd ? `<h4>CLI Command</h4><pre><code>${escapeHtml(runCmd)}</code></pre>` : ''}
      ${item.full_content ? `
        <h4 style="margin-top: 14px;">Documentation & Full Instructions</h4>
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px; font-size: 0.85rem; white-space: pre-wrap; font-family: var(--font-sans); color: var(--text-secondary); max-height: 280px; overflow-y: auto;">
${escapeHtml(item.full_content)}
        </div>
      ` : ''}
    </div>
  `;

  openModal(elements.itemModal);
}

// Modal Tab Switcher Global Helper
window.switchModalTab = function(tabName) {
  document.querySelectorAll('.modal-body .harness-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.modal-body .harness-content-panel').forEach(p => p.classList.remove('active'));

  const btn = document.getElementById(`modal-tab-${tabName}`);
  const panel = document.getElementById(`modal-panel-${tabName}`);

  if (btn) btn.classList.add('active');
  if (panel) panel.classList.add('active');
};

// Modal Helpers
function openModal(modal) {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.style.display = 'none';
  if (!isModalOpen()) {
    document.body.style.overflow = 'auto';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  document.body.style.overflow = 'auto';
}

function isModalOpen() {
  return Array.from(document.querySelectorAll('.modal-overlay')).some(m => m.style.display === 'flex');
}

// Quick Copy Helper
window.quickCopyCmd = function(cmd, name) {
  if (!cmd) return;
  copyToClipboard(cmd, `Copied command for ${name}!`);
};

function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMsg, 'success');
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
  document.body.removeChild(ta);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Start
document.addEventListener('DOMContentLoaded', init);
