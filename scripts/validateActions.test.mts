import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./validateActions.mts', import.meta.url));
const callee = `on:
  workflow_call:
    inputs:
      githubTag:
        type: string
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - run: echo publish
`;
const caller = (uses: string, inputs = 'githubTag: latest') => `on: workflow_dispatch
jobs:
  call:
    if: \${{ false }}
    uses: ${uses}
    with:
      ${inputs}
`;
const action = `name: Test action
description: Test action validation
runs:
  using: composite
  steps:
    - shell: bash
      run: echo test
`;

const validate = (files: Record<string, string>) => {
  const cwd = mkdtempSync(join(tmpdir(), 'validate-actions-'));
  try {
    for (const [file, source] of Object.entries(files)) {
      const path = join(cwd, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, source);
    }
    const result = spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.signal, null, result.stderr);
    return result;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
};

test('validates .yml/.yaml workflows and nested actions', () => {
  const result = validate({
    '.github/workflows/caller.yml': caller('./.github/workflows/callee.yaml'),
    '.github/workflows/callee.yaml': callee,
    '.github/actions/example/action.yml': action,
    '.github/actions/nested/example/action.yaml': action,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated 2 workflows and 2 actions; 0 errors/);
});

for (const uses of [
  './.github/workflows/ctcOpen.yml',
  'salesforcecli/github-workflows/.github/workflows/ctcOpen.yml@main',
]) {
  test(`rejects the #205 inputs even with if: false (${uses})`, () => {
    const result = validate({
      '.github/workflows/npmPublish.yml': caller(uses, [
        'githubTag: latest',
        'package-manager: npm',
        'package-manager-version: "10"',
        'cache-dependency-path: package-lock.json',
      ].join('\n      ')),
      '.github/workflows/ctcOpen.yml': callee,
    });
    assert.equal(result.status, 1);
    for (const input of ['package-manager', 'package-manager-version', 'cache-dependency-path']) {
      assert.ok(result.stderr.includes(`npmPublish.yml/jobs/call/with/${input}: input is not defined by .github/workflows/ctcOpen.yml`));
    }
  });
}

test('removing a callee input fails unchanged repo-qualified callers', () => {
  const files = {
    '.github/workflows/caller.yml': caller('salesforcecli/github-workflows/.github/workflows/ctcClose.yml@main'),
    '.github/workflows/ctcClose.yml': callee,
  };
  assert.equal(validate(files).status, 0);
  const result = validate({
    ...files,
    '.github/workflows/ctcClose.yml': callee.replace('    inputs:\n      githubTag:\n        type: string\n', ''),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /with\/githubTag: input is not defined/);
});

for (const on of ['workflow_call', '[workflow_call]', '\n  workflow_call:']) {
  test(`rejects inputs for inputless workflow_call (${on.trim()})`, () => {
    const result = validate({
      '.github/workflows/caller.yml': caller('./.github/workflows/callee.yml'),
      '.github/workflows/callee.yml': callee.replace(/on:[\s\S]*?jobs:/, `on: ${on}\njobs:`),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /with\/githubTag: input is not defined/);
  });
}

test('rejects missing and non-reusable called workflows', () => {
  const files = { '.github/workflows/caller.yml': caller('./.github/workflows/callee.yml') };
  const missing = validate(files);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /callee.yml is missing or invalid/);
  const nonReusable = validate({
    ...files,
    '.github/workflows/callee.yml': callee.replace(/on:[\s\S]*?jobs:/, 'on: push\njobs:'),
  });
  assert.equal(nonReusable.status, 1);
  assert.match(nonReusable.stderr, /does not declare on.workflow_call/);
});

test('allows only the known optional-secret schema gap', () => {
  const withSecret = callee.replace('    inputs:', '    secrets:\n      TOKEN:\n        description: Optional token\n    inputs:');
  const valid = validate({ '.github/workflows/callee.yml': withSecret });
  assert.equal(valid.status, 0, valid.stderr);
  for (const invalid of [
    withSecret.replace('type: string', 'type: invalid'),
    withSecret.replace('description: Optional token', 'description: Optional token\n        unexpected: true'),
    withSecret.replace('description: Optional token', 'description: Optional token\n        required: invalid'),
  ]) {
    const result = validate({ '.github/workflows/callee.yml': invalid });
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, /callee.yml/);
  }
});

for (const [file, source] of Object.entries({
  '.github/workflows/invalid.yml': callee.replace('runs-on: ubuntu-latest', 'runs-on: 42'),
  '.github/workflows/invalid.yaml': 'on: [',
  '.github/actions/example/action.yml': action.replace('using: composite', 'using: invalid'),
  '.github/actions/nested/example/action.yaml': action.replace('      run: echo test\n', ''),
})) {
  test(`rejects invalid YAML/schema: ${file}`, () => {
    const result = validate({ [file]: source });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(file), result.stderr);
  });
}

test('does not resolve reusable workflows in other repositories', () => {
  const result = validate({
    '.github/workflows/caller.yml': caller('another/repository/.github/workflows/publish.yml@main'),
  });
  assert.equal(result.status, 0, result.stderr);
});
