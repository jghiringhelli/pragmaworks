/**
 * Section 8 — Roadmap to remediation (spec.md §5).
 *
 * Arcana-style bound prompts: each remediation item is a DP-XXX scoped
 * unit with Title, Estimated effort, Files involved, What's in scope,
 * What's NOT in scope, and Acceptance criteria. AI agents and humans both
 * pick these up as discrete work packages.
 */

import type { AuditResult } from '../../types.js';

interface RemediationItem {
  id?: string;
  priority?: 'P0' | 'P1' | 'P2';
  title?: string;
  rationale?: string;
  effort?: string;
  property?: string;
  files?: string[];
  inScope?: string[];
  outOfScope?: string[];
  acceptance?: string[];
}

export function renderSection(audit: AuditResult): string {
  const raw = (audit.remediation ?? []) as RemediationItem[];

  if (!raw.length) {
    return [
      `<section class="pw-section" data-section="08-roadmap-remediation">`,
      `  <h2>8. Roadmap to Remediation</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — remediation planner not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const sorted = [...raw].sort((a, b) =>
    priorityRank(a.priority) - priorityRank(b.priority),
  );
  const numbered = sorted.map((item, idx) => ({
    ...item,
    id: item.id ?? `DP-${String(idx + 1).padStart(3, '0')}`,
  }));

  return [
    `<section class="pw-section" data-section="08-roadmap-remediation">`,
    `  <h2>8. Roadmap to Remediation</h2>`,
    `  <p>${numbered.length} bound prompt${numbered.length === 1 ? '' : 's'}, prioritised P0 → P2. Each prompt is a self-contained unit of work — pick it up, ship it, score the next audit higher.</p>`,
    `  <div class="pw-roadmap-cards">`,
    numbered.map(renderCard).join('\n'),
    `  </div>`,
    `</section>`,
  ].join('\n');
}

function renderCard(item: RemediationItem & { id: string }): string {
  const pri = item.priority ?? 'P2';
  return [
    `    <article class="pw-roadmap-card pw-pri-${escapeAttr(pri)}">`,
    `      <header class="pw-roadmap-header">`,
    `        <span class="pw-roadmap-id">${escapeHtml(item.id)}</span>`,
    `        <span class="pw-pri pw-pri-${escapeAttr(pri)}">${escapeHtml(pri)}</span>`,
    `        <h3>${escapeHtml(item.title ?? '(untitled)')}</h3>`,
    `      </header>`,
    `      <dl class="pw-roadmap-meta">`,
    `        <dt>Estimated effort</dt><dd>${escapeHtml(item.effort ?? '—')}</dd>`,
    `        <dt>GS property</dt><dd>${escapeHtml(item.property ?? '—')}</dd>`,
    `      </dl>`,
    `      <h4>Files involved</h4>`,
    renderList(item.files, '<em>To be identified during implementation.</em>'),
    `      <h4>What's in scope</h4>`,
    renderList(item.inScope, item.rationale ? `<p>${escapeHtml(item.rationale)}</p>` : '<em>—</em>'),
    `      <h4>What's NOT in scope</h4>`,
    renderList(item.outOfScope, '<em>—</em>'),
    `      <h4>Acceptance criteria</h4>`,
    renderList(item.acceptance, '<em>To be defined before work starts.</em>'),
    `    </article>`,
  ].join('\n');
}

function renderList(items: string[] | undefined, fallback: string): string {
  if (!items || !items.length) {
    return `      <div class="pw-roadmap-empty">${fallback}</div>`;
  }
  return `      <ul>${items.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;
}

function priorityRank(p?: string): number {
  if (p === 'P0') return 0;
  if (p === 'P1') return 1;
  return 2;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\s+/g, '-');
}
