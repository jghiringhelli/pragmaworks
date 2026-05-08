/**
 * Section 4 — Test pyramid coverage (spec.md §5).
 *
 * Renders unit/integration/e2e counts as a stacked bar so skew is
 * obvious at a glance. Falls back to a placeholder when the analyzer
 * has not produced a `tests` block yet.
 */

import type { AuditResult, ChartSpec } from '../../types.js';
import { buildChart } from '../charts.js';

interface TestPyramidShape {
  unit?: number;
  integration?: number;
  e2e?: number;
  notes?: string[];
}

export function renderSection(audit: AuditResult): string {
  const data = (audit.tests ?? null) as TestPyramidShape | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="04-test-pyramid">`,
      `  <h2>4. Test pyramid coverage</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — test pyramid analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const unit = data.unit ?? 0;
  const integration = data.integration ?? 0;
  const e2e = data.e2e ?? 0;
  const total = unit + integration + e2e;

  const chartSpec: ChartSpec = {
    id: 'chart-test-pyramid',
    type: 'stackedBar',
    title: 'Test counts by tier',
    labels: ['Tests'],
    datasets: [
      { label: 'Unit', data: [unit] },
      { label: 'Integration', data: [integration] },
      { label: 'E2E', data: [e2e] },
    ],
  };

  return [
    `<section class="pw-section" data-section="04-test-pyramid">`,
    `  <h2>4. Test pyramid coverage</h2>`,
    `  <ul class="pw-kv">`,
    `    <li><strong>Unit:</strong> ${unit}</li>`,
    `    <li><strong>Integration:</strong> ${integration}</li>`,
    `    <li><strong>E2E:</strong> ${e2e}</li>`,
    `    <li><strong>Total:</strong> ${total}</li>`,
    `  </ul>`,
    total > 0 ? buildChart(chartSpec) : '<p>No tests detected.</p>',
    data.notes && data.notes.length
      ? `  <p class="pw-notes"><strong>Notes:</strong> ${escapeHtml(data.notes.join('; '))}</p>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
