/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Entry point for running workflow scripts via CLI
 * Usage: tsx .github/scripts/index.ts <command>
 */

import { main as extChangeDetector } from './ext-change-detector.js';

const command = process.argv[2];

(async () => {
  switch (command) {
    case 'ext-change-detector':
      await extChangeDetector();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Available commands: ext-change-detector');
      process.exit(1);
  }
})();
