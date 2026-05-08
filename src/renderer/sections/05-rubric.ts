/**
 * Section 5 — Seven GS rubric scores (spec.md §4, §5).
 *
 * Arcana / Gabriel-style brownfield format: per property, render Score,
 * Evidence (with file:line refs when available), 'Why this score', and
 * 'What raises it'. Radar at the top for at-a-glance shape; per-property
 * cards below for the narrative read.
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

const DEFAULT_RAISERS: Record<GsProperty, string> = {
  'self-describing': 'Add a top-level CLAUDE.md or README that names purpose, public surface, and tool sequencing. Land specs for every public tool.',
  'bounded': 'Split modules whose public surface exceeds a single responsibility. Define and document module boundaries explicitly.',
  'composable': 'Replace ad-hoc cross-imports with explicit interfaces; reduce circular dependencies to zero.',
  'verifiable': 'Raise unit + integration coverage above the manifest thresholds; add regression tests on every fix:.',
  'auditable': 'Adopt Conventional Commits, ADR slot, and a decisions/ folder. Wire the cascade hook so changes name their why.',
  'defended': 'Add secrets scanning, dependency audit, and input-validation review on the public surface.',
  'executable': 'Provide a one-command bootstrap, a green CI on main, and a documented runtime entry point.',
};

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
    `  <h2>5. Seven GS Rubric Scores</h2>`,
    `  <p>Each property scored 0/1/2 against the calibration anchors in <code>anchors/</code>. Overall AI readiness is the sum (0–14).</p>`,
    buildChart(chartSpec),
    `  <div class="pw-rubric-cards">`,
    ordered.map(renderCard).join('\n'),
    `  </div>`,
    `</section>`,
  ].join('\n');
}

function renderCard(s: PropertyScore): string {
  const anchor = s.provisional
    ? `<em>provisional — calibration anchor missing</em>`
    : s.anchorReference
      ? `<code>${escapeHtml(s.anchorReference)}</code>`
      : '—';
  const evidence = (s.evidence ?? []).length
    ? `<ul class="pw-evidence">${(s.evidence ?? []).map(e => `<li><code>${escapeHtml(e)}</code></li>`).join('')}</ul>`
    : `<p class="pw-evidence-empty"><em>None recorded.</em></p>`;
  const why = whyThisScore(s);
  const raises = s.improvementPath && s.improvementPath !== 'Score not yet computed.'
    ? s.improvementPath
    : DEFAULT_RAISERS[s.property];

  return [
    `    <article class="pw-rubric-card pw-rubric-${s.score}">`,
    `      <header class="pw-rubric-header">`,
    `        <h3>${escapeHtml(s.property)}</h3>`,
    `        <span class="pw-rubric-score">${s.score}/2</span>`,
    `      </header>`,
    `      <p class="pw-rubric-anchor"><strong>Anchor:</strong> ${anchor}</p>`,
    `      <h4>Evidence</h4>`,
    `      ${evidence}`,
    `      <h4>Why this score</h4>`,
    `      <p>${escapeHtml(why)}</p>`,
    `      <h4>What raises it</h4>`,
    `      <p>${escapeHtml(raises)}</p>`,
    `    </article>`,
  ].join('\n');
}

function whyThisScore(s: PropertyScore): string {
  const evidenceCount = (s.evidence ?? []).length;
  if (s.score === 2) {
    return `Practiced consistently across the codebase; ${evidenceCount} evidence point${evidenceCount === 1 ? '' : 's'} support the strong reading${s.provisional ? ' (provisional — calibration anchor missing)' : ''}.`;
  }
  if (s.score === 1) {
    return `Practiced in places but not consistently. ${evidenceCount} evidence point${evidenceCount === 1 ? '' : 's'} show partial coverage${s.provisional ? ' (provisional — calibration anchor missing)' : ''}.`;
  }
  return `Not in evidence at the level GS requires. ${evidenceCount === 0 ? 'No supporting artefacts found.' : `${evidenceCount} evidence point${evidenceCount === 1 ? '' : 's'} reviewed; none meet the bar.`}${s.provisional ? ' (provisional — calibration anchor missing)' : ''}`;
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
