/**
 * Git branch creation helper.
 *
 * Forks a fresh branch off current HEAD, after enforcing spec.md §6's
 * "Branch isolation" contract: the working tree must be clean. We never
 * auto-stash — surfacing the dirty-tree error lets the AI assistant ask the
 * user to commit or stash, which preserves their in-progress work.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitBranchInfo } from '../types.js';
import { isDirtyWorkingTree } from './status.js';

const execFileAsync = promisify(execFile);

/**
 * Create `branchName` from current HEAD in `repoPath` and check it out.
 *
 * Steps:
 *   1. Refuse if the working tree is dirty (no auto-stash).
 *   2. Capture the parent commit SHA so it can be cited in the audit's
 *      commit message and report header.
 *   3. `git checkout -b <branchName>` — fails if the branch already exists,
 *      which we propagate so the orchestrator can pick a new timestamp.
 *
 * Returns the branch name and parent SHA. Throws on dirty tree or any git
 * failure; callers should not catch — let the MCP layer relay the error.
 */
export async function createBranchFromHead(
  repoPath: string,
  branchName: string,
): Promise<GitBranchInfo> {
  if (await isDirtyWorkingTree(repoPath)) {
    throw new Error(
      `Cannot create branch '${branchName}': working tree at ${repoPath} ` +
        'is dirty. Commit or stash first — pragmaworks does not auto-stash ' +
        '(spec.md §6 "Branch isolation").',
    );
  }

  const { stdout: shaOut } = await execFileAsync(
    'git',
    ['rev-parse', 'HEAD'],
    { cwd: repoPath },
  );
  const parentSha = shaOut.trim();

  await execFileAsync(
    'git',
    ['checkout', '-b', branchName],
    { cwd: repoPath },
  );

  return { branchName, parentSha };
}
