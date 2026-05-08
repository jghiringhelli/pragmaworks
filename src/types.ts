// ── Onboardkit-era types (preserved; consumed by assembler/renderer/index) ────

export type Role = 'developer' | 'tech-lead' | 'reviewer' | 'onboarding';

export interface ForgeCraftData {
  available: boolean;
  score?: number;
  maxScore?: number;
  failingGates?: string[];
  specGaps?: string[];
  error?: string;
}

export interface ModuleInfo {
  path: string;
  symbols: string[];
  dependsOn: string[];
  dependedOnBy: string[];
}

export interface CodeSeekerData {
  available: boolean;
  modules?: ModuleInfo[];
  rawSnippets?: string[];
  error?: string;
}

export interface ArchitecturalDecision {
  id?: string;
  content: string;
  memoryType?: string;
  tags?: string[];
}

export interface ChronicleData {
  available: boolean;
  decisions?: ArchitecturalDecision[];
  error?: string;
}

export interface AssembledContext {
  projectName: string;
  generatedAt: string;
  role: Role;
  focusArea: string;
  firstTask: string;
  forgecraft: ForgeCraftData;
  codeseeker: CodeSeekerData;
  chronicle: ChronicleData;
}

// ── Audit / orchestration types (spec.md §4–§6, mcp-tools.md) ─────────────────

/** The seven GS properties scored on every audit (spec.md §4). */
export type GsProperty =
  | 'self-describing'
  | 'bounded'
  | 'composable'
  | 'verifiable'
  | 'auditable'
  | 'defended'
  | 'executable';

/** Output formats for `pragmaworks_audit_repo` (mcp-tools.md). */
export type AuditFormat = 'json-only' | 'json+html' | 'json+html+pdf';

export interface AuditInput {
  /** Absolute path to repo root. */
  repoPath: string;
  /** Default false. When true, the team-habit analyzer is included. */
  includeTeamHabits?: boolean;
  /** Default `pragmaworks/audit-<timestamp>`. */
  branchName?: string;
  /** Default `json+html+pdf`. */
  format?: AuditFormat;
}

export interface AuditSummary {
  /** 0–14, sum across the seven 0/1/2-scored properties. */
  overallScore: number;
  perPropertyScores: Record<GsProperty, 0 | 1 | 2>;
  /** Cover-summary "top 3 risks" (spec.md §5 section 1). */
  topRisks: string[];
  remediationItemCount: number;
}

export interface AuditOutput {
  /** Branch the artifacts were committed to. */
  branch: string;
  /** `<repo>/pragmaworks/audit-<timestamp>/`. */
  outputDir: string;
  reportPaths: {
    json: string;
    html?: string;
    pdf?: string;
  };
  summary: AuditSummary;
  /**
   * Adapter unavailability and partial-data notes — every gap recorded here
   * also appears as a labeled "Section partial" entry in the rendered report.
   */
  gaps: string[];
}

// ── Sentinel detection (architecture.md §7) ───────────────────────────────────

/**
 * Result of scanning a repo for existing AI behavioral files.
 *
 * The detector enumerates `foundFiles` in the priority order from
 * architecture.md §7. The orchestrator uses `recommendation` to decide
 * whether to MAP content into existing files (the default, sentinel-respect)
 * or to require an explicit `--override` from the user.
 */
export interface SentinelDetectionResult {
  /**
   * Repo-relative paths of detected sentinel files, in priority order.
   * Empty array when nothing was found.
   */
  foundFiles: string[];
  /**
   * `'map'`              — at least one sentinel file exists; map content into it.
   * `'override-required'`— caller asked to write but did not pass `--override`
   *                        and a sentinel exists. Set by the orchestrator, not
   *                        the detector itself.
   * `'none-found'`       — no sentinel files; safe to create from scratch.
   */
  recommendation: 'map' | 'override-required' | 'none-found';
}

// ── Git helpers (src/git/*.ts) ────────────────────────────────────────────────

/** Result of creating a fresh branch from current HEAD. */
export interface GitBranchInfo {
  /** The branch that is now checked out. */
  branchName: string;
  /** SHA of the commit the branch was forked from (parent in the audit log). */
  parentSha: string;
}

// ── AuditResult — eight-section JSON consumed by the renderer (spec.md §5) ────

/** Score for one of the seven GS properties (spec.md §4). */
export interface PropertyScore {
  property: GsProperty;
  score: 0 | 1 | 2;
  evidence: string[];
  /** Path within `anchors/` cited for calibration; null when provisional. */
  anchorReference: string | null;
  /** True when the calibration anchor library lacks coverage at this level. */
  provisional: boolean;
  improvementPath: string;
}

/**
 * Canonical audit JSON (`audit.json`). Eight sections in the order rendered
 * by `src/renderer/`. Section field shapes will tighten as the analyzer and
 * renderer modules land — `unknown` here means "shape not yet specified",
 * not "freeform". Update this contract before changing any consuming module.
 */
export interface AuditResult {
  generatedAt: string;
  repoPath: string;
  /** Commit the audit branch was forked from. */
  parentSha: string;
  branch: string;
  sentinel: SentinelDetectionResult;
  /** Section 1 — cover summary (overall grade, top 3 risks). */
  cover: {
    overallScore: number;
    topRisks: string[];
  };
  /** Section 2 — structural disciplines applicability + scoring. TODO: shape. */
  disciplines: unknown[];
  /** Section 3 — documentation health (existence, staleness). TODO: shape. */
  documentation: unknown | null;
  /** Section 4 — test pyramid coverage (unit/integration/e2e). TODO: shape. */
  tests: unknown | null;
  /** Section 5 — seven GS property scores with cited evidence. */
  rubric: PropertyScore[];
  /** Section 6 — security/logging baseline gaps. TODO: shape. */
  security: unknown | null;
  /** Section 7 — team-habit analysis (null when not requested). TODO: shape. */
  teamHabits: unknown | null;
  /** Section 8 — prioritized remediation roadmap. TODO: shape. */
  remediation: unknown[];
  /** Adapter unavailability and partial-data notes. */
  gaps: string[];
}

// ── Analyzer outputs (src/analyzers/*.ts) ─────────────────────────────────────

/**
 * Output of `analyzers/git-history.analyzeGitHistory` — drives spec.md §5
 * section 7 ("Team-habit analysis"). Cheap derivations are populated for
 * real; expensive ones (PR review density, regression coverage, collab
 * graph) are stubbed with documented TODOs in the analyzer.
 */
export interface TeamHabitData {
  /** 0–1 fraction of merged PRs that received at least one review. */
  prReviewDensity: number;
  /** 0–1 fraction of bugfix commits shipping with a regression test. */
  regressionCoverageRate: number;
  /** Lines changed (insertions + deletions) per commit, averaged. */
  avgCommitSize: number;
  /** Distinct authors observed in the window. */
  contributorCount: number;
  /** Weighted co-author / co-edit edges between contributors. */
  collaborationGraph: { from: string; to: string; weight: number }[];
  /** Top-level module commit counts and recency in days since HEAD. */
  perModuleActivity: { path: string; commits: number; lastTouchedDays: number }[];
}

/**
 * Output of `analyzers/ai-bugs.detectAiBugs` — drives the AI-introduced
 * bug-rate signal called out in spec.md §2 (cross-cutting capabilities).
 * Heuristic mode is the default; Chronicle enrichment is opt-in via the
 * caller passing a chronicle client.
 */
export interface AiBugAnalysis {
  /** Commits classified as AI-authored within the window. */
  aiAttributedCommitCount: number;
  /** Bugfix commits attributable to an AI-authored predecessor (or self). */
  aiAttributedBugCount: number;
  /** 0–1 ratio; 0 when the AI-attributed commit count is 0 (no NaN). */
  aiBugRate: number;
  /** 'heuristic' (default) or 'chronicle-enriched' when memory data merged in. */
  method: 'heuristic' | 'chronicle-enriched';
  /** Per-pattern hit counts so the report can show which signals fired. */
  heuristicSignals: { pattern: string; matchedCount: number }[];
}

/**
 * Output of `analyzers/rubric.scoreRubric` — section 5 of the audit JSON.
 * Wraps the canonical `PropertyScore[]` with a precomputed sum so the
 * renderer's cover summary doesn't recompute it.
 */
export interface RubricScores {
  /** One row per `GsProperty` in the canonical order from spec.md §4. */
  scores: PropertyScore[];
  /** Sum of `scores[].score` (0–14). */
  overallScore: number;
}

/** Single discipline applicability + score. */
export interface DisciplineScore {
  discipline: 'SOLID' | 'TDD' | 'hexagonal' | 'layered' | 'clean-architecture' | 'DDD';
  /** Whether the discipline is in the cap-3 set selected for this repo. */
  applies: boolean;
  /** 0/1/2 score against the discipline; 0 when `applies` is false. */
  score: 0 | 1 | 2;
  evidence: string[];
  improvementPath: string;
}

/**
 * Output of `analyzers/disciplines.analyzeDisciplines` — section 2 of the
 * audit JSON. `notes` carries any analyzer-side limits the renderer should
 * surface (e.g. "discipline catalog unavailable; awaiting forgecraft v1.6+").
 */
export interface DisciplineResults {
  disciplines: DisciplineScore[];
  notes: string[];
}
