/**
 * Sentinel detector — locates existing AI behavioral files in a repo.
 *
 * Architecture: docs/specs/architecture.md §7 (sentinel handling)
 * Spec contract: docs/specs/spec.md §6 ("Sentinel respect")
 *
 * The orchestrator calls this BEFORE writing any AI-behavioral file so the
 * renderer can MAP content into existing files under labeled headers rather
 * than overwriting them. `--override` is the only path that bypasses
 * existing sentinels, and it must be set by the user, not inferred here.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SentinelDetectionResult } from '../types.js';

/**
 * Sentinel file paths checked in priority order (architecture.md §7).
 * Order matters — the first match is the canonical sentinel for the repo;
 * later entries are recorded too so the renderer can map into all of them.
 */
const SENTINEL_PATHS: readonly string[] = [
  'CLAUDE.md',
  'agents.md',
  'AGENTS.md',
  '.cursor/rules',
  '.aider.conf.yml',
  '.github/copilot-instructions.md',
];

/**
 * Scan `repoPath` for known AI behavioral files.
 *
 * Pure file-existence detection — does not read or parse the files. Returns
 * the repo-relative paths in priority order, plus a recommendation field
 * the orchestrator uses for its sentinel-respect decision.
 *
 * Note: this function only ever returns `'map'` or `'none-found'`. The
 * `'override-required'` recommendation is reserved for the orchestrator,
 * which sets it when the caller asked to write a sentinel without passing
 * `--override` and at least one already exists.
 */
export function detectSentinels(repoPath: string): SentinelDetectionResult {
  const foundFiles = SENTINEL_PATHS.filter((rel) =>
    existsSync(join(repoPath, rel)),
  );
  return {
    foundFiles,
    recommendation: foundFiles.length === 0 ? 'none-found' : 'map',
  };
}
