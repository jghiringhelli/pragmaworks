/**
 * Section 6 — Security and logging baseline (spec.md §5).
 *
 * Surfaces obvious gaps: secrets in repo, sensitive-data handling,
 * observability. The renderer never echoes any secret value — only
 * the location and category. Until the security analyzer is wired
 * up this is mostly placeholder.
 */

import type { AuditResult } from '../../types.js';

interface SecurityShape {
  secretsScanFindings?: number;
  loggingCoverage?: number;
  sensitiveDataNotes?: string[];
  observabilityGaps?: string[];
}

export function renderSection(audit: AuditResult): string {
  const data = (audit.security ?? null) as SecurityShape | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="06-security-logging">`,
      `  <h2>6. Security and logging baseline</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — security analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const findings = data.secretsScanFindings ?? 0;
  const loggingPct = typeof data.loggingCoverage === 'number'
    ? `${Math.round(data.loggingCoverage * 100)}%`
    : 'unknown';
  const obsGaps = data.observabilityGaps ?? [];
  const sensitive = data.sensitiveDataNotes ?? [];

  return [
    `<section class="pw-section" data-section="06-security-logging">`,
    `  <h2>6. Security and logging baseline</h2>`,
    `  <ul class="pw-kv">`,
    `    <li><strong>Secrets-scan findings:</strong> ${findings}${findings > 0 ? ' <span class="pw-warn">(action required)</span>' : ''}</li>`,
    `    <li><strong>Logging coverage:</strong> ${loggingPct}</li>`,
    `  </ul>`,
    obsGaps.length
      ? `  <h3>Observability gaps</h3><ul>${obsGaps.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>`
      : '',
    sensitive.length
      ? `  <h3>Sensitive-data handling notes</h3><ul>${sensitive.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>`
      : '',
    `  <p class="pw-disclaimer-inline"><em>This audit reports locations and categories only — secret values are never echoed.</em></p>`,
    `</section>`,
  ].filter(Boolean).join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
