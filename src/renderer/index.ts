/**
 * Renderer barrel — public surface consumed by `src/orchestration/audit.ts`
 * and `src/orchestration/after-report.ts`.
 *
 * Composes the eight-section HTML report (spec.md §5) plus the mandatory
 * licensing + judgment-layer last page, then optionally prints it to PDF
 * via headless Chromium (ADR 0003).
 */

import { writeFileSync } from 'node:fs';
import type { AuditResult, RenderOptions } from '../types.js';
import { buildHtmlReport } from './html.js';
import { generatePdf } from './pdf.js';
import type { PdfOptions } from './pdf.js';
import { SECTION_RENDERERS } from './sections-registry.js';
export { SECTION_RENDERERS } from './sections-registry.js';
export type { SectionRendererEntry } from './sections-registry.js';
export { buildHtmlReport } from './html.js';
export { generatePdf } from './pdf.js';
export { buildChart, DEFAULT_CHART_CDN } from './charts.js';
export { renderLastPage } from './last-page.js';

/** Render an AuditResult to a single self-contained HTML string. */
export function renderHtml(audit: AuditResult, options: RenderOptions = {}): string {
  return buildHtmlReport(audit, options);
}

/**
 * Render an AuditResult to a PDF on disk. Returns the absolute path.
 *
 * Two-step pipeline: produce the canonical HTML, then drive Chromium
 * against it. The HTML is the source of truth — see ADR 0003.
 */
export async function renderPdf(
  audit: AuditResult,
  outputPath: string,
  options: RenderOptions & PdfOptions = {},
): Promise<string> {
  const html = renderHtml(audit, options);
  return generatePdf(html, outputPath, options);
}

/**
 * Convenience: render HTML and write it alongside a PDF in one call.
 * Both paths are returned. PDF failure is rethrown — the caller (orchestrator)
 * catches it and records a gap rather than failing the whole audit.
 */
export async function renderHtmlAndPdf(
  audit: AuditResult,
  htmlPath: string,
  pdfPath: string,
  options: RenderOptions & PdfOptions = {},
): Promise<{ htmlPath: string; pdfPath: string }> {
  const html = renderHtml(audit, options);
  writeFileSync(htmlPath, html, 'utf-8');
  await generatePdf(html, pdfPath, options);
  return { htmlPath, pdfPath };
}

/** Section-renderer registry count (handy for tests verifying the eight-section invariant). */
export const SECTION_COUNT = SECTION_RENDERERS.length;
