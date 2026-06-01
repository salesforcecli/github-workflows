/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface PackageJson {
  name: string;
  version: string;
  publisher?: string;
  displayName?: string;
}

interface GitHubReleaseOptions {
  dryRun: boolean;
  preRelease: string;
  versionBump: string;
  selectedExtensions: string;
  isNightly: string;
  vsixArtifactsPath: string;
}

function getPackageDetails(extensionPath: string): PackageJson | null {
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
}

function resolveVsixGlob(extension: string): string {
  const vsixGlob = process.env.VSIX_GLOB;
  if (!vsixGlob) {
    throw new Error('VSIX_GLOB env var is required');
  }
  if (vsixGlob.trim().startsWith('{')) {
    let map: Record<string, string>;
    try {
      map = JSON.parse(vsixGlob);
    } catch (err) {
      throw new Error(
        `VSIX_GLOB looks like JSON but failed to parse: ${(err as Error).message}`,
      );
    }
    const pattern = map[extension];
    if (!pattern) {
      throw new Error(
        `VSIX_GLOB map has no entry for extension '${extension}'.`,
      );
    }
    return pattern;
  }
  return vsixGlob;
}

function findVsixFiles(extension: string, artifactsPath: string): string[] {
  const vsixPattern = resolveVsixGlob(extension);

  // Artifacts are organized in subdirectories: vsix-artifacts/extension-name/file.vsix
  // Try both the subdirectory and root level
  const patterns = [
    join(artifactsPath, extension, vsixPattern), // Subdirectory structure
    join(artifactsPath, '**', vsixPattern), // Recursive search as fallback
    join(artifactsPath, vsixPattern), // Root level as fallback
  ];

  const foundFiles: string[] = [];
  for (const pattern of patterns) {
    const files = glob.sync(pattern);
    if (files.length > 0) {
      foundFiles.push(...files);
      break; // Found files, no need to check other patterns
    }
  }

  return foundFiles;
}

function generateReleaseNotes(
  extension: string,
  currentVersion: string,
  isNightly: string,
  preRelease: string,
): string {
  let releaseNotes = `## ${extension} v${currentVersion}\n\n`;
  releaseNotes += '### Changes\n\n';

  try {
    // Find the last release tag for this extension
    // Replaces shell pipeline `git tag --sort=-version:refname | grep "^v" | head -1`
    // with execFileSync + JS-side filtering (no shell expansion).
    const allTags = execFileSync(
      'git',
      ['tag', '--sort=-version:refname'],
      { encoding: 'utf8' },
    );
    const lastTag = allTags
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => /^v\d/.test(t))[0] || '';

    if (lastTag) {
      // Get commits since the last release
      const recentCommits = execFileSync(
        'git',
        ['log', '--oneline', `${lastTag}..HEAD`, '--', `packages/${extension}/`],
        { encoding: 'utf8' },
      ).trim();
      if (recentCommits) {
        const commits = recentCommits.split('\n').filter(Boolean);
        commits.forEach((commit) => {
          releaseNotes += `- ${commit}\n`;
        });
      } else {
        releaseNotes += '- General improvements and bug fixes\n';
      }
    } else {
      // First release - get all commits for this extension
      const allCommits = execFileSync(
        'git',
        ['log', '--oneline', '--', `packages/${extension}/`],
        { encoding: 'utf8' },
      ).trim();
      if (allCommits) {
        const commits = allCommits.split('\n').filter(Boolean);
        commits.forEach((commit) => {
          releaseNotes += `- ${commit}\n`;
        });
      } else {
        releaseNotes += '- Initial release\n';
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not generate release notes for ${extension}:`,
      error,
    );
    releaseNotes += '- General improvements and bug fixes\n';
  }

  releaseNotes += '\n### Installation\n\n';
  releaseNotes += 'Download the VSIX file and install via:\n';
  releaseNotes += '- VS Code: Install from VSIX...\n';
  releaseNotes += '- Command line: `code --install-extension <vsix-file>`\n';

  if (preRelease === 'true') {
    releaseNotes += '\n⚠️ **This is a pre-release version**\n';
  }

  if (isNightly === 'true') {
    const nightlyDate = new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    releaseNotes += `\n🌙 **This is a nightly build from ${nightlyDate}**\n`;
    releaseNotes += '\n### Nightly Build Information\n';
    releaseNotes += `- **Build Date**: ${nightlyDate}\n`;
    releaseNotes += `- **Version**: ${currentVersion} (pre-release build)\n`;
    releaseNotes += '- **Type**: Nightly pre-release for testing\n';
  }

  return releaseNotes;
}

function createGitHubRelease(
  extension: string,
  currentVersion: string,
  releaseNotes: string,
  vsixFiles: string[],
  isNightly: string,
  preRelease: string,
  dryRun: boolean,
): void {
  // Create release tag
  let releaseTag = `v${currentVersion}`;
  let releaseTitle = `${extension} v${currentVersion}`;

  // For nightly builds, add timestamp and branch to tag and title
  if (isNightly === 'true') {
    const nightlyDate = new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    const branch = process.env.BRANCH || 'main';
    // Format branch name: main -> no suffix, tdx26/main -> .tdx26-main
    const branchSuffix =
      branch === 'main' ? '' : `.${branch.replace(/\//g, '-')}`;
    releaseTag = `v${currentVersion}-nightly${branchSuffix}.${nightlyDate}`;
    releaseTitle = `${extension} v${currentVersion} (Nightly ${branch} ${nightlyDate})`;
  }

  if (dryRun) {
    console.log('✅ DRY RUN: Would create GitHub release:');
    console.log(`  - Tag: ${releaseTag}`);
    console.log(`  - Title: ${releaseTitle}`);
    console.log(`  - Pre-release: ${preRelease}`);
    console.log(`  - VSIX files: ${vsixFiles.join(', ')}`);
    console.log('  - Release notes preview:');
    console.log(releaseNotes.split('\n').slice(0, 20).join('\n'));
    console.log('  ... (truncated)');
  } else {
    console.log('🔄 LIVE: Creating GitHub release...');
    console.log(`Creating release: ${releaseTitle}`);
    console.log(`Tag: ${releaseTag}`);
    console.log(`Pre-release: ${preRelease}`);

    try {
      const repo = process.env.GITHUB_REPOSITORY || '';

      // Check if release already exists (idempotency)
      let releaseExists = false;
      let hasAssets = false;
      try {
        const viewOutput = execFileSync(
          'gh',
          ['release', 'view', releaseTag, '--repo', repo, '--json', 'assets'],
          { encoding: 'utf8' },
        );
        const releaseData = JSON.parse(viewOutput);
        releaseExists = true;
        hasAssets =
          Array.isArray(releaseData.assets) && releaseData.assets.length > 0;
      } catch {
        // Release does not exist — proceed to create
      }

      if (releaseExists && hasAssets) {
        console.log(
          `⏭️ Release ${releaseTag} already exists with assets — skipping`,
        );
      } else if (releaseExists) {
        console.log(
          `📎 Release ${releaseTag} exists but has no assets — uploading`,
        );
        execFileSync(
          'gh',
          ['release', 'upload', releaseTag, ...vsixFiles, '--repo', repo],
          { stdio: 'inherit' },
        );
        console.log(`✅ Assets uploaded to existing release for ${extension}`);
      } else {
        // Write release notes to a temporary file to avoid shell escaping issues
        const notesFile = join(process.cwd(), `.release-notes-${Date.now()}.tmp`);
        try {
          writeFileSync(notesFile, releaseNotes, 'utf8');
        } catch (writeError) {
          console.error(`Failed to write release notes file: ${writeError}`);
          throw writeError;
        }

        const ghArgs = [
          'release',
          'create',
          releaseTag,
          '--title',
          releaseTitle,
          '--notes-file',
          notesFile,
          ...(preRelease === 'true' ? ['--prerelease'] : []),
          '--repo',
          repo,
          ...vsixFiles,
        ];

        try {
          execFileSync('gh', ghArgs, { stdio: 'inherit' });

          // Clean up notes file after successful creation
          try {
            unlinkSync(notesFile);
          } catch (cleanupError) {
            console.warn(`Warning: Failed to clean up notes file ${notesFile}: ${cleanupError}`);
          }
          console.log(`✅ Release created for ${extension}`);
        } catch (createError) {
          // Clean up notes file even on error
          try {
            unlinkSync(notesFile);
          } catch (cleanupError) {
            console.warn(`Warning: Failed to clean up notes file ${notesFile}: ${cleanupError}`);
          }
          throw createError;
        }
      }
    } catch (error) {
      console.error(`Failed to create release for ${extension}:`, error);
      throw error;
    }
  }
}

function createGitHubReleases(options: GitHubReleaseOptions): void {
  const {
    dryRun,
    preRelease,
    versionBump,
    selectedExtensions,
    isNightly,
    vsixArtifactsPath,
  } = options;

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('Creating GitHub releases...');
  console.log(`Pre-release: ${preRelease}`);
  console.log(`Version bump: ${versionBump}`);
  console.log(`Extensions: ${selectedExtensions}`);

  const extensions = selectedExtensions.split(',').filter(Boolean);

  for (const ext of extensions) {
    const packageDetails = getPackageDetails(ext);
    if (!packageDetails) {
      console.warn(`Skipping ${ext}: package.json not found`);
      continue;
    }

    console.log(`Processing extension: ${ext}`);
    console.log(`Current version: ${packageDetails.version}`);

    const vsixFiles = findVsixFiles(ext, vsixArtifactsPath);
    if (vsixFiles.length === 0) {
      console.warn(`No VSIX files found for ${ext} in ${vsixArtifactsPath}`);
      continue;
    }

    const releaseNotes = generateReleaseNotes(
      ext,
      packageDetails.version,
      isNightly,
      preRelease,
    );

    createGitHubRelease(
      ext,
      packageDetails.version,
      releaseNotes,
      vsixFiles,
      isNightly,
      preRelease,
      dryRun,
    );
  }

  if (dryRun) {
    console.log('✅ DRY RUN: GitHub release simulation completed');
  } else {
    console.log('✅ LIVE: GitHub releases created');
  }
}

// Export for use in other modules
export { createGitHubReleases };
