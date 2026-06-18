#!/usr/bin/env tsx
interface ReleasePlanOptions {
    branch?: string;
    buildType: string;
    isNightly: string;
    versionBump: string;
    registries: string;
    preRelease: string;
    selectedExtensions: string;
}
declare function displayReleasePlan(options: ReleasePlanOptions): void;
export { displayReleasePlan as displayExtensionReleasePlan };
//# sourceMappingURL=ext-release-plan.d.ts.map