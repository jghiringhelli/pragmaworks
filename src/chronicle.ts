/**
 * Chronicle peer adapter.
 *
 * Spawns chronicle-mcp as a child MCP server, recalls architectural memories
 * relevant to the given role and task, and returns them as structured decisions.
 * Returns { available: false } if chronicle-mcp is not installed.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ChronicleData, ArchitecturalDecision } from './types.js';

const TIMEOUT_MS = 20_000;

function spawnConfig(): { command: string; args: string[] } {
  const cmd = process.env['CHRONICLE_CMD'];
  if (cmd) return { command: cmd, args: [] };
  return { command: 'npx', args: ['--yes', 'chronicle-mcp'] };
}

/**
 * Query Chronicle for architectural memories relevant to the role and task.
 *
 * @param role - Developer role (shapes which memories are prioritized)
 * @param firstTask - What the developer is about to do
 * @param focusArea - The module or feature being worked on
 * @param projectDir - Absolute path to the project root (scopes the query)
 * @returns Structured Chronicle data, or { available: false } on failure
 */
export async function queryChronicle(
  role: string,
  firstTask: string,
  focusArea: string,
  projectDir: string,
): Promise<ChronicleData> {
  const { command, args } = spawnConfig();
  const transport = new StdioClientTransport({ command, args });
  const client = new Client({ name: 'gs-onboardkit', version: '1.0.0' });

  try {
    const connectPromise = client.connect(transport);
    await withTimeout(connectPromise, TIMEOUT_MS, 'Chronicle connect');

    const query = `${role} ${focusArea} ${firstTask}`.trim();
    const projectName = projectDir.split(/[\\/]/).pop() ?? projectDir;

    const recallResult = await withTimeout(
      client.callTool({
        name: 'chronicle',
        arguments: {
          action: 'recall',
          query,
          project: projectName,
          memory_types: ['architectural', 'semantic', 'procedural'],
          limit: 10,
        },
      }),
      TIMEOUT_MS,
      'chronicle recall',
    );

    await client.close();

    const text = extractText(recallResult);
    return parseChronicleOutput(text);
  } catch (error) {
    await client.close().catch(() => undefined);
    return {
      available: false,
      error: `Chronicle not available: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function parseChronicleOutput(text: string): ChronicleData {
  if (!text.trim()) {
    return { available: true, decisions: [] };
  }

  // Chronicle returns JSON arrays
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const decisions: ArchitecturalDecision[] = parsed.map(
        (m: { id?: string; content?: string; memoryType?: string; tags?: string[] }) => ({
          id: m.id,
          content: m.content ?? '',
          memoryType: m.memoryType,
          tags: m.tags,
        }),
      ).filter((d: ArchitecturalDecision) => d.content);

      return { available: true, decisions };
    }
  } catch {
    // Not JSON — treat each non-empty line as a decision
  }

  const decisions: ArchitecturalDecision[] = text
    .split('\n')
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .map(content => ({ content }));

  return { available: true, decisions };
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
