import { describe, it, expect } from 'vitest';
import { render } from '../src/renderer.js';
import type { AssembledContext } from '../src/types.js';

const baseCtx: AssembledContext = {
  projectName: 'test-project',
  generatedAt: '2026-04-28T10:00:00.000Z',
  role: 'developer',
  focusArea: 'auth',
  firstTask: 'add OAuth provider',
  forgecraft: { available: true },
  codeseeker: { available: true, modules: [] },
  chronicle: { available: true, decisions: [] },
};

describe('render', () => {
  it('includes project name and metadata header', () => {
    const output = render(baseCtx);
    expect(output).toContain('# Onboarding Context — test-project');
    expect(output).toContain('Role: developer');
    expect(output).toContain('Focus: auth');
    expect(output).toContain('Task: add OAuth provider');
  });

  it('includes all four sections', () => {
    const output = render(baseCtx);
    expect(output).toContain('## Open Specification Gaps (ForgeCraft)');
    expect(output).toContain('## Module Map — auth (CodeSeeker)');
    expect(output).toContain('## Architectural Decisions (Chronicle)');
    expect(output).toContain('## Gate Status (ForgeCraft)');
  });

  it('renders ForgeCraft score when available', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      forgecraft: { available: true, score: 11, maxScore: 14, failingGates: ['Auditable', 'Executable'] },
    };
    const output = render(ctx);
    expect(output).toContain('11/14');
    expect(output).toContain('Auditable');
    expect(output).toContain('Executable');
  });

  it('renders ForgeCraft spec gaps', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      forgecraft: {
        available: true,
        specGaps: ['use-cases.md: UC-12 missing postcondition', 'ADR-007: rationale field empty'],
      },
    };
    const output = render(ctx);
    expect(output).toContain('UC-12 missing postcondition');
    expect(output).toContain('ADR-007: rationale field empty');
  });

  it('renders module map with symbols and dependencies', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      codeseeker: {
        available: true,
        modules: [{
          path: 'src/auth',
          symbols: ['OAuthProvider', 'SessionManager'],
          dependsOn: ['src/db'],
          dependedOnBy: ['src/api/routes/auth.ts'],
        }],
      },
    };
    const output = render(ctx);
    expect(output).toContain('src/auth');
    expect(output).toContain('OAuthProvider');
    expect(output).toContain('src/db');
    expect(output).toContain('src/api/routes/auth.ts');
  });

  it('renders Chronicle decisions', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      chronicle: {
        available: true,
        decisions: [
          { id: 'ADR-003', content: 'JWT over sessions — chosen for stateless scaling' },
          { content: 'GitHub OAuth as primary provider' },
        ],
      },
    };
    const output = render(ctx);
    expect(output).toContain('ADR-003');
    expect(output).toContain('JWT over sessions');
    expect(output).toContain('GitHub OAuth as primary provider');
  });

  it('shows unavailable note and install hint when ForgeCraft missing', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      forgecraft: { available: false, error: 'command not found' },
    };
    const output = render(ctx);
    expect(output).toContain('ForgeCraft not available');
    expect(output).toContain('forgecraft-mcp');
    expect(output).toContain('## Missing Tools');
  });

  it('shows unavailable note when CodeSeeker missing', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      codeseeker: { available: false },
    };
    const output = render(ctx);
    expect(output).toContain('CodeSeeker not available');
    expect(output).toContain('codeseeker');
  });

  it('shows unavailable note when Chronicle missing', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      chronicle: { available: false },
    };
    const output = render(ctx);
    expect(output).toContain('Chronicle not available');
    expect(output).toContain('chronicle-mcp');
  });

  it('omits Missing Tools section when all tools available', () => {
    const output = render(baseCtx);
    expect(output).not.toContain('## Missing Tools');
  });

  it('shows no gaps message when ForgeCraft has no gaps', () => {
    const output = render(baseCtx);
    expect(output).toContain('No open specification gaps detected');
  });

  it('shows no module data message when CodeSeeker returns empty', () => {
    const output = render(baseCtx);
    expect(output).toContain('No module data found');
  });

  it('shows no decisions message when Chronicle returns empty', () => {
    const output = render(baseCtx);
    expect(output).toContain('No relevant architectural decisions found');
  });

  it('renders rawSnippets when modules array is absent', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      codeseeker: {
        available: true,
        rawSnippets: ['src/auth/service.ts: AuthService', 'src/auth/repo.ts: AuthRepo'],
      },
    };
    const output = render(ctx);
    expect(output).toContain('src/auth/service.ts');
    expect(output).toContain('src/auth/repo.ts');
  });

  it('renders "All gates passing" when score exists but no failing gates', () => {
    const ctx: AssembledContext = {
      ...baseCtx,
      forgecraft: { available: true, score: 14, maxScore: 14 },
    };
    const output = render(ctx);
    expect(output).toContain('14/14');
    expect(output).toContain('All gates passing');
  });

  it('handles invalid generatedAt gracefully by preserving the raw string', () => {
    const ctx: AssembledContext = { ...baseCtx, generatedAt: 'not-a-date' };
    const output = render(ctx);
    expect(output).toContain('not-a-date');
  });
});
