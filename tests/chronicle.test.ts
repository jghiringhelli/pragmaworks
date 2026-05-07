import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryChronicle } from '../src/chronicle.js';

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

describe('queryChronicle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.close.mockResolvedValue(undefined);
  });

  it('parses JSON array of memories into decisions', async () => {
    const memories = [
      { id: 'ADR-003', content: 'JWT over sessions — stateless scaling', memoryType: 'architectural', tags: ['jwt'] },
      { id: 'ADR-007', content: 'GitHub OAuth as primary provider', memoryType: 'architectural' },
    ];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(memories) }],
    });

    const result = await queryChronicle('developer', 'add OAuth', 'auth', '/project');

    expect(result.available).toBe(true);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions?.[0].id).toBe('ADR-003');
    expect(result.decisions?.[0].content).toContain('JWT over sessions');
    expect(result.decisions?.[1].id).toBe('ADR-007');
  });

  it('filters out memories with empty content', async () => {
    const memories = [
      { id: '1', content: 'Valid decision' },
      { id: '2', content: '' },
    ];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(memories) }],
    });

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions?.[0].content).toBe('Valid decision');
  });

  it('falls back to line-by-line parsing when response is plain text', async () => {
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: '- ADR-003: JWT over sessions\n- ADR-007: OAuth' }],
    });

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.available).toBe(true);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions?.[0].content).toContain('ADR-003');
  });

  it('returns empty decisions for empty text response', async () => {
    mockClient.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '   ' }] });

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.available).toBe(true);
    expect(result.decisions).toEqual([]);
  });

  it('returns available:false when connect throws', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('spawn ENOENT'));

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.available).toBe(false);
    expect(result.error).toContain('Chronicle not available');
    expect(result.error).toContain('spawn ENOENT');
  });

  it('returns available:false when callTool throws', async () => {
    mockClient.callTool.mockRejectedValueOnce(new Error('MCP error'));

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.available).toBe(false);
  });

  it('handles non-Error thrown', async () => {
    mockClient.connect.mockRejectedValueOnce('raw string error');

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.available).toBe(false);
    expect(result.error).toContain('raw string error');
  });

  it('handles result with no content array', async () => {
    mockClient.callTool.mockResolvedValueOnce({ other: 'value' });

    const result = await queryChronicle('developer', 'task', 'focus', '/project');

    expect(result.available).toBe(true);
    expect(result.decisions).toEqual([]);
  });

  it('uses CHRONICLE_CMD env var when set', async () => {
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    process.env['CHRONICLE_CMD'] = '/custom/chronicle';
    mockClient.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '[]' }] });

    await queryChronicle('developer', 'task', 'focus', '/project');

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({ command: '/custom/chronicle' }),
    );

    delete process.env['CHRONICLE_CMD'];
  });

  it('uses project directory name as Chronicle project scope', async () => {
    mockClient.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '[]' }] });

    await queryChronicle('developer', 'task', 'auth', '/workspace/my-project');

    expect(mockClient.callTool).toHaveBeenCalledWith(
      expect.objectContaining({
        arguments: expect.objectContaining({ project: 'my-project' }),
      }),
    );
  });
});
