/**
 * Chart.js inline canvas + script fragment generator (ADR 0004).
 *
 * Each call returns a self-contained HTML fragment: a `<canvas>` element plus
 * a `<script>` block that constructs a Chart.js instance against it. The
 * Chart.js library itself is loaded once via CDN from `<head>` (see
 * `DEFAULT_CHART_CDN`); `buildChart` does not emit the library.
 *
 * Static rendering only — Chromium runs the script during PDF generation
 * (ADR 0003), so the chart appears in both the HTML and PDF outputs.
 */

import type { ChartSpec } from '../types.js';

export const DEFAULT_CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

const DEFAULT_PALETTE = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
];

/**
 * Render a ChartSpec to an inline `<canvas>` + `<script>` fragment.
 *
 * Designed for static PDF capture: the script runs once on DOMContentLoaded.
 * No interactivity, no resize handlers — Chromium prints what it sees.
 */
export function buildChart(spec: ChartSpec): string {
  const width = spec.width ?? 600;
  const height = spec.height ?? 320;
  const config = toChartJsConfig(spec);
  const json = JSON.stringify(config);

  return [
    `<div class="pw-chart" style="max-width:${width}px;">`,
    spec.title ? `  <h4 class="pw-chart-title">${escapeHtml(spec.title)}</h4>` : '',
    `  <canvas id="${escapeAttr(spec.id)}" width="${width}" height="${height}"></canvas>`,
    `  <script>(function(){`,
    `    function init(){`,
    `      var el=document.getElementById(${JSON.stringify(spec.id)});`,
    `      if(!el||typeof Chart==='undefined')return;`,
    `      new Chart(el.getContext('2d'), ${json});`,
    `    }`,
    `    if(document.readyState==='complete')init();`,
    `    else document.addEventListener('DOMContentLoaded', init);`,
    `  })();</script>`,
    `</div>`,
  ].filter(Boolean).join('\n');
}

function toChartJsConfig(spec: ChartSpec): Record<string, unknown> {
  const datasets = spec.datasets.map((ds, i) => ({
    label: ds.label,
    data: ds.data,
    backgroundColor: ds.backgroundColor ?? defaultColors(spec, i),
    borderColor: ds.borderColor ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
    borderWidth: 1,
    fill: spec.type === 'radar',
  }));

  const baseOptions: Record<string, unknown> = {
    responsive: false,
    animation: false,
    plugins: { legend: { display: spec.datasets.length > 1 } },
  };

  switch (spec.type) {
    case 'bar':
      return { type: 'bar', data: { labels: spec.labels, datasets }, options: baseOptions };
    case 'stackedBar':
      return {
        type: 'bar',
        data: { labels: spec.labels, datasets },
        options: {
          ...baseOptions,
          scales: { x: { stacked: true }, y: { stacked: true } },
        },
      };
    case 'radar':
      return { type: 'radar', data: { labels: spec.labels, datasets }, options: baseOptions };
    case 'line':
      return { type: 'line', data: { labels: spec.labels, datasets }, options: baseOptions };
    case 'pie':
      return { type: 'pie', data: { labels: spec.labels, datasets }, options: baseOptions };
  }
}

function defaultColors(spec: ChartSpec, datasetIndex: number): string | string[] {
  if (spec.type === 'pie' || spec.type === 'stackedBar') {
    return spec.labels.map((_, i) => DEFAULT_PALETTE[(datasetIndex + i) % DEFAULT_PALETTE.length]);
  }
  return DEFAULT_PALETTE[datasetIndex % DEFAULT_PALETTE.length];
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\s+/g, '-');
}
