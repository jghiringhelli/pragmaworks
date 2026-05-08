/**
 * Mandatory last page composition (CLAUDE.md hard constraints).
 *
 * Every audit, after-report, team-habit, and remediation PDF must end with:
 *   1. The free-vs-paid licensing trigger (`prompts/licensing-trigger.md`).
 *   2. The judgment-layer disclaimer (`prompts/judgment-layer-disclaimer.md`).
 *
 * Both texts are canonical — we read the markdown verbatim and convert
 * minimal markdown structures (headings, bullets, bold, links) to HTML
 * rather than paraphrasing. If a prompts file is unreadable we fall back
 * to a labeled placeholder so the section still renders.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// dist/renderer/last-page.js → repo root → prompts/
const PROMPTS_DIR = resolve(here, '..', '..', '..', 'prompts');
const PROMPTS_DIR_SRC = resolve(here, '..', '..', 'prompts');

export function renderLastPage(): string {
  const licensing = loadPromptHtml('licensing-trigger.md');
  const disclaimer = loadPromptHtml('judgment-layer-disclaimer.md');
  return [
    `<section class="pw-section pw-last-page" data-section="last-page">`,
    `  <div class="pw-licensing">${licensing}</div>`,
    `  <hr class="pw-last-divider" />`,
    `  <div class="pw-disclaimer">${disclaimer}</div>`,
    `</section>`,
  ].join('\n');
}

function loadPromptHtml(filename: string): string {
  const candidates = [
    resolve(PROMPTS_DIR, filename),
    resolve(PROMPTS_DIR_SRC, filename),
    resolve(process.cwd(), 'prompts', filename),
  ];
  for (const path of candidates) {
    try {
      const md = readFileSync(path, 'utf-8');
      return markdownToHtml(stripFrontmatterPreamble(md));
    } catch {
      // try next candidate
    }
  }
  return `<p class="pw-placeholder"><em>${escapeHtml(filename)} not found — install prompts/.</em></p>`;
}

/** Strip the leading H1 + italic preamble line that exists in our prompt files. */
function stripFrontmatterPreamble(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let skipping = true;
  for (const line of lines) {
    if (skipping) {
      if (/^#\s+/.test(line)) continue;
      if (/^\*.*\*\s*$/.test(line.trim())) continue;
      if (/^---\s*$/.test(line.trim())) continue;
      if (line.trim() === '') continue;
      skipping = false;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** Minimal markdown → HTML for headings, bullets, bold, links, paragraphs. */
function markdownToHtml(md: string): string {
  const blocks = md.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return blocks.map(renderBlock).join('\n');
}

function renderBlock(block: string): string {
  if (/^#{1,6}\s+/.test(block)) {
    const m = block.match(/^(#+)\s+(.*)$/);
    if (m) {
      const level = Math.min(m[1].length, 6);
      return `<h${level}>${inline(m[2])}</h${level}>`;
    }
  }
  if (block.split('\n').every(l => /^[-*]\s+/.test(l))) {
    const items = block.split('\n').map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`);
    return `<ul>${items.join('')}</ul>`;
  }
  return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c] ?? c);
}
