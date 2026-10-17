/* Agent Atlas — search engine + UI logic.
   Search is synchronous and instant: keystroke filtering never animates
   (emil-design-eng: never animate keyboard-initiated repeated actions). */
(() => {
  "use strict";

  const C = window.CATALOG;
  const items = C.items;
  const $ = (s) => document.querySelector(s);
  const grid = $("#grid"), empty = $("#empty"), meta = $("#resultMeta");
  const picks = $("#bestPicks"), picksRow = $("#picksRow");
  const chipsEl = $("#chips"), q = $("#q"), kbdHint = $("#kbdHint");
  const toastEl = $("#toast");

  /* ---------- intent map: "type my need" → search tokens ---------- */
  const INTENT = {
    bug: ["fix", "debug", "test", "tdd", "defect", "repair"],
    broken: ["fix", "debug", "build"],
    error: ["debug", "fix"],
    fail: ["test", "tdd", "build"],
    test: ["tdd", "testing", "coverage", "pytest", "vitest"],
    review: ["code-review", "quality", "security", "review"],
    deploy: ["deployment", "docker", "ci", "release", "canary", "production"],
    release: ["deployment", "changelog", "version"],
    frontend: ["react", "next", "ui", "css", "design", "component"],
    ui: ["design", "frontend", "interface", "ux"],
    website: ["frontend", "landing", "seo", "design"],
    landing: ["frontend", "design", "seo", "marketing"],
    dashboard: ["ui", "frontend", "grafana", "charts"],
    style: ["design", "css", "ui", "typography"],
    animate: ["motion", "animation", "gsap"],
    animation: ["motion", "animate"],
    database: ["sql", "postgres", "mysql", "query", "index"],
    slow: ["performance", "optimization", "latency", "benchmark"],
    fast: ["performance", "optimization"],
    performance: ["optimization", "benchmark"],
    secure: ["security", "audit", "vulnerability"],
    security: ["audit", "vulnerability", "hardening"],
    hack: ["security", "osint", "bounty"],
    docs: ["documentation", "readme", "governance"],
    documentation: ["docs", "readme", "adr"],
    refactor: ["cleanup", "clean", "dead-code", "structure"],
    clean: ["refactor", "cleanup"],
    plan: ["planning", "architect", "blueprint", "scope"],
    architecture: ["design", "architect", "hexagonal", "system"],
    research: ["deep-research", "market", "compare", "literature"],
    video: ["remotion", "ffmpeg", "edit", "generate"],
    image: ["generate", "design", "banner"],
    audio: ["speech", "video", "podcast"],
    rag: ["llm-app", "retrieval", "embedding"],
    agent: ["agents", "llm-app", "orchestration", "mcp"],
    llm: ["llm-app", "prompt", "rag", "model"],
    chatbot: ["llm-app", "rag", "voice"],
    git: ["github", "commit", "pr"],
    github: ["git", "pr", "issue", "ci"],
    commit: ["git", "conventional"],
    python: ["pytest", "django", "fastapi", "pattern"],
    go: ["golang", "pattern", "test"],
    rust: ["ownership", "pattern"],
    java: ["spring", "jpa", "pattern"],
    kotlin: ["coroutines", "android", "compose"],
    swift: ["ios", "swiftui", "concurrency"],
    react: ["next", "component", "frontend", "performance"],
    nextjs: ["react", "turbopack", "frontend"],
    devops: ["docker", "kubernetes", "deployment", "infra"],
    kubernetes: ["docker", "devops", "workload"],
    api: ["rest", "design", "fastapi", "nestjs"],
    email: ["mail", "outreach", "draft"],
    money: ["billing", "finance", "investor", "cost"],
    learn: ["onboarding", "course", "crash"],
  };

  /* ---------- indexing ---------- */
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s/.+-]/g, " ").replace(/\s+/g, " ");
  for (const it of items) {
    it._hay = norm([it.name, it.category, it.desc, it.tags.join(" "), it.type].join(" "));
    it._name = norm(it.name);
  }

  const TYPE_ORDER = ["Skill", "Agent", "Command", "LLM App", "Tool", "MCP", "Instruction"];

  function search(raw) {
    const query = norm(raw).trim();
    if (!query) return null;
    const tokens = query.split(" ").filter(Boolean);
    const expanded = new Set(tokens);
    for (const t of tokens) for (const extra of INTENT[t] || []) expanded.add(extra);
    const toks = [...expanded];

    const scored = [];
    for (const it of items) {
      let s = 0;
      for (const t of toks) {
        if (it._name === t) s += 60;
        else if (it._name.startsWith(t + " ") || it._name.startsWith("/" + t)) s += 45;
        else if (it._name.includes(t)) s += 24;
        else if (it._hay.includes(t)) s += 8;
      }
      if (s === 0) continue;
      // phrase bonus
      if (it._hay.includes(query)) s += 14;
      // primary tokens weigh more than intent expansions
      for (const t of tokens) {
        if (it._name.includes(t)) s += 10;
        else if (it._hay.includes(t)) s += 4;
      }
      scored.push([s, it]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
    return scored;
  }

  /* ---------- chips ---------- */
  const TYPES = ["All", ...TYPE_ORDER.filter((t) => C.counts[t])];
  let activeType = "All";
  for (const t of TYPES) {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", t === activeType);
    b.innerHTML = `${t}<span class="n">${t === "All" ? items.length : (C.counts[t] || 0)}</span>`;
    b.addEventListener("click", () => {
      activeType = t;
      for (const el of chipsEl.children) el.setAttribute("aria-selected", el === b);
      render(q.value); // type switch is occasional — allow the small stagger
    });
    chipsEl.appendChild(b);
  }

  /* ---------- rendering ---------- */
  const esc = (s) => s.replace(/[&<>"]/g, (c) => "&#" + c.charCodeAt(0) + ";");
  const MAX = 90;

  function cardHTML(it) {
    return `<article class="card" data-id="${esc(it.id)}">
      <div class="card-head">
        <span class="badge ${it.type === "LLM App" ? "LLMApp" : it.type}">${esc(it.type)}</span>
        <span class="src">${esc(it.source)}</span>
      </div>
      <h3>${esc(it.name)}</h3>
      <div class="cat">${esc(it.category)}</div>
      <p class="desc">${esc(it.desc).slice(0, 240)}${it.desc.length > 240 ? "…" : ""}</p>
      <div class="how">${esc(it.how)}</div>
      <div class="card-foot"><button class="copy-btn" type="button" data-copy="${esc(it.how)}">Copy how-to</button></div>
    </article>`;
  }

  let lastPainted = "";
  function render(raw, opts = {}) {
    const res = search(raw);
    let list, label;

    if (res === null) { // browse mode
      list = items.filter((i) => activeType === "All" || i.type === activeType);
      label = `Browsing <b>${list.length}</b> entries${activeType !== "All" ? ` in ${activeType}` : ""} — start typing to narrow.`;
    } else {
      list = res.map(([, it]) => it).filter((i) => activeType === "All" || i.type === activeType);
      const shown = Math.min(list.length, MAX);
      label = `<b>${list.length}</b> match${list.length === 1 ? "" : "es"} for “${esc(raw.trim())}”${list.length > shown ? ` — showing best ${shown}` : ""}.`;
    }

    // best picks: strong name hits across distinct types
    if (res !== null && list.length) {
      const seen = new Set(); const top = [];
      for (const it of list) {
        if (seen.has(it.type)) continue;
        seen.add(it.type); top.push(it);
        if (top.length === 3) break;
      }
      picks.hidden = false;
      picksRow.innerHTML = top.map(cardHTML).join("");
    } else {
      picks.hidden = true;
      picksRow.innerHTML = "";
    }

    const shown = list.slice(0, MAX);
    grid.innerHTML = shown.map(cardHTML).join("");
    grid.classList.toggle("stagger", !!opts.stagger);
    empty.hidden = list.length > 0;
    if (list.length === 0 && res !== null) renderSuggestions(raw);
    if (list.length === 0 && res === null) { empty.hidden = false; empty.querySelector(".empty-title").textContent = "Nothing here yet."; }
    meta.innerHTML = label;
    lastPainted = raw;
  }

  function renderSuggestions(raw) {
    const seeds = ["tdd-workflow", "code-reviewer", "deployment", "deep-research", "React", "rag"];
    const sugs = [];
    for (const seed of seeds) {
      const r = search(seed);
      if (r && r.length) sugs.push(r[0][1]);
      if (sugs.length >= 4) break;
    }
    $("#emptySugs").innerHTML = sugs
      .map((it) => `<button class="chip" type="button" data-seed="${esc(it.name)}">${esc(it.name)}</button>`)
      .join("");
    for (const b of $("#emptySugs").children)
      b.addEventListener("click", () => { q.value = b.dataset.seed; onInput(true); q.focus(); });
  }

  // typing = keyboard-repeated → no stagger, instant paint
  const onInput = (stagger = false) => render(q.value, { stagger });
  q.addEventListener("input", () => { kbdHint.classList.toggle("off", !!q.value); onInput(); });
  q.addEventListener("keydown", (e) => { if (e.key === "Escape") { q.value = ""; kbdHint.classList.remove("off"); onInput(); } });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== q && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault(); q.focus();
    }
  });

  /* ---------- copy + toast ---------- */
  let toastTimer;
  function toast(msg, isErr = false) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.toggle("err", isErr);
    toastEl.hidden = false;
    toastEl.classList.remove("out"); toastEl.classList.add("in");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("in"); toastEl.classList.add("out");
      setTimeout(() => (toastEl.hidden = true), 200);
    }, 2200);
  }
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      btn.textContent = "Copied ✓"; btn.classList.add("done");
      setTimeout(() => { btn.textContent = "Copy how-to"; btn.classList.remove("done"); }, 1300);
    }, () => toast("Copy failed — select the text manually.", true));
  });
  picksRow.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    navigator.clipboard.writeText(btn.dataset.copy).then(() => toast("How-to copied to clipboard."));
  });

  /* ---------- optional AI recommendations ---------- */
  const aiCfg = {
    get endpoint() { return localStorage.getItem("aa.endpoint") || ""; },
    get key() { return localStorage.getItem("aa.key") || ""; },
    get model() { return localStorage.getItem("aa.model") || ""; },
  };
  const settingsBtn = $("#settingsBtn"), aiBtn = $("#aiBtn"), pop = $("#settingsPop");
  const syncAiUi = () => { aiBtn.hidden = !aiCfg.endpoint || !aiCfg.key; };
  settingsBtn.addEventListener("click", () => {
    $("#aiEndpoint").value = aiCfg.endpoint; $("#aiKey").value = aiCfg.key; $("#aiModel").value = aiCfg.model;
    pop.hidden = false;
    requestAnimationFrame(() => pop.classList.add("open"));
  });
  document.addEventListener("click", (e) => {
    if (pop.hidden || pop.contains(e.target) || settingsBtn.contains(e.target)) return;
    pop.classList.remove("open");
    setTimeout(() => (pop.hidden = true), 240);
  });
  $("#aiSave").addEventListener("click", () => {
    localStorage.setItem("aa.endpoint", $("#aiEndpoint").value.trim());
    localStorage.setItem("aa.key", $("#aiKey").value.trim());
    localStorage.setItem("aa.model", $("#aiModel").value.trim());
    pop.classList.remove("open"); setTimeout(() => (pop.hidden = true), 240);
    syncAiUi(); toast("AI settings saved in this browser.");
  });
  $("#aiClear").addEventListener("click", () => {
    ["aa.endpoint", "aa.key", "aa.model"].forEach((k) => localStorage.removeItem(k));
    $("#aiEndpoint").value = $("#aiKey").value = $("#aiModel").value = "";
    syncAiUi(); toast("AI settings cleared.");
  });

  aiBtn.addEventListener("click", async () => {
    const need = q.value.trim() || "the most useful capabilities of this setup";
    // prefilter: send a compact shortlist, keep tokens small
    const pre = (search(q.value) || items.map((i) => [1, i])).slice(0, 40).map(([, it]) => it);
    const shortlist = pre.map((it) => `- [${it.id}] (${it.type}, ${it.source}) ${it.name}: ${it.desc.slice(0, 140)}`).join("\n");
    toast("Asking AI…");
    try {
      const res = await fetch(aiCfg.endpoint.replace(/\/+$/, "") + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiCfg.key}` },
        body: JSON.stringify({
          model: aiCfg.model || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: "You recommend the best tools from a fixed catalog. Reply ONLY with JSON: {\"picks\":[{\"id\":\"...\",\"why\":\"one sentence\"}],\"note\":\"one sentence\"}. Pick up to 3 ids strictly from the catalog." },
            { role: "user", content: `Need: ${need}\n\nCatalog:\n${shortlist}` },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(txt.replace(/^```json\s*|```\s*$/g, ""));
      const byId = new Map(items.map((i) => [i.id, i]));
      const picked = (parsed.picks || []).map((p) => ({ it: byId.get(p.id), why: p.why })).filter((p) => p.it);
      if (!picked.length) throw new Error("no valid picks returned");
      picks.hidden = false;
      picksRow.innerHTML = picked.map(({ it, why }) =>
        cardHTML(it).replace('</p>\n      <div class="how">', `</p>\n      <p class="desc" style="color:var(--ember-strong)">Why: ${esc(why)}</p>\n      <div class="how">`)
      ).join("");
      picks.scrollIntoView({ behavior: "smooth", block: "start" });
      toast(parsed.note ? `AI: ${parsed.note}` : "AI recommendations ready.");
    } catch (err) {
      const cors = err instanceof TypeError;
      toast(cors ? "Request blocked (CORS or network). Try a different endpoint." : `AI failed: ${err.message}`, true);
    }
  });

  /* ---------- boot ---------- */
  $("#stats").innerHTML =
    `<span><b>${items.length}</b> entries</span>
     <span><b>${C.counts.Skill}</b> skills</span>
     <span><b>${C.counts.Agent}</b> agents</span>
     <span><b>${C.counts.Command}</b> commands</span>
     <span><b>${C.counts["LLM App"]}</b> LLM apps</span>`;
  $("#genTime").textContent = new Date(C.generated).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  syncAiUi();
  render("", { stagger: true });
})();
