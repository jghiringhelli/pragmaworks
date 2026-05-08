/**
 * Git-history analyzer — implements `analyzeGitHistory(repoPath, windowDays?)`.
 *
 * Spec ref:        docs/specs/spec.md §5 section 7 (Team-habit analysis)
 * Architecture:    docs/specs/architecture.md §1 (src/analyzers/)
 * Output type:     `TeamHabitData` in '../types.ts'
 *
 * Reads `git log` via `execFile` over the trailing `windowDays` window and
 * derives the team-habit signals consumed by the report renderer. Cheap
 * derivations (commit-size mean, contributor count, per-module activity)
 * are real here. Costlier derivations (PR review density, regression
 * coverage of past bugs, collaboration graph weights) are stubbed so the
 * orchestrator's degradation path is exercised today and the analyzer can
 * grow real implementations without changing its contract.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { TeamHabitData } from '../types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_WINDOW_DAYS = 90;

export async function analyzeGitHistory(
  repoPath: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<TeamHabitData> {
  // Per-commit numstat: header line `<hash>\t<author>\t<unix-ts>` followed by
  // numstat rows `<insertions>\t<deletions>\t<path>`. Binary diffs come back
  // as `-\t-\t...` and are dropped from the size mean.
  const { stdout: logOut } = await execFileAsync(
    'git',
    [
      'log',
      `--since=${windowDays}.days.ago`,
      '--numstat',
      '--format=%H%x09%an%x09%at',
    ],
    { cwd: repoPath, maxBuffer: 50 * 1024 * 1024 },
  );

  const commits = parseNumstatLog(logOut);
  const avgCommitSize = commits.length === 0
    ? 0
    : commits.reduce((sum, c) => sum + c.size, 0) / commits.length;
  const contributorCount = new Set(commits.map((c) => c.author)).size;
  const perModuleActivity = perTopLevelModuleActivity(commits, Date.now());

  return {
    // TODO(prReviewDensity): requires the host's PR/review API
    //   (GitHub /pulls + /reviews; GitLab MR approvals). Until wired,
    //   surface 0 and let the orchestrator record it as a labeled gap.
    prReviewDensity: 0,
    // TODO(regressionCoverageRate): correlate bugfix commits (subject prefix
    //   `fix:` or message containing 'fixes #', 'closes #') with test-file
    //   additions in the same commit — walk numstat for `*.test.*` adds.
    regressionCoverageRate: 0,
    avgCommitSize,
    contributorCount,
    // TODO(collaborationGraph): infer edges from co-edits on the same module
    //   within a 14-day rolling window; weight = co-edit count.
    collaborationGraph: [],
    perModuleActivity,
  };
}

interface ParsedCommit {
  hash: string;
  author: string;
  ts: number;
  size: number;
  modules: string[];
}

function parseNumstatLog(stdout: string): ParsedCommit[] {
  const commits: ParsedCommit[] = [];
  let current: ParsedCommit | null = null;

  for (const raw of stdout.split('\n')) {
    if (!raw) continue;
    const parts = raw.split('\t');
    if (parts.length === 3 && /^[0-9a-f]{7,40}$/i.test(parts[0] ?? '')) {
      if (current) commits.push(current);
      current = {
        hash: parts[0] ?? '',
        author: parts[1] ?? '',
        ts: Number.parseInt(parts[2] ?? '0', 10) || 0,
        size: 0,
        modules: [],
      };
      continue;
    }
    if (!current) continue;
    if (parts.length >= 3) {
      const ins = Number.parseInt(parts[0] ?? '', 10);
      const del = Number.parseInt(parts[1] ?? '', 10);
      if (Number.isFinite(ins)) current.size += ins;
      if (Number.isFinite(del)) current.size += del;
      const path = parts[2] ?? '';
      if (path) current.modules.push(topLevelModule(path));
    }
  }
  if (current) commits.push(current);
  return commits;
}

function topLevelModule(path: string): string {
  const idx = path.indexOf('/');
  return idx === -1 ? path : path.slice(0, idx);
}

function perTopLevelModuleActivity(
  commits: ParsedCommit[],
  nowMs: number,
): TeamHabitData['perModuleActivity'] {
  const counts = new Map<string, { commits: number; lastTouchedTs: number }>();
  for (const c of commits) {
    for (const mod of new Set(c.modules)) {
      const prev = counts.get(mod);
      if (prev) {
        prev.commits += 1;
        if (c.ts > prev.lastTouchedTs) prev.lastTouchedTs = c.ts;
      } else {
        counts.set(mod, { commits: 1, lastTouchedTs: c.ts });
      }
    }
  }
  return [...counts.entries()].map(([path, { commits: n, lastTouchedTs }]) => ({
    path,
    commits: n,
    lastTouchedDays: Math.max(
      0,
      Math.floor((nowMs - lastTouchedTs * 1000) / (1000 * 60 * 60 * 24)),
    ),
  }));
}
