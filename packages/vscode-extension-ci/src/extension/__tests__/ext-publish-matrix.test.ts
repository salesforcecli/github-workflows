/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { jest } from '@jest/globals';

// Mock fs to avoid scanning real packages dir during tests.
jest.unstable_mockModule('fs', () => ({
  readdirSync: jest.fn(() => []),
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const { determinePublishMatrix } = await import('../ext-publish-matrix.js');

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.VSIX_GLOB;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('determinePublishMatrix VSIX_GLOB handling', () => {
  it('uses VSIX_GLOB env var as the vsix_pattern for each entry', () => {
    process.env.VSIX_GLOB = 'salesforcedx-vscode-*.vsix';
    const matrix = determinePublishMatrix({
      registries: 'all',
      selectedExtensions: 'salesforcedx-vscode',
    });
    expect(matrix).toHaveLength(2);
    expect(matrix.every((e) => e.vsix_pattern === 'salesforcedx-vscode-*.vsix')).toBe(
      true,
    );
  });

  it('throws when VSIX_GLOB is missing and a real selection is supplied', () => {
    delete process.env.VSIX_GLOB;
    expect(() =>
      determinePublishMatrix({
        registries: 'vsce',
        selectedExtensions: 'salesforcedx-vscode',
      }),
    ).toThrow(/VSIX_GLOB env var is required/);
  });

  it('returns empty matrix without consulting VSIX_GLOB when selection is empty', () => {
    delete process.env.VSIX_GLOB;
    expect(
      determinePublishMatrix({
        registries: 'all',
        selectedExtensions: '',
      }),
    ).toEqual([]);
  });

  it('returns empty matrix without consulting VSIX_GLOB when selection is "none"', () => {
    delete process.env.VSIX_GLOB;
    expect(
      determinePublishMatrix({
        registries: 'all',
        selectedExtensions: 'none',
      }),
    ).toEqual([]);
  });

  it('uses per-extension glob when VSIX_GLOB is a JSON map', () => {
    process.env.VSIX_GLOB = JSON.stringify({
      core: 'salesforcedx-vscode-core-*.vsix',
      apex: 'salesforcedx-vscode-apex-*.vsix',
    });
    const matrix = determinePublishMatrix({
      registries: 'vsce',
      selectedExtensions: 'core,apex',
    });
    expect(matrix).toHaveLength(2);
    expect(matrix[0].vsix_pattern).toBe('salesforcedx-vscode-core-*.vsix');
    expect(matrix[1].vsix_pattern).toBe('salesforcedx-vscode-apex-*.vsix');
  });

  it('throws with helpful message when VSIX_GLOB JSON map is missing entry for extension', () => {
    process.env.VSIX_GLOB = JSON.stringify({
      core: 'salesforcedx-vscode-core-*.vsix',
    });
    expect(() =>
      determinePublishMatrix({
        registries: 'vsce',
        selectedExtensions: 'apex',
      }),
    ).toThrow(/VSIX_GLOB map has no entry for extension 'apex'.*Available keys: core/);
  });

  it('throws parse error when VSIX_GLOB starts with { but is not valid JSON', () => {
    process.env.VSIX_GLOB = '{not valid json';
    expect(() =>
      determinePublishMatrix({
        registries: 'vsce',
        selectedExtensions: 'core',
      }),
    ).toThrow(/VSIX_GLOB looks like JSON but failed to parse/);
  });
});
