/**
 * Git stage-and-commit helper.
 *
 * Used at the end of an orchestration to commit the audit / after-report /
 * remediation artifacts on the branch the orchestrator created. We verify
 * the current branch matches `branchName` before committing so a checkout
 * race never lets us write to `main` (spec.md §6 "Branch isolation").
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Stage `files` and commit them on `branchName` with `message`.
 *
 * - Verifies HEAD points at `branchName` first; throws otherwise.
 * - No-op when `files` is empty (the orchestration may not have produced
 *   artifacts yet during skeleton phase, or all writes may have failed
 *   gracefully — both are valid; emitting an empty commit would not be).
 * - Uses `git add --` to defend against filenames that look like flags.
 *
 * Throws on any git failure — callers let that propagate.
 */
export async function commitFiles(
  repoPath: string,
  branchName: string,
  files: string[],
  message: string,
): Promise<void> {
  if (files.length === 0) return;

  const { stdout: headRef } = await execFileAsync(
    'git',
    ['symbolic-ref', '--short', 'HEAD'],
    { cwd: repoPath },
  );
  const currentBranch = headRef.trim();
  if (currentBranch !== branchName) {
    throw new Error(
      `Refusing to commit: expected branch '${branchName}' but HEAD is ` +
        `'${currentBranch}'. Branch isolation contract (spec.md §6) requires ` +
        'all orchestration writes to land on the branch the orchestrator created.',
    );
  }

  await execFileAsync('git', ['add', '--', ...files], { cwd: repoPath });
  await execFileAsync('git', ['commit', '-m', message], { cwd: repoPath });
}
