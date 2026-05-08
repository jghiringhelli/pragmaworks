/**
 * Sentinel-respecting writer for AI behavioral instruction files.
 *
 * Pairs with `./detect.ts`: detection is the read-only check, this is the
 * gated write. Default behaviour is the safe one — if any sentinel exists
 * (at the target path or anywhere on the canonical priority list), the
 * write is *skipped* and the caller decides what to do.
 *
 * Three opt-ins are available:
 * - `override: true`              → write the target unconditionally.
 * - `appendIfMatchTarget: true`   → append the new content under a dated
 *                                   `## GS Discipline` header, but only
 *                                   when the target file already exists
 *                                   and is itself one of the recognised
 *                                   sentinels. Cross-file appends are not
 *                                   permitted from this helper.
 *
 * Mirrors the forgecraft-mcp pattern so callers that compose both packages
 * see the same return contract.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { detectSentinels } from './detect.js';

/**
 * Sentinel paths the write helper recognises as legitimate append targets,
 * mirroring the priority order in `./detect.ts`. Kept in sync manually until
 * the detector exposes it as a named export.
 */
const SENTINEL_PRIORITY_PATHS: readonly string[] = [
  'CLAUDE.md',
  'agents.md',
  'AGENTS.md',
  '.cursor/rules',
  '.aider.conf.yml',
  '.github/copilot-instructions.md',
];

export interface WriteWithSentinelRespectOptions {
  readonly repoPath: string;
  readonly targetPath: string;
  readonly content: string;
  readonly override?: boolean;
  readonly appendIfMatchTarget?: boolean;
}

export type WriteWithSentinelRespectResult =
  | { readonly action: 'written'; readonly bytesWritten: number }
  | {
      readonly action: 'appended';
      readonly existingFile: string;
      readonly bytesWritten: number;
    }
  | {
      readonly action: 'skipped';
      readonly reason: string;
      readonly existingFile: string;
    };

export function writeWithSentinelRespect(
  opts: WriteWithSentinelRespectOptions,
): WriteWithSentinelRespectResult {
  const {
    repoPath,
    targetPath,
    content,
    override = false,
    appendIfMatchTarget = false,
  } = opts;

  if (override) {
    return writeFresh(targetPath, content);
  }

  const detection = detectSentinels(repoPath);
  const targetExists = existsSync(targetPath);

  if (!targetExists && detection.foundFiles.length === 0) {
    return writeFresh(targetPath, content);
  }

  const targetRel = toRepoRelative(repoPath, targetPath);
  const targetIsSentinel = SENTINEL_PRIORITY_PATHS.includes(targetRel);

  if (appendIfMatchTarget && targetExists && targetIsSentinel) {
    return appendUnderHeader(targetPath, content);
  }

  const blocking =
    targetExists && targetIsSentinel
      ? targetRel
      : (detection.foundFiles[0] ?? targetRel);

  const reason = targetExists
    ? `Target ${targetRel} already exists; pass override:true to replace, or appendIfMatchTarget:true to append.`
    : `Sentinel(s) detected: ${detection.foundFiles.join(', ')}. Pass override:true to write anyway.`;

  return { action: 'skipped', reason, existingFile: blocking };
}

function writeFresh(
  targetPath: string,
  content: string,
): WriteWithSentinelRespectResult {
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, 'utf-8');
  return {
    action: 'written',
    bytesWritten: Buffer.byteLength(content, 'utf-8'),
  };
}

function appendUnderHeader(
  targetPath: string,
  content: string,
): WriteWithSentinelRespectResult {
  const original = readFileSync(targetPath, 'utf-8');
  const date = new Date().toISOString().slice(0, 10);
  const separator = original.endsWith('\n') ? '\n' : '\n\n';
  const header = `## GS Discipline (appended by pragmaworks ${date})\n\n`;
  const merged = `${original}${separator}${header}${content}`;
  writeFileSync(targetPath, merged, 'utf-8');
  const bytesWritten =
    Buffer.byteLength(merged, 'utf-8') - Buffer.byteLength(original, 'utf-8');
  return { action: 'appended', existingFile: targetPath, bytesWritten };
}

function toRepoRelative(repoPath: string, targetPath: string): string {
  return relative(resolve(repoPath), resolve(targetPath)).replace(/\\/g, '/');
}
