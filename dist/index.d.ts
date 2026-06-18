export * from './core/types.js';
export * from './core/utils.js';
export * from './core/audit-logger.js';
export { determineBuildType, setBuildTypeOutputs } from './extension/ext-build-type.js';
export { detectExtensionChanges, setChangeDetectionOutputs } from './extension/ext-change-detector.js';
export { createGitHubReleases } from './extension/ext-github-releases.js';
export { findNightlyCandidate, setNightlyFinderOutputs } from './extension/ext-nightly-finder.js';
export { getAvailableExtensions, setExtensionDiscoveryOutputs } from './extension/ext-package-selector.js';
export { determinePublishMatrix } from './extension/ext-publish-matrix.js';
export { displayExtensionReleasePlan } from './extension/ext-release-plan.js';
export { bumpVersions } from './extension/ext-version-bumper.js';
export { detectNpmChanges, setNpmChangeDetectionOutputs } from './npm/npm-change-detector.js';
export { extractPackageDetails, setPackageDetailsOutputs } from './npm/npm-package-details.js';
export { npmPackageSelectorMain } from './npm/npm-package-selector.js';
export { generateReleasePlan, displayReleasePlan } from './npm/npm-release-plan.js';
//# sourceMappingURL=index.d.ts.map