/**
 * Seven-properties rubric scorer — implements `scoreRubric(repoPath, options?)`.
 *
 * Spec ref:        docs/specs/spec.md §4 (the seven GS properties)
 * Architecture:    docs/specs/architecture.md §1 (src/analyzers/)
 * Output type:     `RubricScores` in '../types.ts'
 * Calibration:     `anchors/<property>/<score>.md` (per ADR 0005)
 *
 * For v0.x, scoring is delegated to forgecraft-mcp via the inherited
 * adapter at '../forgecraft.ts'. This analyzer is the seam where
 * forgecraft's scoring output is mapped into the canonical
 * `PropertyScore[]` shape consumed by the report renderer, with
 * calibration anchors looked up from `anchors/`.
 *
 * Hard contract (spec.md §6 "Calibration grounding"):
 *   - every score must cite an anchor at the same level
 *   - missing anchor → `provisional: true`, `anchorReference: null`
 */

import type { GsProperty, PropertyScore, RubricScores } from '../types.js';
import { queryForgeCraft } from '../forgecraft.js';

const PROPERTIES: GsProperty[] = [
  'self-describing',
  'bounded',
  'composable',
  'verifiable',
  'auditable',
  'defended',
  'executable',
];

export interface ScoreRubricOptions {
  /** Override the default `<package>/anchors/` lookup root. */
  anchorPath?: string;
}

export async function scoreRubric(
  repoPath: string,
  options?: ScoreRubricOptions,
): Promise<RubricScores> {
  // TODO(forgecraft): the inherited `queryForgeCraft` returns a coarse score
  //   (verify + check_cascade); it does NOT yet expose per-property 0/1/2 with
  //   evidence. Two paths land this:
  //     - extend forgecraft-mcp to emit a 7-row rubric (target: forgecraft v1.6+)
  //     - until then, derive 7 scores from the coarse output here using a
  //       deterministic mapping, marking every score `provisional: true`.
  //   Replace the placeholder loop below once forgecraft v1.6+ is published.
  const fc = await queryForgeCraft(repoPath);
  void fc;
  void options?.anchorPath;

  // TODO(anchor-lookup): for each (property, score) pair, resolve
  //   `${anchorPath ?? defaultAnchorRoot()}/${property}/${score}.md`. When
  //   the file exists, set `anchorReference` to that relative path and
  //   `provisional: false`. When it does not exist, leave `anchorReference`
  //   null and keep `provisional: true` per spec.md §6.

  const scores: PropertyScore[] = PROPERTIES.map((property) => ({
    property,
    score: 0,
    evidence: [],
    anchorReference: null,
    provisional: true,
    improvementPath:
      'Score TBD — pending forgecraft v1.6+ per-property scoring; ' +
      'see docs/adrs/0005 for the calibration anchor library.',
  }));

  const overallScore = scores.reduce((sum, s) => sum + s.score, 0);
  return { scores, overallScore };
}
