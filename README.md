# Github Workflows

Reusable workflows and actions

## Opinionated publish process for npm

> github is the source of truth for code AND releases. Get the version/tag/release right on github, then publish to npm based on that.

1. work on a feature branch, commiting with conventional-commits
2. merge to main
3. A push to main produces (if your commits warrant it) a bumped package.json and a tagged github release via `githubRelease`
4. A release cause `npmPublish` to run.

Just need to publish to npm? Use a public action to do step 4.
Use this repo's `npmPublish` if you need either

1. codesigning for Salesforce CLIs
2. integration with CTC
   or if you own other repos that need those features and just want consistency.

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
```

## Opinionated Testing Process

Write unit tests to tests units of code (a function/method)
Write not-unit-tests to tests larger parts of code (a command) against real environments/APIs
Run the UT first (faster, less expensive for infrastructure/limits)

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

### validatePR

requires PR reference a github issue url or a GUS WI surrounded by `@` (`@W-xxxxxxxx@`)

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

### automerge

### versionInfo

> requires npm to exist. Use in a workflow that has already done that

given an npmTag (ex: `7.100.0` or `latest`) returns the numeric version (`foo` => `7.100.0`) plus the xz linux tarball url and the short (7 char) sha.

Intended for releasing CLIs, not for general use on npm packages.

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
