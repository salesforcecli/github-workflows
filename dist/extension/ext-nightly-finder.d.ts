import type { SemanticVersion } from '../core/types.js';
export interface NightlyCandidate {
    tag: string;
    commitSha: string;
    commitDate: number;
    version: SemanticVersion;
}
/**
 * Find the best nightly build eligible for promotion to pre-release.
 *
 * Filters applied (all must pass):
 *   1. Tag format must match nightly pattern (contains "-nightly.")
 *   2. Tag must be at least MIN_TAG_AGE_DAYS days old (default 7)
 *   3. No existing marketplace-prerelease-* tracking tag for this version
 *      (nightly was already promoted to pre-release)
 *   4. Floor check: no marketplace-stable-* tag for the derived stable version
 *      semver.inc(nightlyVersion, 'minor') — prevents re-promoting a version
 *      track that was already published as stable
 *
 * Returns the newest passing candidate.
 */
export declare function findNightlyCandidate(): Promise<NightlyCandidate | null>;
/**
 * Set GitHub Actions outputs for the nightly candidate.
 * Outputs commit-sha and nightly-tag (empty strings if no candidate).
 */
export declare function setNightlyFinderOutputs(candidate: NightlyCandidate | null): void;
/**
 * Main function for CLI usage via index.ts.
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=ext-nightly-finder.d.ts.map