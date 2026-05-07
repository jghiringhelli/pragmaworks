import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryCodeSeeker } from '../src/codeseeker.js';

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

describe('queryCodeSeeker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.close.mockResolvedValue(undefined);
  });

  it('parses JSON array of search results into grouped modules', async () => {
    const results = [
      {
        filePath: 'src/auth/oauth-provider.ts',
        exportedSymbols: ['OAuthProvider'],
        imports: ['src/db', 'src/config'],
        referencedBy: ['src/api/routes/auth.ts'],
      },
      {
        filePath: 'src/auth/session-manager.ts',
        exportedSymbols: ['SessionManager'],
        imports: ['src/db'],
        referencedBy: [],
      },
    ];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(results) }],
    });

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(true);
    expect(result.modules).toBeDefined();
    const authModule = result.modules?.find(m => m.path === 'src/auth');
    expect(authModule).toBeDefined();
    expect(authModule?.symbols).toContain('OAuthProvider');
    expect(authModule?.symbols).toContain('SessionManager');
    expect(authModule?.dependsOn).toContain('src/db');
    expect(authModule?.dependedOnBy).toContain('src/api/routes/auth.ts');
  });

  it('groups files from the same directory into one module entry', async () => {
    const results = [
      { filePath: 'src/auth/a.ts', exportedSymbols: ['A'] },
      { filePath: 'src/auth/b.ts', exportedSymbols: ['B'] },
      { filePath: 'src/db/repo.ts', exportedSymbols: ['Repo'] },
    ];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(results) }],
    });

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.modules?.length).toBe(2); // src/auth, src/db
    const authMod = result.modules?.find(m => m.path === 'src/auth');
    expect(authMod?.symbols).toEqual(['A', 'B']);
  });

  it('deduplicates symbols and dependencies', async () => {
    const results = [
      { filePath: 'src/auth/a.ts', exportedSymbols: ['A'], imports: ['src/db'] },
      { filePath: 'src/auth/b.ts', exportedSymbols: ['A'], imports: ['src/db'] },
    ];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(results) }],
    });

    const result = await queryCodeSeeker('auth', '/project');
    const authMod = result.modules?.find(m => m.path === 'src/auth');

    expect(authMod?.symbols.filter(s => s === 'A')).toHaveLength(1);
    expect(authMod?.dependsOn.filter(d => d === 'src/db')).toHaveLength(1);
  });

  it('falls back to file path extraction for non-JSON plain text', async () => {
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Found: src/auth/service.ts\nAlso: src/auth/repo.ts' }],
    });

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(true);
    expect(result.modules?.length).toBeGreaterThan(0);
    expect(result.rawSnippets?.some(s => s.includes('src/auth'))).toBe(true);
  });

  it('returns empty modules for empty text response', async () => {
    mockClient.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '' }] });

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(true);
    expect(result.modules).toEqual([]);
    expect(result.rawSnippets).toEqual([]);
  });

  it('returns available:false when connect throws', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('spawn ENOENT'));

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(false);
    expect(result.error).toContain('CodeSeeker not available');
    expect(result.error).toContain('spawn ENOENT');
  });

  it('returns available:false when callTool throws', async () => {
    mockClient.callTool.mockRejectedValueOnce(new Error('Tool error'));

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(false);
  });

  it('handles non-Error thrown', async () => {
    mockClient.connect.mockRejectedValueOnce(42);

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(false);
    expect(result.error).toContain('42');
  });

  it('handles result with no content array', async () => {
    mockClient.callTool.mockResolvedValueOnce({});

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.available).toBe(true);
    expect(result.modules).toEqual([]);
  });

  it('skips search results with no filePath', async () => {
    const results = [
      { content: 'some code snippet with no path' },
      { filePath: 'src/auth/valid.ts', exportedSymbols: ['Valid'] },
    ];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(results) }],
    });

    const result = await queryCodeSeeker('auth', '/project');

    expect(result.modules?.length).toBe(1);
    expect(result.modules?.[0].path).toBe('src/auth');
  });

  it('uses CODESEEKER_CMD env var when set', async () => {
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    process.env['CODESEEKER_CMD'] = '/custom/codeseeker';
    mockClient.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '[]' }] });

    await queryCodeSeeker('auth', '/project');

    expect(StdioClientTransport).toHaveBeenCalledWith(
      expect.objectContaining({ command: '/custom/codeseeker', args: [] }),
    );

    delete process.env['CODESEEKER_CMD'];
  });

  it('handles results with `path` field instead of `filePath`', async () => {
    const results = [{ path: 'src/auth/service.ts', exportedSymbols: ['Service'] }];
    mockClient.callTool.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(results) }],
    });

    const result = await queryCodeSeeker('auth', '/project');
    expect(result.modules?.length).toBeGreaterThan(0);
  });
});
