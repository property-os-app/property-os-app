# CLAUDE.md
- Read docs/BRIEF.md and docs/design-system.md before working.
- Keep explanations short and plain. Explain each file you create or change in one line.
- Inspect first, then explain your plan, then wait for the user's OK before big changes.
- Never run git commands that change anything (commit, push, merge, switch, reset, stash). Read-only status, diff and log are allowed.
- Never write secrets to any file. Only .env.example with empty placeholders. Never touch .env.local.
- Build UI only from the design system in src/components. Do not install shadcn or another UI library. Change a design system component only when needed, and say why.
- Use the real API. Never invent endpoints or fields. If something is missing, stop and write a "BACKEND REQUEST" for the user.
- Money from the API is a string: format with lib/format.ts, never float math. Dates are "YYYY-MM-DD": never new Date("YYYY-MM-DD").
- Every list handles loading, empty and error states. Every form shows backend errors (message can be a string or an array).
- After each step: run npm run build and npm run lint, fix errors, list changed files, give a short browser test checklist, then stop.
- Commands for the user: Windows PowerShell, shortest form, one short line under each command saying what it does.
- At the end of each step, suggest one commit message like: feat(area): short summary. Never commit.
- Real API response samples live in docs/api-samples/. Read them before writing types in src/types. If one is missing, ask for it. Never guess a response shape.
- docs/reference/ holds example pages from the design system. Never edit or import them. They wrap themselves in WorkspaceShell; our pages never do (the layout route renders the shell once).
- Every change to src/components, src/styles, src/tokens or src/lib/format.ts gets one line in src/components/README.md (file, what changed, why). Do not use docs/design-system-changes.md. If a prompt mentions docs/design-system-changes.md, use src/components/README.md instead.

## Documentation pattern
- Every folder WE write under src/ (src/app, src/lib, src/types, src/features/<area> and their subfolders) has a README.md explaining:
  1. What the folder is responsible for.
  2. A short section per file: what it does, and a one-line explanation of each exported function, hook or component.
- Keep it short and readable, not verbose. Create or update it automatically whenever you add or change a file in that folder.
- The design system folders (src/components and its subfolders, src/styles, src/tokens) do NOT get a README per folder. Instead, src/components/README.md is the design system catalog: read it before building any page, and keep it up to date.
- When a folder gets its README.md, delete its .gitkeep.
