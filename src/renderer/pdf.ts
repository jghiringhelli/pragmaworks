/**
 * PDF generation via headless Chromium (ADR 0003).
 *
 * Loads the HTML produced by `buildHtmlReport`, lets Chart.js execute on
 * page load, then prints to PDF with the @page rules from `html.ts`.
 *
 * Failure mode (use-cases/audit.md): callers should catch errors here and
 * record a gap in the AuditResult — never let PDF failure cascade and lose
 * the HTML/JSON outputs.
 */

import { writeFileSync } from 'node:fs';

/**
 * Minimal structural type for the puppeteer surface we use. Lets the
 * renderer skeleton typecheck before `npm install` has populated
 * `node_modules/puppeteer` (e.g. on a fresh clone). Replace with
 * `typeof import('puppeteer')` once the dependency is installed and
 * we want full type-aware option coverage.
 */
interface PuppeteerLike {
  launch(opts: { headless: boolean; args?: string[] }): Promise<{
    newPage(): Promise<{
      setContent(html: string, opts: { waitUntil: string; timeout: number }): Promise<void>;
      pdf(opts: Record<string, unknown>): Promise<Uint8Array>;
    }>;
    close(): Promise<void>;
  }>;
}

/** Lazy import so tools that only render HTML don't pay puppeteer's launch cost. */
async function loadPuppeteer(): Promise<PuppeteerLike> {
  // Dynamic import with a non-literal specifier so tsc does not resolve the
  // module at compile time. This keeps the skeleton typecheck-clean before
  // the user runs `npm install`.
  const moduleName = 'puppeteer';
  const mod: { default?: PuppeteerLike } & PuppeteerLike = await import(moduleName);
  return mod.default ?? mod;
}

export interface PdfOptions {
  /** Format passed to Chromium's printToPDF. Default: Letter. */
  format?: 'Letter' | 'A4';
  /**
   * `--no-sandbox` flag for restricted CI environments (architecture.md §3 note).
   * Default: false. Enable when running as root in containers.
   */
  noSandbox?: boolean;
  /**
   * Time (ms) to wait for charts to render after page load. Default: 800.
   * Chart.js binds on DOMContentLoaded; the wait covers font/asset settle.
   */
  chartRenderDelayMs?: number;
}

/**
 * Render `htmlContent` to a PDF at `outputPath`.
 *
 * Returns the absolute path written. Throws on launch / navigation failure
 * so the caller can record a gap and fall through to HTML-only output.
 */
export async function generatePdf(
  htmlContent: string,
  outputPath: string,
  options: PdfOptions = {},
): Promise<string> {
  const { format = 'Letter', noSandbox = false, chartRenderDelayMs = 800 } = options;
  const puppeteer = await loadPuppeteer();

  const launchArgs = noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];
  const browser = await puppeteer.launch({ headless: true, args: launchArgs });
  try {
    const page = await browser.newPage();
    // `setContent` with `networkidle0` lets the Chart.js CDN script load
    // before the @page rules paginate the document.
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

    // Give Chart.js a moment to draw its canvases. Chart.js is synchronous
    // once it has the DOM, but font/layout settle benefits from a short wait.
    await new Promise(resolve => setTimeout(resolve, chartRenderDelayMs));

    const pdfBuffer = await page.pdf({
      format,
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      preferCSSPageSize: true,
    });

    writeFileSync(outputPath, pdfBuffer);
    return outputPath;
  } finally {
    await browser.close();
  }
}
