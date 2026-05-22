import { NpmReleasePlan, VersionBumpType } from './npm-types.js';
/**
 * Generate release plan for a package
 */
export declare function generateReleasePlan(packageName: string, versionBump: VersionBumpType, dryRun?: boolean): NpmReleasePlan | null;
/**
 * Display release plan
 */
export declare function displayReleasePlan(plan: NpmReleasePlan): void;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=npm-release-plan.d.ts.map