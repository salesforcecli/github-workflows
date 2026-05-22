/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Core utilities and types
export * from './core/types.js';
export * from './core/utils.js';
export * from './core/audit-logger.js';

// Extension management
export { determineBuildType, setBuildTypeOutputs } from './extension/ext-build-type.js';
export { detectExtensionChanges, setChangeDetectionOutputs } from './extension/ext-change-detector.js';
export { createGitHubReleases } from './extension/ext-github-releases.js';
export { findNightlyCandidate, setNightlyFinderOutputs } from './extension/ext-nightly-finder.js';
export { getAvailableExtensions, setExtensionDiscoveryOutputs } from './extension/ext-package-selector.js';
export { determinePublishMatrix } from './extension/ext-publish-matrix.js';
export { displayExtensionReleasePlan } from './extension/ext-release-plan.js';
export { bumpVersions } from './extension/ext-version-bumper.js';

// NPM package management
export { detectNpmChanges, setNpmChangeDetectionOutputs } from './npm/npm-change-detector.js';
export { extractPackageDetails, setPackageDetailsOutputs } from './npm/npm-package-details.js';
export { npmPackageSelectorMain } from './npm/npm-package-selector.js';
export { generateReleasePlan, displayReleasePlan } from './npm/npm-release-plan.js';
