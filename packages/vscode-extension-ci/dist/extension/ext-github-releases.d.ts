interface GitHubReleaseOptions {
    dryRun: boolean;
    preRelease: string;
    versionBump: string;
    selectedExtensions: string;
    isNightly: string;
    vsixArtifactsPath: string;
}
declare function createGitHubReleases(options: GitHubReleaseOptions): void;
export { createGitHubReleases };
//# sourceMappingURL=ext-github-releases.d.ts.map