/**
 * ForgeCraft peer adapter.
 *
 * Spawns forgecraft-mcp as a child MCP server, calls verify and check_cascade,
 * then extracts gate score and spec gaps from the text output.
 * Returns { available: false } if forgecraft-mcp is not installed.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ForgeCraftData } from './types.js';

const TIMEOUT_MS = 20_000;

function spawnConfig(): { command: string; args: string[] } {
  const cmd = process.env['FORGECRAFT_CMD'];
  if (cmd) return { command: cmd, args: [] };
  return { command: 'npx', args: ['--yes', 'forgecraft-mcp'] };
}

/**
 * Query ForgeCraft for gate status and spec gaps.
 *
 * @param projectDir - Absolute path to the project root
 * @returns Structured ForgeCraft data, or { available: false } on failure
 */
export async function queryForgeCraft(projectDir: string): Promise<ForgeCraftData> {
  const { command, args } = spawnConfig();
  const transport = new StdioClientTransport({ command, args });
  const client = new Client({ name: 'gs-onboardkit', version: '1.0.0' });

  try {
    const connectPromise = client.connect(transport);
    await withTimeout(connectPromise, TIMEOUT_MS, 'ForgeCraft connect');

    const [verifyResult, cascadeResult] = await Promise.allSettled([
      withTimeout(
        client.callTool({ name: 'forgecraft_actions', arguments: { action: 'verify', project_dir: projectDir } }),
        TIMEOUT_MS,
        'forgecraft verify',
      ),
      withTimeout(
        client.callTool({ name: 'forgecraft_actions', arguments: { action: 'check_cascade', project_dir: projectDir } }),
        TIMEOUT_MS,
        'forgecraft check_cascade',
      ),
    ]);

    await client.close();

    const verifyText = verifyResult.status === 'fulfilled' ? extractText(verifyResult.value) : '';
    const cascadeText = cascadeResult.status === 'fulfilled' ? extractText(cascadeResult.value) : '';

    return parseForgeCraftOutput(verifyText, cascadeText);
  } catch (error) {
    await client.close().catch(() => undefined);
    return {
      available: false,
      error: `ForgeCraft not available: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function parseForgeCraftOutput(verifyText: string, cascadeText: string): ForgeCraftData {
  // Score: extract "11/14" or "Score: 11/14" patterns
  const scoreMatch = verifyText.match(/(\d+)\s*\/\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : undefined;
  const maxScore = scoreMatch ? parseInt(scoreMatch[2], 10) : undefined;

  // Failing gates: lines containing ✗ or explicit "FAIL"
  const failingGates = verifyText
    .split('\n')
    .filter(line => line.includes('✗') || /\bFAIL\b/i.test(line))
    .map(line => line.replace(/^[-*•✗\s]+/, '').trim())
    .filter(Boolean);

  // Spec gaps: missing steps from cascade check
  const specGaps = cascadeText
    .split('\n')
    .filter(line => line.includes('✗') || /missing|incomplete|not found|FAIL/i.test(line))
    .map(line => line.replace(/^[-*•✗\s]+/, '').trim())
    .filter(Boolean);

  return {
    available: true,
    ...(score !== undefined && { score }),
    ...(maxScore !== undefined && { maxScore }),
    ...(failingGates.length > 0 && { failingGates }),
    ...(specGaps.length > 0 && { specGaps }),
  };
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
