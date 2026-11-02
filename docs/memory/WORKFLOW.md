# Agent coordination and memory maintenance
Load when assigning, resuming, integrating or handing off work.

## Assignment contract
Coordinator creates one small docs/tasks/<ID>.md per real assignment:
- Objective: one observable outcome.
- Inputs: exact files/sections and prerequisite commit.
- Owner / branch / owned paths.
- Dependencies and out-of-scope work.
- Acceptance: 3–6 concrete checks.
- Status: ready | active | blocked | review | done | cancelled.
- Result: artifact/commit links; actual checks; blockers; next action.

Do not create speculative task files for the entire roadmap. A sample assignment is not evidence of execution.

## Parallel work
- Coordinator records assignments before launching; each worker gets the recorded task and a base SHA.
- At most three workers initially. Separate worktrees; disjoint file ownership.
- Workers update only their task and owned deliverables. Coordinator alone edits STATE, shared configuration and integration files.
- Worktree copies of STATE are snapshots, not distributed locks. Reconcile via the coordinator and shared branch/PR information.
- Shared dependencies or contracts require coordinator integration before dependent tasks begin.
- If agent tools are unavailable, run sequentially or provide handoff prompts; disclose which occurred.
- Rebase/merge deliberately; inspect conflicts and preserve both agents' intended behavior. Never overwrite unexpected edits or force-push to bypass concurrent work.
- Commit useful work before worktree cleanup. Keep tasks marked review until integrated and checked.
- Limit agent context to root guidance, current task, relevant plan sections and applicable subtree instructions.

## Completion and memory updates
1. Worker records exact changed paths, commit/artifacts, checks and limitations in its task.
2. Coordinator inspects evidence, integrates and verifies; changes status to done only then.
3. Update STATE with current stage, active assignments, blockers and next action.
4. Add durable choices to DECISIONS with date, source, status and short reason.
5. Add one compact entry to CHANGES for meaningful milestones. Git is the detailed change history.
6. Record a lesson only after an observed failure or repeat issue: symptom -> cause -> prevention -> evidence. Put local lessons in the appropriate subtree guidance.
7. Refresh affected BUILD_PLAN sections when scope changes; remove contradictory stale instructions in the same change.

## Keep memory small
- STATE target <=400 words; root AGENTS <=500; task handoff <=200.
- Use normal readable prose; do not sacrifice clarity for cryptic abbreviations.
- Summarise older completed task records into milestone entries and archive only when useful; do not scan archives at startup.
- No raw logs, full conversations, credentials or customer data in memory.
- Do not copy the same rules into .cursorrules, CLAUDE.md or always-on .mdc files.
- New task prompt format: “Read AGENTS.md. Execute docs/tasks/<ID>.md. Stay within owned paths; return evidence and update the task.”
- These files guide behavior; they do not automatically launch agents, persist unsaved chats or enforce locks.

## Instruction design references
Checked 2026-11-02:
- https://cursor.com/docs/rules
- https://agents.md/
Pattern used: concise root instructions, scoped guidance, explicit task outputs and on-demand references. Exact context loading depends on the agent client/version.
