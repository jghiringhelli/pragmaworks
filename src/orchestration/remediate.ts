/**
 * Brownfield remediation orchestrator — implements `pragmaworks_remediate`.
 *
 * Contract:        docs/specs/mcp-tools.md  (input/output schemas)
 * Use case steps:  docs/specs/use-cases/remediate.md
 * Data flow:       docs/specs/architecture.md §3
 *
 * Reads a prior audit's remediation roadmap (located via `auditId`) and
 * applies each item under tightened spec, with optional pause-boundary
 * checks for sensitive change classes (database-schema, public-api,
 * breaking-change). Each applied item is followed by a harness verification
 * pass. Failures are recorded per-item rather than thrown — the AI assistant
 * relies on the structured `itemsApplied[]` to decide what to surface next.
 *
 * Hard contracts (per spec.md §6):
 *   - Branch isolation: remediation lands on the audit branch (or a fresh
 *     `pragmaworks/remediate-<timestamp>` if `branchName` is overridden).
 *   - Sentinel respect: never overwrite existing AI behavioral files.
 *   - Pause-boundary contract: stop and surface for explicit user approval
 *     when an item touches one of the user-declared boundaries.
 *   - Graceful degradation: harness/adapter failure surfaces in the result,
 *     never silently dropped.
 */

import { detectSentinels } from '../sentinel/detect.js';
import { createBranchFromHead } from '../git/branch.js';
import { commitFiles } from '../git/commit.js';
import { collectGap, branchSafeTimestamp } from './shared.js';

export type PauseBoundary = 'database-schema' | 'public-api' | 'breaking-change';
export type RemediationItemStatus = 'applied' | 'paused' | 'failed';

export interface RemediateInput {
  repoPath: string;
  /** Prior audit identifier (audit branch slug or timestamp suffix). */
  auditId: string;
  /** Default: top-5 priority items from the prior audit's roadmap. */
  itemsToApply?: string[];
  /** Boundaries that pause the loop and surface to the user before proceeding. */
  pauseBoundaries?: PauseBoundary[];
  /** Default: same branch as the audit. */
  branchName?: string;
}

export interface AppliedRemediationItem {
  id: string;
  status: RemediationItemStatus;
  /** Why it paused or failed; empty when status === 'applied'. */
  note?: string;
}

export interface RemediateOutput {
  branch: string;
  itemsApplied: AppliedRemediationItem[];
  harnessResults: { passed: number; failed: number; details: string };
  nextSteps: string[];
  gaps: string[];
}

/**
 * Apply a remediation plan from a prior audit on `input.repoPath`.
 *
 * Sequences per docs/specs/use-cases/remediate.md:
 *   1. resolve `auditId` → load the prior audit JSON + its remediation roadmap
 *   2. detect sentinel files (any sentinel writes get MAPPED, not overwritten)
 *   3. resolve branch (reuse audit branch by default, else fresh branch)
 *   4. iterate plan items:
 *        a. classify against `pauseBoundaries` → if matched, record 'paused'
 *           and stop the loop so the user can review the pending change.
 *        b. otherwise apply the change under tightened spec.
 *        c. run harness; record pass/fail. Failure → status 'failed' + gap.
 *   5. commit each successfully-applied item separately (per-item commit
 *      aids reviewability of the audit branch).
 *   6. compose `nextSteps` (paused items, follow-up reviews).
 */
export async function remediate(input: RemediateInput): Promise<RemediateOutput> {
  const pauseBoundaries = input.pauseBoundaries ?? [];
  const timestamp = branchSafeTimestamp(new Date());
  const branch = input.branchName ?? `pragmaworks/remediate-${timestamp}`;
  const gaps: string[] = [];

  // -- Step 1: locate prior audit + plan ------------------------------------
  // TODO(io): resolve `<repo>/pragmaworks/audit-<auditId>/audit.json`, parse
  //   it as `AuditResult` (from '../types.js'), and extract `remediation[]`.
  //   Push a gap and bail with empty itemsApplied if the audit is missing.
  void input.auditId;

  // -- Step 2: sentinel detection ------------------------------------------
  const sentinel = detectSentinels(input.repoPath);
  void sentinel;

  // -- Step 3: branch ------------------------------------------------------
  // TODO(git): if `input.branchName` matches an existing branch (the audit
  //   branch), `git checkout <branch>` instead of `-b`. The current call
  //   always creates fresh — wire branch reuse before MVP.
  const branchInfo = await createBranchFromHead(input.repoPath, branch);

  // -- Step 4: plan iteration with pause-boundary classification -----------
  const items = input.itemsToApply ?? []; // TODO: default to top-5 from plan.
  const itemsApplied: AppliedRemediationItem[] = [];

  // Adapter fan-out for cross-cutting helpers (harness runner, change
  // generator). Per-item work happens inside the loop below.
  const adapterResults = await Promise.allSettled([
    // TODO(harness): implement '../harness/run.js'; replace with `runHarness(repoPath)`.
    Promise.resolve(null),
    // TODO(remediator): implement '../remediator/apply.js'; replace with
    //   `loadApplier(repoPath, plan)` so the loop below can call it per item.
    Promise.resolve(null),
  ]);
  collectGap(gaps, adapterResults[0], 'harness runner');
  collectGap(gaps, adapterResults[1], 'remediation applier');

  for (const id of items) {
    // TODO(remediate): per-item flow (see remediate.md "Per-item flow"):
    //   1. classify(id, pauseBoundaries) — if matched, push 'paused' + break.
    //   2. applyItemUnderSpec(id) — generate the change against tightened spec.
    //   3. runHarness — record pass/fail; failure → status 'failed' with note.
    //   4. on success, stage + commit (per-item commit aids reviewability).
    void id;
    void pauseBoundaries;
  }

  // -- Step 5: aggregate harness results -----------------------------------
  // TODO(harness): replace placeholder once harness adapter lands.
  const harnessResults = {
    passed: 0,
    failed: 0,
    details: 'harness adapter not implemented',
  };

  // -- Step 6: final commit of any leftover unstaged artifacts --------------
  // No-op while step 4 is still TODO (`commitFiles` short-circuits on empty).
  await commitFiles(
    input.repoPath,
    branchInfo.branchName,
    [],
    `pragmaworks: remediate ${timestamp} on ${branchInfo.parentSha}`,
  );

  // -- Compose nextSteps for the AI assistant -------------------------------
  const nextSteps: string[] = [];
  // TODO: append "review database-schema item with user" etc. for each paused.

  return {
    branch: branchInfo.branchName,
    itemsApplied,
    harnessResults,
    nextSteps,
    gaps,
  };
}
