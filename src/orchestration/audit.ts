/**
 * Brownfield audit orchestrator — implements `pragmaworks_audit_repo`.
 *
 * Contract:        docs/specs/mcp-tools.md  (input/output schemas)
 * Use case steps:  docs/specs/use-cases/audit.md
 * Data flow:       docs/specs/architecture.md §3
 * Degradation:     docs/specs/architecture.md §5
 *
 * This file owns the orchestration only. It does not score the rubric, render
 * the report, or shell out to git — those concerns live in dedicated modules
 * (see TODOs below) so this file stays focused on sequencing and assembly.
 *
 * Hard contracts enforced here (per spec.md §6):
 *   - Branch isolation: never write to `main`; always a fresh
 *     `pragmaworks/audit-<timestamp>` branch.
 *   - Sentinel respect: detect existing CLAUDE.md / agents.md before any
 *     AI-behavioral file write; do not overwrite without `--override`.
 *   - Graceful degradation: adapter failure surfaces as a labeled gap in the
 *     report — never silent skip, never thrown.
 *   - No secrets: this file only emits paths and summary scalars; nothing
 *     read from the repo flows through user output.
 */

import { join } from 'node:path';

// Inherited adapters from gs-onboardkit. Do NOT duplicate their logic here —
// extend the adapter modules if the audit flow needs new shapes.
import { queryForgeCraft } from '../forgecraft.js';
import { queryCodeSeeker } from '../codeseeker.js';
import { queryChronicle } from '../chronicle.js';

// ---------------------------------------------------------------------------
// Public types — match docs/specs/mcp-tools.md `pragmaworks_audit_repo`.
// These will likely migrate to src/types.ts once the audit JSON shape is fully
// defined; kept local for now to keep the skeleton self-contained.
// ---------------------------------------------------------------------------

/** The seven GS properties scored on every audit (spec.md §4). */
export type GsProperty =
  | 'self-describing'
  | 'bounded'
  | 'composable'
  | 'verifiable'
  | 'auditable'
  | 'defended'
  | 'executable';

export type AuditFormat = 'json-only' | 'json+html' | 'json+html+pdf';

export interface AuditInput {
  /** Absolute path to repo root. */
  repoPath: string;
  /** Default false. When true, the team-habit analyzer is included. */
  includeTeamHabits?: boolean;
  /** Default `pragmaworks/audit-<timestamp>`. */
  branchName?: string;
  /** Default `json+html+pdf`. */
  format?: AuditFormat;
}

export interface AuditSummary {
  /** 0–14, sum across the seven 0/1/2-scored properties. */
  overallScore: number;
  perPropertyScores: Record<GsProperty, 0 | 1 | 2>;
  /** Cover-summary "top 3 risks" (spec.md §5 section 1). */
  topRisks: string[];
  remediationItemCount: number;
}

export interface AuditOutput {
  /** Branch the artifacts were committed to. */
  branch: string;
  /** `<repo>/pragmaworks/audit-<timestamp>/`. */
  outputDir: string;
  reportPaths: {
    json: string;
    html?: string;
    pdf?: string;
  };
  summary: AuditSummary;
  /**
   * Adapter unavailability and partial-data notes — every gap recorded here
   * also appears as a labeled "Section partial" entry in the rendered report.
   */
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Orchestration entry point.
// ---------------------------------------------------------------------------

/**
 * Run a brownfield audit on `input.repoPath`.
 *
 * Sequences the audit per docs/specs/use-cases/audit.md:
 *   1. detect sentinel files
 *   2. create a fresh branch from current HEAD
 *   3. fan out adapters in parallel (with graceful degradation)
 *   4. assemble the AuditResult JSON
 *   5. render HTML and PDF (per `format`)
 *   6. write artifacts under `<repo>/pragmaworks/audit-<timestamp>/`
 *   7. commit on the new branch
 *
 * The function never throws on adapter failure — degradation is reported
 * via `gaps`. It DOES throw on hard preconditions (dirty working tree,
 * branch creation failure) so the AI assistant can surface them to the user.
 */
export async function auditRepo(input: AuditInput): Promise<AuditOutput> {
  const format: AuditFormat = input.format ?? 'json+html+pdf';
  const includeTeamHabits = input.includeTeamHabits ?? false;
  const timestamp = branchSafeTimestamp(new Date());
  const branch = input.branchName ?? `pragmaworks/audit-${timestamp}`;
  const outputDir = join(input.repoPath, 'pragmaworks', `audit-${timestamp}`);
  const gaps: string[] = [];

  // -- Step 1: sentinel detection ------------------------------------------
  // TODO(sentinel): call `detectSentinels(input.repoPath)` from
  //   '../sentinel/detect.js' (per architecture.md §7). Pass the result to
  //   the renderer so any AI-behavioral output gets MAPPED into existing
  //   files under labeled headers, never overwriting (unless --override).

  // -- Step 2: branch isolation --------------------------------------------
  // TODO(git): refuse to proceed when the working tree is dirty.
  //   - Use `gitStatusPorcelain(input.repoPath)` from '../git/status.js'.
  //   - On dirty tree: throw a typed error the MCP layer can relay to the AI
  //     so it can ask the user to commit/stash. NEVER auto-stash (spec §6).
  // TODO(git): create `branch` from current HEAD via
  //   `createBranchFromHead(input.repoPath, branch)` in '../git/branch.js'.
  //   Capture the parent commit SHA for the commit message in step 7.

  // -- Step 3: fan-out adapters with graceful degradation -------------------
  //
  // architecture.md §5: orchestrator surfaces adapter gaps in the report
  // rather than throwing. We use Promise.allSettled so a single failure
  // never cascades, then translate both rejections AND `{available: false}`
  // resolutions into labeled gap entries via `collectGap` below.
  const [
    forgecraftResult,
    codeseekerResult,
    chronicleResult,
    gitHistoryResult,
    disciplinesResult,
  ] = await Promise.allSettled([
    // ForgeCraft scores the seven GS properties + structural disciplines.
    queryForgeCraft(input.repoPath),

    // CodeSeeker provides semantic + structural module map.
    // TODO(codeseeker): the inherited adapter requires a `focusArea`; the
    //   audit wants a project-wide module map. Extend the adapter with a
    //   no-focus / whole-repo mode and replace the empty-string call.
    queryCodeSeeker('', input.repoPath),

    // Chronicle supplies prior architectural decisions to inform the
    // remediation roadmap section.
    // TODO(chronicle): the inherited signature is onboard-shaped (role/task/
    //   focus). Add an `auditRecall(repoPath)` method on the Chronicle
    //   adapter and call that instead of these placeholder positional args.
    queryChronicle('audit', '', '', input.repoPath),

    // git-history analyzer: docs health, test pyramid, security/logging.
    // TODO(analyzer): implement '../analyzers/git-history.js' and call
    //   `analyzeRepoHistory(input.repoPath)` here.
    Promise.resolve(null),

    // disciplines analyzer: which structural disciplines apply.
    // TODO(analyzer): implement '../analyzers/disciplines.js' and call
    //   `analyzeDisciplines(input.repoPath)` here.
    Promise.resolve(null),
  ]);

  collectGap(gaps, forgecraftResult, 'ForgeCraft (GS rubric scoring)');
  collectGap(gaps, codeseekerResult, 'CodeSeeker (semantic/structural code analysis)');
  collectGap(gaps, chronicleResult, 'Chronicle (architectural memory)');
  collectGap(gaps, gitHistoryResult, 'git-history analyzer');
  collectGap(gaps, disciplinesResult, 'disciplines analyzer');

  // Optional team-habit data (separate analyzer; spec.md §5 section 7).
  if (includeTeamHabits) {
    // TODO(analyzer): call `analyzeTeamHabits(input.repoPath, { windowDays: 90 })`
    //   from '../analyzers/git-history.js' once it exists. Push a gap on failure.
  }

  // -- Step 4: assemble the structured AuditResult JSON --------------------
  // TODO(assembly): build the canonical AuditResult per spec.md §5
  //   (the eight report sections in order). Inputs:
  //     - forgecraftResult       → section 5 (seven GS properties)
  //     - codeseekerResult       → cover summary top risks + section 8 roadmap
  //     - chronicleResult        → section 8 (informs roadmap with prior ADRs)
  //     - gitHistoryResult       → sections 3 (docs), 4 (test pyramid), 6 (security/logging)
  //     - disciplinesResult      → section 2 (structural disciplines)
  //     - team-habit result      → section 7 (when includeTeamHabits is true)
  //   Calibration grounding (spec.md §6): for each property score, look up an
  //   anchor in `anchors/<property>/<score>.md`. If none exists at that level,
  //   mark the score `provisional: true` in the JSON. Renderer renders that
  //   tag as "(provisional — calibration anchor missing)".
  // TODO(types): define `AuditResult` in '../types.ts' to match the JSON the
  //   renderer consumes; the `summary` below is a slice of it.
  const summary: AuditSummary = placeholderSummary();

  // -- Step 5: render hooks ------------------------------------------------
  const reportPaths: AuditOutput['reportPaths'] = {
    json: join(outputDir, 'audit.json'),
  };
  if (format === 'json+html' || format === 'json+html+pdf') {
    // TODO(renderer): call `renderHtml(auditResult, sentinelInfo)` from
    //   '../renderer/html.js'; write to `reportPaths.html`. Anchor refs are
    //   clickable links in HTML (use-case audit.md "Notes for the renderer").
    reportPaths.html = join(outputDir, 'report.html');
  }
  if (format === 'json+html+pdf') {
    // TODO(renderer): call `renderPdf(auditResult)` from '../renderer/pdf.js'.
    //   Last page MUST include prompts/licensing-trigger.md and
    //   prompts/judgment-layer-disclaimer.md (CLAUDE.md hard constraints).
    //   Failure mode (audit.md): if PDF generation fails (e.g. Chromium
    //   missing), leave `reportPaths.pdf` undefined, push a gap entry, keep
    //   the HTML and JSON. Do not throw.
    reportPaths.pdf = join(outputDir, 'report.pdf');
  }

  // -- Step 6: write artifacts ---------------------------------------------
  // TODO(io): mkdirp `outputDir`; write `audit.json` (canonical), then HTML
  //   and PDF as produced above. Also write `<outputDir>/.log/` with the
  //   structured orchestration trace per architecture.md §8 (gitignored).

  // -- Step 7: commit on the new branch ------------------------------------
  // TODO(git): commit the new files on `branch` with message:
  //   `pragmaworks: audit ${timestamp} on ${parentSha}` (use-case audit.md
  //   step 5). Helper: `commitFiles(repoPath, branch, files, message)` in
  //   '../git/commit.js'.

  return {
    branch,
    outputDir,
    reportPaths,
    summary,
    gaps,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Architecture.md §5 graceful-degradation pattern.
 *
 * Translates an adapter result into either a no-op (success with available
 * data) or a labeled gap entry. Two failure modes are flattened:
 *   - the adapter promise rejected (uncaught error in the adapter), or
 *   - the adapter resolved with `{ available: false, error }` (the inherited
 *     adapters' explicit "tool not installed / not reachable" shape).
 */
function collectGap<T>(
  gaps: string[],
  result: PromiseSettledResult<T>,
  label: string,
): void {
  if (result.status === 'rejected') {
    const reason = result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
    gaps.push(`${label} unavailable: ${reason}`);
    return;
  }
  const value = result.value as { available?: boolean; error?: string } | null;
  if (value && value.available === false) {
    gaps.push(`${label} unavailable: ${value.error ?? 'reason not reported by adapter'}`);
  }
}

/**
 * ISO timestamp with characters that are illegal in git refs (`:` and `.`)
 * replaced with `-`. Stable per-second so two calls in the same second
 * produce the same branch name (idempotency hook required by mcp-tools.md
 * "Tool surface invariants").
 */
function branchSafeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Placeholder summary — replaced once the assembly step is wired up.
 * Kept here so the return shape is type-correct during skeleton phase.
 */
function placeholderSummary(): AuditSummary {
  return {
    overallScore: 0,
    perPropertyScores: {
      'self-describing': 0,
      bounded: 0,
      composable: 0,
      verifiable: 0,
      auditable: 0,
      defended: 0,
      executable: 0,
    },
    topRisks: [],
    remediationItemCount: 0,
  };
}
