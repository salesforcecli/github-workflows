#!/usr/bin/env tsx
interface PublishMatrixEntry {
    registry: string;
    vsix_pattern: string;
    marketplace: string;
}
interface PublishMatrixOptions {
    registries: string;
    selectedExtensions: string;
}
declare function determinePublishMatrix(options: PublishMatrixOptions): PublishMatrixEntry[];
export { determinePublishMatrix };
//# sourceMappingURL=ext-publish-matrix.d.ts.map