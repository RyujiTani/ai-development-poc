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

const screenRequirementsRoot = path.join(
  repoRoot,
  'requirements',
  'ai',
  'generated',
  'screens'
);

const resultsRoot = path.join(
  repoRoot,
  'requirements',
  'ai',
  'generated',
  'test-results'
);

const SCREEN_TEST_TIMEOUT_MS = 180_000;
const SCREEN_TEST_TIMEOUT_SECONDS = SCREEN_TEST_TIMEOUT_MS / 1000;

const args = process.argv.slice(2);

function getArgValue(name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

const throughScreen = getArgValue('--through');

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

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

/*
 * Exit code:
 * 0: all screen tests passed
 * 1: generated implementation/test failure (repairable)
 * 2: test infrastructure failure
 */

if (!fs.existsSync(applicationRoot)) {
  console.error(`Application directory not found: ${applicationRoot}`);
  process.exit(2);
}

if (!fs.existsSync(screenRequirementsRoot)) {
  console.error(`Generated screen requirement directory not found: ${screenRequirementsRoot}`);
  process.exit(2);
}

let screenIds;

try {
  screenIds = fs
    .readdirSync(screenRequirementsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('SCR-') && entry.name.endsWith('.json'))
    .map((entry) => entry.name.slice(0, -'.json'.length))
    .sort();
} catch (error) {
  console.error('Failed to read generated screen requirements.');
  console.error(getErrorMessage(error));
  process.exit(2);
}

if (screenIds.length === 0) {
  console.error('No generated screen requirement JSON files found.');
  process.exit(2);
}

if (throughScreen) {
  const throughIndex = screenIds.indexOf(throughScreen);

  if (throughIndex === -1) {
    console.error(`Unknown --through screen: ${throughScreen}`);
    console.error(`Known screens: ${screenIds.join(', ')}`);
    process.exit(2);
  }

  screenIds = screenIds.slice(0, throughIndex + 1);
}

try {
  fs.rmSync(resultsRoot, { recursive: true, force: true });
  fs.mkdirSync(resultsRoot, { recursive: true });
} catch (error) {
  console.error('Failed to initialize test result directory.');
  console.error(getErrorMessage(error));
  process.exit(2);
}

console.log(`Found ${screenIds.length} screen(s) to test.`);
console.log(`Integrated application: ${applicationRoot}`);
if (throughScreen) {
  console.log(`Regression range: first screen through ${throughScreen}`);
}

const summary = [];
let testFailed = 0;
let testTimeout = 0;
let infrastructureFailed = 0;
let infrastructureError = false;

for (let index = 0; index < screenIds.length; index += 1) {
  const screenId = screenIds[index];
  let workspaceDir = null;

  console.log('');
  console.log('='.repeat(60));
  console.log(`[${index + 1}/${screenIds.length}] Testing: ${screenId}`);
  console.log('='.repeat(60));

  try {
    workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), `${screenId}-`));
    copyDir(applicationRoot, workspaceDir);

    for (const name of ['tsconfig.json', 'vitest.config.ts', 'setupTests.ts']) {
      const sourceConfig = path.join(runnerRoot, name);
      const destinationConfig = path.join(workspaceDir, name);

      if (!fs.existsSync(sourceConfig)) {
        throw new Error(`Required test-runner file not found: ${sourceConfig}`);
      }

      fs.copyFileSync(sourceConfig, destinationConfig);
    }

    const runnerNodeModules = path.join(runnerRoot, 'node_modules');
    if (!fs.existsSync(runnerNodeModules)) {
      throw new Error(`node_modules not found: ${runnerNodeModules}`);
    }

    fs.symlinkSync(runnerNodeModules, path.join(workspaceDir, 'node_modules'), 'dir');

    const screenTestDirRelative = path.posix.join('tests', screenId);
    const screenTestDir = path.join(workspaceDir, 'tests', screenId);

    if (!fs.existsSync(screenTestDir)) {
      testFailed += 1;

      const message =
        `Screen test directory not found: ${screenTestDirRelative}. ` +
        'Each screen implementation must generate at least one test under tests/<screen_id>/.';

      const detail = {
        screen: screenId,
        status: 'TEST_FAILED',
        passed: false,
        exit_code: 1,
        stdout: '',
        stderr: message,
      };

      writeJson(path.join(resultsRoot, `${screenId}.json`), detail);
      summary.push({
        screen: screenId,
        status: 'TEST_FAILED',
        passed: false,
        exit_code: 1,
      });

      console.error(message);
      console.error(`FAIL: ${screenId}`);
      continue;
    }

    const vitestBin = path.join(runnerRoot, 'node_modules', '.bin', 'vitest');
    if (!fs.existsSync(vitestBin)) {
      throw new Error(`Vitest executable not found: ${vitestBin}`);
    }

    const result = spawnSync(
      vitestBin,
      [
        'run',
        screenTestDirRelative,
        '--config',
        'vitest.config.ts',
        '--reporter=verbose',
        '--maxWorkers=1',
        '--minWorkers=1',
      ],
      {
        cwd: workspaceDir,
        encoding: 'utf8',
        timeout: SCREEN_TEST_TIMEOUT_MS,
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

    const timedOut = result.error?.code === 'ETIMEDOUT';

    if (timedOut) {
      testTimeout += 1;

      const timeoutMessage =
        `Vitest process exceeded ${SCREEN_TEST_TIMEOUT_SECONDS} seconds and was terminated.`;

      const detail = {
        screen: screenId,
        status: 'TEST_TIMEOUT',
        passed: false,
        exit_code: null,
        timeout_seconds: SCREEN_TEST_TIMEOUT_SECONDS,
        stdout: result.stdout ?? '',
        stderr: [result.stderr ?? '', timeoutMessage].filter(Boolean).join('\n'),
      };

      writeJson(path.join(resultsRoot, `${screenId}.json`), detail);
      summary.push({
        screen: screenId,
        status: 'TEST_TIMEOUT',
        passed: false,
        exit_code: null,
        timeout_seconds: SCREEN_TEST_TIMEOUT_SECONDS,
      });

      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      console.error(timeoutMessage);
      console.error(`TIMEOUT: ${screenId}`);
      continue;
    }

    if (result.error) {
      infrastructureError = true;
      infrastructureFailed += 1;
      const message = getErrorMessage(result.error);

      const detail = {
        screen: screenId,
        status: 'INFRA_ERROR',
        passed: false,
        exit_code: 2,
        stdout: result.stdout ?? '',
        stderr: message,
      };

      writeJson(path.join(resultsRoot, `${screenId}.json`), detail);
      summary.push({
        screen: screenId,
        status: 'INFRA_ERROR',
        passed: false,
        exit_code: 2,
      });

      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      console.error(message);
      console.error(`INFRA ERROR: ${screenId}`);
      continue;
    }

    const exitCode = typeof result.status === 'number' ? result.status : 1;
    const passed = exitCode === 0;

    if (!passed) testFailed += 1;

    const status = passed ? 'PASSED' : 'TEST_FAILED';
    const detail = {
      screen: screenId,
      status,
      passed,
      exit_code: exitCode,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };

    writeJson(path.join(resultsRoot, `${screenId}.json`), detail);
    summary.push({ screen: screenId, status, passed, exit_code: exitCode });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    console.log(passed ? `PASS: ${screenId}` : `FAIL: ${screenId}`);
  } catch (error) {
    infrastructureError = true;
    infrastructureFailed += 1;
    const message = getErrorMessage(error);

    const detail = {
      screen: screenId,
      status: 'INFRA_ERROR',
      passed: false,
      exit_code: 2,
      stdout: '',
      stderr: message,
    };

    try {
      writeJson(path.join(resultsRoot, `${screenId}.json`), detail);
    } catch (writeError) {
      console.error('Failed to write infrastructure error result.');
      console.error(getErrorMessage(writeError));
    }

    summary.push({
      screen: screenId,
      status: 'INFRA_ERROR',
      passed: false,
      exit_code: 2,
    });

    console.error(message);
    console.error(`INFRA ERROR: ${screenId}`);
  } finally {
    if (workspaceDir) {
      try {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      } catch (error) {
        infrastructureError = true;
        infrastructureFailed += 1;
        console.error(`Failed to remove temporary workspace: ${workspaceDir}`);
        console.error(getErrorMessage(error));
      }
    }
  }
}

const passed = summary.filter((item) => item.status === 'PASSED').length;

const summaryFile = {
  total: summary.length,
  passed,
  test_failed: testFailed,
  test_timeout: testTimeout,
  infrastructure_failed: infrastructureFailed,
  success:
    testFailed === 0 &&
    testTimeout === 0 &&
    infrastructureFailed === 0,
  test_completed: infrastructureFailed === 0,
  screens: summary,
};

try {
  writeJson(path.join(resultsRoot, 'summary.json'), summaryFile);
} catch (error) {
  console.error('Failed to write summary.json.');
  console.error(getErrorMessage(error));
  process.exit(2);
}

console.log('');
console.log('='.repeat(60));
console.log('Integrated Application Screen Test Summary');
console.log('='.repeat(60));
console.log(`Total                 : ${summary.length}`);
console.log(`Passed                : ${passed}`);
console.log(`Test failed           : ${testFailed}`);
console.log(`Test timeout          : ${testTimeout}`);
console.log(`Infrastructure failed : ${infrastructureFailed}`);
console.log(`Results               : ${resultsRoot}`);

if (infrastructureError) {
  console.error('');
  console.error('Test infrastructure error detected.');
  process.exit(2);
}

if (testFailed > 0 || testTimeout > 0) {
  console.log('');
  console.log('Test failures or timeouts detected.');
  process.exit(1);
}

console.log('');
console.log('All integrated application screen tests passed.');
process.exit(0);
