/**
 * Section 1 — Cover summary (spec.md §5).
 *
 * Single-page, forward-able: overall AI readiness grade, top 3 risks.
 * Letter grade is derived from `cover.overallScore` (0–14, sum across the
 * seven 0/1/2-scored properties).
 */

import type { AuditResult } from '../../types.js';

export function renderSection(audit: AuditResult): string {
  const score = audit.cover?.overallScore ?? 0;
  const grade = scoreToGrade(score);
  const risks = audit.cover?.topRisks?.length
    ? audit.cover.topRisks.slice(0, 3)
    : ['Top risks not yet computed (placeholder).'];

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
    `    <div class="pw-grade-score">${score} / 14</div>`,
    `    <div class="pw-grade-label">Overall AI Readiness</div>`,
    `  </div>`,
    `  <h2>Top 3 risks</h2>`,
    `  <ol class="pw-cover-risks">`,
    risks.map(r => `    <li>${escapeHtml(r)}</li>`).join('\n'),
    `  </ol>`,
    audit.gaps && audit.gaps.length
      ? `  <p class="pw-cover-gaps"><strong>Partial coverage:</strong> ${escapeHtml(audit.gaps.join('; '))}</p>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
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
