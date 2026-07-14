# GitHub Workflows Scripts

This directory contains TypeScript scripts used by the reusable workflows in this repository.

## Scripts

### ext-change-detector.ts

Detects which VS Code extensions have changed since their last release and determines the appropriate version bump type.

**Features:**
- Discovers all VS Code extensions in the `packages/` directory (packages with a `publisher` field)
- Supports special values for extension selection:
  - `'all'` - selects all available extensions
  - `'changed'` - detects extensions with changes via git diff against per-extension tags
  - `'none'` - skips all extensions
  - Specific names - validates and uses the specified extensions
- Git-based change detection:
  - Finds last release tag per extension (pattern: `{extension-name}-v{version}`)
  - Runs `git diff {lastTag}..HEAD -- {extensionPath}`
  - Returns extensions with changes since their last tag
- Conventional commit analysis for `version-bump: 'auto'`:
  - Detects `BREAKING CHANGE` → major bump
  - Detects `feat:` → minor bump
  - Default → patch bump

**Usage in workflows:**
```yaml
- name: Detect changes and version bumps
  id: changes
  env:
    IS_NIGHTLY: 'true'
    VERSION_BUMP: 'auto'
    PRE_RELEASE: 'true'
    IS_PROMOTION: 'false'
    SELECTED_EXTENSIONS: 'changed'  # or 'all', 'none', or comma-separated names
  run: |
    npx tsx .github/scripts/index.ts ext-change-detector
```

**Outputs:**
- `selected-extensions` - Comma-separated list of extensions to release
- `version-bumps` - Determined version bump type (major, minor, patch)

## Dependencies

The scripts require the following npm packages:
- `simple-git` - Git operations
- `chalk` - Terminal output formatting
- `semver` - Semantic version parsing and comparison
- `zod` - Schema validation
- `tsx` - TypeScript execution

## Local Development

Install dependencies:
```bash
npm install
```

Run a script:
```bash
npm run ext-change-detector
```

Or directly with tsx:
```bash
npx tsx .github/scripts/index.ts ext-change-detector
```

## Integration with Consuming Repositories

These scripts are automatically downloaded and executed by the reusable workflows in this repository. Consuming repositories do not need to copy these scripts - they are fetched at runtime from the main branch of this repository.

The `vscode-publish-extensions.yml` workflow automatically:
1. Downloads the scripts from GitHub
2. Installs required dependencies
3. Executes the change detection
4. Uses the outputs to determine which extensions to publish
