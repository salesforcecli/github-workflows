/**
 * Get all available NPM packages
 */
export declare function getAvailableNpmPackages(): string[];
/**
 * Select NPM packages based on user input and detected changes
 */
export declare function selectNpmPackages(userSelectedPackages?: string, availablePackages?: string, changedPackages?: string): string[];
/**
 * Set GitHub Actions outputs for package selection
 */
export declare function setPackageSelectionOutputs(selectedPackages: string[]): void;
/**
 * Set GitHub Actions outputs for package discovery
 */
export declare function setPackageDiscoveryOutputs(npmPackages: string[]): void;
/**
 * Main function for CLI usage
 */
export declare function main(): Promise<void>;
export { main as npmPackageSelectorMain };
//# sourceMappingURL=npm-package-selector.d.ts.map