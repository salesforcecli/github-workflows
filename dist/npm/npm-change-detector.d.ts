import { NpmChangeDetectionResult } from './npm-types.js';
/**
 * Detect changes in NPM packages
 */
export declare function detectNpmChanges(baseBranch?: string): Promise<NpmChangeDetectionResult>;
/**
 * Set GitHub Actions outputs for NPM change detection
 */
export declare function setNpmChangeDetectionOutputs(result: NpmChangeDetectionResult): void;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=npm-change-detector.d.ts.map