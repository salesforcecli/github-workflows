import { type ValidationError, validateAction, validateWorkflow } from '@action-validator/core';
import { globSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';

type Workflow = {
  on: string | string[] | { workflow_call?: { inputs?: Record<string, unknown> } | null };
  jobs: Record<string, { uses?: string; with?: Record<string, unknown> }>;
};

// The bundled schema requires secrets.<id>.required; current SchemaStore does not.
// Remove this exception when @action-validator/core updates its bundled schema.
// https://json.schemastore.org/github-workflow.json
const schemaExceptions = [
  { code: 'required', path: /^\/on\/workflow_call\/secrets\/[^/]+\/required$/ },
];

const filterSchemaErrors = (errors: ValidationError[]): ValidationError[] =>
  errors.flatMap((error) => {
    if ('states' in error && error.states?.length) {
      const states = error.states.map((state) => ({ ...state, errors: filterSchemaErrors(state.errors) }));
      // A one_of is satisfied when a branch has no remaining errors.
      return states.some((state) => state.errors.length === 0) ? [] : [{ ...error, states }];
    }
    return schemaExceptions.some(({ code, path }) => error.code === code && 'path' in error && path.test(error.path))
      ? []
      : [error];
  });

const formatSchemaErrors = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) =>
    'states' in error && error.states?.length
      ? error.states.flatMap((state) => formatSchemaErrors(state.errors))
      : [`${'path' in error ? error.path : ''}: ${error.detail ?? error.title}`],
  );

const errors: string[] = [];
const workflows = new Map<string, Workflow>();
const workflowFiles = globSync('.github/workflows/*.{yml,yaml}').sort();
const actionFiles = globSync('.github/actions/**/action.{yml,yaml}').sort();

for (const [files, validate] of [[workflowFiles, validateWorkflow], [actionFiles, validateAction]] as const) {
  for (const file of files) {
    try {
      const source = readFileSync(file, 'utf8');
      const schemaErrors = filterSchemaErrors(validate(source).errors);
      errors.push(...formatSchemaErrors(schemaErrors).map((message) => `${file}${message}`));
      if (validate === validateWorkflow && schemaErrors.length === 0) {
        workflows.set(file, parse(source) as Workflow);
      }
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

for (const [file, workflow] of workflows) {
  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    if (!job.uses) continue;
    // Check self-references against this checkout, not the published ref, so PRs
    // validate changes to callers and callees together without network requests.
    const calledFile = job.uses.startsWith('./.github/workflows/')
      ? job.uses.slice(2)
      : /^salesforcecli\/github-workflows\/(\.github\/workflows\/[^@]+)@.+$/.exec(job.uses)?.[1];
    if (!calledFile) continue;

    const calledWorkflow = workflows.get(calledFile);
    const jobPath = `${file}/jobs/${jobId}`;
    if (!calledWorkflow) {
      errors.push(`${jobPath}: called workflow ${calledFile} is missing or invalid`);
      continue;
    }

    const on = calledWorkflow.on;
    const callable = typeof on === 'string'
      ? on === 'workflow_call'
      : Array.isArray(on)
        ? on.includes('workflow_call')
        : Object.hasOwn(on, 'workflow_call');
    if (!callable) {
      errors.push(`${jobPath}: ${calledFile} does not declare on.workflow_call`);
      continue;
    }

    const inputs = typeof on === 'object' && !Array.isArray(on) ? on.workflow_call?.inputs ?? {} : {};
    // GitHub validates inputs even when the calling job's if condition is false.
    for (const input of Object.keys(job.with ?? {})) {
      if (!Object.hasOwn(inputs, input)) {
        errors.push(`${jobPath}/with/${input}: input is not defined by ${calledFile}`);
      }
    }
  }
}

for (const error of errors) console.error(error);
console.log(`Validated ${workflowFiles.length} workflows and ${actionFiles.length} actions; ${errors.length} errors.`);
process.exitCode = errors.length > 0 ? 1 : 0;
