# Beings — Claude Code Project Instructions

This file is read at the start of every session. Follow all instructions here before writing any code.

---

## Project

**Beings** is a daily reflection app. One question per day. Honest answers. Gentle responses. The design philosophy is: calm, spacious, grounded. The tone is always human and warm — never clinical, never gamified.

Primary working directory: `~/chat-app/public/`
Stack: Vanilla HTML/CSS/JS, Python utilities, Firebase (backend).

---

## Installed Tools — Use These Every Session

Five tools are installed in `~/.claude/`. Each has a specific role. Use them in the order they are listed below.

---

### 1. Superpowers — Plan before coding
**Path:** `~/.claude/superpowers/`

Before writing any non-trivial code, use Superpowers skills to plan. Do not skip this for anything larger than a single-line fix.

- Skills live in `~/.claude/superpowers/skills/`
- Use the `/plan` skill before implementing features
- Use the `/code-review` skill before finalising changes
- Superpowers is zero-dependency and general-purpose — these skills apply to all work on this project
- Do not open PRs against the Superpowers repo without reading its CLAUDE.md first

---

### 2. everything-claude-code — Performance and quality patterns
**Path:** `~/.claude/everything-claude-code/`

Reference this for battle-tested coding patterns, hooks, rules, and agent configurations.

- Rules live in `~/.claude/everything-claude-code/rules/` — consult these for coding standards
- Agents live in `~/.claude/everything-claude-code/agents/` — delegate sub-tasks using these when appropriate
- Key commands: `/tdd`, `/e2e`, `/build-fix`, `/learn`
- When writing new features, check `rules/` for applicable security, style, and testing requirements
- When refactoring, use `/code-review` to validate before committing

---

### 3. ui-ux-pro-max — Design quality
**Path:** `~/.claude/ui-ux-pro-max/`

Use this whenever making UI decisions — colors, typography, layout, component patterns.

Search the database before making design choices:
```bash
python3 ~/.claude/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```

Relevant domains for Beings:
- `style` — for UI style decisions (minimal, calm aesthetic)
- `typography` — for font pairings (Cormorant Garamond + Inter is established)
- `color` — for palette validation (dark bg, sage green, lavender, cream)
- `landing` — for landing page structure and CTA patterns
- `ux` — for best practices and anti-patterns to avoid

Beings design constants:
- Background: `#0e1a1a` / `#111510`
- Sage: `#7a9e7e` | Lavender: `#b9a9cc` | Cream: `#e8e0d0`
- Type: Cormorant Garamond (headings) + Inter 300 (body)
- Feeling: peaceful, grounded, minimal, spacious — never busy or urgent

---

### 4. claude-mem — Memory persistence
**Path:** `~/.claude/claude-mem/`

claude-mem provides persistent memory across sessions via 5 lifecycle hooks and a SQLite database at `~/.claude-mem/claude-mem.db`.

- At session start, search memory for prior context relevant to the current task
- Use the `mem-search` skill to recall past decisions, patterns, and user preferences
- Wrap sensitive content in `<private>...</private>` tags to prevent storage
- The worker API runs on port 37777 — check `http://localhost:37777` for the viewer UI if needed
- Memory search skill: `~/.claude/claude-mem/plugin/skills/mem-search/SKILL.md`
- Planning skill (phased plans with subagents): `~/.claude/claude-mem/plugin/skills/make-plan/SKILL.md`

---

### 5. n8n-mcp — Automation
**Path:** `~/.claude/n8n-mcp/`

Use n8n-mcp when building or modifying automation workflows — notifications, scheduled tasks, data pipelines, integrations with external services (email, social, analytics).

- This is an MCP server bridging n8n's workflow platform to Claude
- Node documentation and schemas are stored in a local SQLite database
- Use it to validate n8n workflow configs before deploying
- Relevant for: email signup processing, daily question delivery, social posting automation
- Check `~/.claude/n8n-mcp/docs/` for integration patterns

---

## Session Checklist

At the start of every session on this project:

1. **Check memory** — search claude-mem for relevant prior context
2. **Plan first** — use Superpowers `/plan` skill before any non-trivial implementation
3. **Check design** — query ui-ux-pro-max before making UI decisions
4. **Apply rules** — consult everything-claude-code `rules/` for coding standards
5. **Consider automation** — use n8n-mcp if the task involves workflows or integrations

---

## General Principles for Beings

- **Never add complexity that wasn't asked for.** The app should stay lean.
- **Design serves the feeling.** Every UI decision should make the experience feel quieter and more intentional.
- **One thing at a time.** The app gives one question per day — the codebase should reflect that same restraint.
- **Commit clean.** Use conventional commit messages. Don't commit generated assets without review.
