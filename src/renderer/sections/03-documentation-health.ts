/**
 * Section 3 — Documentation health (spec.md §5).
 *
 * Arcana-style finding/evidence layout: each gap (missing spec, stale page,
 * absent ADR) is a row with severity, finding, and evidence. Coverage
 * headline sits above the table for at-a-glance triage.
 */

import type { AuditResult } from '../../types.js';

interface DocFinding {
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  finding?: string;
  evidence?: string;
}

interface DocHealthShape {
  coverage?: number;
  stalePages?: { path: string; lastUpdated?: string }[];
  findings?: DocFinding[];
  notes?: string[];
}

export function renderSection(audit: AuditResult): string {
  const data = (audit.documentation ?? null) as DocHealthShape | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="03-documentation-health">`,
      `  <h2>3. Documentation Health</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — documentation analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const coveragePct = typeof data.coverage === 'number'
    ? `${Math.round(data.coverage * 100)}%`
    : 'unknown';
  const stale = data.stalePages ?? [];
  const findings = data.findings ?? deriveFindings(data);

  return [
    `<section class="pw-section" data-section="03-documentation-health">`,
    `  <h2>3. Documentation Health</h2>`,
    `  <ul class="pw-kv">`,
    `    <li><strong>Spec coverage:</strong> ${coveragePct}</li>`,
    `    <li><strong>Stale pages:</strong> ${stale.length}</li>`,
    `    <li><strong>Open findings:</strong> ${findings.length}</li>`,
    `  </ul>`,
    findings.length
      ? renderFindingsTable(findings)
      : `  <p>No documentation findings recorded.</p>`,
    stale.length
      ? `  <h3>Stale pages</h3>
  <table class="pw-table">
    <thead><tr><th>Page</th><th>Last updated</th></tr></thead>
    <tbody>
      ${stale.map(p => `<tr><td><code>${escapeHtml(p.path)}</code></td><td>${escapeHtml(p.lastUpdated ?? '—')}</td></tr>`).join('\n      ')}
    </tbody>
  </table>`
      : '',
    data.notes && data.notes.length
      ? `  <p class="pw-notes"><strong>Notes:</strong> ${escapeHtml(data.notes.join('; '))}</p>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
}

function renderFindingsTable(findings: DocFinding[]): string {
  return [
    `  <table class="pw-table pw-finding-evidence">`,
    `    <thead><tr><th style="width: 12%">Severity</th><th style="width: 44%">Finding</th><th style="width: 44%">Evidence</th></tr></thead>`,
    `    <tbody>`,
    findings.map(f => {
      const sev = (f.severity ?? 'MEDIUM').toUpperCase();
      return `      <tr>
        <td><span class="pw-sev pw-sev-${sev.toLowerCase()}">${sev}</span></td>
        <td>${escapeHtml(f.finding ?? '')}</td>
        <td>${escapeHtml(f.evidence ?? '—')}</td>
      </tr>`;
    }).join('\n'),
    `    </tbody>`,
    `  </table>`,
  ].join('\n');
}

function deriveFindings(data: DocHealthShape): DocFinding[] {
  const out: DocFinding[] = [];
  const cov = data.coverage ?? null;
  if (cov !== null && cov < 0.5) {
    out.push({
      severity: 'HIGH',
      finding: `Spec coverage at ${Math.round(cov * 100)}% — over half of public surface lacks a spec.`,
      evidence: 'Spec coverage analyzer (docs/specs/ vs detected public surface).',
    });
  }
  for (const p of data.stalePages ?? []) {
    out.push({
      severity: 'MEDIUM',
      finding: `Page is stale relative to current code.`,
      evidence: `${p.path}${p.lastUpdated ? ` (last updated ${p.lastUpdated})` : ''}`,
    });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
