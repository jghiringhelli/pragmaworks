/**
 * Orchestration barrel — re-exports every flow's entry point and types.
 *
 * Used by '../mcp/server.ts' to expose the catalog in docs/specs/mcp-tools.md
 * without each individual MCP tool registration having to know per-flow paths.
 * Adding a new orchestrator? Add the use case + tool to mcp-tools.md first
 * (see "Adding a new tool" in that file), then re-export it from here.
 */

export { auditRepo } from './audit.js';
export { remediate } from './remediate.js';
export { bootstrapProject } from './bootstrap.js';
export { migrateProject } from './migrate.js';
export { onboardDeveloper } from './onboard.js';
export { generateAfterReport } from './after-report.js';
export { setupHarness } from './harness.js';

export { collectGap, branchSafeTimestamp } from './shared.js';

export type {
  RemediateInput,
  RemediateOutput,
  AppliedRemediationItem,
  PauseBoundary,
  RemediationItemStatus,
} from './remediate.js';
export type {
  BootstrapInput,
  BootstrapOutput,
  BootstrapStatus,
} from './bootstrap.js';
export type {
  MigrateInput,
  MigrateOutput,
  MigrateStatus,
} from './migrate.js';
export type {
  OnboardInput,
  OnboardOutput,
  OnboardFormat,
  DeveloperRole,
  ExperienceLevel,
  FirstTask,
} from './onboard.js';
export type {
  AfterReportInput,
  AfterReportOutput,
  ReportFormat,
} from './after-report.js';
export type {
  HarnessInput,
  HarnessOutput,
} from './harness.js';
