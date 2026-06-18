import { z } from 'zod';
import type { SemanticVersion } from './types.js';
/**
 * Parse version string into components
 */
export declare function parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
};
/**
 * Format version components back to string
 */
export declare function formatVersion(major: number, minor: number, patch: number): string;
/**
 * Check if a version has an even minor (stable) or odd minor (pre-release)
 */
export declare function isStableVersion(version: string): boolean;
/**
 * Check if a version has an odd minor (pre-release)
 */
export declare function isPreReleaseVersion(version: string): boolean;
/**
 * Read and parse package.json
 */
export declare function readPackageJson(packagePath: string): any;
/**
 * Get extension information from package.json
 */
export declare function getExtensionInfo(packagePath: string): {
    name: string;
    version: string;
    publisher?: string;
    displayName?: string;
};
/**
 * Parse GitHub environment variables
 */
export declare function parseEnvironment(): {
    githubEventName: string;
    githubRef: string;
    githubRefName: string;
    githubActor: string;
    githubRepository: string;
    githubRunId: string;
    githubWorkflow: string;
    inputs: Record<string, string | undefined>;
};
/**
 * Set GitHub Actions output using environment files (GITHUB_OUTPUT)
 */
export declare function setOutput(name: string, value: string): void;
/**
 * Type guard to check if a string is a valid semantic version
 */
export declare function isSemanticVersion(version: string): version is SemanticVersion;
/**
 * Parse semantic version string into components
 */
export declare function parseSemver(version: SemanticVersion): {
    major: number;
    minor: number;
    patch: number;
};
/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export declare function compareSemver(a: SemanticVersion, b: SemanticVersion): number;
/**
 * Extract semantic version from tag using regex pattern
 */
export declare function extractVersionFromTag(tag: string): SemanticVersion | null;
/**
 * Log with color coding
 */
export declare const log: {
    info: (message: string) => void;
    success: (message: string) => void;
    warning: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
};
/**
 * Validate string is not empty
 */
export declare const nonEmptyString: z.ZodString;
/**
 * Validate boolean string
 */
export declare const booleanString: z.ZodPipe<z.ZodEnum<{
    true: "true";
    false: "false";
}>, z.ZodTransform<boolean, "true" | "false">>;
/**
 * Validate version bump type
 */
export declare const versionBumpType: z.ZodEnum<{
    patch: "patch";
    minor: "minor";
    major: "major";
    auto: "auto";
}>;
//# sourceMappingURL=utils.d.ts.map