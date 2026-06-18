export interface NpmPackageInfo {
    name: string;
    path: string;
    currentVersion: string;
    description?: string;
    isExtension: boolean;
}
export interface NpmChangeDetectionResult {
    changedPackages: string[];
    selectedPackages: string[];
    versionBump: VersionBumpType;
}
export type VersionBumpType = 'patch' | 'minor' | 'major';
export interface NpmPackageDetails {
    packageNames: string[];
    packageVersions: string[];
    packageDescriptions: string[];
    versionBump: VersionBumpType;
}
export interface NpmReleasePlan {
    package: string;
    currentVersion: string;
    newVersion: string;
    versionBump: VersionBumpType;
    dryRun: boolean;
}
export interface NpmEnvironment {
    githubEventName: string;
    githubRef: string;
    githubRefName: string;
    githubActor: string;
    githubRepository: string;
    githubRunId: string;
    githubWorkflow: string;
    inputs: {
        branch?: string;
        packages?: string;
        availablePackages?: string;
        baseBranch?: string;
        dryRun?: string;
    };
}
//# sourceMappingURL=npm-types.d.ts.map