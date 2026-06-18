import { BuildContext, ChangeDetectionResult } from '../core/types.js';
/**
 * Detect changes in extensions
 */
export declare function detectExtensionChanges(buildContext: BuildContext, promotionCommitSha?: string, userSelectedExtensions?: string): Promise<ChangeDetectionResult>;
/**
 * Set GitHub Actions outputs for change detection
 */
export declare function setChangeDetectionOutputs(result: ChangeDetectionResult): void;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=ext-change-detector.d.ts.map