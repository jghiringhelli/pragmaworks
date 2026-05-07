# pragmaworks — MCP Tool Surface

*Version 0.1 · May 7, 2026.*

This document is the canonical contract for MCP tools the unified `pragmaworks` server exposes. Every tool here has a one-sentence description, an input schema, an output schema, and a reference to the use case it implements. AI assistants invoke these by name; users do not.

The tool surface is intentionally small (~9 tools) so the AI assistant gets a low-token, focused catalog instead of the 30+ low-level tools across the underlying packages.

---

## Tool catalog

### `pragmaworks_bootstrap_project`

**Description.** Bootstrap a new project from a 2-sentence idea: gather clarifying answers (MVP scope, tech stack), set up the GS specification cascade in the current empty folder, and prepare the environment for the AI assistant to generate code under that discipline.

**Input.**
```ts
{
  idea: string;                    // 2-sentence description from user
  techStackPreference?: string;    // optional; AI picks if not given
  mvpScope?: string;               // optional follow-up answer
  hostingPreference?: 'local' | 'cloud' | 'either';
}
```

**Output.**
```ts
{
  status: 'ready' | 'needs-clarification';
  clarificationQuestions?: string[];   // when status = 'needs-clarification'
  generatedArtifacts?: {                // when status = 'ready'
    spec: string;          // path to docs/specs/spec.md
    claudeMd: string;      // path to CLAUDE.md
    forgecraftYaml: string;
    techStack: string;
  };
  nextSteps: string[];                  // human-readable next steps for the AI
}
```

**Use case.** `docs/specs/use-cases/bootstrap.md`.

---

### `pragmaworks_audit_repo`

**Description.** Run a full AI-readiness audit on the current repo: score the seven GS properties with cited evidence, evaluate applicable structural disciplines, assess documentation health and test pyramid coverage, surface security/logging baseline gaps, propose a prioritized remediation plan. Output is structured JSON written to a new branch.

**Input.**
```ts
{
  repoPath: string;                            // absolute path to repo root
  includeTeamHabits?: boolean;                 // default false
  branchName?: string;                         // default 'pragmaworks/audit-<timestamp>'
  format?: 'json-only' | 'json+html' | 'json+html+pdf';  // default 'json+html+pdf'
}
```

**Output.**
```ts
{
  branch: string;                              // branch the report was written to
  outputDir: string;                           // <repo>/pragmaworks/audit-<timestamp>/
  reportPaths: {
    json: string;
    html?: string;
    pdf?: string;
  };
  summary: {
    overallScore: number;                      // 0-14
    perPropertyScores: Record<GsProperty, 0|1|2>;
    topRisks: string[];                        // top 3
    remediationItemCount: number;
  };
  gaps: string[];                              // adapter unavailability or partial-data notes
}
```

**Use case.** `docs/specs/use-cases/audit.md`.

---

### `pragmaworks_remediate`

**Description.** Apply a remediation plan from a prior audit. Each item is generated under tightened spec; harness verification runs after each change. Branch-isolated. Pauses at user-defined boundaries.

**Input.**
```ts
{
  repoPath: string;
  auditId: string;                             // identifies the audit branch+timestamp
  itemsToApply?: string[];                     // default: top-5 priority items
  pauseBoundaries?: ('database-schema' | 'public-api' | 'breaking-change')[];
  branchName?: string;                         // default: same as audit branch
}
```

**Output.**
```ts
{
  branch: string;
  itemsApplied: { id: string; status: 'applied' | 'paused' | 'failed'; ... }[];
  harnessResults: { passed: number; failed: number; details: string };
  nextSteps: string[];                         // e.g., 'review database-schema item with user'
}
```

**Use case.** `docs/specs/use-cases/remediate.md`.

---

### `pragmaworks_generate_report`

**Description.** Render an audit JSON output as HTML and/or PDF with the canonical eight sections and the licensing/judgment-layer disclaimers.

**Input.**
```ts
{
  auditJsonPath: string;
  format: ('html' | 'pdf')[];                  // both by default
  outputDir?: string;
}
```

**Output.**
```ts
{
  paths: { html?: string; pdf?: string };
}
```

**Use case.** `docs/specs/use-cases/report.md`.

---

### `pragmaworks_generate_after_report`

**Description.** Generate a before/after comparison report from two audit JSON outputs. Side-by-side deltas, charts, regression-tests-added log.

**Input.**
```ts
{
  initialAuditJsonPath: string;
  finalAuditJsonPath: string;
  format: ('html' | 'pdf')[];
  outputDir?: string;
}
```

**Output.** Same shape as `pragmaworks_generate_report`.

**Use case.** `docs/specs/use-cases/after-report.md`.

---

### `pragmaworks_analyze_team_habits`

**Description.** Analyze commit history (default last 90 days) for PR review density, regression coverage of past bugs, AI-introduced bug rate, commit-size distribution, collaboration graph. Output as separate PDF with charts.

**Input.**
```ts
{
  repoPath: string;
  windowDays?: number;                         // default 90
  format?: ('html' | 'pdf')[];                 // default ['pdf']
  outputDir?: string;
}
```

**Output.**
```ts
{
  paths: { html?: string; pdf?: string };
  summary: {
    prReviewDensity: number;                   // 0-1
    regressionCoverageRate: number;            // 0-1
    aiIntroducedBugRate: number;               // 0-1
    avgCommitSize: number;
    contributorCount: number;
  };
}
```

**Use case.** `docs/specs/use-cases/team-habits.md`.

---

### `pragmaworks_score_property`

**Description.** Score a single GS property on the current codebase, with cited evidence and a calibration anchor reference. Useful when the AI assistant wants to rescore a specific property after a remediation.

**Input.**
```ts
{
  repoPath: string;
  property: 'self-describing' | 'bounded' | 'composable' | 'verifiable'
          | 'auditable' | 'defended' | 'executable';
}
```

**Output.**
```ts
{
  score: 0 | 1 | 2;
  provisional: boolean;                        // true if anchor library lacked coverage
  evidence: string[];
  anchorReference: string;                     // path within anchors/
  improvementPath: string;
}
```

---

### `pragmaworks_setup_harness`

**Description.** Generate spec-derived test harness for a project. Unit + integration + e2e scaffolding plus the multimodal-AI-as-QA prompts that drive the running app through use cases and compare screenshots to spec postconditions.

**Input.**
```ts
{
  repoPath: string;
  techStack: string;                           // detected or provided
  testRunnerPreference?: string;               // playwright, cypress, etc.
}
```

**Output.**
```ts
{
  filesGenerated: string[];
  harnessRunCommand: string;                   // npm test or equivalent
  multimodalVerificationPrompt: string;
}
```

---

### `pragmaworks_install_chronicle_project_scope`

**Description.** Install a project-scoped Chronicle instance (separate from any global Chronicle) so future AI sessions on this project inherit architectural decisions, prompt history, and team conventions.

**Input.**
```ts
{
  repoPath: string;
  scope: 'project' | 'team';                   // 'team' currently scaffolds for future Chronicle Team
}
```

**Output.**
```ts
{
  chronicleConfigPath: string;
  status: 'installed' | 'already-installed';
}
```

---

## Tool surface invariants

- Every tool's input is a Zod schema. No magic strings.
- Every tool that touches the filesystem writes only to `<repo>/pragmaworks/<flow>-<timestamp>/` unless explicitly remediating with user approval.
- Every tool is idempotent at the timestamp granularity — re-invoking with the same inputs in the same minute returns the same outputs from cache rather than re-running expensive scans.
- Every tool produces structured JSON and references the use case file in `docs/specs/use-cases/`.

## Adding a new tool

1. Add a use case file at `docs/specs/use-cases/<flow>.md`.
2. Document input/output here in this file.
3. Add a row to the cookbook flow mapping table in `CLAUDE.md`.
4. Implement in `src/orchestration/<flow>.ts` and expose in `src/mcp/server.ts`.
5. Add tests under `tests/orchestration/<flow>.test.ts`.

Do not expose a tool that isn't in this document. Out-of-band tools are how MCP packages bloat over time.
