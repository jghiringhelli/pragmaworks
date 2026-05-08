/**
 * AI-introduced bug detector — implements `detectAiBugs(repoPath, windowDays?, options?)`.
 *
 * Spec ref:    docs/specs/spec.md §2 (cross-cutting capabilities)
 * Output type: `AiBugAnalysis` in '../types.ts'
 *
 * Heuristic mode (the default) reads `git log` and matches commit messages,
 * Co-authored-by trailers, and branch naming against patterns associated
 * with AI-assisted authorship. Bugfix attribution joins those AI-attributed
 * commits with downstream commits whose messages reference them as the bug
 * source ("fixes <sha>", "reverts <sha>", "regression from <sha>") or that
 * are themselves AI-authored (the AI fixed its own bug).
 *
 * Chronicle-enriched mode (`options.chronicleClient`) is TODO — when wired,
 * stored authorship metadata from `chronicle-mcp` will be unioned with the
 * heuristic set, and `method` flips to 'chronicle-enriched'.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AiBugAnalysis } from '../types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_WINDOW_DAYS = 90;

const AI_AUTHORSHIP_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'co-authored-by-claude', re: /co-authored-by:\s*claude/i },
  { name: 'co-authored-by-copilot', re: /co-authored-by:\s*github copilot/i },
  { name: 'ai-generated-tag', re: /\bai[- ]generated\b/i },
  { name: 'generated-with-claude-code', re: /generated with .*claude code/i },
  { name: 'cursor-branch', re: /\b(?:from|on)\s+cursor\//i },
  { name: 'copilot-branch', re: /\b(?:from|on)\s+copilot\//i },
];

const BUGFIX_PATTERNS: RegExp[] = [
  /^fix(\(|:|\s)/im,
  /^revert\s/im,
  /\bregression\b/i,
  /\bhotfix\b/i,
];

export interface DetectAiBugsOptions {
  /**
   * Optional chronicle-mcp client. When provided, the analyzer enriches its
   * heuristic AI-authored set with stored authorship decisions and reports
   * `method: 'chronicle-enriched'`. Typed as `unknown` here to keep this
   * module decoupled from the chronicle client surface during skeleton phase.
   */
  chronicleClient?: unknown;
}

export async function detectAiBugs(
  repoPath: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  options?: DetectAiBugsOptions,
): Promise<AiBugAnalysis> {
  // Single git log pass: each record is `<short-sha>\x1f<full-message>\x1e\n`.
  // \x1f separates fields; \x1e separates records — both unlikely to appear
  // inside a commit message and means we don't need per-commit shellouts.
  const { stdout } = await execFileAsync(
    'git',
    [
      'log',
      `--since=${windowDays}.days.ago`,
      '--all',
      '--format=%h%x1f%B%x1e',
    ],
    { cwd: repoPath, maxBuffer: 50 * 1024 * 1024 },
  );

  const commits = stdout
    .split('\x1e')
    .map((rec) => rec.replace(/^\n/, ''))
    .filter(Boolean)
    .map((rec) => {
      const [sha = '', body = ''] = rec.split('\x1f');
      return { sha, body };
    });

  const heuristicSignals = AI_AUTHORSHIP_PATTERNS.map((p) => ({
    pattern: p.name,
    matchedCount: 0,
  }));

  const aiCommits = new Set<string>();
  for (const c of commits) {
    AI_AUTHORSHIP_PATTERNS.forEach((p, i) => {
      if (!p.re.test(c.body)) return;
      const signal = heuristicSignals[i];
      if (signal) signal.matchedCount += 1;
      if (c.sha) aiCommits.add(c.sha);
    });
  }

  let aiAttributedBugCount = 0;
  for (const c of commits) {
    if (!BUGFIX_PATTERNS.some((re) => re.test(c.body))) continue;
    const referencesAi = [...aiCommits].some(
      (sha) => sha.length > 0 && c.body.includes(sha),
    );
    const selfAi = aiCommits.has(c.sha);
    if (referencesAi || selfAi) aiAttributedBugCount += 1;
  }

  // TODO(chronicle): when `options.chronicleClient` is set, query the
  //   chronicle-mcp memory store for `authorship=ai` decisions in window
  //   and union the resulting sha set with `aiCommits`. On enrichment,
  //   set `method: 'chronicle-enriched'`.
  void options?.chronicleClient;

  const aiAttributedCommitCount = aiCommits.size;
  const aiBugRate = aiAttributedCommitCount === 0
    ? 0
    : aiAttributedBugCount / aiAttributedCommitCount;

  return {
    aiAttributedCommitCount,
    aiAttributedBugCount,
    aiBugRate,
    method: 'heuristic',
    heuristicSignals,
  };
}
