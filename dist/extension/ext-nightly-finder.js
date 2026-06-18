/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import simpleGit from 'simple-git';
import semver from 'semver';
import { log, setOutput, extractVersionFromTag } from '../core/utils.js';
/**
 * Nightly tag format: <pkg>-v<version>-nightly.<YYYYMMDD>
 * or the legacy format: v<version>-nightly.<YYYYMMDD>
 * We match both by looking for "-nightly." in the tag name.
 */
function parseNightlyTag(tagName) {
    if (!tagName.includes('-nightly.')) {
        return null;
    }
    const version = extractVersionFromTag(tagName);
    if (!version) {
        return null;
    }
    return { version };
}
/**
 * Check whether a tracking tag matching the given prefix exists in the tag list.
 */
function hasTrackingTag(allTagNames, prefix) {
    for (const tag of allTagNames) {
        if (tag.startsWith(prefix)) {
            return true;
        }
    }
    return false;
}
/**
 * Get all git tags with commit metadata.
 */
async function getAllTagsWithMeta(git) {
    const tags = await git.tags();
    const result = [];
    for (const tagName of tags.all) {
        try {
            const logResult = await git.log({
                from: tagName,
                to: tagName,
                maxCount: 1,
            });
            if (logResult.latest) {
                const commitDate = new Date(logResult.latest.date).getTime() / 1000;
                result.push({
                    name: tagName,
                    commitSha: logResult.latest.hash,
                    commitDate,
                });
            }
        }
        catch {
            log.warning(`Failed to get metadata for tag ${tagName} — skipping`);
        }
    }
    // Newest first
    return result.sort((a, b) => b.commitDate - a.commitDate);
}
/**
 * Find the best nightly build eligible for promotion to pre-release.
 *
 * Filters applied (all must pass):
 *   1. Tag format must match nightly pattern (contains "-nightly.")
 *   2. Tag must be at least MIN_TAG_AGE_DAYS days old (default 7)
 *   3. No existing marketplace-prerelease-* tracking tag for this version
 *      (nightly was already promoted to pre-release)
 *   4. Floor check: no marketplace-stable-* tag for the derived stable version
 *      semver.inc(nightlyVersion, 'minor') — prevents re-promoting a version
 *      track that was already published as stable
 *
 * Returns the newest passing candidate.
 */
export async function findNightlyCandidate() {
    const minAgeDays = parseInt(process.env.MIN_TAG_AGE_DAYS ?? '7', 10);
    const minAgeSeconds = minAgeDays * 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    log.info(`Finding nightly candidate (min age: ${minAgeDays} days)...`);
    const git = simpleGit();
    const allTagsWithMeta = await getAllTagsWithMeta(git);
    const allTagNames = new Set(allTagsWithMeta.map((t) => t.name));
    const candidates = [];
    for (const { name, commitSha, commitDate } of allTagsWithMeta) {
        const parsed = parseNightlyTag(name);
        if (!parsed) {
            continue;
        }
        const { version } = parsed;
        // Filter 1: minimum age
        const ageSeconds = now - commitDate;
        if (ageSeconds < minAgeSeconds) {
            log.debug(`Skipping ${name}: too recent (${Math.floor(ageSeconds / 86400)} days old, need ${minAgeDays})`);
            continue;
        }
        // Filter 2: not already promoted to pre-release
        const tagPrefix = process.env.TAG_PREFIX || 'marketplace';
        const preReleaseTrackingPrefix = `${tagPrefix}-prerelease-`;
        if (hasTrackingTag(allTagNames, `${preReleaseTrackingPrefix}`)) {
            // Check specifically for this version
            const versionSpecificPrefix = `${tagPrefix}-prerelease-apex-lsp-vscode-extension-v${version}`;
            if (hasTrackingTag(allTagNames, versionSpecificPrefix)) {
                log.debug(`Skipping ${name}: already has ${tagPrefix}-prerelease tracking tag for v${version}`);
                continue;
            }
        }
        // Filter 3: floor check — derived stable version not already published
        const derivedStable = semver.inc(version, 'minor');
        if (derivedStable) {
            const stableTrackingPrefix = `${tagPrefix}-stable-apex-lsp-vscode-extension-v${derivedStable}`;
            if (hasTrackingTag(allTagNames, stableTrackingPrefix)) {
                log.debug(`Skipping ${name}: derived stable v${derivedStable} already published`);
                continue;
            }
        }
        candidates.push({ tag: name, commitSha, commitDate, version });
    }
    if (candidates.length === 0) {
        log.warning('No eligible nightly candidates found');
        return null;
    }
    // Already sorted newest-first; pick first
    const best = candidates[0];
    log.success(`Selected nightly candidate: ${best.tag}`);
    log.info(`  Commit SHA: ${best.commitSha}`);
    log.info(`  Version: ${best.version}`);
    log.info(`  Age: ${Math.floor((now - best.commitDate) / 86400)} days`);
    return best;
}
/**
 * Set GitHub Actions outputs for the nightly candidate.
 * Outputs commit-sha and nightly-tag (empty strings if no candidate).
 */
export function setNightlyFinderOutputs(candidate) {
    setOutput('commit-sha', candidate?.commitSha ?? '');
    setOutput('nightly-tag', candidate?.tag ?? '');
    log.success('Nightly finder outputs set');
}
/**
 * Main function for CLI usage via index.ts.
 */
export async function main() {
    try {
        const candidate = await findNightlyCandidate();
        setNightlyFinderOutputs(candidate);
    }
    catch (error) {
        log.error(`Failed to find nightly candidate: ${error}`);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=ext-nightly-finder.js.map