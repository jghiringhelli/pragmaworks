/**
 * Section 4 — Test pyramid coverage (spec.md §5).
 *
 * Arcana-style metric table: a Metric column plus one column per
 * environment (Backend / Web / etc.). When the analyzer reports a single
 * environment we collapse to a single value column. Includes coverage
 * thresholds and a short gap analysis.
 */

import type { AuditResult, ChartSpec } from '../../types.js';
import { buildChart } from '../charts.js';

interface EnvCounts {
  unit?: number;
  integration?: number;
  e2e?: number;
  coverage?: number;
}

interface TestPyramidShape {
  // Single-env back-compat
  unit?: number;
  integration?: number;
  e2e?: number;
  coverage?: number;
  // Multi-env new shape
  environments?: { name: string; counts: EnvCounts }[];
  thresholds?: { line?: number; branch?: number };
  notes?: string[];
}

const DEFAULT_THRESHOLDS = { line: 0.8, branch: 0.7 };

export function renderSection(audit: AuditResult): string {
  const data = (audit.tests ?? null) as TestPyramidShape | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="04-test-pyramid">`,
      `  <h2>4. Test Pyramid Coverage</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — test pyramid analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const envs = data.environments?.length
    ? data.environments
    : [{ name: 'All', counts: { unit: data.unit, integration: data.integration, e2e: data.e2e, coverage: data.coverage } }];
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(data.thresholds ?? {}) };

  const totals = envs.map(e => (e.counts.unit ?? 0) + (e.counts.integration ?? 0) + (e.counts.e2e ?? 0));
  const grandTotal = totals.reduce((a, b) => a + b, 0);

  const chartSpec: ChartSpec = {
    id: 'chart-test-pyramid',
    type: 'stackedBar',
    title: 'Test counts by tier',
    labels: envs.map(e => e.name),
    datasets: [
      { label: 'Unit', data: envs.map(e => e.counts.unit ?? 0) },
      { label: 'Integration', data: envs.map(e => e.counts.integration ?? 0) },
      { label: 'E2E', data: envs.map(e => e.counts.e2e ?? 0) },
    ],
  };

  return [
    `<section class="pw-section" data-section="04-test-pyramid">`,
    `  <h2>4. Test Pyramid Coverage</h2>`,
    `  <p>Coverage thresholds: line ≥ ${pct(thresholds.line)}, branch ≥ ${pct(thresholds.branch)}. Below these, regression risk for AI-edited code rises sharply.</p>`,
    renderMetricTable(envs, thresholds),
    grandTotal > 0 ? buildChart(chartSpec) : '<p>No tests detected.</p>',
    renderGapAnalysis(envs, thresholds),
    data.notes && data.notes.length
      ? `  <p class="pw-notes"><strong>Notes:</strong> ${escapeHtml(data.notes.join('; '))}</p>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
}

function renderMetricTable(envs: { name: string; counts: EnvCounts }[], thresholds: { line: number; branch: number }): string {
  const headerCols = envs.map(e => `<th>${escapeHtml(e.name)}</th>`).join('');
  const row = (label: string, fn: (c: EnvCounts) => string) =>
    `      <tr><td><strong>${label}</strong></td>${envs.map(e => `<td>${fn(e.counts)}</td>`).join('')}</tr>`;
  return [
    `  <table class="pw-table">`,
    `    <thead><tr><th style="width: 28%">Metric</th>${headerCols}</tr></thead>`,
    `    <tbody>`,
    row('Unit tests', c => String(c.unit ?? 0)),
    row('Integration tests', c => String(c.integration ?? 0)),
    row('End-to-end tests', c => String(c.e2e ?? 0)),
    row('Total', c => String((c.unit ?? 0) + (c.integration ?? 0) + (c.e2e ?? 0))),
    row('Coverage', c => typeof c.coverage === 'number'
      ? `${pct(c.coverage)}${c.coverage < thresholds.line ? ' <span class="pw-sev pw-sev-high">below threshold</span>' : ''}`
      : 'unknown'),
    `    </tbody>`,
    `  </table>`,
  ].join('\n');
}

function renderGapAnalysis(envs: { name: string; counts: EnvCounts }[], thresholds: { line: number; branch: number }): string {
  const gaps: string[] = [];
  for (const e of envs) {
    const total = (e.counts.unit ?? 0) + (e.counts.integration ?? 0) + (e.counts.e2e ?? 0);
    if (total === 0) {
      gaps.push(`<strong>${escapeHtml(e.name)}:</strong> no tests of any tier — no regression safety net for AI edits.`);
      continue;
    }
    const u = e.counts.unit ?? 0;
    const i = e.counts.integration ?? 0;
    const eR = e.counts.e2e ?? 0;
    if (u > 0 && i === 0 && eR === 0) {
      gaps.push(`<strong>${escapeHtml(e.name)}:</strong> unit-only pyramid — integration/E2E gap masks contract drift.`);
    }
    if (eR > i && i > 0) {
      gaps.push(`<strong>${escapeHtml(e.name)}:</strong> inverted pyramid (E2E > integration) — slow CI, brittle regressions.`);
    }
    if (typeof e.counts.coverage === 'number' && e.counts.coverage < thresholds.line) {
      gaps.push(`<strong>${escapeHtml(e.name)}:</strong> coverage ${pct(e.counts.coverage)} < threshold ${pct(thresholds.line)}.`);
    }
  }
  if (!gaps.length) return `  <p><strong>Gap analysis:</strong> no critical gaps detected against current thresholds.</p>`;
  return `  <h3>Gap analysis</h3><ul>${gaps.map(g => `<li>${g}</li>`).join('')}</ul>`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
