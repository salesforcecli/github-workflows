import { BuildContext } from '../core/types.js';
/**
 * Determine the build context based on GitHub event and inputs
 */
export declare function determineBuildType(): BuildContext;
/**
 * Set GitHub Actions outputs for build type
 */
export declare function setBuildTypeOutputs(buildContext: BuildContext): void;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=ext-build-type.d.ts.map