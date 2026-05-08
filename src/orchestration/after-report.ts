/**
 * After-report orchestrator — implements `pragmaworks_generate_after_report`.
 *
 * Contract:        docs/specs/mcp-tools.md
 * Use case steps:  docs/specs/use-cases/after-report.md
 *
 * Reads two audit JSON outputs (initial + final), computes deltas across
 * the eight sections, and renders a side-by-side comparison report
 * (HTML + PDF). The final page carries the licensing-trigger and the
 * judgment-layer disclaimer (CLAUDE.md hard constraint), same as the
 * regular audit report.
 *
 * No git work here — after-reports are read-only over existing audit JSON
 * files and emit into the audit branch's directory or a caller-specified one.
 *
 * Hard contracts (per spec.md §6):
 *   - Graceful degradation: a missing or malformed audit JSON surfaces as
 *     a labeled gap, never as a thrown error.
 *   - No secrets: the comparison report only contains scalars and section
 *     deltas; nothing flows through from the source repos themselves.
 */

import { dirname, join } from 'node:path';
import { collectGap } from './shared.js';

export type ReportFormat = 'html' | 'pdf';

export interface AfterReportInput {
  initialAuditJsonPath: string;
  finalAuditJsonPath: string;
  format: ReportFormat[];
  /** Default: alongside the final audit JSON. */
  outputDir?: string;
}

export interface AfterReportOutput {
  paths: { html?: string; pdf?: string };
  /** Adapter + read-side gaps (e.g., one of the JSONs failed to parse). */
  gaps: string[];
}

/**
 * Generate a before/after comparison report from two audit JSON outputs.
 *
 * Sequences per docs/specs/use-cases/after-report.md:
 *   1. load both audit JSONs (parsed against `AuditResult` in '../types.js')
 *   2. compute deltas across the eight sections — overall score, per-property
 *      score deltas, remediation items closed/added, regression tests added,
 *      sentinel changes.
 *   3. render via the comparison renderer; same disclaimers as audit reports.
 *   4. write artifacts; do NOT commit (no git side-effects from after-report).
 */
export async function generateAfterReport(
  input: AfterReportInput,
): Promise<AfterReportOutput> {
  const gaps: string[] = [];
  const outputDir = input.outputDir ?? dirname(input.finalAuditJsonPath);

  // -- Step 1: load both audit JSONs ---------------------------------------
  // TODO(io): readFile + JSON.parse both inputs as `AuditResult`. Push a
  //   gap and return early-with-empty-paths if either fails to parse, so
  //   the AI assistant gets a clear "audit JSONs unreadable" surface
  //   rather than a throw the MCP layer would have to repackage.
  const loadResults = await Promise.allSettled([
    Promise.resolve(null), // TODO: loadAuditResult(input.initialAuditJsonPath)
    Promise.resolve(null), // TODO: loadAuditResult(input.finalAuditJsonPath)
  ]);
  collectGap(gaps, loadResults[0], 'initial audit JSON');
  collectGap(gaps, loadResults[1], 'final audit JSON');

  // -- Step 2: diff the eight sections -------------------------------------
  // TODO(diff): implement '../analyzers/audit-diff.js' that takes two
  //   `AuditResult` and returns a structured `AfterReportDelta` covering:
  //     - cover.overallScore delta + per-property score delta
  //     - remediation items: applied, paused, still-open, newly-introduced
  //     - regression tests added (test-pyramid section delta)
  //     - documentation health changes
  //     - sentinel changes (rare but worth flagging)
  //   The renderer below consumes that delta directly.

  // -- Step 3: render side-by-side comparison ------------------------------
  // TODO(renderer): implement '../renderer/after-report.js'. The HTML/PDF
  //   templates live alongside the audit renderer and reuse its layout. The
  //   comparison view shows initial vs. final side-by-side per section, with
  //   charts for score progression. Last page MUST include
  //   prompts/licensing-trigger.md + prompts/judgment-layer-disclaimer.md.
  const paths: AfterReportOutput['paths'] = {};
  if (input.format.includes('html')) {
    paths.html = join(outputDir, 'after-report.html');
  }
  if (input.format.includes('pdf')) {
    paths.pdf = join(outputDir, 'after-report.pdf');
  }

  // -- Step 4: write artifacts (no commit step) ----------------------------
  // TODO(io): mkdirp `outputDir`; write each path produced above. Push a
  //   gap (do not throw) on PDF generation failure — keep HTML if produced.

  return { paths, gaps };
}
