import { describe, it, expect } from 'vitest';
import { onboardSchema, refreshSchema, statusSchema } from '../src/questions.js';

describe('onboardSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = onboardSchema.safeParse({
      project_dir: '/some/project',
      role: 'developer',
      focus_area: 'auth',
      first_task: 'add OAuth provider',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = onboardSchema.safeParse({
      project_dir: '/some/project',
      role: 'unknown',
      focus_area: 'auth',
      first_task: 'task',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing project_dir', () => {
    const result = onboardSchema.safeParse({
      role: 'developer',
      focus_area: 'auth',
      first_task: 'task',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing focus_area', () => {
    const result = onboardSchema.safeParse({
      project_dir: '/project',
      role: 'developer',
      first_task: 'task',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing first_task', () => {
    const result = onboardSchema.safeParse({
      project_dir: '/project',
      role: 'developer',
      focus_area: 'auth',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid role values', () => {
    const roles = ['developer', 'tech-lead', 'reviewer', 'onboarding'] as const;
    for (const role of roles) {
      const result = onboardSchema.safeParse({
        project_dir: '/p',
        role,
        focus_area: 'f',
        first_task: 't',
      });
      expect(result.success, `role ${role} should be valid`).toBe(true);
    }
  });
});

describe('refreshSchema', () => {
  it('accepts only project_dir (all optional fields omitted)', () => {
    const result = refreshSchema.safeParse({ project_dir: '/project' });
    expect(result.success).toBe(true);
  });

  it('accepts all optional override fields', () => {
    const result = refreshSchema.safeParse({
      project_dir: '/project',
      role: 'tech-lead',
      focus_area: 'payments',
      first_task: 'review PR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_dir', () => {
    const result = refreshSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid role when provided', () => {
    const result = refreshSchema.safeParse({
      project_dir: '/project',
      role: 'invalid-role',
    });
    expect(result.success).toBe(false);
  });
});

describe('statusSchema', () => {
  it('accepts valid project_dir', () => {
    const result = statusSchema.safeParse({ project_dir: '/project' });
    expect(result.success).toBe(true);
  });

  it('rejects missing project_dir', () => {
    const result = statusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
