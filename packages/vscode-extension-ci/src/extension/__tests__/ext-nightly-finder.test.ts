/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { jest } from '@jest/globals';

interface MockTagMeta {
  name: string;
  hash: string;
  isoDate: string;
}

const tagsState: { tags: MockTagMeta[] } = { tags: [] };

const mockGitInstance = {
  tags: jest.fn(async () => ({
    all: tagsState.tags.map((t) => t.name),
    latest: tagsState.tags[0]?.name,
  })),
  log: jest.fn(async (opts: { from: string; to: string }) => {
    const found = tagsState.tags.find((t) => t.name === opts.from);
    if (!found) {
      return { latest: undefined };
    }
    return {
      latest: { hash: found.hash, date: found.isoDate },
    };
  }),
};

jest.unstable_mockModule('simple-git', () => ({
  default: jest.fn(() => mockGitInstance),
}));

const { findNightlyCandidate } = await import('../ext-nightly-finder.js');

const originalEnv = process.env;

function setTags(tags: MockTagMeta[]): void {
  tagsState.tags = tags;
}

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.EXTENSION_ID;
  delete process.env.TAG_PREFIX;
  delete process.env.MIN_TAG_AGE_DAYS;
  setTags([]);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

afterAll(() => {
  process.env = originalEnv;
});

describe('findNightlyCandidate EXTENSION_ID handling', () => {
  it('throws when EXTENSION_ID is missing', async () => {
    delete process.env.EXTENSION_ID;
    await expect(findNightlyCandidate()).rejects.toThrow(
      /EXTENSION_ID env var is required/,
    );
  });

  it('returns a candidate using the configured EXTENSION_ID for tracking-tag exclusion', async () => {
    process.env.EXTENSION_ID = 'salesforce.salesforcedx-vscode';
    process.env.MIN_TAG_AGE_DAYS = '7';

    // Date 30 days ago — passes age filter
    const oldIso = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    setTags([
      { name: 'v66.7.0-nightly.20260101', hash: 'abc123', isoDate: oldIso },
    ]);

    const result = await findNightlyCandidate();
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('v66.7.0-nightly.20260101');
    expect(result?.commitSha).toBe('abc123');
  });

  it('skips a nightly when a tracking tag for the configured EXTENSION_ID already exists', async () => {
    process.env.EXTENSION_ID = 'salesforce.salesforcedx-vscode';
    process.env.MIN_TAG_AGE_DAYS = '7';

    const oldIso = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    setTags([
      { name: 'v66.7.0-nightly.20260101', hash: 'abc123', isoDate: oldIso },
      {
        name: 'marketplace-prerelease-salesforce.salesforcedx-vscode-v66.7.0',
        hash: 'def456',
        isoDate: oldIso,
      },
    ]);

    const result = await findNightlyCandidate();
    expect(result).toBeNull();
  });

  it('does not skip a nightly when only a different-extension tracking tag exists', async () => {
    process.env.EXTENSION_ID = 'salesforce.salesforcedx-vscode';
    process.env.MIN_TAG_AGE_DAYS = '7';

    const oldIso = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    setTags([
      { name: 'v66.7.0-nightly.20260101', hash: 'abc123', isoDate: oldIso },
      {
        name: 'marketplace-prerelease-some.other-extension-v66.7.0',
        hash: 'def456',
        isoDate: oldIso,
      },
    ]);

    const result = await findNightlyCandidate();
    expect(result?.tag).toBe('v66.7.0-nightly.20260101');
  });

  it('honors a custom TAG_PREFIX in the tracking-tag check', async () => {
    process.env.EXTENSION_ID = 'salesforce.salesforcedx-vscode';
    process.env.TAG_PREFIX = 'mp';
    process.env.MIN_TAG_AGE_DAYS = '7';

    const oldIso = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    setTags([
      { name: 'v66.7.0-nightly.20260101', hash: 'abc123', isoDate: oldIso },
      {
        name: 'mp-prerelease-salesforce.salesforcedx-vscode-v66.7.0',
        hash: 'def456',
        isoDate: oldIso,
      },
    ]);

    const result = await findNightlyCandidate();
    expect(result).toBeNull();
  });
});
