/**
 * Migration orchestrator — implements `pragmaworks_migrate_project`.
 *
 * Contract:        docs/specs/mcp-tools.md
 * Use case steps:  docs/specs/use-cases/migrate.md
 * Conversational:  prompts/migration-refinement.md
 *
 * Three-stage state machine:
 *   1. 'audit-complete'      — ran a brownfield audit on the source repo to
 *                              extract a stack-independent specification.
 *   2. 'awaiting-refinement' — surfaced refinement questions (what to drop,
 *                              what to modernize, NFRs to add, target stack);
 *                              question text comes from
 *                              prompts/migration-refinement.md.
 *   3. 'bootstrapped'        — refinement answers in hand; the target folder
 *                              now has a fresh CLAUDE.md/spec/forgecraft.yaml
 *                              cascade derived from the refined spec.
 *
 * The user does not handwrite the new system. `auditRepo` runs stage 1 and
 * `bootstrapProject` runs stage 3; this orchestrator owns the cross-stage
 * state machine and the spec-extraction step that strips stack-specific
 * details from the audit JSON before bootstrap.
 */

import { auditRepo } from './audit.js';
import { bootstrapProject } from './bootstrap.js';

export type MigrateStatus =
  | 'audit-complete'
  | 'awaiting-refinement'
  | 'bootstrapped'
  | 'failed';

export interface MigrateInput {
  /** Existing system to migrate FROM. */
  sourceRepoPath: string;
  /** Empty folder to migrate INTO. */
  targetFolderPath: string;
  /** Optional target tech stack — AI proposes if absent. */
  targetTechStackPreference?: string;
  /** Answers to the refinement conversation (drives stage 3). */
  refinementAnswers?: Record<string, string>;
}

export interface MigrateOutput {
  status: MigrateStatus;
  refinementQuestions?: string[];
  /** Path to the stack-independent extracted spec (set after audit). */
  extractedSpec?: string;
  bootstrappedArtifacts?: {
    spec: string;
    claudeMd: string;
    forgecraftYaml: string;
    techStack: string;
  };
  nextSteps: string[];
  gaps: string[];
}

/**
 * Drive a stack-or-platform migration from `sourceRepoPath` to `targetFolderPath`.
 *
 * State transitions per docs/specs/use-cases/migrate.md:
 *   - no `refinementAnswers` → run audit, return 'awaiting-refinement' with
 *     the question list from prompts/migration-refinement.md.
 *   - `refinementAnswers` present → bootstrap target, return 'bootstrapped'.
 *
 * Auditing and bootstrapping are reused (auditRepo, bootstrapProject) so
 * this file owns only the state machine, the extracted-spec hand-off, and
 * the per-stage gap aggregation.
 */
export async function migrateProject(input: MigrateInput): Promise<MigrateOutput> {
  const gaps: string[] = [];

  // -- Stage 1: brownfield audit on the source repo ------------------------
  // TODO(io): if a fresh audit JSON already exists for sourceRepoPath in the
  //   current minute (idempotency invariant), reuse it instead of re-running.
  let extractedSpec: string | undefined;
  try {
    const auditOut = await auditRepo({
      repoPath: input.sourceRepoPath,
      format: 'json-only',
    });
    // TODO(migrate): call `extractStackIndependentSpec(auditOut.reportPaths.json)`
    //   from '../analyzers/migrate-spec.js' once the analyzer lands. It
    //   strips language- and framework-specific details from the audit JSON
    //   and writes the refined spec to <targetFolderPath>/specs/source-spec.md.
    extractedSpec = auditOut.reportPaths.json;
    gaps.push(...auditOut.gaps);
  } catch (e) {
    return {
      status: 'failed',
      nextSteps: [`Source audit failed: ${(e as Error).message}`],
      gaps,
    };
  }

  // -- Stage 2: refinement gate --------------------------------------------
  if (!input.refinementAnswers) {
    // TODO(prompts): load prompts/migration-refinement.md and emit its
    //   structured question list (what to drop, what to modernize, new NFRs,
    //   target stack confirmation). The placeholders below cover the four
    //   canonical refinement questions until the prompt loader lands.
    return {
      status: 'awaiting-refinement',
      extractedSpec,
      refinementQuestions: [
        'What from the source system should we drop in the new stack?',
        'Which behaviors must be preserved exactly vs. modernized?',
        'What new non-functional requirements (perf, security) apply?',
        'Confirm target tech stack (or "AI choose").',
      ],
      nextSteps: [
        'Ask the user the refinement questions, then re-invoke ' +
          'pragmaworks_migrate_project with `refinementAnswers` populated.',
      ],
      gaps,
    };
  }

  // -- Stage 3: bootstrap target with refined spec -------------------------
  // TODO(migrate): merge `refinementAnswers` into the extracted spec to
  //   produce the final stack-independent input for bootstrap. Today we
  //   only forward the idea-level fields, which loses the NFR + drop-list
  //   refinement. Wire spec-merge before MVP.
  const bootstrapOut = await bootstrapProject(
    {
      idea: 'Migrated from source repo (refined spec at ' + extractedSpec + ')',
      techStackPreference: input.targetTechStackPreference,
      mvpScope: input.refinementAnswers.mvpScope,
    },
    input.targetFolderPath,
  );
  gaps.push(...bootstrapOut.gaps);

  if (bootstrapOut.status !== 'ready') {
    return {
      status: 'failed',
      extractedSpec,
      nextSteps: bootstrapOut.nextSteps,
      gaps,
    };
  }

  return {
    status: 'bootstrapped',
    extractedSpec,
    bootstrappedArtifacts: bootstrapOut.generatedArtifacts,
    nextSteps: [
      'Review the migrated CLAUDE.md/spec.md and begin generating code ' +
        'under the GS discipline.',
    ],
    gaps,
  };
}
