# Github Workflows

Reusable workflows and actions

## Opinionated publish process for npm

> github is the source of truth for code AND releases. Get the version/tag/release right on github, then publish based on that.

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

## Other Tooling

### validatePR

### unitTest

### nut

### externalNut

### automerge
