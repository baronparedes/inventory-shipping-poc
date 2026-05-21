# Build Prompts Guide

This folder contains 9 phased prompt files for building the **Pharmacy Inventory and Shipping** application from scratch using React + Node.js, built for the cloud.

---

## Phases Overview

| File | Phase | Focus |
|------|-------|-------|
| [phase-01-project-setup-and-architecture.prompt.md](phase-01-project-setup-and-architecture.prompt.md) | 1 | pnpm monorepo, Turborepo, shared types package, tooling (ESLint, Prettier, Husky, Commitlint) |
| [phase-02-backend-foundation.prompt.md](phase-02-backend-foundation.prompt.md) | 2 | Prisma schema + migrations, JWT auth, error handling middleware, health check, env validation |
| [phase-03-backend-business-logic-and-apis.prompt.md](phase-03-backend-business-logic-and-apis.prompt.md) | 3 | All REST API endpoints — products, inventory, orders, reorder requests, shipping with atomic transactions |
| [phase-04-frontend-foundation.prompt.md](phase-04-frontend-foundation.prompt.md) | 4 | Axios API client, Zustand auth store, React Query, role-based routing, login page, app shells |
| [phase-05-store-branch-features.prompt.md](phase-05-store-branch-features.prompt.md) | 5 | Dashboard, inventory + receive shipment, new customer order, order history, reorder request |
| [phase-06-warehouse-distribution-features.prompt.md](phase-06-warehouse-distribution-features.prompt.md) | 6 | Network dashboard, branch monitor, movement ledger, dispatch lifecycle management |
| [phase-07-testing-strategy.prompt.md](phase-07-testing-strategy.prompt.md) | 7 | Vitest unit + integration tests, MSW + React Testing Library components, Playwright e2e flows |
| [phase-08-cloud-infrastructure-and-devops.prompt.md](phase-08-cloud-infrastructure-and-devops.prompt.md) | 8 | Dockerfiles, nginx, docker-compose, GitHub Actions CI/CD, Railway + AWS ECS options |
| [phase-09-observability-and-security.prompt.md](phase-09-observability-and-security.prompt.md) | 9 | Pino structured logging, Sentry, rate limiting, CSP headers, audit log, OWASP Top 10 hardening |

Each phase builds on the previous one. Complete the acceptance criteria of each phase before moving to the next.

---

## How to Use These Prompts

### Option A — GitHub Copilot Agent Mode (Recommended)

Each `.prompt.md` file is a self-contained instruction set for GitHub Copilot's agent mode.

1. Open VS Code with the GitHub Copilot Chat extension installed.
2. Open the Copilot Chat panel (`⌃⌘I` / `Ctrl+Alt+I`).
3. Switch the chat mode to **Agent** (the dropdown next to the input box).
4. Reference the prompt file using the paperclip / attach button, or type:
   ```
   #file:docs/phase-01-project-setup-and-architecture.prompt.md
   ```
5. Send the message. Copilot will read the full prompt and begin implementing.
6. Review the changes, run the acceptance criteria checklist at the bottom of each file, then move to the next phase.

> **Tip**: You can also open a prompt file and use the "Run in Agent Mode" button that appears at the top of `.prompt.md` files in VS Code with Copilot Chat 0.22+.

---

### Option B — VS Code Prompt File (`.prompt.md` native support)

VS Code natively recognises `.prompt.md` files as reusable prompts.

1. Open the Command Palette (`⌘⇧P` / `Ctrl+Shift+P`).
2. Run **"Chat: Run Prompt"**.
3. Select the phase file you want to execute.
4. Copilot will run it in agent mode automatically.

---

### Option C — Paste Manually into Any AI Chat

The prompt files are plain Markdown and work with any LLM (Claude, GPT-4, Gemini, etc.).

1. Open the phase file.
2. Copy the entire contents.
3. Paste into your AI chat interface as the user message.
4. The AI will implement the phase based on the instructions.

---

## Workflow Tips

### Work phase by phase

Do not skip phases. Each phase explicitly assumes the output of the previous one is in place. The dependency chain is:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
                                       ↘ Phase 6
Phase 7 depends on Phases 1–6 being complete
Phase 8 depends on Phases 1–7 being complete
Phase 9 depends on Phase 8 being complete
```

### Use the acceptance criteria as your definition of done

Each prompt file ends with a checklist of acceptance criteria. Treat these as your "done" signal before proceeding to the next phase. You can ask Copilot:

> "Check the acceptance criteria in `#file:docs/phase-02-backend-foundation.prompt.md` and tell me which items are not yet complete."

### Iterate within a phase

If Copilot misses something or makes an error, stay in the same phase and correct it before moving on. You can re-run a phase prompt on top of partial work — the prompts are written to be additive rather than destructive.

### Commit between phases

After completing each phase and verifying the acceptance criteria, commit your work:

```bash
git add .
git commit -m "feat: complete phase <N> - <short description>"
```

This gives you a clean rollback point if a later phase causes regressions.

### Ask Copilot to verify before building

Before running a phase, you can ask Copilot to review the prompt and flag anything unclear:

> "Read `#file:docs/phase-03-backend-business-logic-and-apis.prompt.md` and summarise what you are about to build before you start."

---

## Prerequisites

Before starting Phase 1, ensure you have the following installed locally:

- **Node.js** v22+
- **pnpm** v9+ (`npm install -g pnpm`)
- **Docker** (for local database and docker-compose)
- **Git**
- **VS Code** with the GitHub Copilot Chat extension

For cloud deployment (Phase 8):

- A [Railway](https://railway.app) account **or** an AWS account with appropriate IAM permissions
- A [Sentry](https://sentry.io) account (optional, for Phase 9 error tracking)
