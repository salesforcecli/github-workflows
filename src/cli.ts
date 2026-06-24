#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Command } from 'commander';
import { determineBuildType, setBuildTypeOutputs } from './extension/ext-build-type.js';
import {
  findNightlyCandidate,
  setNightlyFinderOutputs,
} from './extension/ext-nightly-finder.js';
import {
  detectExtensionChanges,
  setChangeDetectionOutputs,
} from './extension/ext-change-detector.js';
import {
  getAvailableExtensions,
  setExtensionDiscoveryOutputs,
} from './extension/ext-package-selector.js';

import { displayExtensionReleasePlan } from './extension/ext-release-plan.js';
import { bumpVersions } from './extension/ext-version-bumper.js';
import { determinePublishMatrix } from './extension/ext-publish-matrix.js';
import { createGitHubReleases } from './extension/ext-github-releases.js';

import { log, setOutput } from './core/utils.js';

const program = new Command();

program
  .name('release-scripts')
  .description('Release automation scripts for VS Code extensions')
  .version('1.0.0');

program
  .command('ext-build-type')
  .description('Determine build type (nightly/promotion/regular)')
  .action(async () => {
    try {
      const buildContext = determineBuildType();
      setBuildTypeOutputs(buildContext);
    } catch (error) {
      log.error(`Failed to determine build type: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-nightly-finder')
  .description('Find eligible nightly builds for pre-release promotion')
  .action(async () => {
    try {
      const candidate = await findNightlyCandidate();
      setNightlyFinderOutputs(candidate);
    } catch (error) {
      log.error(`Failed to find nightly candidate: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-change-detector')
  .description('Detect changes in extensions')
  .action(async () => {
    try {
      // Parse build context from environment variables
      const isNightly = process.env.IS_NIGHTLY === 'true';
      const versionBump = (process.env.VERSION_BUMP as any) || 'auto';
      const preRelease = process.env.PRE_RELEASE === 'true';
      const isPromotion = process.env.IS_PROMOTION === 'true';
      const promotionCommitSha = process.env.PROMOTION_COMMIT_SHA;
      const userSelectedExtensions = process.env.SELECTED_EXTENSIONS;

      const buildContext = {
        isNightly,
        versionBump,
        preRelease,
        isPromotion,
        promotionCommitSha,
      };

      const result = await detectExtensionChanges(
        buildContext,
        promotionCommitSha,
        userSelectedExtensions,
      );
      setChangeDetectionOutputs(result);
    } catch (error) {
      log.error(`Failed to determine changes: ${error}`);
      process.exit(1);
    }
  });


program
  .command('ext-package-selector')
  .description('Discover available VS Code extensions')
  .action(async () => {
    try {
      const extensions = getAvailableExtensions();
      setExtensionDiscoveryOutputs(extensions);
    } catch (error) {
      log.error(`Failed to discover extensions: ${error}`);
      process.exit(1);
    }
  });


program
  .command('ext-release-plan')
  .description('Display extension release plan for dry runs')
  .action(async () => {
    try {
      const options = {
        branch: process.env.BRANCH || 'main',
        buildType: process.env.BUILD_TYPE || 'workflow_dispatch',
        isNightly: process.env.IS_NIGHTLY || 'false',
        versionBump: process.env.VERSION_BUMP || 'auto',
        registries: process.env.REGISTRIES || 'all',
        preRelease: process.env.PRE_RELEASE || 'false',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
      };
      displayExtensionReleasePlan(options);
    } catch (error) {
      log.error(`Failed to display release plan: ${error}`);
      process.exit(1);
    }
  });


program
  .command('ext-github-releases')
  .description('Create GitHub releases for extensions')
  .action(async () => {
    try {
      createGitHubReleases({
        dryRun: process.env.DRY_RUN === 'true',
        preRelease: process.env.PRE_RELEASE || 'false',
        versionBump: process.env.VERSION_BUMP || 'auto',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
        isNightly: process.env.IS_NIGHTLY || 'false',
        vsixArtifactsPath:
          process.env.VSIX_ARTIFACTS_PATH || './vsix-artifacts',
      });
    } catch (error) {
      log.error(`Failed to create GitHub releases: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-publish-matrix')
  .description('Determine publish matrix for extensions')
  .action(async () => {
    try {
      const options = {
        registries: process.env.REGISTRIES || 'all',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
      };
      const matrix = determinePublishMatrix(options);
      // Output in GitHub Actions format
      setOutput('matrix', JSON.stringify(matrix));
    } catch (error) {
      log.error(`Failed to determine publish matrix: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-version-bumper')
  .description('Bump versions for selected extensions')
  .action(async () => {
    try {
      bumpVersions({
        versionBump: process.env.VERSION_BUMP || 'auto',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
        preRelease: process.env.PRE_RELEASE || 'false',
        isNightly: process.env.IS_NIGHTLY || 'false',
        isPromotion: process.env.IS_PROMOTION || 'false',
        promotionCommitSha: process.env.PROMOTION_COMMIT_SHA,
      });
    } catch (error) {
      log.error(`Failed to bump versions: ${error}`);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();
