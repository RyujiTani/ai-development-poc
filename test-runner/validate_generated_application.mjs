import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const runnerRoot = path.dirname(scriptFile);
const repoRoot = path.resolve(runnerRoot, '..');

const applicationRoot = path.join(
  repoRoot,
  'requirements',
  'ai',
  'generated',
  'application'
);

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

if (!fs.existsSync(applicationRoot)) {
  console.error(`Application directory not found: ${applicationRoot}`);
  process.exit(2);
}

const runnerNodeModules = path.join(runnerRoot, 'node_modules');

if (!fs.existsSync(runnerNodeModules)) {
  console.error(`node_modules not found: ${runnerNodeModules}`);
  console.error('Run npm install in test-runner before static validation.');
  process.exit(2);
}

const tscBin = path.join(runnerNodeModules, '.bin', 'tsc');

if (!fs.existsSync(tscBin)) {
  console.error(`TypeScript executable not found: ${tscBin}`);
  process.exit(2);
}

let workspaceDir = null;

try {
  workspaceDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'generated-application-static-')
  );

  copyDir(applicationRoot, workspaceDir);

  const tsconfigSource = path.join(runnerRoot, 'tsconfig.json');
  const tsconfigDestination = path.join(workspaceDir, 'tsconfig.json');

  if (!fs.existsSync(tsconfigSource)) {
    throw new Error(`Required test-runner file not found: ${tsconfigSource}`);
  }

  fs.copyFileSync(tsconfigSource, tsconfigDestination);
  fs.symlinkSync(runnerNodeModules, path.join(workspaceDir, 'node_modules'), 'dir');

  console.log('='.repeat(60));
  console.log('Generated Application Static Validation');
  console.log('='.repeat(60));
  console.log(`Application: ${applicationRoot}`);
  console.log(`Workspace  : ${workspaceDir}`);
  console.log('');
  console.log('Running: tsc --noEmit --project tsconfig.json');
  console.log('');

  const result = spawnSync(
    tscBin,
    [
      '--noEmit',
      '--project',
      'tsconfig.json',
      '--pretty',
      'false',
    ],
    {
      cwd: workspaceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: 'true',
        NODE_OPTIONS: [
          process.env.NODE_OPTIONS,
          '--max-old-space-size=1024',
        ]
          .filter(Boolean)
          .join(' '),
      },
    }
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(getErrorMessage(result.error));
    process.exit(2);
  }

  const exitCode = typeof result.status === 'number' ? result.status : 1;

  if (exitCode !== 0) {
    console.error('');
    console.error('STATIC CHECK FAILED');
    console.error(
      'The integrated application contains a TypeScript, import, or module-resolution error.'
    );
    process.exit(1);
  }

  console.log('');
  console.log('STATIC CHECK PASSED');
  process.exit(0);
} catch (error) {
  console.error('Static validation infrastructure error.');
  console.error(getErrorMessage(error));
  process.exit(2);
} finally {
  if (workspaceDir) {
    try {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to remove temporary workspace: ${workspaceDir}`);
      console.error(getErrorMessage(error));
    }
  }
}
