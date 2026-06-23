# Architecture: VS Code Extension Nightly Releases

## Design Philosophy

Consumer repositories **explicitly declare their extension paths** in workflow YAML. No npm packages, no auto-discovery - just pure GitHub Actions workflows.

## Core Architecture

```
┌──────────────────────────────────────────────┐
│ Consumer Repository                          │
│                                              │
│  .github/workflows/nightly.yml              │
│                                              │
│  with:                                      │
│    extension-paths: 'packages/*'            │
│    release-mode: changed                    │
│    base-branch: main                        │
└──────────────┬───────────────────────────────┘
               │
               │ uses: salesforcecli/github-workflows/
               │       .github/workflows/vscode-nightly-release.yml
               │
               ▼
┌──────────────────────────────────────────────┐
│ Shared Workflow (this repo)                 │
│                                              │
│  1. Parse extension-paths input             │
│  2. Detect changes (if mode=changed)        │
│  3. Bump versions                           │
│  4. Create PR                               │
│  5. Auto-merge                              │
│  6. Publish & Release                       │
└──────────────────────────────────────────────┘
```

## Implementation

### Pure GitHub Actions

All logic uses:
- **Bash scripts** for file operations
- **Git commands** for change detection  
- **Node.js scripts** (inline) for JSON parsing
- **GitHub CLI (`gh`)** for PR/release management
- **Composite Actions** for reusable steps

### Workflow Structure

**Main workflow:** `vscode-nightly-release.yml`

**Sub-workflows:**
1. `vscode-make-pr-for-nightly.yml` - Bump versions, create PR
2. `vscode-automerge-nightly-pr.yml` - Auto-merge after checks
3. `vscode-draft-release-on-merge.yml` - Publish and create releases

## Configuration

### extension-paths

Glob patterns or explicit paths:

```yaml
# Standard monorepo
extension-paths: 'packages/*'

# Specific pattern
extension-paths: 'packages/salesforcedx-vscode-*'

# Multiple paths
extension-paths: |
  packages/apex
  packages/core
  packages/lwc

# Custom structure
extension-paths: |
  libs/shared
  extensions/main
  packs/bundle
```

### release-mode

**`all`** - Release all matching extensions

**`changed`** - Release only modified extensions (requires `base-branch`)

**`specific`** - Release specific extensions (requires `extensions` list)

## Supported Structures

### Standard Monorepo
```
repo/packages/
  ├── extension-a/
  ├── extension-b/
  └── extension-c/
```
→ `extension-paths: 'packages/*'`

### Custom Layout
```
repo/
  ├── libs/shared/
  ├── exts/apex/
  ├── exts/lwc/
  └── packs/bundle/
```
→ `extension-paths: |`  
  `exts/*`  
  `packs/bundle`

### Single Extension
```
repo/
  ├── package.json
  └── src/
```
→ `extension-paths: '.'`

## Benefits

- ✅ Works with any repository structure
- ✅ No external dependencies
- ✅ Consumer has full control
- ✅ Simple to understand and maintain
- ✅ Scales from single extensions to large monorepos

## Example Usage

```yaml
name: Nightly Release

on:
  schedule:
    - cron: '0 4 * * *'
  workflow_dispatch:

jobs:
  nightly:
    uses: salesforcecli/github-workflows/.github/workflows/vscode-nightly-release.yml@main
    with:
      extension-paths: 'packages/salesforcedx-vscode-*'
      release-mode: changed
      base-branch: main
    secrets: inherit
```

## Required Secrets

- `VSCE_PAT` - VS Code Marketplace token
- `OVSX_PAT` - Open VSX token  
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions
