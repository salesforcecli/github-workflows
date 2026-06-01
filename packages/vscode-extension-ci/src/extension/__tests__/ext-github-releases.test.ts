/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { jest } from '@jest/globals';

// Mock fs and child_process and glob before importing the module under test.
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));
jest.unstable_mockModule('child_process', () => ({
  execFileSync: jest.fn(),
}));
jest.unstable_mockModule('glob', () => ({
  glob: { sync: jest.fn() },
}));

const fs = await import('fs');
const glob = await import('glob');
const { createGitHubReleases } = await import('../ext-github-releases.js');

const mockedReadFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;
const mockedGlobSync = glob.glob.sync as jest.MockedFunction<
  typeof glob.glob.sync
>;

const originalEnv = process.env;
let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.VSIX_GLOB;
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('createGitHubReleases VSIX_GLOB handling', () => {
  it('uses VSIX_GLOB to resolve the VSIX glob pattern via glob.sync', () => {
    process.env.VSIX_GLOB = 'salesforcedx-vscode-*.vsix';
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ name: 'salesforcedx-vscode', version: '65.9.0' }),
    );
    mockedGlobSync.mockReturnValue(['/tmp/vsix-artifacts/salesforcedx-vscode-65.9.0.vsix']);

    createGitHubReleases({
      dryRun: true,
      preRelease: 'true',
      versionBump: 'minor',
      selectedExtensions: 'salesforcedx-vscode',
      isNightly: 'false',
      vsixArtifactsPath: './vsix-artifacts',
    });

    // glob.sync should have been invoked with paths that contain the env-supplied glob
    const seenPatterns = mockedGlobSync.mock.calls.map((call) => call[0] as string);
    expect(seenPatterns.some((p) => p.includes('salesforcedx-vscode-*.vsix'))).toBe(true);
  });

  it('throws when VSIX_GLOB is not set', () => {
    delete process.env.VSIX_GLOB;
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ name: 'salesforcedx-vscode', version: '65.9.0' }),
    );

    expect(() =>
      createGitHubReleases({
        dryRun: true,
        preRelease: 'true',
        versionBump: 'minor',
        selectedExtensions: 'salesforcedx-vscode',
        isNightly: 'false',
        vsixArtifactsPath: './vsix-artifacts',
      }),
    ).toThrow(/VSIX_GLOB env var is required/);
  });

  it('skips an extension whose package.json cannot be read', () => {
    process.env.VSIX_GLOB = 'salesforcedx-vscode-*.vsix';
    mockedReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    createGitHubReleases({
      dryRun: true,
      preRelease: 'true',
      versionBump: 'minor',
      selectedExtensions: 'no-such-package',
      isNightly: 'false',
      vsixArtifactsPath: './vsix-artifacts',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not read package.json'),
      expect.any(Error),
    );
  });

  it('warns when VSIX_GLOB is set but no files match', () => {
    process.env.VSIX_GLOB = 'no-match-*.vsix';
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ name: 'salesforcedx-vscode', version: '65.9.0' }),
    );
    mockedGlobSync.mockReturnValue([]);

    createGitHubReleases({
      dryRun: true,
      preRelease: 'true',
      versionBump: 'minor',
      selectedExtensions: 'salesforcedx-vscode',
      isNightly: 'false',
      vsixArtifactsPath: './vsix-artifacts',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No VSIX files found for salesforcedx-vscode'),
    );
    // dry-run summary should still be emitted
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('DRY RUN: GitHub release simulation completed'),
    );
  });

  it('uses per-extension pattern when VSIX_GLOB is a JSON map', () => {
    process.env.VSIX_GLOB = JSON.stringify({
      core: 'salesforcedx-vscode-core-*.vsix',
      apex: 'salesforcedx-vscode-apex-*.vsix',
    });
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ name: 'core', version: '1.0.0' }),
    );
    mockedGlobSync.mockReturnValue(['/tmp/vsix-artifacts/core/salesforcedx-vscode-core-1.0.0.vsix']);

    createGitHubReleases({
      dryRun: true,
      preRelease: 'true',
      versionBump: 'minor',
      selectedExtensions: 'core',
      isNightly: 'false',
      vsixArtifactsPath: './vsix-artifacts',
    });

    const seenPatterns = mockedGlobSync.mock.calls.map((call) => call[0] as string);
    expect(seenPatterns.some((p) => p.includes('salesforcedx-vscode-core-*.vsix'))).toBe(true);
    expect(seenPatterns.some((p) => p.includes('salesforcedx-vscode-apex-*.vsix'))).toBe(false);
  });

  it('throws when VSIX_GLOB JSON map has no entry for the extension', () => {
    process.env.VSIX_GLOB = JSON.stringify({
      core: 'salesforcedx-vscode-core-*.vsix',
    });
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ name: 'apex', version: '1.0.0' }),
    );

    expect(() =>
      createGitHubReleases({
        dryRun: true,
        preRelease: 'true',
        versionBump: 'minor',
        selectedExtensions: 'apex',
        isNightly: 'false',
        vsixArtifactsPath: './vsix-artifacts',
      }),
    ).toThrow(/VSIX_GLOB map has no entry for extension 'apex'/);
  });

  it('throws when VSIX_GLOB looks like JSON but fails to parse', () => {
    process.env.VSIX_GLOB = '{not valid json';
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({ name: 'core', version: '1.0.0' }),
    );

    expect(() =>
      createGitHubReleases({
        dryRun: true,
        preRelease: 'true',
        versionBump: 'minor',
        selectedExtensions: 'core',
        isNightly: 'false',
        vsixArtifactsPath: './vsix-artifacts',
      }),
    ).toThrow(/VSIX_GLOB looks like JSON but failed to parse/);
  });
});
