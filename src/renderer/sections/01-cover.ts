/**
 * Section 1 — Cover summary (spec.md §5).
 *
 * Arcana-style executive cover: overall score, grade, what's working,
 * context, core problem (root-cause chain), forward risk, top 3 risks.
 */

import type { AuditResult } from '../../types.js';

interface CoverShape {
  overallScore: number;
  topRisks?: string[];
  whatsWorking?: { title: string; evidence: string }[];
  context?: string;
  coreProblem?: { steps: string[]; impact: string };
  ifNothingChanges?: { risks: string[]; urgency: number };
}

export function renderSection(audit: AuditResult): string {
  const cover = (audit.cover ?? {}) as CoverShape;
  const score = cover.overallScore ?? 0;
  const grade = scoreToGrade(score);
  const risks = cover.topRisks?.length ? cover.topRisks.slice(0, 3) : [];
  const wins = cover.whatsWorking ?? [];
  const context = cover.context ?? '';
  const coreProblem = cover.coreProblem ?? null;
  const forward = cover.ifNothingChanges ?? null;

  return [
    `<section class="pw-section pw-section-cover" data-section="01-cover">`,
    `  <header class="pw-cover-header">`,
    `    <h1>PragmaWorks AI Readiness Audit</h1>`,
    `    <p class="pw-cover-meta">`,
    `      Generated ${escapeHtml(audit.generatedAt ?? 'unknown')} · Branch <code>${escapeHtml(audit.branch ?? 'n/a')}</code>`,
    `    </p>`,
    `  </header>`,
    `  <div class="pw-cover-grade">`,
    `    <div class="pw-grade-letter">${grade}</div>`,
    `    <div class="pw-grade-score">Overall Score: ${score} / 14</div>`,
    `    <div class="pw-grade-label">AI Readiness — Grade ${grade}</div>`,
    `  </div>`,
    `  <h2>What's Working</h2>`,
    wins.length
      ? `  <ul class="pw-cover-wins">${wins.slice(0, 4).map(w => `<li><strong>${escapeHtml(w.title)}.</strong> ${escapeHtml(w.evidence)}</li>`).join('')}</ul>`
      : `  <p class="pw-placeholder"><em>Strengths not yet computed.</em></p>`,
    `  <h2>Context</h2>`,
    context
      ? `  <p class="pw-cover-context">${escapeHtml(context)}</p>`
      : `  <p class="pw-placeholder"><em>Team and codebase framing not yet computed.</em></p>`,
    `  <h2>The Core Problem</h2>`,
    coreProblem
      ? renderCoreProblem(coreProblem)
      : `  <p class="pw-placeholder"><em>Root-cause chain not yet computed.</em></p>`,
    `  <h2>If Nothing Changes (3–6 Months)</h2>`,
    forward
      ? renderForward(forward)
      : `  <p class="pw-placeholder"><em>Forward-looking risk not yet computed.</em></p>`,
    `  <h2>Top 3 Risks</h2>`,
    risks.length
      ? `  <ol class="pw-cover-risks">${risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>`
      : `  <p class="pw-placeholder"><em>Top risks not yet computed.</em></p>`,
    audit.gaps && audit.gaps.length
      ? `  <p class="pw-cover-gaps"><strong>Partial coverage:</strong> ${escapeHtml(audit.gaps.join('; '))}</p>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
}

function renderCoreProblem(cp: { steps: string[]; impact: string }): string {
  const steps = cp.steps ?? [];
  if (!steps.length) {
    return `  <p class="pw-placeholder"><em>No root-cause chain recorded.</em></p>`;
  }
  const chain = steps.map(s => `<div class="pw-chain-step">${escapeHtml(s)}</div>`).join('<div class="pw-chain-arrow">↓</div>');
  return [
    `  <div class="pw-core-problem-chain">`,
    `    ${chain}`,
    `    <div class="pw-chain-arrow">↓</div>`,
    `    <div class="pw-chain-impact"><strong>Impact:</strong> ${escapeHtml(cp.impact ?? '')}</div>`,
    `  </div>`,
  ].join('\n');
}

function renderForward(f: { risks: string[]; urgency: number }): string {
  const urgency = Math.max(0, Math.min(10, Math.round(f.urgency ?? 0)));
  const risks = f.risks ?? [];
  return [
    `  <p class="pw-urgency"><strong>Urgency:</strong> ${urgency} / 10</p>`,
    risks.length
      ? `  <ul class="pw-forward-risks">${risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
      : `  <p><em>No forward risks recorded.</em></p>`,
  ].join('\n');
}

function scoreToGrade(score: number): string {
  if (score >= 13) return 'A';
  if (score >= 11) return 'B';
  if (score >= 8) return 'C';
  if (score >= 5) return 'D';
  return 'F';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
