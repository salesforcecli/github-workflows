interface VersionBumpOptions {
    versionBump: string;
    selectedExtensions: string;
    preRelease: string;
    isNightly: string;
    isPromotion: string;
    promotionCommitSha?: string;
}
export type { VersionBumpOptions };
declare function bumpVersions(options: VersionBumpOptions): void;
export { bumpVersions };
//# sourceMappingURL=ext-version-bumper.d.ts.map