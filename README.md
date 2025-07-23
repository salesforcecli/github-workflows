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

Just need to publish to npm? You could use any public action to do step 4.
Use this repo's `npmPublish` if you need either

1. codesigning for Salesforce CLIs
2. integration with CTC
   or if you own other repos that need those features and just want consistency.

### githubRelease

> creates a github release based on conventional commit prefixes. Using commits like `fix: etc` (patch version) and `feat: wow` (minor version).
> A commit whose **body** (not the title) contains `BREAKING CHANGES:` will cause the action to update the packageVersion to the next major version, produce a changelog, tag and release.

```yml
name: create-github-release

on:
  push:
    branches: [main]

jobs:
  release:
    uses: salesforcecli/github-workflows/.github/workflows/create-github-release.yml@main
    secrets: inherit
    # you can also pass in values for the secrets
    # secrets:
    #  SVC_CLI_BOT_GITHUB_TOKEN: gh_pat00000000
```

### npmPublish

> This will verify that the version has not already been published. There are additional params for signing your plugin and integrating with Change Traffic Control (release moratoriums) that you probably only care about if your work for Salesforce.

example usage

```yml
on:
  release:
    # the result of the githubRelease workflow
    types: [published]

jobs:
  my-publish:
    uses: salesforcecli/github-workflows/.github/workflows/npmPublish.yml
    with:
      tag: latest
      githubTag: ${{ github.event.release.tag_name }}
    secrets: inherit
    # you can also pass in values for the secrets
    # secrets:
    #  NPM_TOKEN: ^&*$
```

works with npm, too

```yml
with:
  packageManager: npm
```

### Plugin Signing

Plugins created by Salesforce teams can be signed automatically with `sign:true` if the repo is in [salesforcecli](https://github.com/salesforcecli) or [forcedotcom](https://github.com/forcedotcom) gitub organization.

You'll need the CLI team to enable your repo for signing. Ask in https://salesforce-internal.slack.com/archives/C0298EE05PU

Plugin signing is not available outside of Salesforce. Your users can add your plugin to their allow list (`unsignedPluginAllowList.json`)

```yml
on:
  release:
    # the result of the githubRelease workflow
    types: [published]

jobs:
  my-publish:
    uses: salesforcecli/github-workflows/.github/workflows/npmPublish.yml
    with:
      sign: true
      tag: latest
      githubTag: ${{ github.event.release.tag_name }}
    secrets: inherit
```

### Prereleases

`main` will release to `latest`. Other branches can create github prereleases and publish to other npm dist tags.

You can create a prerelease one of two ways:

1. Create a branch with the `prerelease/**` prefix. Example `prerelease/my-fix`
   1. Once a PR is opened, every commit pushed to this branch will create a prerelease
   2. The default prerelease tag will be `dev`. If another tag is desired, manually set it in your `package.json`. Example: `1.2.3-beta.0`
1. Manually run the `create-github-release` workflow in the Actions tab
   1. Click `Run workflow`
      1. Select the branch you want to create a prerelease from
      1. Enter the desired prerelease tag: `dev`, `beta`, etc

> [!NOTE]  
> Since conventional commits are used, there is no need to manually remove the prerelease tag from your `package.json`. Once the PR is merged into `main`, conventional commits will bump the version as expected (patch for `fix:`, minor for `feat:`, etc)

Setup:

1. Configure the branch rules for wherever you want to release from
1. Modify your release and publish workflows like the following

```yml
name: create-github-release

on:
  push:
    branches:
      - main
      # point at specific branches, or a naming convention via wildcard
      - prerelease/**
    tags-ignore:
      - "*"
  workflow_dispatch:
    inputs:
      prerelease:
        type: string
        description: "Name to use for the prerelease: beta, dev, etc. NOTE: If this is already set in the package.json, it does not need to be passed in here."

jobs:
  release:
    uses: salesforcecli/github-workflows/.github/workflows/create-github-release.yml@main
    secrets: inherit
    with:
      prerelease: ${{ inputs.prerelease }}
      # If this is a push event, we want to skip the release if there are no semantic commits
      # However, if this is a manual release (workflow_dispatch), then we want to disable skip-on-empty
      # This helps recover from forgetting to add semantic commits ('fix:', 'feat:', etc.)
      skip-on-empty: ${{ github.event_name == 'push' }}
```

```yml
name: publish

on:
  release:
    # both release and prereleases
    types: [published]
  # support manual release in case something goes wrong and needs to be repeated or tested
  workflow_dispatch:
    inputs:
      tag:
        description: github tag that needs to publish
        type: string
        required: true

jobs:
  # parses the package.json version and detects prerelease tag (ex: beta from 4.4.4-beta.0)
  getDistTag:
    outputs:
      tag: ${{ steps.distTag.outputs.tag }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.release.tag_name || inputs.tag  }}
      - uses: salesforcecli/github-workflows/.github/actions/getPreReleaseTag@main
        id: distTag

  npm:
    uses: salesforcecli/github-workflows/.github/workflows/npmPublish.yml@main
    needs: [getDistTag]
    with:
      tag: ${{ needs.getDistTag.outputs.tag || 'latest' }}
      githubTag: ${{ github.event.release.tag_name || inputs.tag }}
    secrets: inherit
```

### Publishing from multiple long-lived branches

> In this example `main` publishes to npm on a 1.x.x version and uses `latest`. `some-other-branch` publishes version 2.x.x and uses the `v2` dist tag

```yml
name: version, tag and github release

on:
  push:
    # add the other branch so that it causes github releases just like main does
    branches: [main, some-other-branch]

jobs:
  release:
    uses: salesforcecli/github-workflows/.github/workflows/githubRelease.yml@main
    secrets: inherit
```

```yml
on:
  release:
    # the result of the githubRelease workflow
    types: [published]

jobs:
  my-publish:
    uses: salesforcecli/github-workflows/.github/workflows/npmPublish.yml
    with:
      # ternary-ish https://github.com/actions/runner/issues/409#issuecomment-752775072
      # if the version is 2.x we release it on the `v2` dist tag
      tag: ${{ startsWith( github.event.release.tag_name || inputs.tag, '1.') && 'latest' || 'v2'}}
      githubTag: ${{ github.event.release.tag_name }}
    secrets: inherit
```

## Opinionated Testing Process

Write unit tests to tests units of code (a function/method).

Write not-unit-tests to tests larger parts of code (a command) against real environments/APIs.

Run the UT first (faster, less expensive for infrastructure/limits).

```yml
name: tests
on:
  push:
    branches-ignore: [main]
  workflow_dispatch:

jobs:
  unit-tests:
    uses: salesforcecli/github-workflows/.github/workflows/unitTest.yml@main
  nuts:
    needs: unit-tests
    uses: salesforcecli/github-workflows/.github/workflows/nut.yml@main
    secrets: inherit
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
      fail-fast: false
    with:
      os: ${{ matrix.os }}
```

## Other Tooling

### nut conditional on commit message

```yml
# conditional nuts based on commit message includes a certain string
sandbox-nuts:
  needs: [nuts, unit-tests]
  if: contains(github.event.push.head_commit.message,'[sb-nuts]')
  uses: salesforcecli/github-workflows/.github/workflows/nut.yml@main
  secrets: inherit
  with:
    command: test:nuts:sandbox
    os: ubuntu-latest
```

### externalNut

> Scenario
>
> 1. you have NUTs on a plugin that uses a library
> 2. you want to check changes to the library against those NUTs

see https://github.com/forcedotcom/source-deploy-retrieve/blob/> e09d635a7b852196701e71a4b2fba401277da313/.github/workflows/test.yml#L25 for an example

### automerge

> This example calls the automerge job. It'll merge PRs from dependabot that are
>
> 1. up to date with main
> 2. mergeable (per github)
> 3. all checks have completed and none failed (skipped may not have run)

```yml
name: automerge
on:
  workflow_dispatch:
  schedule:
    - cron: "56 2,5,8,11 * * *"

jobs:
  automerge:
    uses: salesforcecli/github-workflows/.github/workflows/automerge.yml@main
    # secrets are needed
    secrets: inherit
```

need squash?

```yml
automerge:
  with:
    mergeMethod: squash
```

### versionInfo

> requires npm to exist. Use in a workflow that has already done that
>
> given an npmTag (ex: `7.100.0` or `latest`) returns the numeric version (`foo` => `7.100.0`) plus > the xz linux tarball url and the short (7 char) sha.
>
> Intended for releasing CLIs, not for general use on npm packages.

```yml
# inside steps
- uses: salesforcecli/github-workflows/.github/actions/versionInfo@main
  id: version-info
  with:
    version: ${{ inputs.version }}
    npmPackage: sfdx-cli
- run: echo "version is ${{ steps.version-info.outputs.version }}
- run: echo "sha is ${{ steps.version-info.outputs.sha }}
- run: echo "url is ${{ steps.version-info.outputs.url }}
```

### validatePR

> Checks that PRs have a link to a github issue OR a GUS WI in the form of `@W-12456789@` (the `@` are to be compatible with [git2gus](https://github.com/forcedotcom/git2gus))

```yml
name: pr-validation

on:
  pull_request:
    types: [opened, reopened, edited]
    # only applies to PRs that want to merge to main
    branches: [main]

jobs:
  pr-validation:
    uses: salesforcecli/github-workflows/.github/workflows/validatePR.yml@main
```

### prNotification

> Mainly used to notify Slack when Pull Requests are opened.
>
> For more info see [.github/actions/prNotification/README.md](.github/actions/prNotification/README.md)

```yaml
name: Nightly Release

on:
  schedule:
    - cron: "0 4 * * *" # 4 AM UTC daily
  workflow_dispatch:
    inputs:
      dry-run:
        description: "Run in dry-run mode"
        type: boolean
        default: false

jobs:
  nightly:
    uses: salesforcecli/github-workflows/.github/workflows/vscode-nightly-release.yml@main
    with:
      # Explicitly declare your extension paths
      extension-paths: "packages/salesforcedx-vscode-*"
      release-mode: changed # all | changed | specific
      base-branch: main
      dry-run: ${{ inputs.dry-run || false }}
    secrets: inherit
```

## Configuration Examples

### 1. Monorepo - All Extensions

Release all extensions matching a pattern:

```yaml
with:
  extension-paths: "packages/salesforcedx-vscode-*"
  release-mode: all
```

### 2. Monorepo - Changed Only

Release only extensions that have changes:

```yaml
with:
  extension-paths: "packages/salesforcedx-vscode-*"
  release-mode: changed
  base-branch: main
```

### 3. Single Extension Repository

```yaml
with:
  extension-paths: "."
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

| Input             | Description                             | Example                      |
| ----------------- | --------------------------------------- | ---------------------------- |
| `extension-paths` | Glob pattern or list of extension paths | `packages/*`                 |
| `release-mode`    | How to determine what to release        | `changed`, `all`, `specific` |

### Optional Inputs

| Input          | Description                      | Default                                |
| -------------- | -------------------------------- | -------------------------------------- |
| `base-branch`  | Base branch for change detection | `main`                                 |
| `dry-run`      | Skip actual publishing           | `false`                                |
| `pre-release`  | Mark as pre-release              | `true`                                 |
| `version-bump` | Version bump strategy            | `auto`                                 |
| `registries`   | Where to publish                 | `all` (VS Code Marketplace + Open VSX) |

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

| Feature                     | Explicit Declaration | Auto-Discovery              |
| --------------------------- | -------------------- | --------------------------- |
| **Setup complexity**        | Low                  | High (npm package)          |
| **Dependencies**            | None                 | npm git dependency          |
| **Works for any structure** | ✅ Yes               | ❌ Assumes standard layout  |
| **Consumer control**        | ✅ Full control      | ⚠️ Magic behavior           |
| **Maintenance**             | ✅ Simple            | ❌ Complex TypeScript/build |
| **Installation issues**     | ✅ None              | ❌ npm git dep bugs         |

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
  extension-paths: "packages/*" # Explicitly declare
  release-mode: changed
```

### From Manual Workflows

Replace your custom nightly workflow with:

```yaml
jobs:
  nightly:
    uses: salesforcecli/github-workflows/.github/workflows/vscode-nightly-release.yml@main
    with:
      extension-paths: "<your-paths>"
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
