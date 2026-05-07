/**
 * CodeSeeker peer adapter.
 *
 * Spawns codeseeker as a child MCP server, calls the search tool with the
 * focus area query, and extracts module paths and dependency information.
 * Returns { available: false } if codeseeker is not installed or not indexed.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CodeSeekerData, ModuleInfo } from './types.js';

const TIMEOUT_MS = 20_000;

function spawnConfig(): { command: string; args: string[] } {
  const cmd = process.env['CODESEEKER_CMD'];
  if (cmd) return { command: cmd, args: [] };
  return { command: 'npx', args: ['--yes', 'codeseeker', 'serve', '--mcp'] };
}

/**
 * Query CodeSeeker for the module map of the given focus area.
 *
 * @param focusArea - The module or feature name to scope the query (e.g. "auth")
 * @param projectDir - Absolute path to the project root
 * @returns Structured CodeSeeker data, or { available: false } on failure
 */
export async function queryCodeSeeker(focusArea: string, projectDir: string): Promise<CodeSeekerData> {
  const { command, args } = spawnConfig();
  const transport = new StdioClientTransport({ command, args, env: { ...process.env as Record<string, string>, PROJECT_DIR: projectDir } });
  const client = new Client({ name: 'gs-onboardkit', version: '1.0.0' });

  try {
    const connectPromise = client.connect(transport);
    await withTimeout(connectPromise, TIMEOUT_MS, 'CodeSeeker connect');

    const searchResult = await withTimeout(
      client.callTool({
        name: 'codeseeker',
        arguments: {
          action: 'search',
          q: focusArea,
          project_path: projectDir,
          limit: 10,
        },
      }),
      TIMEOUT_MS,
      'codeseeker search',
    );

    await client.close();

    const text = extractText(searchResult);
    return parseCodeSeekerOutput(text, focusArea);
  } catch (error) {
    await client.close().catch(() => undefined);
    return {
      available: false,
      error: `CodeSeeker not available: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function parseCodeSeekerOutput(text: string, focusArea: string): CodeSeekerData {
  if (!text.trim()) {
    return {
      available: true,
      modules: [],
      rawSnippets: [],
    };
  }

  // Try to parse JSON array (CodeSeeker returns JSON)
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const modules = groupIntoModules(parsed, focusArea);
      const rawSnippets = parsed
        .slice(0, 5)
        .map((r: { content?: string; filePath?: string; path?: string }) =>
          [r.filePath ?? r.path ?? '', r.content ?? ''].filter(Boolean).join(': '))
        .filter(Boolean);

      return { available: true, modules, rawSnippets };
    }
  } catch {
    // Not JSON — treat as plain text snippets
  }

  // Plain text fallback: extract file paths from lines like "src/auth/..."
  const filePaths = text
    .split('\n')
    .map(line => line.match(/\b(src\/[^\s:]+|lib\/[^\s:]+)/)?.[1] ?? '')
    .filter(Boolean);

  const modules: ModuleInfo[] = [...new Set(filePaths)].map(p => ({
    path: p,
    symbols: [],
    dependsOn: [],
    dependedOnBy: [],
  }));

  return { available: true, modules, rawSnippets: filePaths.slice(0, 5) };
}

interface SearchResult {
  filePath?: string;
  path?: string;
  content?: string;
  imports?: string[];
  exportedSymbols?: string[];
  referencedBy?: string[];
}

function groupIntoModules(results: SearchResult[], _focusArea: string): ModuleInfo[] {
  const byDir = new Map<string, ModuleInfo>();

  for (const r of results) {
    const filePath = r.filePath ?? r.path ?? '';
    if (!filePath) continue;

    const parts = filePath.replace(/\\/g, '/').split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : filePath;

    const existing = byDir.get(dir) ?? {
      path: dir,
      symbols: [],
      dependsOn: [],
      dependedOnBy: [],
    };

    // Collect exported symbols
    if (r.exportedSymbols) {
      existing.symbols.push(...r.exportedSymbols.filter(s => !existing.symbols.includes(s)));
    }

    // Collect imports as dependencies
    if (r.imports) {
      for (const imp of r.imports) {
        if (!existing.dependsOn.includes(imp)) existing.dependsOn.push(imp);
      }
    }

    // Collect reverse dependencies
    if (r.referencedBy) {
      for (const ref of r.referencedBy) {
        if (!existing.dependedOnBy.includes(ref)) existing.dependedOnBy.push(ref);
      }
    }

    byDir.set(dir, existing);
  }

  return [...byDir.values()];
}

function extractText(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'content' in result) {
    const content = (result as { content: unknown[] }).content;
    if (Array.isArray(content)) {
      return content
        .filter((c): c is { type: 'text'; text: string } =>
          typeof c === 'object' && c !== null && 'type' in c &&
          (c as { type: unknown }).type === 'text' && 'text' in c)
        .map(c => c.text)
        .join('\n');
    }
  }
  return '';
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}
