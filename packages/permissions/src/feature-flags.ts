export interface FeatureFlag {
  /** Whether the feature is globally enabled. */
  enabled: boolean;
  /**
   * Optional percentage-based rollout (0-100).
   * When set, only a deterministic subset of tenants will see the feature,
   * even if `enabled` is true.
   */
  rollout?: number;
}

export interface FeatureFlagContext {
  /** The tenant / organization ID used for deterministic rollout hashing. */
  tenantId: string;
  /** The subscription plan slug (e.g. "free", "pro", "enterprise"). */
  plan?: string;
}

/**
 * Simple deterministic hash that maps a string to a number between 0 and 99.
 * Used for percentage-based feature rollouts so the same tenant always gets
 * a consistent result.
 */
function hashToPercentage(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Determines whether a feature flag is enabled for the given context.
 *
 * - If `flag.enabled` is false the feature is always off.
 * - If `flag.rollout` is defined (0-100) a deterministic hash of the
 *   `tenantId` decides whether the tenant falls within the rollout
 *   percentage.
 * - Otherwise the feature is enabled for everyone.
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  context: FeatureFlagContext,
): boolean {
  if (!flag.enabled) {
    return false;
  }

  if (flag.rollout !== undefined) {
    const percentage = hashToPercentage(context.tenantId);
    return percentage < flag.rollout;
  }

  return true;
}
