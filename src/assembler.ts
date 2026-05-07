/**
 * Assembler — orchestrates calls to all three peer tools and merges results.
 *
 * Calls ForgeCraft, CodeSeeker, and Chronicle concurrently. Each adapter
 * degrades gracefully on failure, so a partial context package is always
 * returned even when peer tools are missing.
 *
 * Before any change to this file: read src/assembler.ts + peer tool contracts
 * in .claude/domain.md (as required by the CLAUDE.md navigation protocol).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { queryForgeCraft } from './forgecraft.js';
import { queryCodeSeeker } from './codeseeker.js';
import { queryChronicle } from './chronicle.js';
import type { AssembledContext, Role } from './types.js';

/**
 * Assemble a full context package for the given onboard parameters.
 * All three peer tools are queried concurrently. Missing tools are noted, not fatal.
 *
 * @param projectDir - Absolute path to the project root
 * @param role - Developer role (shapes context priority)
 * @param focusArea - Module or feature being worked on
 * @param firstTask - What the developer is about to do
 * @returns Fully assembled context, with degraded sections where tools are absent
 */
export async function assemble(
  projectDir: string,
  role: Role,
  focusArea: string,
  firstTask: string,
): Promise<AssembledContext> {
  const projectName = resolveProjectName(projectDir);

  const [forgecraft, codeseeker, chronicle] = await Promise.all([
    queryForgeCraft(projectDir),
    queryCodeSeeker(focusArea, projectDir),
    queryChronicle(role, firstTask, focusArea, projectDir),
  ]);

  return {
    projectName,
    generatedAt: new Date().toISOString(),
    role,
    focusArea,
    firstTask,
    forgecraft,
    codeseeker,
    chronicle,
  };
}

/**
 * Parse the existing context.md to extract the last recorded onboard parameters.
 * Returns null if context.md does not exist or the header cannot be parsed.
 *
 * @param projectDir - Absolute path to the project root
 */
export function readLastContext(projectDir: string): {
  role: Role;
  focusArea: string;
  firstTask: string;
} | null {
  const contextPath = join(projectDir, '.onboardkit', 'context.md');
  if (!existsSync(contextPath)) return null;

  try {
    const text = readFileSync(contextPath, 'utf-8');
    // Match the metadata line: _Generated: ... · Role: X · Focus: Y · Task: Z_
    const match = text.match(/_Generated:.*?·\s*Role:\s*([^·]+?)·\s*Focus:\s*([^·]+?)·\s*Task:\s*(.+?)_/i);
    if (!match) return null;

    const role = match[1].trim() as Role;
    const focusArea = match[2].trim();
    const firstTask = match[3].trim();

    const validRoles: Role[] = ['developer', 'tech-lead', 'reviewer', 'onboarding'];
    if (!validRoles.includes(role)) return null;

    return { role, focusArea, firstTask };
  } catch {
    return null;
  }
}

/**
 * Read the generation timestamp from an existing context.md.
 *
 * @param projectDir - Absolute path to the project root
 * @returns ISO timestamp string, or null if not found
 */
export function readLastGeneratedAt(projectDir: string): string | null {
  const contextPath = join(projectDir, '.onboardkit', 'context.md');
  if (!existsSync(contextPath)) return null;

  try {
    const text = readFileSync(contextPath, 'utf-8');
    const match = text.match(/_Generated:\s*([^·_]+)/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function resolveProjectName(projectDir: string): string {
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string };
      if (pkg.name) return pkg.name;
    } catch {
      // fall through to directory name
    }
  }
  return projectDir.split(/[\\/]/).pop() ?? projectDir;
}
