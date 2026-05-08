/**
 * Section 2 — Structural disciplines (spec.md §5).
 *
 * Arcana-style finding/evidence layout: applicable disciplines from the
 * cap-3 set, each row a Finding with Evidence and a severity tag
 * (HIGH/MEDIUM/LOW) derived from the 0/1/2 score.
 */

import type { AuditResult, ChartSpec, DisciplineScore } from '../../types.js';
import { buildChart } from '../charts.js';

export function renderSection(audit: AuditResult): string {
  const raw = (audit.disciplines ?? []) as DisciplineScore[];

  if (!raw.length) {
    return [
      `<section class="pw-section" data-section="02-structural-disciplines">`,
      `  <h2>2. Structural Disciplines</h2>`,
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
    `  <h2>2. Structural Disciplines</h2>`,
    `  <p>${applicable.length} of ${raw.length} disciplines apply to this codebase. Each row below pairs a finding (what was observed) with the evidence (where it was observed) and a severity tag.</p>`,
    applicable.length ? buildChart(chartSpec) : '',
    `  <table class="pw-table pw-finding-evidence">`,
    `    <thead><tr><th style="width: 12%">Severity</th><th style="width: 18%">Discipline</th><th style="width: 35%">Finding</th><th style="width: 35%">Evidence</th></tr></thead>`,
    `    <tbody>`,
    raw.map(renderRow).join('\n'),
    `    </tbody>`,
    `  </table>`,
    `</section>`,
  ].filter(Boolean).join('\n');
}

function renderRow(d: DisciplineScore): string {
  if (!d.applies) {
    return `      <tr>
        <td><span class="pw-sev pw-sev-na">N/A</span></td>
        <td>${escapeHtml(d.discipline)}</td>
        <td>Discipline does not apply to this codebase shape.</td>
        <td>—</td>
      </tr>`;
  }
  const severity = scoreToSeverity(d.score);
  const finding = d.score === 2
    ? `Practiced consistently (score ${d.score}/2). ${escapeHtml(d.improvementPath ?? '')}`
    : d.score === 1
      ? `Partially applied (score ${d.score}/2). ${escapeHtml(d.improvementPath ?? '')}`
      : `Not applied where expected (score ${d.score}/2). ${escapeHtml(d.improvementPath ?? '')}`;
  const evidence = (d.evidence ?? []).length
    ? `<ul>${(d.evidence ?? []).map(e => `<li><code>${escapeHtml(e)}</code></li>`).join('')}</ul>`
    : '<em>none recorded</em>';
  return `      <tr>
        <td><span class="pw-sev pw-sev-${severity.toLowerCase()}">${severity}</span></td>
        <td>${escapeHtml(d.discipline)}</td>
        <td>${finding}</td>
        <td>${evidence}</td>
      </tr>`;
}

function scoreToSeverity(score: 0 | 1 | 2): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score === 0) return 'HIGH';
  if (score === 1) return 'MEDIUM';
  return 'LOW';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
