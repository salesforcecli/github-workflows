#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Command } from 'commander';
import {
  findNightlyCandidate,
  setNightlyFinderOutputs,
} from './extension/ext-nightly-finder.js';
import {
  detectExtensionChanges,
  setChangeDetectionOutputs,
} from './extension/ext-change-detector.js';
import { bumpVersions } from './extension/ext-version-bumper.js';

import { log } from './core/utils.js';

const program = new Command();

program
  .name('release-scripts')
  .description('Release automation scripts for VS Code extensions')
  .version('1.0.0');

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
