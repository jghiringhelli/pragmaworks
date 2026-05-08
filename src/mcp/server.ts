#!/usr/bin/env node

/**
 * pragmaworks — unified MCP server entry point.
 *
 * Exposes the eleven tools catalogued in docs/specs/mcp-tools.md to AI
 * assistants. Each tool registers a Zod input schema and dispatches to the
 * matching orchestration function in src/orchestration/. Handlers never
 * throw on adapter failure — the orchestrators surface gaps via the
 * `gaps` array on each return value, which we forward verbatim.
 *
 * Pattern inherited from src/index.ts (gs-onboardkit): McpServer +
 * StdioServerTransport, `server.tool(name, description, schema.shape, handler)`,
 * structured returns wrapped as `{ content: [{ type: 'text', text }] }`.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  auditRepo,
  remediate,
  bootstrapProject,
  migrateProject,
  onboardDeveloper,
  generateAfterReport,
  setupHarness,
} from '../orchestration/index.js';
import type { GsProperty } from '../types.js';

// ── Server ─────────────────────────────────────────────────────────────────────

export const server = new McpServer({ name: 'pragmaworks', version: '0.1.0' });

const json = (value: unknown): string => JSON.stringify(value, null, 2);
const ok = (value: unknown) => ({ content: [{ type: 'text' as const, text: json(value) }] });

// ── Schemas ────────────────────────────────────────────────────────────────────

const auditSchema = z.object({
  repoPath: z.string().describe('Absolute path to repo root.'),
  includeTeamHabits: z.boolean().optional().describe('Default false.'),
  branchName: z.string().optional(),
  format: z.enum(['json-only', 'json+html', 'json+html+pdf']).optional(),
});

const remediateSchema = z.object({
  repoPath: z.string(),
  auditId: z.string().describe('Audit branch slug or timestamp suffix.'),
  itemsToApply: z.array(z.string()).optional(),
  pauseBoundaries: z.array(
    z.enum(['database-schema', 'public-api', 'breaking-change']),
  ).optional(),
  branchName: z.string().optional(),
});

const bootstrapSchema = z.object({
  idea: z.string().describe('2-sentence description from the user.'),
  techStackPreference: z.string().optional(),
  mvpScope: z.string().optional(),
  hostingPreference: z.enum(['local', 'cloud', 'either']).optional(),
  targetFolderPath: z.string().describe('Empty folder to bootstrap into (CWD by default).'),
});

const migrateSchema = z.object({
  sourceRepoPath: z.string(),
  targetFolderPath: z.string(),
  targetTechStackPreference: z.string().optional(),
  refinementAnswers: z.record(z.string()).optional(),
});

const onboardSchema = z.object({
  repoPath: z.string(),
  developerRole: z.enum(['frontend', 'backend', 'full-stack', 'data', 'devops', 'other']).optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'staff']).optional(),
  focusArea: z.string().optional(),
  includeTeamHabits: z.boolean().optional(),
  format: z.array(z.enum(['html', 'pdf', 'markdown'])).optional(),
});

const generateReportSchema = z.object({
  auditJsonPath: z.string(),
  format: z.array(z.enum(['html', 'pdf'])),
  outputDir: z.string().optional(),
});

const afterReportSchema = z.object({
  initialAuditJsonPath: z.string(),
  finalAuditJsonPath: z.string(),
  format: z.array(z.enum(['html', 'pdf'])),
  outputDir: z.string().optional(),
});

const teamHabitsSchema = z.object({
  repoPath: z.string(),
  windowDays: z.number().int().positive().optional(),
  format: z.array(z.enum(['html', 'pdf'])).optional(),
  outputDir: z.string().optional(),
});

const GS_PROPERTIES = [
  'self-describing', 'bounded', 'composable', 'verifiable',
  'auditable', 'defended', 'executable',
] as const;

const scorePropertySchema = z.object({
  repoPath: z.string(),
  property: z.enum(GS_PROPERTIES),
});

const setupHarnessSchema = z.object({
  repoPath: z.string(),
  techStack: z.string(),
  testRunnerPreference: z.string().optional(),
});

const installChronicleSchema = z.object({
  repoPath: z.string(),
  scope: z.enum(['project', 'team']),
});

// ── Tools ──────────────────────────────────────────────────────────────────────

server.tool(
  'pragmaworks_audit_repo',
  'Run a full AI-readiness audit on a repo: score the seven GS properties with cited evidence, evaluate applicable structural disciplines, assess docs and test pyramid, surface security/logging gaps, propose a remediation plan. Output is structured JSON written to a new branch.',
  auditSchema.shape,
  async (args) => ok(await auditRepo(args)),
);

server.tool(
  'pragmaworks_remediate',
  'Apply a remediation plan from a prior audit. Each item generated under tightened spec; harness verification runs after each change. Branch-isolated. Pauses at user-defined boundaries.',
  remediateSchema.shape,
  async (args) => ok(await remediate(args)),
);

server.tool(
  'pragmaworks_bootstrap_project',
  'Bootstrap a new project from a 2-sentence idea: gather clarifying answers, set up the GS specification cascade in the target folder, prepare the environment for AI-assisted code generation under that discipline.',
  bootstrapSchema.shape,
  async (args) => {
    const { targetFolderPath, ...rest } = args;
    return ok(await bootstrapProject(rest, targetFolderPath));
  },
);

server.tool(
  'pragmaworks_migrate_project',
  'Multi-stage migration: brownfield-audit the source repo to extract a stack-independent spec, run a guided refinement conversation, then bootstrap a fresh project in the target folder using the refined spec.',
  migrateSchema.shape,
  async (args) => ok(await migrateProject(args)),
);

server.tool(
  'pragmaworks_onboard_developer',
  'Brownfield audit run in onboarding mode: produces a "what is this project, how does it work, where to start" briefing rather than a "what is wrong" critique. Includes an architectural cheat sheet and 2-3 first-task suggestions.',
  onboardSchema.shape,
  async (args) => ok(await onboardDeveloper(args)),
);

server.tool(
  'pragmaworks_generate_report',
  'Render an audit JSON output as HTML and/or PDF with the canonical eight sections plus the licensing/judgment-layer disclaimers.',
  generateReportSchema.shape,
  async (args) => {
    // TODO(renderer): wire to '../renderer/index.js' once it lands. Returning
    // a structured stub keeps the MCP surface complete during the skeleton phase.
    const paths: { html?: string; pdf?: string } = {};
    if (args.format.includes('html')) paths.html = `${args.outputDir ?? '.'}/report.html`;
    if (args.format.includes('pdf')) paths.pdf = `${args.outputDir ?? '.'}/report.pdf`;
    return ok({
      paths,
      gaps: ['renderer not yet implemented — paths are placeholders'],
    });
  },
);

server.tool(
  'pragmaworks_generate_after_report',
  'Generate a before/after comparison report from two audit JSON outputs: side-by-side deltas, charts, regression-tests-added log.',
  afterReportSchema.shape,
  async (args) => ok(await generateAfterReport(args)),
);

server.tool(
  'pragmaworks_analyze_team_habits',
  'Analyze commit history (default last 90 days) for PR review density, regression coverage, AI-introduced bug rate, commit-size distribution, collaboration graph. Output as separate PDF with charts.',
  teamHabitsSchema.shape,
  async (args) => {
    // TODO(analyzer): wire to '../analyzers/git-history.js' and the team-habit
    // renderer once both land. Stub keeps the tool surface honest for now.
    void args;
    return ok({
      paths: {},
      summary: {
        prReviewDensity: 0,
        regressionCoverageRate: 0,
        aiIntroducedBugRate: 0,
        avgCommitSize: 0,
        contributorCount: 0,
      },
      gaps: ['team-habit analyzer not yet implemented'],
    });
  },
);

server.tool(
  'pragmaworks_score_property',
  'Score a single GS property on the current codebase, with cited evidence and a calibration anchor reference. Useful for rescoring after a remediation.',
  scorePropertySchema.shape,
  async (args) => {
    // TODO(rubric): wire to '../analyzers/rubric.js' (`scoreSingleProperty`).
    const property = args.property as GsProperty;
    return ok({
      score: 0 as 0 | 1 | 2,
      provisional: true,
      evidence: [],
      anchorReference: `anchors/${property}/0.md`,
      improvementPath: 'rubric scorer not yet implemented',
      gaps: ['rubric scorer not yet implemented'],
    });
  },
);

server.tool(
  'pragmaworks_setup_harness',
  'Generate a spec-derived test harness: unit + integration + e2e scaffolding plus the multimodal-AI-as-QA prompts that drive the running app through use cases and compare outputs to spec postconditions.',
  setupHarnessSchema.shape,
  async (args) => ok(await setupHarness(args)),
);

server.tool(
  'pragmaworks_install_chronicle_project_scope',
  'Install a project-scoped Chronicle instance so future AI sessions on this project inherit architectural decisions, prompt history, and team conventions.',
  installChronicleSchema.shape,
  async (args) => {
    // TODO(chronicle): delegate to chronicle-mcp's project-scope installer
    // once exposed; for now report the configured location and the not-yet-
    // installed status so the AI assistant surfaces it accurately.
    return ok({
      chronicleConfigPath: `${args.repoPath}/.chronicle/config.json`,
      status: 'already-installed' as 'installed' | 'already-installed',
      gaps: ['chronicle project-scope installer not yet implemented'],
    });
  },
);

// ── Start ──────────────────────────────────────────────────────────────────────

export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Allow `node dist/mcp/server.js` to start the server directly.
const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('mcp/server.js');
if (isDirectInvocation) {
  await startMcpServer();
}
