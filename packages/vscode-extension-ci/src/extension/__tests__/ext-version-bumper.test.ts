/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { jest } from '@jest/globals';

// Mock child_process and fs BEFORE importing the module under test.
jest.unstable_mockModule('child_process', () => ({
  execFileSync: jest.fn(),
}));
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  appendFileSync: jest.fn(),
}));

const { execFileSync } = await import('child_process');
const {
  buildNextVersion,
  isCI,
  errorAndExit,
  validateNewMajor,
  parseSemver,
  getLatestPreReleaseVersionFromMarketplace,
} = await import('../ext-version-bumper.js');

const mockedExecFileSync = execFileSync as jest.MockedFunction<
  typeof execFileSync
>;

const originalEnv = process.env;
let consoleSpy: jest.SpiedFunction<typeof console.log>;
let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
let exitSpy: jest.SpiedFunction<typeof process.exit>;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.CI;
  delete process.env.NEW_MAJOR;
  delete process.env.FORCE_NEW_MAJOR;
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  exitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation((() => {}) as never);
});

afterEach(() => {
  consoleSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  exitSpy.mockRestore();
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = originalEnv;
});

// ---------------------------------------------------------------------------
// isCI
// ---------------------------------------------------------------------------
describe('isCI', () => {
  it('returns true when CI env var is "true"', () => {
    process.env.CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns false when CI env var is "false"', () => {
    process.env.CI = 'false';
    expect(isCI()).toBe(false);
  });

  it('returns false when CI env var is undefined', () => {
    delete process.env.CI;
    expect(isCI()).toBe(false);
  });

  it('returns false when CI env var is empty string', () => {
    process.env.CI = '';
    expect(isCI()).toBe(false);
  });

  it('returns false when CI is "TRUE" (case sensitive)', () => {
    process.env.CI = 'TRUE';
    expect(isCI()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// errorAndExit
// ---------------------------------------------------------------------------
describe('errorAndExit', () => {
  describe('in CI environment', () => {
    beforeEach(() => {
      process.env.CI = 'true';
    });

    it('logs message with GitHub Actions error prefix', () => {
      errorAndExit('Something went wrong');
      expect(consoleSpy).toHaveBeenCalledWith('::error::Something went wrong');
    });

    it('exits with code 1', () => {
      errorAndExit('Something went wrong');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('in local environment', () => {
    beforeEach(() => {
      delete process.env.CI;
    });

    it('logs message with colored error prefix', () => {
      errorAndExit('Something went wrong');
      expect(consoleSpy).toHaveBeenCalledWith(
        '\x1b[31m[Error]\x1b[0m Something went wrong',
      );
    });

    it('exits with code 0 (to prevent terminal from closing)', () => {
      errorAndExit('Something went wrong');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});

// ---------------------------------------------------------------------------
// validateNewMajor
// ---------------------------------------------------------------------------
describe('validateNewMajor', () => {
  it('returns undefined when NEW_MAJOR is not set', () => {
    delete process.env.NEW_MAJOR;
    expect(validateNewMajor()).toBeUndefined();
  });

  it('returns undefined when NEW_MAJOR is empty string', () => {
    process.env.NEW_MAJOR = '';
    expect(validateNewMajor()).toBeUndefined();
  });

  it('returns parsed integer when NEW_MAJOR is a valid whole number', () => {
    process.env.NEW_MAJOR = '66';
    expect(validateNewMajor()).toBe(66);
  });

  it('returns parsed integer for single digit', () => {
    process.env.NEW_MAJOR = '5';
    expect(validateNewMajor()).toBe(5);
  });

  it('accepts an explicit raw value (overrides env)', () => {
    process.env.NEW_MAJOR = '66';
    expect(validateNewMajor('70')).toBe(70);
  });

  it('returns undefined when explicit raw value is empty', () => {
    process.env.NEW_MAJOR = '66';
    expect(validateNewMajor('')).toBeUndefined();
  });

  it('calls errorAndExit when NEW_MAJOR contains a decimal point', () => {
    process.env.NEW_MAJOR = '66.0';
    validateNewMajor();
    expect(exitSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid NEW_MAJOR value (66.0)'),
    );
  });

  it('calls errorAndExit when NEW_MAJOR is not a number', () => {
    process.env.NEW_MAJOR = 'abc';
    validateNewMajor();
    expect(exitSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid NEW_MAJOR value (abc)'),
    );
  });

  it('calls errorAndExit when NEW_MAJOR is a semver string', () => {
    process.env.NEW_MAJOR = '66.1.0';
    validateNewMajor();
    expect(exitSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid NEW_MAJOR value (66.1.0)'),
    );
  });
});

// ---------------------------------------------------------------------------
// parseSemver
// ---------------------------------------------------------------------------
describe('parseSemver', () => {
  describe('valid versions', () => {
    it('parses standard semver', () => {
      expect(parseSemver('65.8.0')).toEqual({
        semver: '65.8.0',
        major: 65,
        minor: 8,
        patch: 0,
      });
    });

    it('parses single digit versions', () => {
      expect(parseSemver('1.2.3')).toEqual({
        semver: '1.2.3',
        major: 1,
        minor: 2,
        patch: 3,
      });
    });

    it('parses large version numbers', () => {
      expect(parseSemver('100.200.300')).toEqual({
        semver: '100.200.300',
        major: 100,
        minor: 200,
        patch: 300,
      });
    });

    it('parses version with zeros', () => {
      expect(parseSemver('0.0.0')).toEqual({
        semver: '0.0.0',
        major: 0,
        minor: 0,
        patch: 0,
      });
    });
  });

  describe('invalid versions', () => {
    it('calls errorAndExit for prerelease versions', () => {
      parseSemver('1.2.3-beta.0');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Prerelease versions'),
      );
    });

    it('calls errorAndExit for prerelease with simple tag', () => {
      parseSemver('1.2.3-alpha');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Prerelease versions'),
      );
    });

    it('calls errorAndExit for missing patch version', () => {
      parseSemver('1.2');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version format: 1.2'),
      );
    });

    it('calls errorAndExit for missing minor and patch', () => {
      parseSemver('1');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version format: 1'),
      );
    });

    it('calls errorAndExit for non-numeric version', () => {
      parseSemver('a.b.c');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version format: a.b.c'),
      );
    });

    it('calls errorAndExit for empty string', () => {
      parseSemver('');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version format:'),
      );
    });

    it('calls errorAndExit for version without dots', () => {
      parseSemver('123');
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version format: 123'),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// getLatestPreReleaseVersionFromMarketplace
// ---------------------------------------------------------------------------
describe('getLatestPreReleaseVersionFromMarketplace', () => {
  const createMockResponse = (versions: any[]) =>
    JSON.stringify({ versions });

  const createVersion = (version: string, isPreRelease = false) => ({
    version,
    properties: isPreRelease
      ? [{ key: 'Microsoft.VisualStudio.Code.PreRelease', value: 'true' }]
      : [],
  });

  it('returns the latest pre-release version', () => {
    const mockResponse = createMockResponse([
      createVersion('65.9.0', true),
      createVersion('65.8.0', true),
      createVersion('65.7.0', false),
    ]);
    mockedExecFileSync.mockReturnValue(Buffer.from(mockResponse));

    const result = getLatestPreReleaseVersionFromMarketplace(
      'salesforce.salesforcedx-vscode',
    );

    expect(result).toBe('65.9.0');
    expect(mockedExecFileSync).toHaveBeenCalledWith('npx', [
      '@vscode/vsce',
      'show',
      'salesforce.salesforcedx-vscode',
      '--json',
    ]);
  });

  it('skips non-pre-release versions to find the latest pre-release', () => {
    const mockResponse = createMockResponse([
      createVersion('65.9.0', false),
      createVersion('65.8.0', false),
      createVersion('65.7.0', true),
    ]);
    mockedExecFileSync.mockReturnValue(Buffer.from(mockResponse));

    const result = getLatestPreReleaseVersionFromMarketplace(
      'salesforce.salesforcedx-vscode',
    );

    expect(result).toBe('65.7.0');
  });

  it('throws when vsce returns "undefined" (extension not found)', () => {
    mockedExecFileSync.mockReturnValue(Buffer.from('undefined'));

    expect(() =>
      getLatestPreReleaseVersionFromMarketplace('some.extension'),
    ).toThrow(/No version info found/);
  });

  it('returns null when no pre-release versions exist (bootstrap case)', () => {
    const mockResponse = createMockResponse([
      createVersion('65.9.0', false),
      createVersion('65.8.0', false),
    ]);
    mockedExecFileSync.mockReturnValue(Buffer.from(mockResponse));

    const result = getLatestPreReleaseVersionFromMarketplace(
      'salesforce.salesforcedx-vscode',
    );

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Treating as bootstrap'),
    );
  });

  it('handles versions with no properties array', () => {
    const mockResponse = JSON.stringify({
      versions: [
        { version: '65.9.0' },
        createVersion('65.8.0', true),
      ],
    });
    mockedExecFileSync.mockReturnValue(Buffer.from(mockResponse));

    const result = getLatestPreReleaseVersionFromMarketplace(
      'salesforce.salesforcedx-vscode',
    );

    expect(result).toBe('65.8.0');
  });

  it('throws when execFileSync itself fails (network/rate-limit)', () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error('ENETUNREACH');
    });

    expect(() =>
      getLatestPreReleaseVersionFromMarketplace('some.extension'),
    ).toThrow(/Failed to query marketplace/);
  });
});

// ---------------------------------------------------------------------------
// buildNextVersion
// ---------------------------------------------------------------------------
describe('buildNextVersion', () => {
  describe('without newMajor', () => {
    it('bumps MINOR when main and marketplace versions match', () => {
      const main = parseSemver('65.8.0');
      const marketplace = parseSemver('65.8.0');
      expect(buildNextVersion(main, marketplace, undefined)).toBe('65.9.0');
    });

    it('bumps PATCH when main minor is greater than marketplace', () => {
      const main = parseSemver('65.9.0');
      const marketplace = parseSemver('65.8.0');
      expect(buildNextVersion(main, marketplace, undefined)).toBe('65.9.1');
    });

    it('bumps PATCH when main major is already ahead', () => {
      const main = parseSemver('66.0.0');
      const marketplace = parseSemver('65.8.0');
      expect(buildNextVersion(main, marketplace, undefined)).toBe('66.0.1');
    });

    it('bumps PATCH correctly when patch is already > 0', () => {
      const main = parseSemver('65.9.5');
      const marketplace = parseSemver('65.8.0');
      expect(buildNextVersion(main, marketplace, undefined)).toBe('65.9.6');
    });

    it('bumps MINOR from main when marketplace is null (bootstrap)', () => {
      const main = parseSemver('65.8.0');
      expect(buildNextVersion(main, null, undefined)).toBe('65.9.0');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bootstrap: no marketplace prerelease yet'),
      );
    });

    it('throws with diagnostic when main is behind marketplace (fall-through)', () => {
      const main = parseSemver('65.7.0');
      const marketplace = parseSemver('65.8.0');
      expect(() => buildNextVersion(main, marketplace, undefined)).toThrow(
        /main \(65\.7\.0\) is behind marketplace prerelease \(65\.8\.0\)/,
      );
    });

    it('throws with diagnostic when main is behind marketplace on major', () => {
      const main = parseSemver('64.5.0');
      const marketplace = parseSemver('65.8.0');
      expect(() => buildNextVersion(main, marketplace, undefined)).toThrow(
        /main \(64\.5\.0\) is behind marketplace prerelease \(65\.8\.0\)/,
      );
    });
  });

  describe('with newMajor', () => {
    beforeEach(() => {
      delete process.env.FORCE_NEW_MAJOR;
    });

    it('returns new major version when validation passes', () => {
      const main = parseSemver('65.8.0');
      const marketplace = parseSemver('65.8.0');
      expect(buildNextVersion(main, marketplace, 66)).toBe('66.0.0');
    });

    it('works when marketplace is null (bootstrap + newMajor)', () => {
      const main = parseSemver('65.8.0');
      expect(buildNextVersion(main, null, 66)).toBe('66.0.0');
    });

    it('calls errorAndExit when main and marketplace majors do not match', () => {
      const main = parseSemver('66.0.0');
      const marketplace = parseSemver('65.8.0');
      buildNextVersion(main, marketplace, 67);
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('major versions'),
      );
    });

    it('calls errorAndExit when newMajor is not exactly 1 greater than main', () => {
      const main = parseSemver('65.8.0');
      const marketplace = parseSemver('65.8.0');
      buildNextVersion(main, marketplace, 68);
      expect(exitSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not exactly 1 greater'),
      );
    });

    describe('with FORCE_NEW_MAJOR', () => {
      beforeEach(() => {
        process.env.FORCE_NEW_MAJOR = 'true';
      });

      it('bypasses validation checks', () => {
        const main = parseSemver('65.8.0');
        const marketplace = parseSemver('64.0.0');
        expect(buildNextVersion(main, marketplace, 99)).toBe('99.0.0');
        expect(exitSpy).not.toHaveBeenCalled();
      });

      it('logs warning about bypassing checks', () => {
        const main = parseSemver('65.8.0');
        const marketplace = parseSemver('65.8.0');
        buildNextVersion(main, marketplace, 66);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('FORCE_NEW_MAJOR'),
        );
      });
    });
  });
});
