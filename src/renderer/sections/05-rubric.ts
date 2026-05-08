/**
 * Section 5 — Seven GS rubric scores (spec.md §4, §5).
 *
 * Per property: score, evidence, anchor reference, improvement path.
 * Renders a radar chart showing all seven scores at a glance, then a
 * detail table with each property.
 */

import type { AuditResult, ChartSpec, GsProperty, PropertyScore } from '../../types.js';
import { buildChart } from '../charts.js';

const CANONICAL_ORDER: GsProperty[] = [
  'self-describing',
  'bounded',
  'composable',
  'verifiable',
  'auditable',
  'defended',
  'executable',
];

export function renderSection(audit: AuditResult): string {
  const scores = audit.rubric ?? [];
  const byProp = new Map(scores.map(s => [s.property, s]));
  const ordered: PropertyScore[] = CANONICAL_ORDER.map(p =>
    byProp.get(p) ?? placeholderScore(p),
  );

  const chartSpec: ChartSpec = {
    id: 'chart-rubric',
    type: 'radar',
    title: 'Seven GS properties (0–2)',
    labels: ordered.map(s => s.property),
    datasets: [{ label: 'Score', data: ordered.map(s => s.score) }],
  };

  return [
    `<section class="pw-section" data-section="05-rubric">`,
    `  <h2>5. Seven GS rubric scores</h2>`,
    buildChart(chartSpec),
    `  <table class="pw-table">`,
    `    <thead><tr><th>Property</th><th>Score</th><th>Anchor</th><th>Evidence</th><th>Improvement path</th></tr></thead>`,
    `    <tbody>`,
    ordered.map(renderRow).join('\n'),
    `    </tbody>`,
    `  </table>`,
    `</section>`,
  ].join('\n');
}

function renderRow(s: PropertyScore): string {
  const anchor = s.provisional
    ? `<em>provisional — calibration anchor missing</em>`
    : s.anchorReference
      ? `<code>${escapeHtml(s.anchorReference)}</code>`
      : '—';
  const evidence = s.evidence?.length
    ? `<ul>${s.evidence.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
    : '<em>none recorded</em>';
  return `      <tr>
        <td><strong>${escapeHtml(s.property)}</strong></td>
        <td>${s.score}/2</td>
        <td>${anchor}</td>
        <td>${evidence}</td>
        <td>${escapeHtml(s.improvementPath ?? '')}</td>
      </tr>`;
}

function placeholderScore(property: GsProperty): PropertyScore {
  return {
    property,
    score: 0,
    evidence: [],
    anchorReference: null,
    provisional: true,
    improvementPath: 'Score not yet computed.',
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
