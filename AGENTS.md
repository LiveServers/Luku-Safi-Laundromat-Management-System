## Engineering standards

- Design for reuse across the frontend and backend. Compose focused UI components and hooks on the frontend and focused modules and services on the backend. Reuse existing code when its contract fits, and extract shared logic when multiple callers need the same behavior.
- Organize files by responsibility and domain. Put schemas in a dedicated `schemas/` directory or with their existing contract, and group backend services by domain under `server/services/`, such as `services/users/` and `services/telegram/`. Keep routes, scripts, and database helpers in their respective directories.
- Use the latest stable package release when adding or upgrading dependencies. Verify the published version, check compatibility with the project and runtime, and update the lockfile. Flag compatibility blockers before choosing an older stable version.
- Follow test-driven development with Vitest for frontend and backend behavior changes. Write a test that fails for the expected reason, implement the smallest change that passes it, then refactor and rerun the relevant suite.
- Use Zod for schema validation. Validate untrusted data at the boundary, including frontend form submissions and backend requests. Enforce validation on the server even when the client also validates, and reuse schemas where the input contract matches.
- Use the current OWASP Top 10 to review frontend and backend changes. Check authorization, input handling, secrets, and configuration where relevant. Check dependency changes and affected existing packages for known CVEs using the package manager's audit and upstream advisories. Apply compatible fixes within scope and flag unresolved findings.

## Git workflow

- Start each issue on a fresh branch from the latest default branch. Name it `<type>/<issue-number>-<short-slug>` and use that branch for follow-up work on the same issue.
- Present changes for review and wait for the user's approval before committing. Present any subsequent edits for review before committing them.
- Use Conventional Commits for each authored commit, for example `docs: document the Git workflow`.
- Include a `Summary` section in every commit body. Leave a blank line after the subject and use short Markdown bullets to describe what changed and why. Add a `Verification` section when checks were run or limitations affect the change.
- Record durable instructions in the relevant repository documentation, such as `AGENTS.md` for agent guidance. Skip GitHub issues and standalone Markdown files for discussion records.

## Agent skills

### Issue tracker

Use GitHub Issues for specs and tickets. Read `docs/agents/issue-tracker.md` before working with issues.

### Triage labels

Read `docs/agents/triage-labels.md` before triaging issues or applying triage labels.

### Domain docs

This repository uses a single-context layout. Read `docs/agents/domain.md` before exploring the codebase.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
