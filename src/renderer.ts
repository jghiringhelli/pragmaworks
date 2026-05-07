/**
 * Renderer — converts an AssembledContext into the context package markdown format.
 *
 * Output format is specified in docs/specs/spec.md and .claude/domain.md.
 * Sections are ordered: spec gaps → module map → architectural decisions → gate status.
 * Missing tool sections include a note explaining how to install the missing tool.
 */

import type { AssembledContext, ForgeCraftData, CodeSeekerData, ChronicleData, ModuleInfo } from './types.js';

/**
 * Render the assembled context as a markdown context package.
 *
 * @param ctx - The assembled context from the assembler
 * @returns Markdown string ready to write to .onboardkit/context.md
 */
export function render(ctx: AssembledContext): string {
  const date = formatDate(ctx.generatedAt);
  const lines: string[] = [
    `# Onboarding Context — ${ctx.projectName}`,
    `_Generated: ${date} · Role: ${ctx.role} · Focus: ${ctx.focusArea} · Task: ${ctx.firstTask}_`,
    '',
  ];

  lines.push(...renderSpecGaps(ctx.forgecraft));
  lines.push(...renderModuleMap(ctx.codeseeker, ctx.focusArea));
  lines.push(...renderArchitecturalDecisions(ctx.chronicle));
  lines.push(...renderGateStatus(ctx.forgecraft));
  lines.push(...renderMissingTools(ctx));

  return lines.join('\n');
}

function renderSpecGaps(fc: ForgeCraftData): string[] {
  const lines: string[] = ['## Open Specification Gaps (ForgeCraft)'];

  if (!fc.available) {
    lines.push(`_ForgeCraft not available${fc.error ? ` — ${fc.error}` : ''}. Install: \`npm install -g forgecraft-mcp\`_`);
    lines.push('');
    return lines;
  }

  if (!fc.specGaps?.length) {
    lines.push('_No open specification gaps detected._');
  } else {
    for (const gap of fc.specGaps) {
      lines.push(`- ${gap}`);
    }
  }

  lines.push('');
  return lines;
}

function renderModuleMap(cs: CodeSeekerData, focusArea: string): string[] {
  const lines: string[] = [`## Module Map — ${focusArea} (CodeSeeker)`];

  if (!cs.available) {
    lines.push(`_CodeSeeker not available${cs.error ? ` — ${cs.error}` : ''}. Install: \`npm install -g codeseeker\`_`);
    lines.push('');
    return lines;
  }

  if (!cs.modules?.length && !cs.rawSnippets?.length) {
    lines.push('_No module data found. Ensure CodeSeeker has indexed this project._');
    lines.push('');
    return lines;
  }

  if (cs.modules?.length) {
    for (const mod of cs.modules) {
      lines.push(...renderModule(mod));
    }
  } else if (cs.rawSnippets?.length) {
    for (const snippet of cs.rawSnippets) {
      lines.push(`- ${snippet}`);
    }
  }

  lines.push('');
  return lines;
}

function renderModule(mod: ModuleInfo): string[] {
  const lines: string[] = [];
  const symbolsStr = mod.symbols.length ? ` — ${mod.symbols.join(', ')}` : '';
  lines.push(`- \`${mod.path}\`${symbolsStr}`);

  if (mod.dependsOn.length > 0) {
    lines.push(`  - Depends on: ${mod.dependsOn.slice(0, 5).join(', ')}`);
  }
  if (mod.dependedOnBy.length > 0) {
    lines.push(`  - Depended on by: ${mod.dependedOnBy.slice(0, 5).join(', ')}`);
  }
  return lines;
}

function renderArchitecturalDecisions(ch: ChronicleData): string[] {
  const lines: string[] = ['## Architectural Decisions (Chronicle)'];

  if (!ch.available) {
    lines.push(`_Chronicle not available${ch.error ? ` — ${ch.error}` : ''}. Install: \`npm install -g chronicle-mcp\`_`);
    lines.push('');
    return lines;
  }

  if (!ch.decisions?.length) {
    lines.push('_No relevant architectural decisions found._');
    lines.push('');
    return lines;
  }

  for (const decision of ch.decisions) {
    const idPrefix = decision.id ? `${decision.id}: ` : '';
    lines.push(`- ${idPrefix}${decision.content}`);
  }

  lines.push('');
  return lines;
}

function renderGateStatus(fc: ForgeCraftData): string[] {
  const lines: string[] = ['## Gate Status (ForgeCraft)'];

  if (!fc.available) {
    lines.push('_ForgeCraft not available — gate status unknown._');
    lines.push('');
    return lines;
  }

  if (fc.score !== undefined && fc.maxScore !== undefined) {
    lines.push(`- Current score: ${fc.score}/${fc.maxScore}`);
  } else {
    lines.push('_Score not determined._');
  }

  if (fc.failingGates?.length) {
    lines.push(`- Failing: ${fc.failingGates.join(', ')}`);
  } else if (fc.score !== undefined) {
    lines.push('- All gates passing.');
  }

  lines.push('');
  return lines;
}

function renderMissingTools(ctx: AssembledContext): string[] {
  const missing: string[] = [];

  if (!ctx.forgecraft.available) missing.push('ForgeCraft (`npm install -g forgecraft-mcp`)');
  if (!ctx.codeseeker.available) missing.push('CodeSeeker (`npm install -g codeseeker`)');
  if (!ctx.chronicle.available) missing.push('Chronicle (`npm install -g chronicle-mcp`)');

  if (!missing.length) return [];

  return [
    '## Missing Tools',
    'Install to complete the context package:',
    ...missing.map(t => `- ${t}`),
    '',
  ];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}
