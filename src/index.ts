#!/usr/bin/env node

/**
 * gs-onboardkit — MCP server entry point.
 *
 * Exposes three tools:
 *   onboard — full context assembly, three-question flow, writes .onboardkit/context.md
 *   refresh — re-runs assembly, updates context.md with current state
 *   status  — staleness report: when last built, what changed since
 *
 * Each tool calls ForgeCraft, CodeSeeker, and Chronicle concurrently.
 * Missing peer tools are noted in the output; they never block execution.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { onboardSchema, refreshSchema, statusSchema } from './questions.js';
import { assemble, readLastContext, readLastGeneratedAt } from './assembler.js';
import { render } from './renderer.js';
import type { Role } from './types.js';

// ── Server ─────────────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'gs-onboardkit', version: '1.0.0' });

// ── Tool: onboard ──────────────────────────────────────────────────────────────

server.tool(
  'onboard',
  'Assemble a day-one context package for a GS-governed project. ' +
  'Calls ForgeCraft (gate status + spec gaps), CodeSeeker (module map), and Chronicle (architectural decisions). ' +
  'Writes the result to .onboardkit/context.md. ' +
  'Degrades gracefully when peer tools are missing.',
  onboardSchema.shape,
  async (args) => {
    const { project_dir, role, focus_area, first_task } = args;

    const ctx = await assemble(project_dir, role as Role, focus_area, first_task);
    const markdown = render(ctx);

    writeContextFile(project_dir, markdown);

    const missingCount = [ctx.forgecraft, ctx.codeseeker, ctx.chronicle]
      .filter(t => !t.available).length;

    const summary = [
      `Context package written to ${join(project_dir, '.onboardkit', 'context.md')}`,
      `Project: ${ctx.projectName} · Role: ${role} · Focus: ${focus_area}`,
      missingCount > 0
        ? `⚠ ${missingCount} peer tool(s) missing — partial context generated. See ## Missing Tools.`
        : '✓ All three peer tools responded.',
      '',
      markdown,
    ].join('\n');

    return { content: [{ type: 'text', text: summary }] };
  },
);

// ── Tool: refresh ──────────────────────────────────────────────────────────────

server.tool(
  'refresh',
  'Re-assemble and update .onboardkit/context.md with the current project state. ' +
  'Reuses the last recorded role, focus area, and task unless overrides are provided.',
  refreshSchema.shape,
  async (args) => {
    const { project_dir } = args;

    const last = readLastContext(project_dir);
    const role = (args.role ?? last?.role ?? 'developer') as Role;
    const focusArea = args.focus_area ?? last?.focusArea ?? '';
    const firstTask = args.first_task ?? last?.firstTask ?? '';

    if (!focusArea || !firstTask) {
      return {
        content: [{
          type: 'text',
          text: 'No previous context found and focus_area/first_task not provided. Run `onboard` first.',
        }],
      };
    }

    const ctx = await assemble(project_dir, role, focusArea, firstTask);
    const markdown = render(ctx);

    writeContextFile(project_dir, markdown);

    return {
      content: [{
        type: 'text',
        text: [
          `Context refreshed at ${join(project_dir, '.onboardkit', 'context.md')}`,
          `Role: ${role} · Focus: ${focusArea} · Task: ${firstTask}`,
          '',
          markdown,
        ].join('\n'),
      }],
    };
  },
);

// ── Tool: status ───────────────────────────────────────────────────────────────

server.tool(
  'status',
  'Show staleness of .onboardkit/context.md: when it was last built and what has changed since.',
  statusSchema.shape,
  (args) => {
    const { project_dir } = args;
    const contextPath = join(project_dir, '.onboardkit', 'context.md');

    if (!existsSync(contextPath)) {
      return {
        content: [{
          type: 'text',
          text: 'No context package found. Run `onboard` to generate one.',
        }],
      };
    }

    const lastGenerated = readLastGeneratedAt(project_dir);
    const fileStat = statSync(contextPath);
    const lastModified = fileStat.mtime.toISOString();

    const ageMs = Date.now() - fileStat.mtime.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    const staleness = ageDays > 7
      ? `⚠ Context is ${ageDays} days old — consider refreshing.`
      : ageDays > 0
        ? `Context is ${ageDays}d ${ageHours}h old.`
        : `Context is ${ageHours}h old.`;

    const last = readLastContext(project_dir);
    const sessionInfo = last
      ? `Last session: Role=${last.role} · Focus=${last.focusArea} · Task=${last.firstTask}`
      : 'Session metadata not parseable.';

    return {
      content: [{
        type: 'text',
        text: [
          `## Context Status — ${project_dir}`,
          `- Last generated: ${lastGenerated ?? lastModified}`,
          `- File modified: ${lastModified}`,
          `- ${staleness}`,
          `- ${sessionInfo}`,
          '',
          'Run `refresh` to update with the current project state.',
        ].join('\n'),
      }],
    };
  },
);

// ── Helpers ────────────────────────────────────────────────────────────────────

function writeContextFile(projectDir: string, markdown: string): void {
  const dir = join(projectDir, '.onboardkit');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(join(dir, 'context.md'), markdown, 'utf-8');
}

// ── Start ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
