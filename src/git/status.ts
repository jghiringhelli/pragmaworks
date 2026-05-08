/**
 * Git working-tree status helper.
 *
 * Used by `createBranchFromHead` to enforce spec.md §6's "Branch isolation"
 * contract: pragmaworks refuses to fork off a dirty tree (no auto-stash —
 * the user must commit or stash explicitly).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Returns true when `git status --porcelain` reports any uncommitted change
 * (modified, staged, or untracked) in the working tree at `repoPath`.
 *
 * The porcelain format is the canonical machine-readable status output:
 * empty stdout ⇒ clean tree, any line ⇒ dirty.
 *
 * Throws if the path is not a git repo or git is not on PATH — callers
 * should let that propagate so the AI assistant can ask the user to fix it.
 */
export async function isDirtyWorkingTree(repoPath: string): Promise<boolean> {
  const { stdout } = await execFileAsync(
    'git',
    ['status', '--porcelain'],
    { cwd: repoPath },
  );
  return stdout.trim().length > 0;
}
