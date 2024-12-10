# Determine Node Versions Action

This action will fetch the Node.js Release Schedule JSON and find all versions that are "open". The action sets the `nodeVersions` output with an array of Node versions. These versions will be used to run tests against. Example in `.github/workflows/unitTestsLinux.yml`

### Installing and building

This packages uses `ncc` to create a single javascript file for execution. Running the following will bundle a new `dist/index.js` file that needs to be committed to the repo.

```shell
cd .github/actions/determineNodeVersions
yarn install
yarn build
```

### Disabling specific versions

You can disabled Node versions at the Org or Repo level by setting an environment variable for the versions you wish to disable. For example:

```shell
NODE_DISABLE_VERSIONS='18'
NODE_DISABLE_VERSIONS='18,23'
```

