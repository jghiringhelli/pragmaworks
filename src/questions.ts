import { z } from 'zod';

export const onboardSchema = z.object({
  project_dir: z.string().describe('Absolute path to the project root.'),
  role: z.enum(['developer', 'tech-lead', 'reviewer', 'onboarding'])
    .describe('Your role: developer | tech-lead | reviewer | onboarding'),
  focus_area: z.string()
    .describe('The module or feature you are working on (e.g. auth, payments, src/users/)'),
  first_task: z.string()
    .describe('What you are about to do (e.g. add OAuth provider, fix login bug)'),
});

export const refreshSchema = z.object({
  project_dir: z.string().describe('Absolute path to the project root.'),
  role: z.enum(['developer', 'tech-lead', 'reviewer', 'onboarding']).optional()
    .describe('Role override — omit to reuse last recorded role'),
  focus_area: z.string().optional()
    .describe('Focus area override — omit to reuse last recorded focus area'),
  first_task: z.string().optional()
    .describe('Task override — omit to reuse last recorded task'),
});

export const statusSchema = z.object({
  project_dir: z.string().describe('Absolute path to the project root.'),
});

export type OnboardInput = z.infer<typeof onboardSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
