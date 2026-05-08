#!/usr/bin/env node

/**
 * pragmaworks — unified CLI entry point.
 *
 * Subcommand dispatch via a minimal `process.argv[2]` switch; commander is
 * not pulled in to keep the dependency surface narrow. Each subcommand
 * routes to the same orchestration function the MCP server exposes
 * (src/orchestration/), so the CLI and the AI-driven flow stay in lockstep.
 *
 * Subcommands:
 *   audit       — run brownfield AI-readiness audit
 *   remediate   — apply a remediation plan from a prior audit
 *   report      — render an audit JSON as HTML/PDF (placeholder)
 *   bootstrap   — set up the GS cascade in an empty folder
 *   migrate     — multi-stage source-repo → target-folder migration
 *   onboard     — generate an onboarding briefing for a brownfield repo
 *   mcp         — start the MCP server over stdio
 *   dashboard   — placeholder for v0.x
 *
 * Args after the subcommand are parsed as `--key value` / `--flag` pairs.
 */

import { resolve } from 'node:path';
import {
  auditRepo,
  remediate,
  bootstrapProject,
  migrateProject,
  onboardDeveloper,
  generateAfterReport,
} from '../orchestration/index.js';
import { startMcpServer } from '../mcp/server.js';

type Args = Record<string, string | boolean | string[]>;

const HELP = `pragmaworks — AI-readiness audit and remediation suite.

Usage:
  pragmaworks <command> [options]

Commands:
  audit       Run a brownfield AI-readiness audit on a repo
  remediate   Apply a remediation plan from a prior audit
  report      Render an audit JSON as HTML/PDF
  bootstrap   Set up the GS cascade in an empty folder
  migrate     Migrate a source repo into a fresh target folder
  onboard     Generate an onboarding briefing for a brownfield repo
  mcp         Start the MCP server over stdio
  dashboard   (not yet implemented)

Common options:
  --repo <path>            Repo root (defaults to CWD)
  --include-team-habits    Include team-habit analyzer in audit
  --branch <name>          Override the generated branch name
  --format <list>          Comma-separated formats (html,pdf,markdown)
  --help                   Show this help

Examples:
  pragmaworks audit --repo .
  pragmaworks bootstrap --idea "task tracker" --mvp "kanban v1" --stack node
  pragmaworks mcp`;

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith('--')) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function asString(v: unknown, fallback?: string): string {
  if (typeof v === 'string') return v;
  if (fallback !== undefined) return fallback;
  throw new Error('expected string argument');
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

async function main(): Promise<void> {
  const [, , subcommand, ...rest] = process.argv;
  const args = parseArgs(rest);

  if (!subcommand || args['help'] || subcommand === 'help' || subcommand === '--help') {
    process.stdout.write(HELP + '\n');
    return;
  }

  const repoPath = resolve(asString(args['repo'] ?? args['repo-path'] ?? process.cwd()));

  switch (subcommand) {
    case 'mcp': {
      await startMcpServer();
      return;
    }

    case 'audit': {
      const result = await auditRepo({
        repoPath,
        includeTeamHabits: Boolean(args['include-team-habits']),
        branchName: typeof args['branch'] === 'string' ? args['branch'] : undefined,
        format: (args['format'] as never) ?? undefined,
      });
      print(result);
      return;
    }

    case 'remediate': {
      const result = await remediate({
        repoPath,
        auditId: asString(args['audit-id']),
        itemsToApply: asList(args['items']),
        branchName: typeof args['branch'] === 'string' ? args['branch'] : undefined,
      });
      print(result);
      return;
    }

    case 'report': {
      // After-report when both --initial and --final are supplied; otherwise
      // single-audit render is the renderer's job (not yet wired).
      const initial = args['initial'];
      const final = args['final'];
      if (typeof initial === 'string' && typeof final === 'string') {
        const result = await generateAfterReport({
          initialAuditJsonPath: initial,
          finalAuditJsonPath: final,
          format: asList(args['format'] ?? 'html,pdf') as ('html' | 'pdf')[],
          outputDir: typeof args['out'] === 'string' ? args['out'] : undefined,
        });
        print(result);
        return;
      }
      print({
        gaps: ['single-audit report renderer not yet implemented; use --initial and --final for after-report'],
      });
      return;
    }

    case 'bootstrap': {
      const target = resolve(asString(args['target'] ?? repoPath));
      const result = await bootstrapProject(
        {
          idea: asString(args['idea']),
          techStackPreference: typeof args['stack'] === 'string' ? args['stack'] : undefined,
          mvpScope: typeof args['mvp'] === 'string' ? args['mvp'] : undefined,
          hostingPreference: (args['hosting'] as never) ?? undefined,
        },
        target,
      );
      print(result);
      return;
    }

    case 'migrate': {
      const result = await migrateProject({
        sourceRepoPath: resolve(asString(args['source'] ?? repoPath)),
        targetFolderPath: resolve(asString(args['target'])),
        targetTechStackPreference:
          typeof args['stack'] === 'string' ? args['stack'] : undefined,
      });
      print(result);
      return;
    }

    case 'onboard': {
      const result = await onboardDeveloper({
        repoPath,
        developerRole: (args['role'] as never) ?? undefined,
        experienceLevel: (args['level'] as never) ?? undefined,
        focusArea: typeof args['focus'] === 'string' ? args['focus'] : undefined,
        includeTeamHabits: Boolean(args['include-team-habits']),
        format: asList(args['format'] ?? 'markdown') as ('html' | 'pdf' | 'markdown')[],
      });
      print(result);
      return;
    }

    case 'dashboard': {
      process.stdout.write('pragmaworks dashboard: not yet implemented (planned for v0.x).\n');
      return;
    }

    default: {
      process.stderr.write(`Unknown command: ${subcommand}\n\n${HELP}\n`);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  process.stderr.write(`pragmaworks: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
