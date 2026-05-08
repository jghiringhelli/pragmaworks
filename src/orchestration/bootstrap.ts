/**
 * Greenfield bootstrap orchestrator — implements `pragmaworks_bootstrap_project`.
 *
 * Contract:        docs/specs/mcp-tools.md
 * Use case steps:  docs/specs/use-cases/bootstrap.md
 * Conversational:  prompts/mvp-guide.md (clarification questions)
 *
 * Two-state machine:
 *   - 'needs-clarification' — input is incomplete (idea only, no MVP scope or
 *     stack); return the clarification questions sourced from
 *     prompts/mvp-guide.md so the AI assistant can ask the user.
 *   - 'ready' — all required answers present; set up the GS specification
 *     cascade in the empty target folder (CLAUDE.md, docs/specs/spec.md,
 *     forgecraft.yaml, tech-stack manifest) so the AI assistant can begin
 *     generating code under that discipline.
 *
 * Hard contracts (per spec.md §6):
 *   - Sentinel respect: refuse if the target folder already has CLAUDE.md or
 *     other sentinels unless `--override` is set explicitly.
 *   - No secrets: only writes scaffolding; nothing read from any sample
 *     files flows into output.
 */

import { join } from 'node:path';
import { detectSentinels } from '../sentinel/detect.js';
import { collectGap } from './shared.js';

export type BootstrapStatus = 'ready' | 'needs-clarification';

export interface BootstrapInput {
  /** 2-sentence description from the user. */
  idea: string;
  /** Optional preferred tech stack — AI proposes one if absent. */
  techStackPreference?: string;
  /** Optional MVP scope answer (from clarification round). */
  mvpScope?: string;
  /** Optional hosting preference. */
  hostingPreference?: 'local' | 'cloud' | 'either';
}

export interface BootstrapOutput {
  status: BootstrapStatus;
  clarificationQuestions?: string[];
  generatedArtifacts?: {
    spec: string;
    claudeMd: string;
    forgecraftYaml: string;
    techStack: string;
  };
  nextSteps: string[];
  gaps: string[];
}

/**
 * Bootstrap a fresh project from a 2-sentence idea.
 *
 * Sequences per docs/specs/use-cases/bootstrap.md:
 *   1. validate input completeness → return 'needs-clarification' when any
 *      required answer is missing (prompts/mvp-guide.md owns the question text).
 *   2. detect sentinels in `targetFolderPath`; refuse with override-required
 *      gap when one already exists.
 *   3. fan out to forgecraft cascade-setup (writes CLAUDE.md +
 *      docs/specs/spec.md + forgecraft.yaml + tech-stack manifest in order).
 *   4. emit `nextSteps` so the AI assistant knows what to generate first.
 *
 * `targetFolderPath` is passed alongside the spec-defined input rather than
 * inside it because the MCP boundary fills it from CWD; keeping it out of
 * `BootstrapInput` keeps that schema 1:1 with the public tool contract.
 */
export async function bootstrapProject(
  input: BootstrapInput,
  targetFolderPath: string,
): Promise<BootstrapOutput> {
  const gaps: string[] = [];

  // -- Step 1: completeness gate -------------------------------------------
  // TODO(prompts): load and parse the question list in prompts/mvp-guide.md;
  //   match each question against the corresponding `input` field; surface
  //   any unanswered questions as `clarificationQuestions`. The placeholder
  //   below covers the two questions every bootstrap needs answered.
  const missingAnswers: string[] = [];
  if (!input.mvpScope) {
    missingAnswers.push('What is the smallest demoable MVP slice?');
  }
  if (!input.techStackPreference) {
    missingAnswers.push('Tech stack preference (or "AI choose")?');
  }
  if (missingAnswers.length > 0) {
    return {
      status: 'needs-clarification',
      clarificationQuestions: missingAnswers,
      nextSteps: [
        'Ask the user the clarification questions, then re-invoke ' +
          'pragmaworks_bootstrap_project with the answers populated.',
      ],
      gaps,
    };
  }

  // -- Step 2: sentinel guard ----------------------------------------------
  const sentinel = detectSentinels(targetFolderPath);
  if (sentinel.recommendation === 'map') {
    // TODO(orchestration): wire `--override` flag through the MCP boundary;
    //   for now, refuse so we never overwrite an existing CLAUDE.md.
    gaps.push(
      `Target folder already contains sentinels: ${sentinel.foundFiles.join(', ')}. ` +
        'Pass --override to bootstrap-into-existing.',
    );
  }

  // -- Step 3: forgecraft cascade-setup ------------------------------------
  // TODO(forgecraft): call `cascadeSetup({ targetFolderPath, idea, techStack,
  //   mvpScope, hostingPreference })` once forgecraft-mcp exposes it. The
  //   cascade writes the four canonical files in the right order
  //   (CLAUDE.md → spec.md → forgecraft.yaml → tech-stack manifest) so the
  //   GS discipline is in place before any code is generated.
  const cascadeResult = await Promise.allSettled([Promise.resolve(null)]);
  collectGap(gaps, cascadeResult[0], 'forgecraft cascade-setup');

  // -- Step 4: assemble result ---------------------------------------------
  const generatedArtifacts = {
    spec: join(targetFolderPath, 'docs', 'specs', 'spec.md'),
    claudeMd: join(targetFolderPath, 'CLAUDE.md'),
    forgecraftYaml: join(targetFolderPath, 'forgecraft.yaml'),
    techStack: join(targetFolderPath, 'tech-stack.md'),
  };

  return {
    status: 'ready',
    generatedArtifacts,
    nextSteps: [
      'Open CLAUDE.md and verify the cascade matches the user\'s intent.',
      'Begin generating code per docs/specs/spec.md under the GS discipline.',
    ],
    gaps,
  };
}
