import os
import json
import re

SCRATCH_DIR = r"C:\Users\Chirag\.gemini\antigravity-ide\scratch"
ECC_DIR = r"C:\Users\Chirag\.gemini\antigravity-ide\scratch\ECC"
if not os.path.exists(ECC_DIR):
    ECC_DIR = r"C:\Users\Chirag\ECC"

CONFIG_DIR = r"C:\Users\Chirag\.gemini\config"
OUTPUT_DIR = os.path.join(SCRATCH_DIR, "ecc-llm-navigator")

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

def clean_summary(text, max_len=220):
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('![') or line.startswith('[!') or line.startswith('---') or line.startswith('>'):
            continue
        lines.append(line)
        if sum(len(l) for l in lines) > max_len:
            break
    summary = " ".join(lines)
    summary = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', summary)
    summary = re.sub(r'[*_`#]', '', summary)
    summary = re.sub(r'\s+', ' ', summary).strip()
    if len(summary) > max_len:
        summary = summary[:max_len].rsplit(' ', 1)[0] + '...'
    return summary

def categorize_item(item_type, name, desc):
    combined = (name + " " + desc).lower()
    if item_type == 'rule':
        if any(k in combined for k in ['test', 'tdd', 'coverage', 'mock']): return 'Testing & Quality Rules'
        if any(k in combined for k in ['security', 'auth', 'hipaa', 'secret', 'vulnerability']): return 'Security & Safety Rules'
        if any(k in combined for k in ['react', 'vue', 'angular', 'nuxt', 'web', 'ui', 'css', 'style']): return 'Frontend & Web Rules'
        if any(k in combined for k in ['python', 'rust', 'golang', 'typescript', 'swift', 'java', 'kotlin', 'csharp', 'cpp']): return 'Language Standards'
        if any(k in combined for k in ['pattern', 'architecture', 'git', 'hook', 'common']): return 'Core Architecture Rules'
        return 'Engineering Standards'
    elif item_type == 'agent':
        if 'reviewer' in combined or 'audit' in combined: return 'Reviewers & Auditors'
        if 'resolver' in combined or 'fix' in combined or 'cleaner' in combined: return 'Error Resolvers & Fixers'
        if 'architect' in combined or 'planner' in combined or 'spec' in combined: return 'Architects & Planners'
        if 'evaluator' in combined or 'loop' in combined or 'gan' in combined: return 'Autonomous & Evaluation Agents'
        return 'Specialized Task Agents'
    elif item_type == 'workflow':
        if any(k in combined for k in ['plan', 'prd', 'decompose']): return 'Planning & Scoping Workflows'
        if any(k in combined for k in ['feature', 'orch-add', 'build', 'implement']): return 'Feature Implementation'
        if any(k in combined for k in ['review', 'quality', 'gate', 'test']): return 'Verification & Quality Gates'
        if any(k in combined for k in ['fix', 'defect', 'repair', 'clean']): return 'Debugging & Refactoring'
        if any(k in combined for k in ['security', 'scan', 'audit']): return 'Security & Compliance'
        return 'Execution Workflows'
    else: # skill
        if any(k in combined for k in ['test', 'tdd', 'coverage', 'mock', 'e2e', 'playwright', 'pytest', 'junit']): return 'Testing & Quality'
        if any(k in combined for k in ['security', 'hardening', 'vulnerability', 'auth', 'audit', 'hipaa', 'compliance']): return 'Security & Compliance'
        if any(k in combined for k in ['architect', 'design', 'adr', 'system', 'patterns', 'hexagonal', 'api-design', 'interface']): return 'Architecture & API Design'
        if any(k in combined for k in ['frontend', 'ui', 'react', 'vue', 'angular', 'flutter', 'tailwind', 'css', 'a11y', 'motion', 'glass']): return 'Frontend & UI Engineering'
        if any(k in combined for k in ['database', 'postgres', 'mysql', 'sql', 'redis', 'prisma', 'migration', 'clickhouse', 'bigquery']): return 'Databases & Cloud Data'
        if any(k in combined for k in ['docker', 'kubernetes', 'ci-cd', 'pipeline', 'deployment', 'uncloud', 'terminal', 'devops']): return 'DevOps & CI/CD'
        if any(k in combined for k in ['science', 'bio', 'genomic', 'protein', 'chem', 'pdb', 'pubmed', 'alphafold', 'clinvar', 'molecular']): return 'Scientific & Life Sciences'
        if any(k in combined for k in ['python', 'rust', 'golang', 'typescript', 'dart', 'csharp', 'cpp', 'java', 'kotlin', 'perl', 'php']): return 'Language Specialists'
        if any(k in combined for k in ['agent', 'harness', 'eval', 'council', 'autonomous', 'loop', 'memory', 'context', 'interview']): return 'Agentic Engineering & Prompts'
        return 'Domain & Utility Skills'

def build_simple_english(item_type, name, desc, category):
    n_clean = name.replace('-', ' ').title()
    desc_clean = (desc or "").strip()
    
    if item_type == 'rule':
        what = f"Enforces strict coding standards and guidelines for {n_clean} across your codebase."
        when = f"Applied continuously during code authoring and reviewed before merging PRs."
        benefit = f"Eliminates bad practices, guarantees consistent code style, and prevents technical debt."
    elif item_type == 'agent':
        what = f"An autonomous specialist agent configured with dedicated instructions to handle {n_clean}."
        when = f"Invoked when delegating complex or focused {category.lower()} tasks."
        benefit = f"Provides expert, focused execution with rigorous criteria and zero distraction."
    elif item_type == 'workflow':
        what = f"A structured multi-step execution pipeline for {n_clean}."
        when = f"Triggered when starting, planning, implementing, or auditing a task."
        benefit = f"Keeps agent execution organized in predictable, safe, verifiable phases."
    else: # skill
        what = f"A modular agent skill providing specialized instructions, playbooks, and tools for {n_clean}."
        when = f"Activated automatically or via @skill:{name} when handling {category.lower()}."
        benefit = f"Gives the AI agent senior-level domain expertise without trial-and-error."

    return {
        "what": what,
        "when": when,
        "benefit": benefit
    }

def build_antigravity_guide(item_type, name, category):
    clean_id = name.lower().replace(' ', '-')
    if item_type == 'skill':
        return {
            "syntax": f"@skill:{clean_id}",
            "prompt": f"@skill:{clean_id} Please apply this skill to guide our current task.",
            "rule": f"# AGENTS.md rule\nWhenever handling {category.lower()}, invoke `@skill:{clean_id}`."
        }
    elif item_type == 'agent':
        return {
            "syntax": f"Delegate to {clean_id}",
            "prompt": f"Adopt the {clean_id} persona to review and verify our changes against all {category.lower()} criteria.",
            "rule": f"# AGENTS.md rule\nDelegate all {category.lower()} verification to `{clean_id}` subagent."
        }
    elif item_type == 'workflow':
        clean_wf = clean_id.lstrip('/')
        return {
            "syntax": f"/{clean_wf}",
            "prompt": f"Execute the /{clean_wf} workflow step-by-step for our current task.",
            "rule": f"# AGENTS.md rule\nFollow the phase gates defined in workflows/{clean_wf}.md."
        }
    else: # rule
        return {
            "syntax": f"Rule: {clean_id}",
            "prompt": f"Verify our code and design strictly adheres to the {clean_id} guidelines.",
            "rule": f"# AGENTS.md rule\nStrictly comply with .agents/rules/{clean_id}.md before completion."
        }

def collect_all():
    items = []
    seen_ids = set()

    # 1. ECC & Common Rules
    rules_sources = [
        (os.path.join(CONFIG_DIR, 'rules', 'ecc'), 'ECC Rules'),
        (os.path.join(ECC_DIR, 'rules'), 'ECC Rules')
    ]
    for r_dir, src_label in rules_sources:
        if not os.path.exists(r_dir): continue
        for root, _, files in os.walk(r_dir):
            for f in files:
                if not f.endswith('.md') or f.lower() == 'readme.md': continue
                rel_path = os.path.relpath(os.path.join(root, f), r_dir)
                r_id = 'rule-' + rel_path.replace('\\', '-').replace('/', '-').replace('.md', '')
                if r_id in seen_ids: continue
                seen_ids.add(r_id)

                with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                meta, body = parse_frontmatter(content)
                name = meta.get('name', f.replace('.md', ''))
                desc = meta.get('description', '') or clean_summary(body)
                category = categorize_item('rule', name, desc)
                simple_eng = build_simple_english('rule', name, desc, category)
                ag_guide = build_antigravity_guide('rule', name, category)

                tags = list(set([t for t in re.split(r'[-_\s]+', name.lower()) if len(t) > 2] + [category.lower(), 'rule', 'ecc']))

                items.append({
                    "id": r_id,
                    "name": name,
                    "type": "rule",
                    "source": src_label,
                    "category": category,
                    "description": desc,
                    "summary": clean_summary(body),
                    "simple_english": simple_eng,
                    "antigravity": ag_guide,
                    "tags": tags,
                    "search_text": f"{name} rule standard {category}: {desc}. Tags: {' '.join(tags)}"
                })

    # 2. Agents (ECC + global)
    agent_sources = [
        (os.path.join(CONFIG_DIR, 'agents'), 'ECC & Custom Agents'),
        (os.path.join(ECC_DIR, 'agents'), 'ECC Agents')
    ]
    for a_dir, src_label in agent_sources:
        if not os.path.exists(a_dir): continue
        for f in os.listdir(a_dir):
            if not f.endswith('.md'): continue
            raw_name = f.replace('.md', '')
            a_id = f"agent-{raw_name}"
            if a_id in seen_ids: continue
            seen_ids.add(a_id)

            with open(os.path.join(a_dir, f), 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            meta, body = parse_frontmatter(content)
            name = meta.get('name', raw_name)
            desc = meta.get('description', '') or clean_summary(body)
            category = categorize_item('agent', name, desc)
            simple_eng = build_simple_english('agent', name, desc, category)
            ag_guide = build_antigravity_guide('agent', name, category)

            tags = list(set([t for t in re.split(r'[-_\s]+', name.lower()) if len(t) > 2] + [category.lower(), 'agent', 'ecc']))

            items.append({
                "id": a_id,
                "name": name,
                "type": "agent",
                "source": src_label,
                "category": category,
                "description": desc,
                "summary": clean_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "tags": tags,
                "search_text": f"{name} agent persona {category}: {desc}. Tags: {' '.join(tags)}"
            })

    # 3. Workflows (ECC + global)
    wf_sources = [
        (os.path.join(CONFIG_DIR, 'workflows'), 'ECC Workflows'),
        (os.path.join(ECC_DIR, 'workflows'), 'ECC Workflows')
    ]
    for w_dir, src_label in wf_sources:
        if not os.path.exists(w_dir): continue
        for f in os.listdir(w_dir):
            if not f.endswith('.md'): continue
            raw_name = f.replace('.md', '')
            w_id = f"workflow-{raw_name}"
            if w_id in seen_ids: continue
            seen_ids.add(w_id)

            with open(os.path.join(w_dir, f), 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            meta, body = parse_frontmatter(content)
            name = meta.get('name', f"/{raw_name}")
            if not name.startswith('/'): name = f"/{name}"
            desc = meta.get('description', '') or clean_summary(body)
            category = categorize_item('workflow', name, desc)
            simple_eng = build_simple_english('workflow', name, desc, category)
            ag_guide = build_antigravity_guide('workflow', name, category)

            tags = list(set([t for t in re.split(r'[-_\s/]+', name.lower()) if len(t) > 2] + [category.lower(), 'workflow', 'ecc']))

            items.append({
                "id": w_id,
                "name": name,
                "type": "workflow",
                "source": src_label,
                "category": category,
                "description": desc,
                "summary": clean_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "tags": tags,
                "search_text": f"{name} workflow pipeline {category}: {desc}. Tags: {' '.join(tags)}"
            })

    # 4. Skills (ECC + Addy's Agent-Skills + Science + Firebase + Flutter + Gemini API)
    skill_sources = [
        (os.path.join(ECC_DIR, 'skills'), 'ECC Skills'),
        (os.path.join(CONFIG_DIR, 'plugins', 'agent-skills', 'skills'), 'Agent Skills (Addy Osmani)'),
        (os.path.join(CONFIG_DIR, 'plugins', 'science', 'skills'), 'Science Skills (K-Dense)'),
        (os.path.join(CONFIG_DIR, 'plugins', 'firebase', 'skills'), 'Firebase Skills'),
        (os.path.join(CONFIG_DIR, 'plugins', 'flutter', 'skills'), 'Flutter Skills'),
        (os.path.join(CONFIG_DIR, 'plugins', 'gemini-api', 'skills'), 'Gemini API Skills'),
        (os.path.join(CONFIG_DIR, 'plugins', 'modern-web-guidance-plugin', 'skills'), 'Modern Web Skills'),
        (os.path.join(CONFIG_DIR, 'skills'), 'Global Skills')
    ]

    for s_dir, src_label in skill_sources:
        if not os.path.exists(s_dir): continue
        for item in sorted(os.listdir(s_dir)):
            item_path = os.path.join(s_dir, item)
            skill_md = os.path.join(item_path, 'SKILL.md') if os.path.isdir(item_path) else None
            if not skill_md or not os.path.exists(skill_md):
                # sometimes skill file is directly named SKILL.md or file
                continue
            
            s_id = f"skill-{item.lower()}"
            if s_id in seen_ids: continue
            seen_ids.add(s_id)

            with open(skill_md, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            meta, body = parse_frontmatter(content)
            name = meta.get('name', item)
            desc = meta.get('description', '') or clean_summary(body)
            category = categorize_item('skill', name, desc)
            simple_eng = build_simple_english('skill', name, desc, category)
            ag_guide = build_antigravity_guide('skill', name, category)

            tags = list(set([t for t in re.split(r'[-_\s]+', name.lower()) if len(t) > 2] + [category.lower(), 'skill']))

            items.append({
                "id": s_id,
                "name": name,
                "type": "skill",
                "source": src_label,
                "category": category,
                "description": desc,
                "summary": clean_summary(body),
                "simple_english": simple_eng,
                "antigravity": ag_guide,
                "tags": tags,
                "search_text": f"{name} skill tool {category}: {desc}. Tags: {' '.join(tags)}"
            })

    print(f"Total collected items: {len(items)}")
    counts = {}
    for i in items:
        counts[i['type']] = counts.get(i['type'], 0) + 1
    print(f"Counts by type: {counts}")

    out_file = os.path.join(OUTPUT_DIR, "catalog_items.json")
    with open(out_file, 'w', encoding='utf-8') as fp:
        json.dump(items, fp, indent=2)
    print(f"Saved to {out_file}")

if __name__ == "__main__":
    collect_all()
