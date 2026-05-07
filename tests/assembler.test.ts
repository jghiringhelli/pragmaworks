import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readLastContext, readLastGeneratedAt, assemble } from '../src/assembler.js';
import { existsSync, readFileSync } from 'node:fs';

vi.mock('node:fs');
vi.mock('../src/forgecraft.js');
vi.mock('../src/codeseeker.js');
vi.mock('../src/chronicle.js');

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

// Import mocked adapter modules after vi.mock declarations
import { queryForgeCraft } from '../src/forgecraft.js';
import { queryCodeSeeker } from '../src/codeseeker.js';
import { queryChronicle } from '../src/chronicle.js';

describe('readLastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when context.md does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = readLastContext('/some/project');
    expect(result).toBeNull();
  });

  it('parses role, focus area, and task from context header', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      '# Onboarding Context — test-project\n' +
      '_Generated: 2026-04-28 · Role: developer · Focus: auth · Task: add OAuth provider_\n',
    );
    const result = readLastContext('/some/project');
    expect(result).toEqual({
      role: 'developer',
      focusArea: 'auth',
      firstTask: 'add OAuth provider',
    });
  });

  it('parses tech-lead role', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      '_Generated: 2026-04-28 · Role: tech-lead · Focus: payments · Task: review PR_\n',
    );
    const result = readLastContext('/some/project');
    expect(result?.role).toBe('tech-lead');
  });

  it('returns null for unrecognized role', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      '_Generated: 2026-04-28 · Role: unknown-role · Focus: auth · Task: fix bug_\n',
    );
    const result = readLastContext('/some/project');
    expect(result).toBeNull();
  });

  it('returns null when header line is missing', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('# Just a heading with no metadata\n');
    const result = readLastContext('/some/project');
    expect(result).toBeNull();
  });

  it('returns null on read error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => { throw new Error('Permission denied'); });
    const result = readLastContext('/some/project');
    expect(result).toBeNull();
  });
});

describe('readLastGeneratedAt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when file does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = readLastGeneratedAt('/some/project');
    expect(result).toBeNull();
  });

  it('extracts the generated timestamp', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      '_Generated: 2026-04-28 · Role: developer · Focus: auth · Task: fix bug_\n',
    );
    const result = readLastGeneratedAt('/some/project');
    expect(result).toBe('2026-04-28');
  });

  it('returns null when no Generated line present', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('# No metadata here\n');
    const result = readLastGeneratedAt('/some/project');
    expect(result).toBeNull();
  });

  it('returns null on read error', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => { throw new Error('Read error'); });
    const result = readLastGeneratedAt('/some/project');
    expect(result).toBeNull();
  });
});

describe('assemble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryForgeCraft).mockResolvedValue({ available: true, score: 11, maxScore: 14 });
    vi.mocked(queryCodeSeeker).mockResolvedValue({ available: true, modules: [] });
    vi.mocked(queryChronicle).mockResolvedValue({ available: true, decisions: [] });
  });

  it('returns an AssembledContext with all peer tool results', async () => {
    const ctx = await assemble('/project', 'developer', 'auth', 'add OAuth');

    expect(ctx.role).toBe('developer');
    expect(ctx.focusArea).toBe('auth');
    expect(ctx.firstTask).toBe('add OAuth');
    expect(ctx.forgecraft.available).toBe(true);
    expect(ctx.codeseeker.available).toBe(true);
    expect(ctx.chronicle.available).toBe(true);
  });

  it('calls all three adapters concurrently', async () => {
    await assemble('/project', 'tech-lead', 'payments', 'review PR');

    expect(queryForgeCraft).toHaveBeenCalledWith('/project');
    expect(queryCodeSeeker).toHaveBeenCalledWith('payments', '/project');
    expect(queryChronicle).toHaveBeenCalledWith('tech-lead', 'review PR', 'payments', '/project');
  });

  it('sets generatedAt as a valid ISO timestamp', async () => {
    const ctx = await assemble('/project', 'developer', 'auth', 'task');
    expect(() => new Date(ctx.generatedAt)).not.toThrow();
    expect(new Date(ctx.generatedAt).getTime()).toBeGreaterThan(0);
  });

  it('uses package.json name when available', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{"name": "my-awesome-project"}');

    const ctx = await assemble('/project', 'developer', 'auth', 'task');

    expect(ctx.projectName).toBe('my-awesome-project');
  });

  it('falls back to directory name when no package.json', async () => {
    mockExistsSync.mockReturnValue(false);

    const ctx = await assemble('/workspace/cool-service', 'developer', 'auth', 'task');

    expect(ctx.projectName).toBe('cool-service');
  });

  it('falls back to directory name when package.json lacks a name field', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{"version": "1.0.0"}');

    const ctx = await assemble('/workspace/cool-service', 'developer', 'auth', 'task');

    expect(ctx.projectName).toBe('cool-service');
  });

  it('falls back to directory name when package.json is malformed', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('not json at all');

    const ctx = await assemble('/workspace/cool-service', 'developer', 'auth', 'task');

    expect(ctx.projectName).toBe('cool-service');
  });

  it('degrades gracefully when all peer tools fail', async () => {
    vi.mocked(queryForgeCraft).mockResolvedValue({ available: false, error: 'not found' });
    vi.mocked(queryCodeSeeker).mockResolvedValue({ available: false, error: 'not found' });
    vi.mocked(queryChronicle).mockResolvedValue({ available: false, error: 'not found' });

    const ctx = await assemble('/project', 'developer', 'auth', 'task');

    expect(ctx.forgecraft.available).toBe(false);
    expect(ctx.codeseeker.available).toBe(false);
    expect(ctx.chronicle.available).toBe(false);
    expect(ctx.role).toBe('developer');
  });
});
