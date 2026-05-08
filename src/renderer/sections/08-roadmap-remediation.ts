/**
 * Section 8 — Roadmap to remediation (spec.md §5).
 *
 * Prioritized action list scoped by current architecture. Each item has
 * a priority (P0/P1/P2), a brief rationale, and effort estimate. Until
 * the remediation planner is wired up this is mostly placeholder.
 */

import type { AuditResult } from '../../types.js';

interface RemediationItem {
  priority?: 'P0' | 'P1' | 'P2';
  title?: string;
  rationale?: string;
  effort?: string;
  property?: string;
}

export function renderSection(audit: AuditResult): string {
  const raw = (audit.remediation ?? []) as RemediationItem[];

  if (!raw.length) {
    return [
      `<section class="pw-section" data-section="08-roadmap-remediation">`,
      `  <h2>8. Roadmap to remediation</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — remediation planner not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const sorted = [...raw].sort((a, b) =>
    priorityRank(a.priority) - priorityRank(b.priority),
  );

  return [
    `<section class="pw-section" data-section="08-roadmap-remediation">`,
    `  <h2>8. Roadmap to remediation</h2>`,
    `  <p>${raw.length} prioritized action${raw.length === 1 ? '' : 's'}.</p>`,
    `  <table class="pw-table">`,
    `    <thead><tr><th>Priority</th><th>Action</th><th>Property</th><th>Effort</th><th>Rationale</th></tr></thead>`,
    `    <tbody>`,
    sorted.map(item => `      <tr>
        <td><span class="pw-pri pw-pri-${escapeAttr(item.priority ?? 'P2')}">${escapeHtml(item.priority ?? 'P2')}</span></td>
        <td>${escapeHtml(item.title ?? '(untitled)')}</td>
        <td>${escapeHtml(item.property ?? '—')}</td>
        <td>${escapeHtml(item.effort ?? '—')}</td>
        <td>${escapeHtml(item.rationale ?? '')}</td>
      </tr>`).join('\n'),
    `    </tbody>`,
    `  </table>`,
    `</section>`,
  ].join('\n');
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
