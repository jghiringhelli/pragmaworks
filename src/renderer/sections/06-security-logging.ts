/**
 * Section 6 — Security and logging baseline (spec.md §5).
 *
 * Arcana-style finding rows: Severity | Finding | Location | Recommended
 * action. The renderer never echoes a secret value — only its location
 * and category.
 */

import type { AuditResult } from '../../types.js';

interface SecurityFinding {
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  finding?: string;
  location?: string;
  recommendation?: string;
}

interface SecurityShape {
  secretsScanFindings?: number;
  loggingCoverage?: number;
  sensitiveDataNotes?: string[];
  observabilityGaps?: string[];
  findings?: SecurityFinding[];
}

export function renderSection(audit: AuditResult): string {
  const data = (audit.security ?? null) as SecurityShape | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="06-security-logging">`,
      `  <h2>6. Security & Logging Baseline</h2>`,
      `  <p class="pw-placeholder"><em>Data not available — security analyzer not yet wired.</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const findings = data.findings ?? deriveFindings(data);
  const findingCount = findings.length;
  const loggingPct = typeof data.loggingCoverage === 'number'
    ? `${Math.round(data.loggingCoverage * 100)}%`
    : 'unknown';

  return [
    `<section class="pw-section" data-section="06-security-logging">`,
    `  <h2>6. Security & Logging Baseline</h2>`,
    `  <ul class="pw-kv">`,
    `    <li><strong>Secrets-scan findings:</strong> ${data.secretsScanFindings ?? 0}${(data.secretsScanFindings ?? 0) > 0 ? ' <span class="pw-warn">(action required)</span>' : ''}</li>`,
    `    <li><strong>Logging coverage:</strong> ${loggingPct}</li>`,
    `    <li><strong>Total findings:</strong> ${findingCount}</li>`,
    `  </ul>`,
    findingCount
      ? renderFindingsTable(findings)
      : `  <p>No security or logging findings recorded against the current baseline.</p>`,
    `  <p class="pw-disclaimer-inline"><em>This audit reports locations and categories only — secret values are never echoed.</em></p>`,
    `</section>`,
  ].filter(Boolean).join('\n');
}

function renderFindingsTable(findings: SecurityFinding[]): string {
  const sorted = [...findings].sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
  return [
    `  <table class="pw-table pw-finding-evidence">`,
    `    <thead><tr>`,
    `      <th style="width: 12%">Severity</th>`,
    `      <th style="width: 32%">Finding</th>`,
    `      <th style="width: 28%">Location</th>`,
    `      <th style="width: 28%">Recommended action</th>`,
    `    </tr></thead>`,
    `    <tbody>`,
    sorted.map(f => {
      const sev = (f.severity ?? 'MEDIUM').toUpperCase();
      return `      <tr>
        <td><span class="pw-sev pw-sev-${sev.toLowerCase()}">${sev}</span></td>
        <td>${escapeHtml(f.finding ?? '—')}</td>
        <td>${f.location ? `<code>${escapeHtml(f.location)}</code>` : '—'}</td>
        <td>${escapeHtml(f.recommendation ?? '—')}</td>
      </tr>`;
    }).join('\n'),
    `    </tbody>`,
    `  </table>`,
  ].join('\n');
}

function deriveFindings(data: SecurityShape): SecurityFinding[] {
  const out: SecurityFinding[] = [];
  const secrets = data.secretsScanFindings ?? 0;
  if (secrets > 0) {
    out.push({
      severity: 'HIGH',
      finding: `${secrets} secret-scan hit${secrets === 1 ? '' : 's'} — credentials must be rotated and removed from history.`,
      location: 'See secrets scanner output (locations only — values never logged).',
      recommendation: 'Rotate exposed credentials, purge from git history (BFG / filter-repo), add pre-commit-secrets hook.',
    });
  }
  for (const note of data.sensitiveDataNotes ?? []) {
    out.push({
      severity: 'MEDIUM',
      finding: `Sensitive-data handling concern: ${note}`,
      location: '—',
      recommendation: 'Review and document handling in a decision; add validation at the boundary.',
    });
  }
  for (const gap of data.observabilityGaps ?? []) {
    out.push({
      severity: 'LOW',
      finding: `Observability gap: ${gap}`,
      location: '—',
      recommendation: 'Add structured logging or metric at the surface; cite in the runbook.',
    });
  }
  return out;
}

function sevRank(s?: string): number {
  if (s === 'HIGH') return 0;
  if (s === 'MEDIUM') return 1;
  return 2;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
