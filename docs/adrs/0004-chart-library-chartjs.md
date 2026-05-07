# ADR 0004 — Chart library: Chart.js

*Date: 2026-05-07 · Status: Accepted*

## Context

The audit, after-report, and team-habit reports include charts (bar charts for property scores, time series for AI-bug rate over commits, network/graph for collaboration, stacked bars for test pyramid). Charts render in HTML (interactive) and PDF (static via Chromium per ADR 0003).

Candidates: Chart.js, D3, Plotly, Vega/Vega-Lite, ApexCharts, ECharts.

## Decision

**Use Chart.js for v0.x.** Reconsider when interactive dashboards (multi-repo views) become a v1+ requirement.

## Rationale

- **Renders in headless Chromium without server-side computation.** PDF generation needs the chart to render in the same Chromium pass as the rest of the page. Chart.js does this natively.
- **Small bundle.** ~60KB minified. Acceptable in the report HTML.
- **Sufficient chart types** for the eight report sections: bar, stacked bar, radar (for the seven-properties radar), line/time series, scatter. We don't need treemaps, sankey, or complex network layouts in v0.x.
- **Mature, well-documented, low API surface.** Easier for the renderer team to maintain than D3 (which is much more powerful but requires substantially more code per chart).
- **Static config.** Reports are render-once, not interactive dashboards. Chart.js suits static use; D3's strength is interactive viz we don't need yet.

## Consequences

- The collaboration-graph chart in the team-habit report needs network/graph rendering, which Chart.js does not natively do. Use a minimal force-directed layout (e.g., `vis-network` or a hand-rolled SVG) for that single chart. Documented in `src/renderer/charts.ts`.
- If we later need richly interactive multi-repo dashboards on `app.pragmaworks.dev`, that's a separate web app and can use a different library (likely D3 or Plotly). This ADR scopes to the report renderer in the npm package, not the future dashboard.

## Alternatives considered

- **D3** rejected for v0.x: too much code per chart for a report renderer; reconsider for the dashboard.
- **Plotly** rejected: bundle size (~3MB) too large for an embedded report.
- **Vega/Vega-Lite** rejected: declarative grammar is elegant but adds a learning curve and the rendering model is more complex than necessary for static reports.
- **ApexCharts / ECharts** rejected: no specific advantage over Chart.js for our use case; choosing the most-mainstream option simplifies maintenance.
