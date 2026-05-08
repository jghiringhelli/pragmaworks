/**
 * Structural disciplines analyzer — implements `analyzeDisciplines(repoPath)`.
 *
 * Spec ref:        docs/specs/spec.md §5 section 2 (Structural disciplines)
 * Architecture:    docs/specs/architecture.md §1 (src/analyzers/)
 * Output type:     `DisciplineResults` in '../types.ts'
 *
 * Determines which structural disciplines apply to the repo (SOLID, TDD,
 * hexagonal, layered, clean architecture, DDD) and scores each 0/1/2 with
 * cited evidence.
 *
 * For v0.x, the heavy lifting belongs to forgecraft-mcp's discipline
 * catalog (the "cap 3" feature: a project picks at most three disciplines
 * so review stays focused). That catalog is not yet published — this
 * analyzer ships a typed skeleton so the orchestrator's degradation path
 * is exercised today and the contract is fixed for downstream renderer work.
 */

import type { DisciplineResults, DisciplineScore } from '../types.js';

const KNOWN_DISCIPLINES: DisciplineScore['discipline'][] = [
  'SOLID',
  'TDD',
  'hexagonal',
  'layered',
  'clean-architecture',
  'DDD',
];

export async function analyzeDisciplines(
  repoPath: string,
): Promise<DisciplineResults> {
  void repoPath;

  // TODO(forgecraft-cap-3): delegate to the discipline catalog in
  //   forgecraft-mcp once it ships (target: forgecraft v1.6+). The catalog
  //   accepts a repo path, picks ≤3 applicable disciplines based on layout
  //   and dependency manifest, and emits per-discipline 0/1/2 with evidence.
  //   Until then, declare every discipline "not applicable" and surface the
  //   limit in `notes` so the renderer can show it.
  const disciplines: DisciplineScore[] = KNOWN_DISCIPLINES.map((discipline) => ({
    discipline,
    applies: false,
    score: 0,
    evidence: [],
    improvementPath:
      'Awaiting forgecraft v1.6+ discipline catalog (cap 3) — ' +
      'discipline applicability cannot be inferred without it.',
  }));

  return {
    disciplines,
    notes: [
      'Discipline catalog (forgecraft cap 3) not available — pending forgecraft v1.6+.',
    ],
  };
}
