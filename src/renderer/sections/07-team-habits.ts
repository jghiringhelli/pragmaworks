/**
 * Section 7 — Team-habit analysis (spec.md §5).
 *
 * Arcana-style metrics table plus 'How it shows up' narrative. Metrics
 * cover PR review density, regression coverage of bugfixes, AI-bug rate,
 * and per-module activity.
 */

import type { AuditResult, ChartSpec, TeamHabitData, AiBugAnalysis } from '../../types.js';
import { buildChart } from '../charts.js';

interface TeamHabitSection extends TeamHabitData {
  aiBugs?: AiBugAnalysis;
}

export function renderSection(audit: AuditResult): string {
  const data = (audit.teamHabits ?? null) as TeamHabitSection | null;

  if (!data) {
    return [
      `<section class="pw-section" data-section="07-team-habits">`,
      `  <h2>7. Team-Habit Analysis</h2>`,
      `  <p class="pw-placeholder"><em>Skipped — not requested for this run (individual flow).</em></p>`,
      `</section>`,
    ].join('\n');
  }

  const reviewPct = pct(data.prReviewDensity ?? 0);
  const regPct = pct(data.regressionCoverageRate ?? 0);
  const aiBugRate = data.aiBugs?.aiBugRate;
  const aiBugStr = typeof aiBugRate === 'number' ? pct(aiBugRate) : 'unknown';
  const modules = data.perModuleActivity ?? [];

  const moduleChart: ChartSpec = {
    id: 'chart-module-activity',
    type: 'bar',
    title: 'Commits by module (top 8)',
    labels: modules.slice(0, 8).map(m => m.path),
    datasets: [{ label: 'Commits', data: modules.slice(0, 8).map(m => m.commits) }],
  };

  return [
    `<section class="pw-section" data-section="07-team-habits">`,
    `  <h2>7. Team-Habit Analysis</h2>`,
    `  <table class="pw-table">`,
    `    <thead><tr><th style="width: 40%">Metric</th><th>Value</th><th>Read</th></tr></thead>`,
    `    <tbody>`,
    `      <tr><td><strong>PR review density</strong></td><td>${reviewPct}</td><td>${readReview(data.prReviewDensity ?? 0)}</td></tr>`,
    `      <tr><td><strong>Regression coverage of bugfixes</strong></td><td>${regPct}</td><td>${readReg(data.regressionCoverageRate ?? 0)}</td></tr>`,
    `      <tr><td><strong>AI-attributed bug rate</strong></td><td>${aiBugStr}</td><td>${readAiBug(aiBugRate)}</td></tr>`,
    `      <tr><td><strong>Average commit size</strong></td><td>${Math.round(data.avgCommitSize ?? 0)} lines</td><td>${readCommitSize(data.avgCommitSize ?? 0)}</td></tr>`,
    `      <tr><td><strong>Contributors</strong></td><td>${data.contributorCount ?? 0}</td><td>—</td></tr>`,
    `    </tbody>`,
    `  </table>`,
    `  <h3>How it shows up</h3>`,
    `  <p>${narrative(data, aiBugRate)}</p>`,
    modules.length ? buildChart(moduleChart) : '',
    modules.length
      ? `  <h3>Per-module activity</h3>
  <table class="pw-table">
    <thead><tr><th>Module</th><th>Commits</th><th>Last touched (days ago)</th></tr></thead>
    <tbody>
      ${modules.map(m => `<tr><td><code>${escapeHtml(m.path)}</code></td><td>${m.commits}</td><td>${m.lastTouchedDays}</td></tr>`).join('\n      ')}
    </tbody>
  </table>`
      : '',
    `</section>`,
  ].filter(Boolean).join('\n');
}

function readReview(rate: number): string {
  if (rate >= 0.9) return 'Strong — most PRs are reviewed.';
  if (rate >= 0.5) return 'Patchy — review applied selectively.';
  return 'Weak — most PRs ship without a second pair of eyes.';
}

function readReg(rate: number): string {
  if (rate >= 0.7) return 'Strong — bugfixes routinely ship with a regression test.';
  if (rate >= 0.3) return 'Patchy — fixes sometimes lack a regression guard.';
  return 'Weak — bugs can recur silently.';
}

function readAiBug(rate?: number): string {
  if (typeof rate !== 'number') return '—';
  if (rate >= 0.3) return 'High — AI-introduced regressions are a recurring source of bugs.';
  if (rate >= 0.1) return 'Notable — watch the trend; tighten review of AI-authored diffs.';
  return 'Low — current AI involvement is not a dominant bug source.';
}

function readCommitSize(avg: number): string {
  if (avg <= 80) return 'Small commits — easy to review and revert.';
  if (avg <= 250) return 'Medium — review burden manageable.';
  return 'Large — review fatigue likely, regressions harder to localise.';
}

function narrative(data: TeamHabitSection, aiBugRate?: number): string {
  const parts: string[] = [];
  if ((data.prReviewDensity ?? 0) < 0.5) {
    parts.push('Low review density means changes land without a second reader, eroding the human-judgment layer.');
  }
  if ((data.regressionCoverageRate ?? 0) < 0.3) {
    parts.push('Bugfix commits rarely add a regression test, so the same bug can resurface without anyone noticing.');
  }
  if (typeof aiBugRate === 'number' && aiBugRate >= 0.2) {
    parts.push('AI-attributed bug rate is elevated — the team is shipping AI output faster than it can verify it.');
  }
  if ((data.avgCommitSize ?? 0) > 250) {
    parts.push('Large commits combine refactor and behavior change in one diff, making blame and revert noisy.');
  }
  if (!parts.length) {
    parts.push('Habits track the GS baseline — review density, regression coverage, and commit size are within healthy ranges.');
  }
  return escapeHtml(parts.join(' '));
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
