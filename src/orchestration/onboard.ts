/**
 * Onboarding orchestrator — implements `pragmaworks_onboard_developer`.
 *
 * Contract:        docs/specs/mcp-tools.md
 * Use case steps:  docs/specs/use-cases/onboard.md
 * Conversational:  prompts/onboarding-briefing.md (briefing prompt)
 *
 * Same engine as the brownfield audit (sentinel + adapter fan-out + git
 * branching) but with the onboarding-briefing prompt swapped in. Output is
 * a markdown briefing — "what is this project, how does it work, where to
 * start" — plus an architectural cheat sheet and 2-3 first-task suggestions
 * sized for the developer's first week. NOT the eight-section audit critique.
 *
 * Hard contracts (per spec.md §6):
 *   - Branch isolation: briefings are committed artifacts, like audits, so
 *     they land on a fresh `pragmaworks/onboard-<timestamp>` branch.
 *   - Sentinel respect: briefing references existing CLAUDE.md / agents.md
 *     instead of overwriting.
 *   - Graceful degradation: adapter failure surfaces as a labeled gap.
 *   - No secrets: only architectural knowledge ships in the briefing.
 */

import { join } from 'node:path';
import { queryForgeCraft } from '../forgecraft.js';
import { queryCodeSeeker } from '../codeseeker.js';
import { queryChronicle } from '../chronicle.js';
import { detectSentinels } from '../sentinel/detect.js';
import { createBranchFromHead } from '../git/branch.js';
import { commitFiles } from '../git/commit.js';
import { collectGap, branchSafeTimestamp } from './shared.js';

export type DeveloperRole =
  | 'frontend' | 'backend' | 'full-stack' | 'data' | 'devops' | 'other';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'staff';
export type OnboardFormat = 'html' | 'pdf' | 'markdown';

export interface OnboardInput {
  repoPath: string;
  developerRole?: DeveloperRole;
  experienceLevel?: ExperienceLevel;
  /** Optional module/feature the new developer is starting on. */
  focusArea?: string;
  /** Include team-habit context (good for takeover use case). */
  includeTeamHabits?: boolean;
  /** Default ['markdown']. Markdown is most useful for IDE-pasted reading. */
  format?: OnboardFormat[];
}

export interface FirstTask {
  title: string;
  difficulty: 'easy' | 'medium';
  estimatedHours: number;
}

export interface OnboardOutput {
  outputDir: string;
  briefing: { markdown: string; pdf?: string; html?: string };
  cheatSheet: string;
  firstTasks: FirstTask[];
  gaps: string[];
}

/**
 * Generate an onboarding briefing for `input.repoPath`.
 *
 * Sequences per docs/specs/use-cases/onboard.md:
 *   1. detect sentinels (briefing references existing CLAUDE.md if present)
 *   2. create a fresh branch (briefings are committed artifacts, like audits)
 *   3. fan out adapters in parallel — same set as audit, used to power the
 *      briefing prompt rather than the rubric scoring.
 *   4. assemble the briefing context (architectural cheat sheet, conventions,
 *      first-task suggestions sized to `experienceLevel`).
 *   5. render markdown via the onboarding-briefing prompt; HTML/PDF when
 *      requested in `format`.
 *   6. write artifacts under `<repo>/pragmaworks/onboard-<timestamp>/`.
 *   7. commit on the branch.
 */
export async function onboardDeveloper(input: OnboardInput): Promise<OnboardOutput> {
  const formats = input.format ?? ['markdown'];
  const includeTeamHabits = input.includeTeamHabits ?? false;
  const timestamp = branchSafeTimestamp(new Date());
  const branch = `pragmaworks/onboard-${timestamp}`;
  const outputDir = join(input.repoPath, 'pragmaworks', `onboard-${timestamp}`);
  const gaps: string[] = [];

  // -- Step 1: sentinel detection ------------------------------------------
  const sentinel = detectSentinels(input.repoPath);
  void sentinel;

  // -- Step 2: branch isolation --------------------------------------------
  const branchInfo = await createBranchFromHead(input.repoPath, branch);

  // -- Step 3: adapter fan-out ---------------------------------------------
  const [forgecraftResult, codeseekerResult, chronicleResult] =
    await Promise.allSettled([
      queryForgeCraft(input.repoPath),
      // CodeSeeker accepts the focus area when supplied; an empty string
      // falls back to a project-wide module map.
      queryCodeSeeker(input.focusArea ?? '', input.repoPath),
      // Chronicle in onboarding mode surfaces prior architectural decisions
      // for the briefing's "how this project got here" section.
      queryChronicle('onboarding', '', input.focusArea ?? '', input.repoPath),
    ]);
  collectGap(gaps, forgecraftResult, 'ForgeCraft (governance + rubric context)');
  collectGap(gaps, codeseekerResult, 'CodeSeeker (architectural cheat sheet)');
  collectGap(gaps, chronicleResult, 'Chronicle (architectural decisions)');
  if (includeTeamHabits) {
    // TODO(analyzer): include team-habit data via '../analyzers/git-history.js'.
  }

  // -- Step 4 + 5: render markdown briefing --------------------------------
  // TODO(briefing-renderer): implement '../renderer/onboarding.js' that
  //   consumes prompts/onboarding-briefing.md as the prompt template plus
  //   the adapter results, and emits:
  //     - onboarding-briefing.md      (always)
  //     - architectural-cheatsheet.md (always)
  //     - briefing.html / briefing.pdf when those formats are requested
  //   The renderer also produces `firstTasks`, sized to `experienceLevel`.
  //   Until it lands we return placeholder paths so the return shape stays
  //   type-correct in skeleton phase.
  const briefing: OnboardOutput['briefing'] = {
    markdown: join(outputDir, 'onboarding-briefing.md'),
  };
  if (formats.includes('html')) briefing.html = join(outputDir, 'briefing.html');
  if (formats.includes('pdf')) briefing.pdf = join(outputDir, 'briefing.pdf');
  const cheatSheet = join(outputDir, 'architectural-cheatsheet.md');
  const firstTasks: FirstTask[] = [];

  // -- Step 6 + 7: write + commit ------------------------------------------
  // TODO(io): mkdirp `outputDir`; write briefing artifacts; populate
  //   `writtenFiles` with absolute paths so the commit picks up exactly
  //   what was produced. Also write `<outputDir>/.log/` per architecture.md §8.
  const writtenFiles: string[] = [];
  await commitFiles(
    input.repoPath,
    branchInfo.branchName,
    writtenFiles,
    `pragmaworks: onboard ${timestamp} on ${branchInfo.parentSha}`,
  );

  return { outputDir, briefing, cheatSheet, firstTasks, gaps };
}
