# ⚡ ECC & Awesome LLM Apps Navigator
> **The Universal Agent & Skill Matchmaker** for [Affaan M's ECC (Everything Claude Code)](https://github.com/affaan-m/ECC) and [Shubham Saboo's Awesome LLM Apps](https://github.com/Shubhamsaboo/awesome-llm-apps).

Search any engineering task or application idea to instantly discover the optimal AI agent roles, workflow skills, starter app templates, and execution blueprints.

---

## 🌟 Key Highlights

- **620+ Curated Items Indexed**:
  - **311 ECC Skills**: Agentic engineering, TDD, CI/CD, security audits, database patterns, frontend & mobile workflows, scientific domains.
  - **71 ECC Agents**: Specialized reviewer personas, error resolvers, system architects, planners, and autonomous loops.
  - **136 Awesome LLM Apps**: Multi-agent software teams, RAG architectures (Graph/Hybrid/Multimodal), voice assistants, MCP tool agents, generative UI copilots.
  - **100+ Commands & Rules**: Core ECC standards (`AGENTS.md`, `SOUL.md`, security guidelines, and custom hooks).
- **Intelligent Task Matchmaker**:
  - Type any task (e.g., *"Refactor legacy code with TDD"*, *"Multi-agent financial research analyst"*, *"Automate PR security review and reproduction"*).
  - Calculates composite relevance scores across all agents, skills, and templates.
  - Delivers a structured **3-Step Composite Execution Blueprint**.
  - Generates copyable CLI commands (`claude --agent ... "/skill ..."`).
- **Zero-Key Local Mode by Default**:
  - Built-in multi-field BM25 & semantic tag matching engine operates 100% in your browser.
  - Zero API key required for fast, private, instant offline matching!
- **Optional AI Copilot Mode**:
  - Connect your free Google Gemini API key (or Groq / OpenAI) for dynamic multi-agent task reasoning with 3-phase thinking states.
  - Keys are saved exclusively in your browser's `localStorage`—never sent to any server or committed to Git.

---

## 🔑 Which API Key Should You Use?

| Provider | Recommended Model | Pricing / Limits | How to Obtain | Best For |
|---|---|---|---|---|
| **Google Gemini (Recommended)** | `gemini-2.5-flash` / `gemini-1.5-flash` | **100% Free** (15 req/min, 1M tokens/min) | [Google AI Studio](https://aistudio.google.com/app/apikey) | Fast reasoning, structured outputs, no credit card required |
| **Groq (Free Alternative)** | `llama-3.3-70b-versatile` | **100% Free** Tier | [Groq Console](https://console.groq.com/keys) | Blazing fast inference speed (~500 tokens/sec) |
| **OpenAI** | `gpt-4o-mini` | Paid per token | [OpenAI Platform](https://platform.openai.com/api-keys) | General tasks if you have existing OpenAI credits |
| **Anthropic** | `claude-3-5-haiku-latest` | Paid per token | [Anthropic Console](https://console.anthropic.com/) | Claude-native reasoning |
| **None (Local Search)** | *Built-in BM25* | **Free Forever** | No key needed | Instant search and ranking without any setup |

---

## 🚀 Instant Deployment on GitHub Pages

This repository is already configured with automated GitHub Pages deployment using GitHub Actions (`.github/workflows/deploy.yml`).

### 1. Initialize & Push to Your GitHub Account
```bash
# In this directory:
git init
git add .
git commit -m "feat: initial commit of ECC & LLM Apps Navigator"
git branch -M main
git remote add origin https://github.com/<your-username>/ecc-llm-navigator.git
git push -u origin main
```

### 2. Enable GitHub Pages
1. Go to your repo on GitHub &rarr; **Settings** &rarr; **Pages**.
2. Under **Build and deployment &rarr; Source**, choose **GitHub Actions**.
3. In ~60 seconds, your site will be live at:
   ```
   https://<your-username>.github.io/ecc-llm-navigator/
   ```

---

## 💻 Local Preview

Run any simple static file server:
```bash
# Using Python
python -m http.server 8080

# Or simply open index.html directly in your web browser!
```
Visit `http://localhost:8080` in your browser.

---

## 📜 Credits & Sources
- **Affaan Mustafa** for [Everything Claude Code (ECC)](https://github.com/affaan-m/ECC).
- **Shubham Saboo** for [Awesome LLM Apps](https://github.com/Shubhamsaboo/awesome-llm-apps).
