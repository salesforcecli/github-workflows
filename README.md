# Salesforce VS Code Extension CI/CD Workflows

Shared GitHub Actions workflows for automating nightly releases and CI/CD for VS Code extension repositories.

## Overview

This repository provides **reusable GitHub Actions workflows** that can be called from consumer repositories to automate:
- Nightly pre-release builds
- Version bumping
- Extension packaging and publishing
- GitHub release creation

**Key Design Principle:** Consumer repositories **explicitly declare** their extension paths in workflow YAML - no auto-discovery or npm packages required!

## Usage

### Quick Start

In your VS Code extension repository, create `.github/workflows/nightly.yml`:

```yaml
name: Nightly Release

on:
  schedule:
    - cron: '0 4 * * *'  # 4 AM UTC daily
  workflow_dispatch:
    inputs:
      dry-run:
        description: 'Run in dry-run mode'
        type: boolean
        default: false

jobs:
  nightly:
    uses: salesforcecli/github-workflows/.github/workflows/vscode-nightly-release.yml@main
    with:
      # Explicitly declare your extension paths
      extension-paths: 'packages/salesforcedx-vscode-*'
      release-mode: changed  # all | changed | specific
      base-branch: main
      dry-run: ${{ inputs.dry-run || false }}
    secrets: inherit
```

## Configuration Examples

### 1. Monorepo - All Extensions

Release all extensions matching a pattern:

```yaml
with:
  extension-paths: 'packages/salesforcedx-vscode-*'
  release-mode: all
```

### 2. Monorepo - Changed Only

Release only extensions that have changes:

```yaml
with:
  extension-paths: 'packages/salesforcedx-vscode-*'
  release-mode: changed
  base-branch: main
```

### 3. Single Extension Repository

```yaml
with:
  extension-paths: '.'
  release-mode: all
```

### 4. Mixed/Custom Structure

Explicitly list different paths:

```yaml
with:
  extension-paths: |
    packages/libraries/foo
    packages/extensions/bar
    packages/extensionPacks/baz
  release-mode: changed
```

### 5. Specific Extensions Only

```yaml
with:
  extensions: |
    packages/salesforcedx-vscode-apex
    packages/salesforcedx-vscode-core
  release-mode: all
```

## Workflow Inputs

### Required Inputs

| Input | Description | Example |
|-------|-------------|---------|
| `extension-paths` | Glob pattern or list of extension paths | `packages/*` |
| `release-mode` | How to determine what to release | `changed`, `all`, `specific` |

### Optional Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `base-branch` | Base branch for change detection | `main` |
| `dry-run` | Skip actual publishing | `false` |
| `pre-release` | Mark as pre-release | `true` |
| `version-bump` | Version bump strategy | `auto` |
| `registries` | Where to publish | `all` (VS Code Marketplace + Open VSX) |

## Architecture

### No npm Package Required!

Unlike traditional approaches, this workflow system:
- ✅ Uses **only GitHub Actions native features**
- ✅ Requires **explicit path declaration** from consumers
- ✅ Performs all logic via **shell/bash scripts in workflows**
- ✅ **No cross-repo npm dependencies** to install or manage

### How It Works

```
┌─────────────────────────────────────┐
│ Consumer Repo                       │
│                                     │
│  .github/workflows/nightly.yml     │
│  - Explicitly declares paths       │
│  - Calls shared workflow           │
└──────────────┬──────────────────────┘
               │ uses:
               │ salesforcecli/github-workflows/
               │   .github/workflows/vscode-nightly-release.yml
               ▼
┌─────────────────────────────────────┐
│ Shared Workflow                     │
│                                     │
│  1. Parse declared paths            │
│  2. Run git diff (if changed mode)  │
│  3. Bump versions                   │
│  4. Create PR                       │
│  5. Auto-merge                      │
│  6. Publish & release               │
└─────────────────────────────────────┘
```

## Benefits

### vs Auto-Discovery Approach

| Feature | Explicit Declaration | Auto-Discovery |
|---------|---------------------|----------------|
| **Setup complexity** | Low | High (npm package) |
| **Dependencies** | None | npm git dependency |
| **Works for any structure** | ✅ Yes | ❌ Assumes standard layout |
| **Consumer control** | ✅ Full control | ⚠️ Magic behavior |
| **Maintenance** | ✅ Simple | ❌ Complex TypeScript/build |
| **Installation issues** | ✅ None | ❌ npm git dep bugs |

### Key Advantages

1. **No npm Package Installation** - Avoids npm git dependency issues entirely
2. **Flexible Structure** - Works with monorepos, single extensions, custom layouts
3. **Explicit Intent** - Clear declaration of what gets released
4. **Simple Maintenance** - Pure workflow YAML, no complex TypeScript
5. **Fast Setup** - Consumer just declares paths in YAML

## Features

### Smart Version Bumping

Automatically determines version bumps based on:
- **Conventional commits** (`fix:`, `feat:`, `feat!:`)
- **Even/odd versioning pattern** for stable vs pre-release

### Change Detection

When `release-mode: changed`:
- Runs `git diff` against base branch
- Identifies modified extensions
- Only releases what changed

### Dry-Run Mode

Test the full workflow without publishing:
```yaml
dry-run: true
```

This will:
- ✅ Create local branches and commits
- ✅ Build VSIXes
- ✅ Validate the flow
- ❌ Skip: git push, PR creation, publishing

## Workflow Structure

The main workflow calls these sub-workflows in sequence:

1. **`vscode-make-pr-for-nightly.yml`** - Bumps versions, creates PR
2. **`vscode-automerge-nightly-pr.yml`** - Auto-merges after checks pass
3. **`vscode-draft-release-on-merge.yml`** - Publishes and creates releases

## Required Secrets

Configure these in your repository settings:

- `VSCE_PAT` - VS Code Marketplace personal access token
- `OVSX_PAT` - Open VSX personal access token
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Supported Repository Types

- ✅ **Monorepo** with multiple extensions
- ✅ **Single extension** repository
- ✅ **Mixed structure** (libraries + extensions + packs)
- ✅ **Custom layouts** with explicit path declaration

## Migration Guide

### From Auto-Discovery Approach

If you were using an npm package for auto-discovery:

**Before:**
```yaml
- name: Install dependencies
  run: npm install
- name: Discover extensions
  run: npx tsx .github/scripts/index.ts ext-package-selector
```

**After:**
```yaml
with:
  extension-paths: 'packages/*'  # Explicitly declare
  release-mode: changed
```

### From Manual Workflows

Replace your custom nightly workflow with:

```yaml
jobs:
  nightly:
    uses: salesforcecli/github-workflows/.github/workflows/vscode-nightly-release.yml@main
    with:
      extension-paths: '<your-paths>'
      release-mode: changed
    secrets: inherit
```

## Examples

See real-world examples in:
- [forcedotcom/salesforcedx-vscode](https://github.com/forcedotcom/salesforcedx-vscode)
- [forcedotcom/apex-language-support](https://github.com/forcedotcom/apex-language-support)

## Contributing

This repository follows Salesforce open source guidelines. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

BSD-3-Clause - See [LICENSE.txt](LICENSE.txt)

## Support

For questions or issues:
- Open an issue in this repository
- Contact the VS Code Extensions Team
- See [NIGHTLY_RELEASE_DESIGN.md](docs/NIGHTLY_RELEASE_DESIGN.md) for detailed architecture

---

**Note:** This approach eliminates the need for the npm package (`@salesforce/vscode-extension-ci`). All logic is contained in GitHub Actions workflows that can be called directly via `uses:` syntax.
