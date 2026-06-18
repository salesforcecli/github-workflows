interface AuditLoggerOptions {
    action: string;
    actor: string;
    repository: string;
    branch: string;
    workflow: string;
    runId: string;
    details: string;
    logFile?: string;
}
declare function logAuditEvent(options: AuditLoggerOptions): void;
export { logAuditEvent };
//# sourceMappingURL=audit-logger.d.ts.map