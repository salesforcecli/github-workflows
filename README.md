# @salesforce/vscode-extension-ci

Shared CI/CD infrastructure for Salesforce VS Code extensions.

## Installation

```bash
npm install --save-dev @salesforce/vscode-extension-ci
```

## CLI Usage

The package provides a CLI tool for running release automation scripts:

```bash
npx vscode-ext-ci <command>
```

### Available Commands

**Extension Management:**
- `ext-build-type` - Determine build type (nightly/promotion/regular)
- `ext-change-detector` - Detect changes in extensions and determine version bump
- `ext-nightly-finder` - Find eligible nightly builds for pre-release promotion
- `ext-package-selector` - Discover available VS Code extensions
- `ext-publish-matrix` - Generate publish matrix for marketplace publishing
- `ext-release-plan` - Display extension release plan
- `ext-version-bumper` - Bump versions for selected extensions
- `ext-github-releases` - Create GitHub releases with VSIX artifacts

**NPM Package Management:**
- `npm-change-detector` - Detect changes in NPM packages
- `npm-package-selector` - Select NPM packages for release
- `npm-package-details` - Extract package details for notifications
- `npm-release-plan` - Generate NPM release plan

**Utilities:**
- `audit-logger` - Log audit events for compliance

## Environment Variables

Configure behavior with environment variables:

- `PACKAGES_ROOT` - Root directory for packages (default: `packages`)
- `TAG_PREFIX` - Git tag prefix (default: `marketplace`)
- `AUDIT_LOG_DIR` - Audit log directory (default: `.github/audit-logs`)

## Programmatic API

```typescript
import {
  detectExtensionChanges,
  bumpVersions,
  createGitHubReleases,
  determinePublishMatrix
} from '@salesforce/vscode-extension-ci';

// Detect changes
const changes = await detectExtensionChanges(buildContext, commitSha, extensions);

// Bump versions
bumpVersions({
  versionBump: 'auto',
  selectedExtensions: 'my-extension',
  preRelease: 'true',
  isNightly: 'true'
});
```

## Features

### Smart Version Bumping

Uses conventional commits and even/odd minor versioning:

- **Even minor** (0.2.x, 0.4.x) → Stable releases
- **Odd minor** (0.3.x, 0.5.x) → Pre-releases
- `fix:` commits → patch bump
- `feat:` commits → minor bump
- `feat!:` or `BREAKING CHANGE:` → major bump

### Change Detection

Analyzes git history and conventional commits to determine:
- Which extensions have changes
- What type of version bump is needed
- Whether to create a release

### GitHub Releases

Automatically creates GitHub releases with:
- VSIX artifacts attached
- Release notes from commits
- Proper tagging (pre-release vs stable)

## License

BSD-3-Clause
