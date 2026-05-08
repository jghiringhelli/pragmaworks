/**
 * Section 3 — Documentation health (spec.md §5).
 *
 * Existence, staleness, alignment to current code. Until the
 * documentation analyzer is wired up, renders a placeholder that
 * expects `audit.documentation` to be an object with optional
 * `coverage`, `stalePages`, and `notes` fields.
 */

import type { AuditResult } from '../../types.js';

interface DocHealthShape {
  coverage?: number;
  stalePages?: { path: string; lastUpdated?: string }[];
  notes?: string[];
}

export function renderSection(audit: AuditResult): string {
  const data = (audit.documentation ?? null) as DocHealthShape | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="03-documentation-health">`,
      `  <h2>3. Documentation health</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — documentation analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const coveragePct = typeof data.coverage === 'number'
    ? `${Math.round(data.coverage * 100)}%`
    : 'unknown';
  const stale = data.stalePages ?? [];

  return [
    `<section class="pw-section" data-section="03-documentation-health">`,
    `  <h2>3. Documentation health</h2>`,
    `  <ul class="pw-kv">`,
    `    <li><strong>Spec coverage:</strong> ${coveragePct}</li>`,
    `    <li><strong>Stale pages:</strong> ${stale.length}</li>`,
    `  </ul>`,
    stale.length
      ? `  <table class="pw-table">
    <thead><tr><th>Page</th><th>Last updated</th></tr></thead>
    <tbody>
      ${stale.map(p => `<tr><td><code>${escapeHtml(p.path)}</code></td><td>${escapeHtml(p.lastUpdated ?? '—')}</td></tr>`).join('\n      ')}
    </tbody>
  </table>`
      : `  <p>No stale pages detected.</p>`,
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
