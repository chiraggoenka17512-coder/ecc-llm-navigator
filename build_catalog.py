import os
import json
import re

ECC_DIR = r"C:\Users\Chirag\.gemini\antigravity-ide\scratch\ECC"
APPS_DIR = r"C:\Users\Chirag\.gemini\antigravity-ide\scratch\awesome-llm-apps"
OUTPUT_DIR = r"C:\Users\Chirag\.gemini\antigravity-ide\scratch\ecc-llm-navigator"

def parse_frontmatter(content):
    meta = {}
    body = content
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            fm_text = parts[1]
            body = parts[2].strip()
            for line in fm_text.splitlines():
                if ':' in line and not line.startswith(' ') and not line.startswith('\t'):
                    k, v = line.split(':', 1)
                    meta[k.strip()] = v.strip().strip('"\'')
    return meta, body

def clean_markdown_summary(text, max_len=240):
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('![') or line.startswith('[!') or line.startswith('---'):
            continue
        lines.append(line)
        if sum(len(l) for l in lines) > max_len:
            break
    summary = " ".join(lines)
    summary = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', summary)
    summary = re.sub(r'[*_`]', '', summary)
    if len(summary) > max_len:
        summary = summary[:max_len].rsplit(' ', 1)[0] + '...'
    return summary

def categorize_skill(name, desc):
    name_desc = (name + " " + desc).lower()
    if any(k in name_desc for k in ['test', 'tdd', 'coverage', 'mock', 'e2e', 'playwright', 'pytest', 'junit']):
        return 'Testing & Quality'
    if any(k in name_desc for k in ['security', 'hardening', 'vulnerability', 'auth', 'audit', 'hipaa', 'sanitizer']):
        return 'Security & Audit'
    if any(k in name_desc for k in ['architect', 'design', 'adr', 'system', 'patterns', 'hexagonal', 'api-design']):
        return 'Architecture & Design'
    if any(k in name_desc for k in ['agent', 'harness', 'eval', 'council', 'autonomous', 'loop', 'memory', 'context']):
        return 'Agent Engineering'
    if any(k in name_desc for k in ['frontend', 'ui', 'react', 'vue', 'angular', 'flutter', 'tailwind', 'css', 'a11y', 'motion']):
        return 'Frontend & Mobile'
    if any(k in name_desc for k in ['database', 'postgres', 'mysql', 'sql', 'redis', 'prisma', 'migration', 'clickhouse']):
        return 'Databases & Storage'
    if any(k in name_desc for k in ['docker', 'kubernetes', 'ci-cd', 'pipeline', 'deployment', 'uncloud', 'terminal']):
        return 'DevOps & Infrastructure'
    if any(k in name_desc for k in ['science', 'bio', 'genomic', 'protein', 'chem', 'pdb', 'pubmed', 'alphafold']):
        return 'Scientific & Domain'
    if any(k in name_desc for k in ['python', 'rust', 'golang', 'typescript', 'dart', 'csharp', 'cpp', 'java', 'kotlin']):
        return 'Language Specialists'
    return 'Workflows & Tooling'

def categorize_agent(name, desc):
    n = name.lower()
    if 'reviewer' in n or 'audit' in n or 'hunter' in n:
        return 'Reviewers & Auditors'
    if 'resolver' in n or 'cleaner' in n or 'fix' in n:
        return 'Error Resolvers & Fixers'
    if 'architect' in n or 'planner' in n or 'spec' in n:
        return 'Architects & Planners'
    if 'gan-' in n or 'evaluator' in n or 'loop' in n:
        return 'Autonomous & Evaluation'
    return 'Specialist Agents'

def generate_simple_english(item_type, name, desc, category):
    name_clean = name.replace('-', ' ').title()
    desc_clean = (desc or "").strip()
    
    # Simple, human-friendly explanation generator
    if item_type == 'skill':
        if 'tdd' in name or 'test' in name:
            what = f"Helps you write automated tests first before touching implementation code. It ensures your features work on the first try and never regress."
            when = "Whenever you're building a new feature, writing API endpoints, or reproducing and fixing a bug."
            benefit = "Guarantees 80%+ test coverage, stops 'silent breakages', and gives you total confidence when deploying."
        elif 'security' in name or 'audit' in name or 'hipaa' in name:
            what = f"Acts as an automated cybersecurity auditor that scans your code for vulnerabilities, leaked credentials, injection attacks, and unsafe inputs."
            when = "Before merging any pull request, when adding authentication, or handling user-uploaded data."
            benefit = "Protects user data, prevents costly security breaches, and meets regulatory compliance standards."
        elif 'architect' in name or 'design' in name or 'pattern' in name:
            what = f"Provides a clean structural architectural blueprint for your project, defining modules, API boundaries, and database schemas."
            when = "At the start of a project or feature when deciding how systems, components, and services should communicate."
            benefit = "Prevents messy spaghetti code, reduces technical debt, and keeps your codebase easy to maintain."
        elif 'agent' in name or 'harness' in name or 'eval' in name:
            what = f"Gives AI coding assistants a structured playbook with rules, evaluation checkpoints, and memory so they don't wander off track."
            when = "When running complex, autonomous AI coding sessions where you want reliable, repeatable outcomes."
            benefit = "Stops the AI from guessing, hallucinating, or deleting necessary code."
        elif 'frontend' in name or 'ui' in name:
            what = f"Teaches the AI how to design slick, modern, accessible user interfaces with sleek dark themes, glassmorphism, and micro-interactions."
            when = "Whenever you are building web pages, dashboards, landing pages, or mobile app screens."
            benefit = "Makes your product look like an expensive high-end agency built it rather than a generic template."
        else:
            what = f"Gives your assistant a specialized, step-by-step playbook for {name_clean}. It defines exactly what steps to follow and what mistakes to avoid."
            when = f"Whenever you need to work with {category.lower()} or execute {name_clean} workflows."
            benefit = "Saves hours of trial-and-error by adhering to proven industry best practices."

    elif item_type == 'agent':
        if 'reviewer' in name:
            what = f"A senior code reviewer persona that rigorously examines your code diffs for bugs, performance leaks, and logic flaws before merge."
            when = "Before creating or merging a pull request, or right after finishing a major code edit."
            benefit = "Acts as a fresh pair of expert eyes that catches subtle edge cases you might have missed."
        elif 'resolver' in name or 'fix' in name:
            what = f"A dedicated debugger and error troubleshooter that diagnoses compile errors, failing tests, and broken dependencies."
            when = "When a build breaks, terminal throws stack traces, or dependencies fail to install."
            benefit = "Systematically traces root causes and applies surgical fixes without breaking surrounding code."
        elif 'architect' in name or 'planner' in name:
            what = f"A system architect persona that maps out high-level technical decisions, scalability plans, and data models."
            when = "Before writing code on a complex project, when refactoring large modules, or planning system migrations."
            benefit = "Ensures clean boundaries, scalable design, and solid technical foundations."
        else:
            what = f"A specialized AI agent persona dedicated entirely to {name_clean}. It runs with dedicated tool permissions and focused directives."
            when = f"When you want your AI assistant to focus exclusively on {name_clean} with zero distractions."
            benefit = "Delivers higher accuracy than generic prompts by narrowing the agent's focus."

    elif item_type == 'llm_app':
        what = f"A complete, ready-to-run reference application. It contains real production-tested code, requirements, and prompts demonstrating {name_clean}."
        when = f"When you want to build a {category.lower()} app without having to start from scratch."
        benefit = "Skip days of boilerplate setup and copy working, verified architecture directly into your project."

    else:
        what = f"A core harness rule and operational guideline that enforces engineering quality standards across your AI coding tools."
        when = "During project setup to align all developers and AI agents on common rules and constraints."
        benefit = "Maintains consistent code quality, formatting, and security policies automatically."

    return {
        "what": what,
        "when": when,
        "benefit": benefit
    }

def generate_harness_guides(item_type, name, category, run_cmd=""):
    clean_name = name.lower().replace(' ', '-')

    # 1. Google Antigravity Guide
    if item_type == 'skill':
        ag_prompt = f"@skill:{clean_name} Please guide and apply this skill to our current task."
        ag_loc = f"C:\\Users\\Chirag\\.gemini\\config\\skills\\{clean_name}\\SKILL.md (or .agents/skills/{clean_name}/)"
        ag_rule = f"# AGENTS.md rule\nWhenever handling {category.lower()} tasks, automatically invoke `@skill:{clean_name}` and verify all acceptance criteria."
    elif item_type == 'agent':
        ag_prompt = f"Adopt the {clean_name} agent persona. Strictly follow the prompt defense baseline and focus on {category}."
        ag_loc = f"C:\\Users\\Chirag\\.gemini\\config\\agents\\{clean_name}.md (or define as subagent)"
        ag_rule = f"# AGENTS.md rule\nDelegate all {category.lower()} reviews to the {clean_name} subagent before completing tasks."
    elif item_type == 'llm_app':
        ag_prompt = f"Inspect the awesome-llm-apps/{clean_name} directory in our scratch folder and implement its architecture in our current app."
        ag_loc = f"C:\\Users\\Chirag\\.gemini\\antigravity-ide\\scratch\\awesome-llm-apps\\"
        ag_rule = f"# AGENTS.md rule\nReference the {clean_name} template pattern for building {category.lower()} components."
    else:
        ag_prompt = f"Review and strictly adhere to the {clean_name} rule standards in AGENTS.md."
        ag_loc = f"AGENTS.md or .agents/rules/{clean_name}.md"
        ag_rule = f"# AGENTS.md rule\nAll code generated must pass the {clean_name} quality baseline."

    antigravity_guide = {
        "prompt": ag_prompt,
        "location": ag_loc,
        "rule_snippet": ag_rule,
        "steps": [
            f"1. Open chat in Google Antigravity.",
            f"2. Type '{ag_prompt}'.",
            f"3. Antigravity reads the skill/agent file from your local config and executes the task with step-by-step verification."
        ]
    }

    # 2. OpenCode Guide
    if item_type == 'skill':
        oc_entry = f'"instructions": [\n  "skills/{clean_name}/SKILL.md"\n]'
        oc_cli = f'opencode run "/skill {clean_name}"'
        oc_desc = f'Add to instructions in .opencode/opencode.json or call via slash command.'
    elif item_type == 'agent':
        oc_entry = f'"agents": {{\n  "{clean_name}": {{\n    "model": "claude-3-7-sonnet",\n    "instruction": "agents/{clean_name}.md"\n  }}\n}}'
        oc_cli = f'opencode --agent {clean_name}'
        oc_desc = f'Configure in .opencode/opencode.json under agents or pass via --agent flag.'
    elif item_type == 'llm_app':
        oc_entry = f'// Run starter template\ncd awesome-llm-apps && python app.py'
        oc_cli = f'opencode run "inspect and run {clean_name} app"'
        oc_desc = f'Clone from awesome-llm-apps and run directly in OpenCode workspace.'
    else:
        oc_entry = f'"instructions": [\n  "rules/{clean_name}.md"\n]'
        oc_cli = f'opencode run "verify {clean_name} constraints"'
        oc_desc = f'Add as a global instruction file in opencode.json.'

    opencode_guide = {
        "json_config": oc_entry,
        "cli_command": oc_cli,
        "description": oc_desc,
        "steps": [
            f"1. Open your project root in OpenCode.",
            f"2. In your `.opencode/opencode.json` file, add:\n{oc_entry}",
            f"3. In OpenCode terminal or chat, execute:\n`{oc_cli}`"
        ]
    }

    return antigravity_guide, opencode_guide

def run():
    catalog = {
        "stats": {},
        "skills": [],
        "agents": [],
        "rules": [],
        "commands": [],
        "awesome_apps": []
    }

    # 1. Parse ECC Skills
    skills_dir = os.path.join(ECC_DIR, 'skills')
    if os.path.exists(skills_dir):
        for s in sorted(os.listdir(skills_dir)):
            sp = os.path.join(skills_dir, s, 'SKILL.md')
            if os.path.exists(sp):
                with open(sp, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                meta, body = parse_frontmatter(content)
                name = meta.get('name', s)
                desc = meta.get('description', '')
                if not desc:
                    desc = clean_markdown_summary(body)
                category = categorize_skill(name, desc)
                simple_eng = generate_simple_english('skill', name, desc, category)
                ag_guide, oc_guide = generate_harness_guides('skill', name, category)

                catalog["skills"].append({
                    "id": f"ecc-skill-{s}",
                    "name": name,
                    "type": "skill",
                    "source": "affaan-m/ECC",
                    "repo_url": f"https://github.com/affaan-m/ECC/tree/main/skills/{s}",
                    "category": category,
                    "description": desc,
                    "summary": clean_markdown_summary(body),
                    "simple_english": simple_eng,
                    "antigravity": ag_guide,
                    "opencode": oc_guide,
                    "tags": [category.lower(), "ecc", "skill", s.replace('-', ' ')],
                    "install_cmd": f"/skill add {name}",
                    "full_content": body[:1400]
                })

    # 2. Parse ECC Agents
    agents_dir = os.path.join(ECC_DIR, 'agents')
    if os.path.exists(agents_dir):
        for a in sorted(os.listdir(agents_dir)):
            if not a.endswith('.md'):
                continue
            ap = os.path.join(agents_dir, a)
            with open(ap, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            meta, body = parse_frontmatter(content)
            raw_name = a.replace('.md', '')
            name = meta.get('name', raw_name)
            desc = meta.get('description', '')
            if not desc:
                desc = clean_markdown_summary(body)
            tools = meta.get('tools', 'Read, Grep, Glob')
            model = meta.get('model', 'claude-3-7-sonnet')
            category = categorize_agent(raw_name, desc)
            simple_eng = generate_simple_english('agent', name, desc, category)
            ag_guide, oc_guide = generate_harness_guides('agent', name, category)

            catalog["agents"].append({
                "id": f"ecc-agent-{raw_name}",
                "name": name,
                "type": "agent",
                "source": "affaan-m/ECC",
                "repo_url": f"https://github.com/affaan-m/ECC/blob/main/agents/{a}",
                "category": category,
                "description": desc,
                "tools": tools,
                "model": model,
                "summary": clean_markdown_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "opencode": oc_guide,
                "tags": [category.lower(), "ecc", "agent", raw_name.replace('-', ' ')],
                "run_cmd": f"/agent run {name}",
                "full_content": body[:1400]
            })

    # 3. Parse ECC Commands
    commands_dir = os.path.join(ECC_DIR, 'commands')
    if os.path.exists(commands_dir):
        for c in sorted(os.listdir(commands_dir)):
            if not c.endswith('.md'):
                continue
            cp = os.path.join(commands_dir, c)
            with open(cp, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            meta, body = parse_frontmatter(content)
            cmd_name = c.replace('.md', '')
            desc = meta.get('description', clean_markdown_summary(body, 160))
            simple_eng = generate_simple_english('command', cmd_name, desc, 'Commands')
            ag_guide, oc_guide = generate_harness_guides('command', cmd_name, 'Commands')

            catalog["commands"].append({
                "id": f"ecc-cmd-{cmd_name}",
                "name": f"/{cmd_name}",
                "type": "command",
                "source": "affaan-m/ECC",
                "repo_url": f"https://github.com/affaan-m/ECC/blob/main/commands/{c}",
                "description": desc,
                "summary": clean_markdown_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "opencode": oc_guide,
                "tags": ["command", "ecc", cmd_name.replace('-', ' ')],
                "command": f"/{cmd_name}"
            })

    # 4. Parse ECC Rules & Harnesses
    rules_dir = os.path.join(ECC_DIR, 'rules')
    if os.path.exists(rules_dir):
        for r in sorted(os.listdir(rules_dir)):
            if not r.endswith('.md'):
                continue
            rp = os.path.join(rules_dir, r)
            with open(rp, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            meta, body = parse_frontmatter(content)
            rule_name = r.replace('.md', '')
            desc = meta.get('description', clean_markdown_summary(body, 160))
            simple_eng = generate_simple_english('rule', rule_name, desc, 'Rules')
            ag_guide, oc_guide = generate_harness_guides('rule', rule_name, 'Rules')

            catalog["rules"].append({
                "id": f"ecc-rule-{rule_name}",
                "name": rule_name,
                "type": "rule",
                "source": "affaan-m/ECC",
                "repo_url": f"https://github.com/affaan-m/ECC/blob/main/rules/{r}",
                "description": desc,
                "summary": clean_markdown_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "opencode": oc_guide,
                "tags": ["rule", "harness", "ecc", rule_name.replace('-', ' ')],
                "full_content": body[:1400]
            })

    # AGENTS.md, SOUL.md, CLAUDE.md
    for root_doc in ['AGENTS.md', 'SOUL.md', 'CLAUDE.md', 'the-security-guide.md', 'the-shortform-guide.md']:
        rd_path = os.path.join(ECC_DIR, root_doc)
        if os.path.exists(rd_path):
            with open(rd_path, 'r', encoding='utf-8', errors='ignore') as f:
                body = f.read()
            doc_id = root_doc.lower().replace('.', '-')
            simple_eng = generate_simple_english('harness', root_doc, f"Core ECC standard {root_doc}", 'Harness Standards')
            ag_guide, oc_guide = generate_harness_guides('harness', root_doc, 'Harness Standards')

            catalog["rules"].append({
                "id": f"ecc-doc-{doc_id}",
                "name": root_doc,
                "type": "harness_standard",
                "source": "affaan-m/ECC",
                "repo_url": f"https://github.com/affaan-m/ECC/blob/main/{root_doc}",
                "description": f"Core ECC Harness standard and guidelines: {root_doc}",
                "summary": clean_markdown_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "opencode": oc_guide,
                "tags": ["harness", "standard", "ecc", root_doc.lower()],
                "full_content": body[:1400]
            })

    # 5. Parse Awesome LLM Apps
    app_cat_meta = {
        "advanced_ai_agents": ("Advanced Multi-Agent & Autonomous", "High-complexity autonomous workflows, multi-agent teams, game bots and planner systems."),
        "starter_ai_agents": ("Starter AI Agents", "Clean, self-contained single-agent starters for data analysis, podcasts, audio, research, and blogging."),
        "rag_tutorials": ("RAG & Vector Search", "Production RAG architectures: Graph RAG, Hybrid Search, Multimodal, Agentic RAG, and Vector databases."),
        "mcp_ai_agents": ("MCP AI Agents", "Model Context Protocol enabled agents connecting LLMs directly to tools, databases, APIs, and systems."),
        "generative_ui_agents": ("Generative UI & Copilots", "Realtime interactive UI generation, dynamic widgets, and embedded agent components."),
        "voice_ai_agents": ("Voice & Multimodal AI", "Realtime bidirectional voice conversations, audio pipelines, ElevenLabs and Whisper integrations."),
        "agent_skills": ("Agent Skills & Function Calling", "Self-contained tool-use skills, custom functions, and modular agent execution units."),
        "always_on_agents": ("Always-On Background Agents", "Autonomous loop monitors, scheduled workers, and continuous system watchers."),
        "advanced_llm_apps": ("Advanced LLM Production Apps", "End-to-end fullstack production applications powered by state-of-the-art models."),
        "ai_agent_framework_crash_course": ("Framework Crash Courses", "Crash courses and reference implementations for AutoGen, CrewAI, LangGraph, and Swarm.")
    }

    if os.path.exists(APPS_DIR):
        for cat_folder in sorted(os.listdir(APPS_DIR)):
            cat_path = os.path.join(APPS_DIR, cat_folder)
            if not os.path.isdir(cat_path) or cat_folder.startswith('.') or cat_folder in ['docs', 'assets']:
                continue
            cat_display, cat_desc = app_cat_meta.get(cat_folder, (cat_folder.replace('_', ' ').title(), 'Curated app collection'))

            for item in sorted(os.listdir(cat_path)):
                item_path = os.path.join(cat_path, item)
                if not os.path.isdir(item_path):
                    continue

                sub_items = [d for d in os.listdir(item_path) if os.path.isdir(os.path.join(item_path, d))]
                has_direct_code = any(f.endswith('.py') or f.endswith('.ipynb') or f.lower() == 'readme.md' for f in os.listdir(item_path))

                if not has_direct_code and len(sub_items) > 0:
                    for sub in sub_items:
                        sub_path = os.path.join(item_path, sub)
                        if not os.path.isdir(sub_path):
                            continue
                        readme_path = os.path.join(sub_path, 'README.md')
                        readme_text = ""
                        if os.path.exists(readme_path):
                            with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                                readme_text = f.read()

                        tech_stack = []
                        files = os.listdir(sub_path)
                        for f in files:
                            fl = f.lower()
                            if fl.endswith('.py'): tech_stack.append('Python')
                            if 'crew' in fl or 'crew' in readme_text.lower(): tech_stack.append('CrewAI')
                            if 'langgraph' in fl or 'langgraph' in readme_text.lower(): tech_stack.append('LangGraph')
                            if 'autogen' in fl or 'autogen' in readme_text.lower(): tech_stack.append('AutoGen')
                            if 'streamlit' in fl or 'streamlit' in readme_text.lower(): tech_stack.append('Streamlit')
                            if 'gemini' in fl or 'gemini' in readme_text.lower(): tech_stack.append('Gemini')
                            if 'openai' in fl or 'openai' in readme_text.lower(): tech_stack.append('OpenAI')
                            if 'rag' in fl or 'rag' in readme_text.lower(): tech_stack.append('RAG')
                        tech_stack = sorted(list(set(tech_stack)))

                        display_name = sub.replace('_', ' ').replace('-', ' ').title()
                        desc = clean_markdown_summary(readme_text, 180) if readme_text else f"{display_name} - {cat_display}"
                        simple_eng = generate_simple_english('llm_app', display_name, desc, cat_display)
                        ag_guide, oc_guide = generate_harness_guides('llm_app', display_name, cat_display)

                        catalog["awesome_apps"].append({
                            "id": f"llm-app-{cat_folder}-{sub}",
                            "name": display_name,
                            "type": "llm_app",
                            "source": "Shubhamsaboo/awesome-llm-apps",
                            "category": cat_display,
                            "folder": f"{cat_folder}/{item}/{sub}",
                            "repo_url": f"https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/{cat_folder}/{item}/{sub}",
                            "description": desc,
                            "tech_stack": tech_stack if tech_stack else ["Python", "LLM"],
                            "simple_english": simple_eng,
                            "antigravity": ag_guide,
                            "opencode": oc_guide,
                            "tags": [cat_display.lower(), "llm-app", sub.replace('_', ' ')] + [t.lower() for t in tech_stack],
                            "clone_cmd": f"git clone https://github.com/Shubhamsaboo/awesome-llm-apps.git && cd awesome-llm-apps/{cat_folder}/{item}/{sub}",
                            "full_content": readme_text[:1400]
                        })
                else:
                    readme_path = os.path.join(item_path, 'README.md')
                    readme_text = ""
                    if os.path.exists(readme_path):
                        with open(readme_path, 'r', encoding='utf-8', errors='ignore') as f:
                            readme_text = f.read()

                    tech_stack = []
                    files = os.listdir(item_path)
                    for f in files:
                        fl = f.lower()
                        if fl.endswith('.py'): tech_stack.append('Python')
                        if 'crew' in fl or 'crew' in readme_text.lower(): tech_stack.append('CrewAI')
                        if 'langgraph' in fl or 'langgraph' in readme_text.lower(): tech_stack.append('LangGraph')
                        if 'autogen' in fl or 'autogen' in readme_text.lower(): tech_stack.append('AutoGen')
                        if 'streamlit' in fl or 'streamlit' in readme_text.lower(): tech_stack.append('Streamlit')
                        if 'gemini' in fl or 'gemini' in readme_text.lower(): tech_stack.append('Gemini')
                        if 'openai' in fl or 'openai' in readme_text.lower(): tech_stack.append('OpenAI')
                        if 'rag' in fl or 'rag' in readme_text.lower(): tech_stack.append('RAG')
                        if 'mcp' in fl or 'mcp' in readme_text.lower(): tech_stack.append('MCP')
                        if 'voice' in fl or 'audio' in readme_text.lower(): tech_stack.append('Voice/Audio')
                    tech_stack = sorted(list(set(tech_stack)))

                    display_name = item.replace('_', ' ').replace('-', ' ').title()
                    desc = clean_markdown_summary(readme_text, 180) if readme_text else f"{display_name} - {cat_display}"
                    simple_eng = generate_simple_english('llm_app', display_name, desc, cat_display)
                    ag_guide, oc_guide = generate_harness_guides('llm_app', display_name, cat_display)

                    catalog["awesome_apps"].append({
                        "id": f"llm-app-{cat_folder}-{item}",
                        "name": display_name,
                        "type": "llm_app",
                        "source": "Shubhamsaboo/awesome-llm-apps",
                        "category": cat_display,
                        "folder": f"{cat_folder}/{item}",
                        "repo_url": f"https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/{cat_folder}/{item}",
                        "description": desc,
                        "tech_stack": tech_stack if tech_stack else ["Python", "LLM"],
                        "simple_english": simple_eng,
                        "antigravity": ag_guide,
                        "opencode": oc_guide,
                        "tags": [cat_display.lower(), "llm-app", item.replace('_', ' ')] + [t.lower() for t in tech_stack],
                        "clone_cmd": f"git clone https://github.com/Shubhamsaboo/awesome-llm-apps.git && cd awesome-llm-apps/{cat_folder}/{item}",
                        "full_content": readme_text[:1400]
                    })

    catalog["stats"] = {
        "total_skills": len(catalog["skills"]),
        "total_agents": len(catalog["agents"]),
        "total_rules": len(catalog["rules"]),
        "total_commands": len(catalog["commands"]),
        "total_awesome_apps": len(catalog["awesome_apps"]),
        "total_catalog_items": len(catalog["skills"]) + len(catalog["agents"]) + len(catalog["rules"]) + len(catalog["commands"]) + len(catalog["awesome_apps"])
    }

    # Output JSON and JS
    json_path = os.path.join(OUTPUT_DIR, 'catalog_data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    js_path = os.path.join(OUTPUT_DIR, 'catalog_data.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("window.CATALOG_DATA = " + json.dumps(catalog, indent=2, ensure_ascii=False) + ";\n")

    print("Rebuilt catalog with Simple English and Antigravity & OpenCode guides successfully!")
    print(f"Stats: {catalog['stats']}")

if __name__ == '__main__':
    run()
