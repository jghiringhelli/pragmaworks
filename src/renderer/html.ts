/**
 * HTML report composer (spec.md §5 — eight sections + mandatory last page).
 *
 * Single source of truth for the report layout. PDF generation (`pdf.ts`)
 * runs Chromium against this same HTML so the print version stays visually
 * consistent with the on-screen version.
 *
 * CSS is inlined via `<style>` so the file is portable: open it directly
 * from disk and it renders without external assets except Chart.js (CDN).
 */

import type { AuditResult, RenderOptions } from '../types.js';
import { DEFAULT_CHART_CDN } from './charts.js';
import { SECTION_RENDERERS } from './sections-registry.js';
import { renderLastPage } from './last-page.js';

export function buildHtmlReport(audit: AuditResult, options: RenderOptions = {}): string {
  const title = options.title ?? 'PragmaWorks Audit Report';
  const chartCdn = options.chartCdnUrl ?? DEFAULT_CHART_CDN;
  const sections = SECTION_RENDERERS.map(({ render }) => render(audit)).join('\n');
  const lastPage = renderLastPage();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <script src="${chartCdn}"></script>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <main class="pw-report">
${sections}
${lastPage}
  </main>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}

const PRINT_CSS = `
@page { size: Letter; margin: 0.75in; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1f2937; line-height: 1.5; margin: 0; padding: 0;
  font-size: 11pt;
}
.pw-report { max-width: 7in; margin: 0 auto; padding: 0.5in 0; }
.pw-section { page-break-inside: avoid; padding: 1.25rem 0; border-bottom: 1px solid #e5e7eb; }
.pw-section:last-child { border-bottom: none; }
.pw-section-cover { page-break-after: always; text-align: center; padding-top: 1.5in; }
.pw-cover-header h1 { font-size: 28pt; margin-bottom: 0.25rem; color: #111827; }
.pw-cover-meta { color: #6b7280; font-size: 9pt; }
.pw-cover-grade { margin: 2rem auto; }
.pw-grade-letter { font-size: 96pt; font-weight: 700; color: #4F46E5; line-height: 1; }
.pw-grade-score { font-size: 14pt; color: #374151; }
.pw-grade-label { font-size: 10pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
.pw-cover-risks { text-align: left; max-width: 5in; margin: 1rem auto; }
.pw-cover-risks li { margin-bottom: 0.5rem; }
.pw-cover-gaps { font-size: 9pt; color: #6b7280; margin-top: 1rem; }
h2 { font-size: 16pt; color: #111827; margin-top: 0; border-bottom: 2px solid #4F46E5; padding-bottom: 0.25rem; }
h3 { font-size: 12pt; color: #374151; margin-top: 1rem; }
h4.pw-chart-title { font-size: 10pt; color: #6b7280; margin: 0.5rem 0 0.25rem; }
.pw-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 10pt; }
.pw-table th, .pw-table td { border: 1px solid #e5e7eb; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
.pw-table th { background: #f9fafb; font-weight: 600; }
.pw-table ul { margin: 0; padding-left: 1.1rem; }
.pw-kv { list-style: none; padding: 0; margin: 0.5rem 0; }
.pw-kv li { padding: 0.1rem 0; }
.pw-chart { margin: 0.75rem 0; }
.pw-placeholder { color: #6b7280; font-style: italic; }
.pw-warn { color: #DC2626; font-weight: 600; }
.pw-notes { font-size: 9pt; color: #4b5563; }
.pw-pri { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 9pt; font-weight: 600; color: white; }
.pw-pri-P0 { background: #DC2626; }
.pw-pri-P1 { background: #F59E0B; }
.pw-pri-P2 { background: #6b7280; }
.pw-last-page { page-break-before: always; font-size: 10pt; }
.pw-last-divider { margin: 1.5rem 0; border: none; border-top: 1px solid #e5e7eb; }
.pw-licensing h2, .pw-disclaimer h2 { font-size: 14pt; }
.pw-disclaimer-inline { font-size: 9pt; color: #6b7280; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; background: #f3f4f6; padding: 0.05rem 0.25rem; border-radius: 0.2rem; }
a { color: #4F46E5; text-decoration: none; }
a:hover { text-decoration: underline; }
`;
