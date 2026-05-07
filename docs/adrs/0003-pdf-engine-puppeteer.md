# ADR 0003 — PDF engine: headless Chromium via Puppeteer

*Date: 2026-05-07 · Status: Accepted*

## Context

The audit and after-report are produced in HTML and PDF. The PDF must be:

- Printable cleanly (page breaks, margins, headers/footers)
- Visually consistent with the HTML version
- Capable of rendering charts that the analyzers produce
- Cross-platform (works on Linux CI, macOS dev, Windows dev)
- Deployable inside an npm package without requiring users to install LaTeX or other heavy dependencies

Candidates considered: Puppeteer (Chromium), pdfkit, jsPDF, weasyprint, wkhtmltopdf, pandoc + LaTeX.

## Decision

**Use headless Chromium via Puppeteer (or `@sparticuz/chromium` for Lambda/CI environments).** The renderer produces HTML first, then Chromium renders the HTML to PDF.

## Rationale

- **Single source of truth.** HTML is the canonical format. PDF is a render of HTML. We don't maintain two layouts.
- **Charts render natively.** Whatever JS chart library we adopt (see ADR 0004) renders in Chromium without conversion.
- **Cross-platform.** Puppeteer abstracts Chromium across OSes. We get consistent output.
- **No LaTeX dependency.** Pandoc + LaTeX produces beautiful output but requires users to install a TeX distribution. Unacceptable friction for an `npx pragmaworks audit` that should "just work."
- **Already in our stack.** The MinneAnalytics slides PDF was generated via headless Chromium in this same workspace; the pattern is proven.

## Consequences

- Puppeteer adds ~280MB to the install size when it bundles Chromium. We use `puppeteer-core` plus a thin Chromium-detection layer to use the user's existing Chrome/Edge installation when available; only download Chromium as fallback.
- CI runs need an `--no-sandbox` flag in some environments; documented in `docs/specs/architecture.md`.
- Headers, footers, and page breaks are controlled via CSS `@page` rules. The renderer team owns the print stylesheet at `src/renderer/print.css`.

## Alternatives considered

- **pdfkit / jsPDF** rejected: hand-laying out PDF primitives is fragile for an 8-section report with charts; HTML+CSS is mature for this.
- **weasyprint** rejected: Python dependency, fragile install on Windows, charting story weaker.
- **wkhtmltopdf** rejected: deprecated upstream, security advisories, intermittent CSS support.
- **pandoc + LaTeX** rejected: TeX install friction unacceptable for an `npx`-installed package.
