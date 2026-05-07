import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryForgeCraft } from '../src/forgecraft.js';

// Shared mock client instance — hoisted so it's available in the vi.mock factory.
const mockClient = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  callTool: vi.fn<(p: unknown) => Promise<unknown>>(),
  close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => mockClient),
}));
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn(() => ({})),
}));

describe('queryForgeCraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.close.mockResolvedValue(undefined);
  });

  it('returns structured data when ForgeCraft responds with score and gates', async () => {
    mockClient.callTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Score: 11/14\n✗ Auditable\n✗ Executable' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '✗ use-cases.md missing' }] });

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(true);
    expect(result.score).toBe(11);
    expect(result.maxScore).toBe(14);
    expect(result.failingGates).toContain('Auditable');
    expect(result.failingGates).toContain('Executable');
    expect(result.specGaps).toContain('use-cases.md missing');
  });

  it('returns available:true with no score when verify output has no score pattern', async () => {
    mockClient.callTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'All checks passing.' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Cascade complete.' }] });

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(true);
    expect(result.score).toBeUndefined();
    expect(result.failingGates).toBeUndefined();
    expect(result.specGaps).toBeUndefined();
  });

  it('handles plain string result from callTool', async () => {
    mockClient.callTool
      .mockResolvedValueOnce('Score: 12/14\n')
      .mockResolvedValueOnce('No gaps detected.');

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(true);
    expect(result.score).toBe(12);
    expect(result.maxScore).toBe(14);
  });

  it('handles result with no content array', async () => {
    mockClient.callTool
      .mockResolvedValueOnce({ other: 'field' })
      .mockResolvedValueOnce({ other: 'field' });

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(true);
    expect(result.score).toBeUndefined();
  });

  it('returns available:false when connect throws', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('spawn ENOENT'));

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(false);
    expect(result.error).toContain('ForgeCraft not available');
    expect(result.error).toContain('spawn ENOENT');
  });

  it('returns available:true with no data when callTool rejects after connect', async () => {
    // callTool failure is absorbed by Promise.allSettled — ForgeCraft is present but gave no data
    mockClient.callTool.mockRejectedValue(new Error('Tool not found'));

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(true);
    expect(result.score).toBeUndefined();
    expect(result.failingGates).toBeUndefined();
  });

  it('still parses partial results when only one callTool settles', async () => {
    mockClient.callTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Score: 8/14' }] })
      .mockRejectedValueOnce(new Error('cascade failed'));

    const result = await queryForgeCraft('/project');

    // verify succeeded, cascade failed — should still get the score
    expect(result.available).toBe(true);
    expect(result.score).toBe(8);
  });

  it('handles non-Error thrown from connect', async () => {
    mockClient.connect.mockRejectedValueOnce('string error');

    const result = await queryForgeCraft('/project');

    expect(result.available).toBe(false);
    expect(result.error).toContain('string error');
  });

  it('uses FORGECRAFT_CMD env var when set', async () => {
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    process.env['FORGECRAFT_CMD'] = '/custom/forgecraft';
    mockClient.callTool.mockResolvedValue({ content: [] });

    await queryForgeCraft('/project');

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({ command: '/custom/forgecraft', args: [] }),
    );

    delete process.env['FORGECRAFT_CMD'];
  });

  it('parses FAIL keyword as failing gate', async () => {
    mockClient.callTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '10/14\nFAIL: Testable missing' }] })
      .mockResolvedValueOnce({ content: [] });

    const result = await queryForgeCraft('/project');

    expect(result.failingGates).toContain('FAIL: Testable missing');
  });
});
