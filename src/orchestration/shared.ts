/**
 * Shared helpers for orchestrators.
 *
 * Patterns extracted from src/orchestration/audit.ts so every flow shares
 * the same graceful-degradation and timestamp formatting. Adding new helpers
 * here keeps the per-flow orchestrators focused on sequencing and assembly.
 */

/**
 * Architecture.md §5 graceful-degradation pattern.
 *
 * Translates an adapter result into either a no-op (success with available
 * data) or a labeled gap entry. Two failure modes are flattened:
 *   - the adapter promise rejected (uncaught error in the adapter), or
 *   - the adapter resolved with `{ available: false, error }` (the inherited
 *     adapters' explicit "tool not installed / not reachable" shape).
 */
export function collectGap<T>(
  gaps: string[],
  result: PromiseSettledResult<T>,
  label: string,
): void {
  if (result.status === 'rejected') {
    const reason = result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
    gaps.push(`${label} unavailable: ${reason}`);
    return;
  }
  const value = result.value as { available?: boolean; error?: string } | null;
  if (value && value.available === false) {
    gaps.push(`${label} unavailable: ${value.error ?? 'reason not reported by adapter'}`);
  }
}

/**
 * ISO timestamp with characters that are illegal in git refs (`:` and `.`)
 * replaced with `-`. Stable per-second so two calls in the same second
 * produce the same branch name (idempotency hook required by mcp-tools.md
 * "Tool surface invariants").
 */
export function branchSafeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
