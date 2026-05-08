/**
 * Section 2 — Structural disciplines (spec.md §5).
 *
 * Lists which disciplines apply to this codebase (cap-3 set per spec.md §4)
 * and the 0/1/2 score against each that does. Renders a small bar chart of
 * the applicable scores.
 */

import type { AuditResult, ChartSpec, DisciplineScore } from '../../types.js';
import { buildChart } from '../charts.js';

export function renderSection(audit: AuditResult): string {
  const raw = (audit.disciplines ?? []) as DisciplineScore[];

  if (!raw.length) {
    return [
      `<section class="pw-section" data-section="02-structural-disciplines">`,
      `  <h2>2. Structural disciplines</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — disciplines analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const applicable = raw.filter(d => d.applies);
  const chartSpec: ChartSpec = {
    id: 'chart-disciplines',
    type: 'bar',
    title: 'Applicable discipline scores (0–2)',
    labels: applicable.map(d => d.discipline),
    datasets: [{ label: 'Score', data: applicable.map(d => d.score) }],
  };

  return [
    `<section class="pw-section" data-section="02-structural-disciplines">`,
    `  <h2>2. Structural disciplines</h2>`,
    `  <p>${applicable.length} of ${raw.length} disciplines apply to this codebase.</p>`,
    applicable.length ? buildChart(chartSpec) : '',
    `  <table class="pw-table">`,
    `    <thead><tr><th>Discipline</th><th>Applies</th><th>Score</th><th>Improvement path</th></tr></thead>`,
    `    <tbody>`,
    raw.map(d => `      <tr>
        <td>${escapeHtml(d.discipline)}</td>
        <td>${d.applies ? 'yes' : 'no'}</td>
        <td>${d.applies ? `${d.score}/2` : '—'}</td>
        <td>${escapeHtml(d.improvementPath ?? '')}</td>
      </tr>`).join('\n'),
    `    </tbody>`,
    `  </table>`,
    `</section>`,
  ].filter(Boolean).join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
