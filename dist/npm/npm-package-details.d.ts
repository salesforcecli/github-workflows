import { NpmPackageDetails, VersionBumpType } from './npm-types.js';
/**
 * Extract package details from JSON array string
 */
export declare function extractPackageDetails(selectedPackagesJson: string, versionBump: VersionBumpType): NpmPackageDetails;
/**
 * Set GitHub Actions outputs for package details
 */
export declare function setPackageDetailsOutputs(details: NpmPackageDetails): void;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=npm-package-details.d.ts.map