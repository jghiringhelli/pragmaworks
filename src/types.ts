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
