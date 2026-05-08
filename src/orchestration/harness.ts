/**
 * Harness setup orchestrator — implements `pragmaworks_setup_harness`.
 *
 * Contract:        docs/specs/mcp-tools.md
 * Use case steps:  docs/specs/use-cases/harness.md
 *
 * Generates a spec-derived test harness for a project: unit + integration +
 * e2e scaffolding plus the multimodal-AI-as-QA prompts that drive the
 * running app through use cases and compare screenshots/outputs to spec
 * postconditions. Per-stack scaffolding (Node/Python/Go/Rails/etc.) is
 * delegated to per-stack generators in '../harness/<stack>/' so this file
 * stays concerned only with stack dispatch and the multimodal prompt.
 *
 * Hard contracts (per spec.md §6):
 *   - Sentinel respect: never overwrites existing AI behavioral files; the
 *     scaffolders themselves refuse to clobber an existing test directory.
 *   - Graceful degradation: an unrecognized stack surfaces as a gap rather
 *     than a throw, so the AI assistant can ask the user for clarification.
 */

import { detectSentinels } from '../sentinel/detect.js';
import { collectGap } from './shared.js';

export interface HarnessInput {
  repoPath: string;
  /** Detected via tech-stack analyzer or supplied by the caller. */
  techStack: string;
  /** Optional: 'playwright' | 'cypress' | etc. */
  testRunnerPreference?: string;
}

export interface HarnessOutput {
  filesGenerated: string[];
  /** Command the developer runs to execute the harness (e.g., 'npm test'). */
  harnessRunCommand: string;
  /** Prompt that powers the multimodal-AI-as-QA pass over the running app. */
  multimodalVerificationPrompt: string;
  gaps: string[];
}

/**
 * Generate a spec-derived test harness for `input.repoPath`.
 *
 * Sequences per docs/specs/use-cases/harness.md:
 *   1. read docs/specs/spec.md to enumerate the use cases under test.
 *   2. dispatch on `techStack` to the matching per-stack scaffolder.
 *   3. write unit/integration/e2e scaffolding into `<repo>/tests/`.
 *   4. assemble the multimodal-AI-as-QA prompt: each use case's
 *      preconditions/postconditions become checkable assertions the
 *      multimodal model evaluates against screenshots and HTTP responses.
 */
export async function setupHarness(input: HarnessInput): Promise<HarnessOutput> {
  const gaps: string[] = [];

  // -- Step 1: spec ingest -------------------------------------------------
  // TODO(spec-loader): implement '../analyzers/spec-loader.js' that parses
  //   docs/specs/spec.md into use-case records (preconditions, steps,
  //   postconditions). Each use case becomes one e2e scenario plus one
  //   multimodal-verification prompt entry.
  void input.repoPath;

  // -- Step 2: detect sentinels so we don't conflict with existing AI files
  const sentinel = detectSentinels(input.repoPath);
  // The scan covers AI behavioral files, not test directories; we record
  // it so the briefing can mention any existing CLAUDE.md pointers to test
  // conventions the new harness must honor.
  void sentinel.foundFiles;

  // -- Step 3: per-stack scaffolding ---------------------------------------
  // TODO(harness-scaffolder): per-stack generators live in '../harness/<stack>/'.
  //   Dispatch table keyed by `techStack` (lowercased, normalized):
  //     - 'node' / 'typescript' → vitest + supertest + playwright
  //     - 'python'              → pytest + httpx + playwright-python
  //     - 'go'                  → testing + httptest + playwright-go (optional)
  //     - 'rails'               → minitest/rspec + capybara
  //   Each scaffolder takes the parsed use-case records and emits the test
  //   files. Push a gap (don't throw) when the stack is unrecognized so the
  //   AI assistant can ask the user for the correct value.
  const scaffolderResults = await Promise.allSettled([
    Promise.resolve(null), // TODO: scaffolders[input.techStack]({ ...useCases, runner })
  ]);
  collectGap(gaps, scaffolderResults[0], `harness scaffolder for ${input.techStack}`);

  // -- Step 4: multimodal-AI-as-QA prompt ----------------------------------
  // TODO(multimodal-prompt): build the prompt from the use-case records.
  //   The prompt instructs the multimodal model to launch the app, walk the
  //   use case's steps, screenshot at each postcondition, and report
  //   spec-violations as structured failures the harness consumes.
  const multimodalVerificationPrompt =
    'TODO(multimodal): assemble from docs/specs/spec.md use cases.';

  return {
    filesGenerated: [], // TODO: populate from per-stack scaffolder outputs.
    harnessRunCommand: harnessCommandFor(input.techStack, input.testRunnerPreference),
    multimodalVerificationPrompt,
    gaps,
  };
}

/**
 * Map (`techStack`, `testRunnerPreference`) → developer-facing run command.
 * Skeleton stub; per-stack generators may override with their canonical
 * command (`pnpm test`, `pytest`, `go test ./...`, etc.).
 */
function harnessCommandFor(techStack: string, runner?: string): string {
  // TODO(harness): keyed by `techStack` from the per-stack scaffolders;
  //   `runner` overrides the e2e tool when the caller has a preference.
  void techStack;
  void runner;
  return 'npm test';
}
