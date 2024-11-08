/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { setFailed, setOutput, notice } from '@actions/core';

type VersionData = {
    start: string;
    end: string;
    lts?: string;
    maintenance?: string;
    codename?: string;
};

type VersionsJson = {
    [key: string]: VersionData;
};

export const getVersions = async () => {
    // Get the node release schedule json
    const response = await fetch("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json");
    const json = await response.json() as VersionsJson;

    // This version of node was installed in the composite action before this script runs
    // This defaults to 'lts/*' but allows for the user to override it with an env var
    // Below we will replace the matching major version with this more specific version
    // This will ensure that the unit tests run on the same version that will be shipped
    const installedNode = process.versions.node;

    // Comma separated list of major versions to disable
    // For example: Set `NODE_DISABLE_VERSIONS` to `18,23`
    const disableVersions = process.env.NODE_DISABLE_VERSIONS?.split(',') || [];


    const today = new Date();

    // Build an array of versions that the current date is between the start and end dates
    const versions = Object.keys(json)
        .filter((version) => {
            const startDate = new Date(json[version].start);
            const endDate = new Date(json[version].end);
            return today >= startDate && today <= endDate;
        })
        .map((version) => version.replace('v', ''))
        // Remove versions that are disabled via env var
        .filter((version) => {
            if (disableVersions.includes(version)) {
                notice(`Node version ${version} is disabled via env var`);
                return false;
            }
            return true;
        })
        // Override the matching major version with the installed version
        // for example if the installed version is 18.15.1, replace 18 with 18.15.1
        .map((version) => {
            if (version === installedNode.split('.')[0]) {
                console.log(`Node version ${version} is overridden to ${installedNode}`);
                return installedNode;
            }
            return version;
        })

    if (versions.length === 0) {
        throw new Error('No versions found');
    }

    console.log('Found versions: ', versions);
    return versions;
};

export const run = async () => {
    try {
        const versions = await getVersions();

        setOutput('nodeVersions', versions)
    } catch (error: any) {
        setFailed(error.message);
    }
};
