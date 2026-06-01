/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
  version: string;
  publisher?: string;
  displayName?: string;
}

interface VersionBumpOptions {
  selectedExtensions: string;
  preRelease: string;
  isNightly: string;
  extensionId?: string;
  newMajor?: string;
}

export type { VersionBumpOptions };

interface ParsedSemver {
  semver: string;
  major: number;
  minor: number;
  patch: number;
}

const isCI = (): boolean => process.env.CI === 'true';

const errorAndExit = (msg: string): never => {
  const prefix = isCI() ? '::error::' : '\x1b[31m[Error]\x1b[0m ';
  console.log(`${prefix}${msg}`);
  process.exit(isCI() ? 1 : 0);
};

const validateNewMajor = (rawValue?: string): number | undefined => {
  const major = rawValue ?? process.env.NEW_MAJOR;
  if (!major) return undefined;
  if (major.includes('.') || isNaN(parseInt(major, 10))) {
    errorAndExit(`Invalid NEW_MAJOR value (${major}). Must be a whole number`);
  }
  return parseInt(major, 10);
};

const parseSemver = (version: string): ParsedSemver => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    errorAndExit(`Invalid version format: ${version}`);
    // errorAndExit normally process.exits, so this return is only reached
    // when the exit is mocked (in tests). Return a sentinel that callers
    // shouldn't rely on; production never sees this path.
    return { semver: version, major: 0, minor: 0, patch: 0 };
  }
  const [semver, major, minor, patch, prerelease] = match;
  if (prerelease) {
    errorAndExit(
      'Prerelease versions (e.g. 1.2.3-beta.0) are not currently supported in the VSCode Marketplace',
    );
    return { semver: version, major: 0, minor: 0, patch: 0 };
  }
  return {
    semver,
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
  };
};

/**
 * Query the VS Code Marketplace for the highest pre-release version of an extension.
 * Returns null if no pre-release has ever been published (bootstrap case).
 * Throws if vsce show fails or returns malformed data.
 */
const getLatestPreReleaseVersionFromMarketplace = (
  extensionId: string,
): string | null => {
  let versionsJson: string;
  try {
    versionsJson = execFileSync('npx', [
      '@vscode/vsce',
      'show',
      extensionId,
      '--json',
    ])
      .toString()
      .trim();
  } catch (error) {
    throw new Error(
      `Failed to query marketplace for ${extensionId}: ${(error as Error).message}`,
    );
  }

  if (versionsJson === 'undefined') {
    throw new Error(
      `No version info found for ${extensionId}. Run 'npx @vscode/vsce show ${extensionId} --json' locally to debug.`,
    );
  }

  const parsed = JSON.parse(versionsJson);
  const preReleaseVersions = parsed.versions.filter((version: any) =>
    version.properties?.some(
      (prop: any) =>
        prop.key === 'Microsoft.VisualStudio.Code.PreRelease' &&
        prop.value === 'true',
    ),
  );

  if (preReleaseVersions.length === 0) {
    console.log(
      `No pre-release versions found for ${extensionId}. Treating as bootstrap (first prerelease).`,
    );
    return null;
  }

  // vsce returns versions ordered by lastUpdated descending.
  return preReleaseVersions[0].version;
};

/**
 * Decide the next version based on:
 *   - main: the version in main's package.json (what we're building from)
 *   - marketplace: the latest prerelease in the marketplace, or null if none yet
 *   - newMajor: optional major override (engineer-driven)
 *
 * Decision tree:
 *   1. newMajor passed → validate (must be main.major + 1, unless FORCE_NEW_MAJOR=true) → return ${newMajor}.0.0
 *   2. marketplace is null (bootstrap) → bump main.minor by 1, reset patch
 *   3. main matches marketplace → "promotions just ran" → bump main.minor by 1, reset patch
 *   4. main minor ahead of marketplace → bump main.patch
 *   5. main major ahead of marketplace → bump main.patch
 *   6. Otherwise (main < marketplace) → throw with diagnostic
 */
export const buildNextVersion = (
  main: ParsedSemver,
  marketplace: ParsedSemver | null,
  newMajor?: number,
): string => {
  if (newMajor !== undefined) {
    if (process.env.FORCE_NEW_MAJOR === 'true') {
      console.log(
        `::warning::FORCE_NEW_MAJOR is set to true. Bypassing new major version checks.`,
      );
    } else {
      if (marketplace !== null && main.major !== marketplace.major) {
        errorAndExit(
          `A new major was passed (${newMajor}), however the major versions in 'main' (${main.semver}) and the 'marketplace' (${marketplace.semver}) already do NOT match. This suggests that a new major was just recently published as a pre-release in the marketplace. Please confirm versions in main and in the marketplace.`,
        );
      }
      if (newMajor - main.major !== 1) {
        errorAndExit(
          `The new major version (${newMajor}) is not exactly 1 greater than the current major version in 'main' (${main.major}). Please confirm the correct new major version.`,
        );
      }
      console.log(`New major version passed validation: ${newMajor}`);
    }
    console.log(`::warning::Setting new major version to ${newMajor}.0.0`);
    return `${newMajor}.0.0`;
  }

  if (marketplace === null) {
    console.log(
      `Bootstrap: no marketplace prerelease yet. Bumping minor from main (${main.semver}).`,
    );
    return `${main.major}.${main.minor + 1}.0`;
  }

  if (main.semver === marketplace.semver) {
    console.log(
      `Versions match (${main.semver}). Promotions likely just ran, bumping MINOR.`,
    );
    return `${main.major}.${main.minor + 1}.0`;
  }

  if (main.major === marketplace.major && main.minor > marketplace.minor) {
    console.log(
      `Majors match and main minor is greater (${main.semver} > ${marketplace.semver}). Nightly already ahead, bumping PATCH.`,
    );
    return `${main.major}.${main.minor}.${main.patch + 1}`;
  }

  if (main.major > marketplace.major) {
    console.log(
      `Main major already ahead (${main.semver} > ${marketplace.semver}). Bumping PATCH.`,
    );
    return `${main.major}.${main.minor}.${main.patch + 1}`;
  }

  throw new Error(
    `Cannot determine next version: main (${main.semver}) is behind marketplace prerelease (${marketplace.semver}). ` +
      `This shouldn't happen — main should always be ahead of or equal to the latest prerelease. ` +
      `Check whether main was reverted or whether the marketplace lookup is returning a stale value.`,
  );
};

const getPackageDetails = (extensionPath: string): PackageJson | null => {
  try {
    const packageJsonPath = join(
      process.cwd(),
      'packages',
      extensionPath,
      'package.json',
    );
    const content = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `Warning: Could not read package.json for ${extensionPath}:`,
      error,
    );
    return null;
  }
};

const createGitTag = (
  packageName: string,
  version: string,
  isPreRelease: boolean,
  isNightly: boolean,
): void => {
  let tagName: string;
  if (isNightly) {
    const nightlyDate = new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    const branch = process.env.BRANCH || 'main';
    const branchSuffix =
      branch === 'main' ? '' : `.${branch.replace(/\//g, '-')}`;
    tagName = `v${version}-nightly${branchSuffix}.${nightlyDate}`;
  } else {
    tagName = isPreRelease
      ? `${packageName}-v${version}-pre-release`
      : `${packageName}-v${version}`;
  }

  try {
    let tagExists = false;
    try {
      execFileSync('git', ['rev-parse', tagName], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      tagExists = true;
    } catch {
      try {
        execFileSync('git', ['ls-remote', '--tags', 'origin', tagName], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        tagExists = true;
      } catch {
        tagExists = false;
      }
    }

    if (tagExists) {
      console.log(
        `⏭️ Tag ${tagName} already exists — skipping (idempotent rerun)`,
      );
      return;
    }

    console.log(`Creating tag ${tagName} on current commit...`);
    execFileSync('git', ['tag', tagName], { stdio: 'inherit' });
    console.log(`✅ Tag created: ${tagName}`);
  } catch (error) {
    console.error(`Failed to create tag ${tagName}:`, error);
    throw error;
  }
};

/**
 * Public entry point. Iterates over selected extensions, decides the next
 * version using marketplace-lookup, runs `npm version`, and creates git tags.
 */
export const bumpVersions = (options: VersionBumpOptions): void => {
  const {
    selectedExtensions,
    preRelease,
    isNightly,
    extensionId,
    newMajor: newMajorRaw,
  } = options;

  console.log(`Selected extensions: ${selectedExtensions}`);
  console.log(`Pre-release mode: ${preRelease}`);
  console.log(`Is nightly build: ${isNightly}`);
  console.log(
    `Extension ID for marketplace lookup: ${extensionId || '(not set)'}`,
  );
  console.log(`New major override: ${newMajorRaw || '(not set)'}`);

  if (!extensionId) {
    errorAndExit(
      'EXTENSION_ID env var is required for marketplace-lookup version selection. ' +
        'Pass the marketplace extension id (e.g. salesforce.salesforcedx-vscode).',
    );
  }

  const newMajor = validateNewMajor(newMajorRaw);

  const extensions = selectedExtensions.split(',').filter(Boolean);

  for (const ext of extensions) {
    const packageDetails = getPackageDetails(ext);
    if (!packageDetails) {
      console.warn(`Skipping ${ext}: package.json not found`);
      continue;
    }

    console.log(`\nProcessing ${ext}...`);
    console.log(
      `Current version (from package.json on main): ${packageDetails.version}`,
    );

    const main = parseSemver(packageDetails.version);
    const marketplaceVersion =
      newMajor !== undefined
        ? null
        : getLatestPreReleaseVersionFromMarketplace(extensionId!);
    const marketplace = marketplaceVersion
      ? parseSemver(marketplaceVersion)
      : null;

    if (marketplace) {
      console.log(`Marketplace prerelease: ${marketplace.semver}`);
    }

    const newVersion = buildNextVersion(main, marketplace, newMajor);

    console.log(
      `🔄 Bumping ${ext} from ${packageDetails.version} to ${newVersion}`,
    );

    const originalDir = process.cwd();
    try {
      process.chdir(join(originalDir, 'packages', ext));
      execFileSync('npm', ['version', newVersion, '--no-git-tag-version'], {
        stdio: 'inherit',
      });
      process.chdir(originalDir);

      createGitTag(
        packageDetails.name,
        newVersion,
        preRelease === 'true',
        isNightly === 'true',
      );
    } catch (error) {
      console.error(`Failed to bump version for ${ext}:`, error);
      process.chdir(originalDir);
      throw error;
    }
  }

  console.log('\n✅ Version bumps and tags applied');
};

// Exported for testability of internal helpers.
export {
  isCI,
  errorAndExit,
  validateNewMajor,
  parseSemver,
  getLatestPreReleaseVersionFromMarketplace,
};
