/**
 * Section 7 — Team-habit analysis (spec.md §5).
 *
 * Renders PR review density, regression coverage of bugfixes, AI-bug rate,
 * commit-size distribution, and a per-module activity table. When the
 * audit was run for an individual flow (`includeTeamHabits: false`), this
 * section emits a 'skipped — not requested' note so the report has a
 * stable section count.
 */

import type { AuditResult, ChartSpec, TeamHabitData } from '../../types.js';
import { buildChart } from '../charts.js';

export function renderSection(audit: AuditResult): string {
  const data = (audit.teamHabits ?? null) as TeamHabitData | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="07-team-habits">`,
      `  <h2>7. Team-habit analysis</h2>`,
      `  <p class="pw-placeholder"><em>Skipped — not requested for this run (individual flow).</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const reviewPct = `${Math.round((data.prReviewDensity ?? 0) * 100)}%`;
  const regPct = `${Math.round((data.regressionCoverageRate ?? 0) * 100)}%`;
  const modules = data.perModuleActivity ?? [];

  const moduleChart: ChartSpec = {
    id: 'chart-module-activity',
    type: 'bar',
    title: 'Commits by module (top 8)',
    labels: modules.slice(0, 8).map(m => m.path),
    datasets: [{ label: 'Commits', data: modules.slice(0, 8).map(m => m.commits) }],
  };

  return [
    `<section class="pw-section" data-section="07-team-habits">`,
    `  <h2>7. Team-habit analysis</h2>`,
    `  <ul class="pw-kv">`,
    `    <li><strong>PR review density:</strong> ${reviewPct}</li>`,
    `    <li><strong>Regression coverage of bugfixes:</strong> ${regPct}</li>`,
    `    <li><strong>Average commit size:</strong> ${Math.round(data.avgCommitSize ?? 0)} lines</li>`,
    `    <li><strong>Contributors:</strong> ${data.contributorCount ?? 0}</li>`,
    `  </ul>`,
    modules.length ? buildChart(moduleChart) : '',
    modules.length
      ? `  <table class="pw-table">
    <thead><tr><th>Module</th><th>Commits</th><th>Last touched (days ago)</th></tr></thead>
    <tbody>
      ${modules.map(m => `<tr><td><code>${escapeHtml(m.path)}</code></td><td>${m.commits}</td><td>${m.lastTouchedDays}</td></tr>`).join('\n      ')}
    </tbody>
  </table>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
