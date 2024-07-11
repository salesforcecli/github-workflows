# Audit of Github actions for RCE

## Notes:
- The max payload size for an input is 65,535 characters [source](https://docs.github.com/en/enterprise-cloud@latest/actions/using-workflows/workflow-syntax-for-github-actions#:~:text=The%20maximum%20payload%20for%20inputs%20is%2065%2C535%20characters)
- 🟠 It is possible to nest a command in the `package.json` and have it be pulled out with `github-workflows/.github/actions/get-json-property` 
    - Here is an [example](https://github.com/iowillhoit/gha-sandbox/actions/runs/9603339877/job/26486286410#step:5:1) using `"version": "foo\"; ls -lah; echo \"bar",`
    - TODO: add screenshot "Screenshot 2024-06-20 at 2.40.30 PM"
    - However... this would require us to approve a PR to run workflows that has clearly been tampered with. This type of exploit is along the same lines of someone changing a `package.json > script` or modifying a repo's Workflow files themselves.

## Unknowns:
- Once an external contributor has been approved to run workflows, do follow up commits run workflows automatically? Or do additional commits need to be re-approved to run? If it is "approve once, always run", someone could open a legit PR, get approved, then do some malicious things, then change the code back. 

## Tests:
> It doesn't seem to matter how the quotes are structure, as long as you close them out correctly.
> Using https://github.com/iowillhoit/gha-sandbox/actions/workflows/testing-inputs.yml to test RCE
🔴 `echo "Value '${{ inputs.string }}' from inputs.string"`
🔴 `echo "Value ${{ inputs.string }} from inputs.string"`
🔴 `echo 'Value ${{ inputs.string }} from inputs.string'`
🔴 `printf "Value %s from inputs.string" foo; ls -lah`
   ^ It does not matter if printf is used. It still treats the `ls -lah` as a new command ([action]())
🔴 `FOO="${{ inputs.string }}"; printf "Value %s from inputs.string" $FOO`
   ^ Wrapping in a var does not help if input is built correctly ([action](https://github.com/iowillhoit/gha-sandbox/actions/runs/9587452357/job/26437518458#step:3:2))
   🟡 TODO: Get screenshot "Screenshot 2024-06-19 at 2.52.06 PM"

## `github-workflows` repo

### Workflows
- 🟢 automerge.yml
    - No inputs
    - (Dried up action)
- ❓ create-github-release.yml
- 🟡 ctcClose.yml
    - Injection possible, but... 
    - We control all inputs
        - `changeCaseId` and `status` are passed in from `ctcOpen` step outputs.
- 🟢 ctcOpen.yml
    - No inputs
    - We control all variables
- 🟠 devScriptsUpdate.yml
    - Potential RCE with `github-workflows/.github/actions/get-json-property`
    - See note above ^
- 🟡 externalCompile.yml
    - Injection possible, but...
    - All inputs are hardcoded
        - Only used [here](https://github.com/forcedotcom/ts-types/blob/b5ec96d88facef0bc81f22ac04696a0d7b946087/.github/workflows/test.yml#L18)
- ❓ externalNut.yml
- ❓ githubRelease.yml
- 🟠 inclusionTest.yml
    - No RCE risk
    - We should delete this one, this is a pre-JIT workflow.
        - It is only used by `plugin-functions`
- 🟢 lockFileCheck.yml
    - No inputs or needs
- 🟢 notify-slack-on-pr-open.yml
    - No inputs
    - No `run`s
- 🟡 npmPublish.yml
    - Injection possible, but...
    - INPUTS
        - `githubTag`
            - Comes from `github.event.release.tag_name` [example](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/9db4c65d9d611e0141d5aafc2782e3e15a0616a4/.github/workflows/onRelease.yml#L31C22-L31C51) or the `input` of a workflow dispatch, which external users would not be able to execute.
        - `tag`
            - Is `latest` or comes from `package.json`. The `get-json-property` issue (see note above ^) does not pertain here. The `npmPublish` is triggered by a Github Release being created. If someone had modified the `package.json > version` and somehow got the PR approved and merged. The Github Release would fail and not make it this far.
- 🟡 nut.yml
    - Injection possible, but...
    - Most input are not used in a `run`
        - `sfdxExecutablePath` is not passed anywhere, so default is used
        - `command` Either hardcoded or using the default everywhere [search](https://github.com/search?q=org%3Asalesforcecli+nut.yml++NOT+is%3Aarchived&type=code&p=1)
- 🟡 packUploadMac.yml
    - Injection possible, but...
    - We own all inputs
        - `cli` 
            - Hardcoded [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L97)
        - `version`
            -  - From github `github.event.release.tag_name` [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L98)
        - `channel`
            - Channel is pulled from the Release body and the regex is restrictive enough [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L20)
        - `nodeVersion`
            - Github env or hardcoded default [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L100)
- 🟡 packUploadWindows.yml
    - Injection possible, but...
    - We own all inputs
        - `cli` 
            - Hardcoded [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L107)
        - `version`
            -  - From github `github.event.release.tag_name` [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L108)
        - `channel`
            - Channel is pulled from the Release body and the regex is restrictive enough [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L20)
        - `nodeVersion`
            - Github env or hardcoded default [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L110)
- 🟢 publishTypedoc.yml
    - No inputs
    - No values in `run`
- 🟡 stampyUpload.yml
    - Injection possible, but...
    - We own all inputs. They are either hardcoded or pulled from `github.event` [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L118-L120)
- 🟡 tarballs.yml
    - Injection possible, but...
    - We own all inputs
        - `cli`
            - Hardcoded [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L62)
            - Not passed [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/test.yml#L20)
        - `version`
            - From github `github.event.release.tag_name` [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L63C20-L63C49)
            - Not passed [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/test.yml#L20)
        - `channel`
            - Channel is pulled from the Release body and the regex is restrictive enough [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/create-cli-release.yml#L20)
            - Not passed [source](https://github.com/salesforcecli/cli/blob/e5a4e7e13ca48da9973fc7a1e462112c11fd22ec/.github/workflows/test.yml#L20)
- 🟢 unitTest.yml
    - No inputs
    - No runs
- 🟢 unitTestsLinux.yml
    - No inputs
    - No values in `run`
- 🟢 unitTestsWindows.yml
    - No inputs
    - No values in `run`
- 🔴 validatePR.yml
    - RCE possible because of lax regex (`.+`). 
    - Need to merge https://github.com/salesforcecli/github-workflows/pull/110


### Actions
- ctcOpen
- determineNodeVersions
- generateOclifReadme
- get-json-property
- getGithubUserInfo
- getPackageName
- getPreReleaseTag
- gitConfig
- parse-semver
- prNotification
- renameMacPkg
- retry
- versionInfo
- yarnInstallWithRetries