/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export interface BuildContext {
  isNightly: boolean;
  versionBump: VersionBumpType;
  preRelease: boolean;
  isPromotion: boolean;
  promotionCommitSha?: string;
}

export type VersionBumpType = 'patch' | 'minor' | 'major' | 'auto';

export interface ExtensionInfo {
  name: string;
  path: string;
  currentVersion: string;
  publisher?: string;
  displayName?: string;
}

export interface ChangeDetectionResult {
  selectedExtensions: string[];
  versionBumps: VersionBumpType;
  promotionCommitSha?: string;
}

export type SemanticVersion = `${number}.${number}.${number}`;

export type TagWithVersion = { tag: string; version: SemanticVersion | null };
