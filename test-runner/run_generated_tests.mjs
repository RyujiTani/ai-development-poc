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

/*
 * Screen test process timeout.
 *
 * Normal Vitest screen suites complete in a few seconds.
 * A process that does not finish within 60 seconds is treated as
 * a generated implementation/test hang and reported as TEST_TIMEOUT.
 */
const SCREEN_TEST_TIMEOUT_MS = 30_000;
const SCREEN_TEST_TIMEOUT_SECONDS = SCREEN_TEST_TIMEOUT_MS / 1000;

const args = process.argv.slice(2);

function getArgValue(name) {
  const index = args.indexOf(name);

  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

const requestedScreen = getArgValue('--screen');
const isSingleScreenRun = Boolean(requestedScreen);

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
  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2) + '\n',
    'utf8'
  );
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

function removeIfExists(target) {
  try {
    fs.rmSync(
      target,
      {
        recursive: true,
        force: true,
      }
    );
  } catch (error) {
    throw new Error(
      `Failed to remove generated test infrastructure file: ${target}\n` +
      getErrorMessage(error)
    );
  }
}

function isolateRunnerInfrastructure(workspaceDir) {
  // Generated application build/test config must never control Vitest.
  // Remove known generated config variants before copying the controlled
  // test-runner configuration into the temporary workspace.
  const protectedNames = [
    'tsconfig.json',
    'jsconfig.json',

    'vitest.config.ts',
    'vitest.config.js',
    'vitest.config.mts',
    'vitest.config.mjs',

    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
    'vite.config.mjs',

    'postcss.config.js',
    'postcss.config.cjs',
    'postcss.config.mjs',
    'postcss.config.ts',

    'tailwind.config.js',
    'tailwind.config.cjs',
    'tailwind.config.mjs',
    'tailwind.config.ts',
  ];

  for (const name of protectedNames) {
    removeIfExists(
      path.join(
        workspaceDir,
        name
      )
    );
  }

  for (
    const name of [
      'tsconfig.json',
      'vitest.config.ts',
      'setupTests.ts',
    ]
  ) {
    const sourceConfig = path.join(
      runnerRoot,
      name
    );

    const destinationConfig = path.join(
      workspaceDir,
      name
    );

    if (!fs.existsSync(sourceConfig)) {
      throw new Error(
        `Required test-runner file not found: ${sourceConfig}`
      );
    }

    fs.copyFileSync(
      sourceConfig,
      destinationConfig
    );
  }
}

/*
 * Execution modes:
 *
 * node run_generated_tests.mjs --screen SCR-xxx
 *   - incremental generation
 *   - test only the screen that was just generated
 *
 * node run_generated_tests.mjs
 *   - final/full regression
 *   - test every generated screen exactly once
 *
 * Exit code:
 * 0: all executed screen tests passed
 * 1: generated implementation/test failure or timeout
 * 2: test infrastructure failure
 */

// ============================================================
// Pre-check
// ============================================================

if (!fs.existsSync(applicationRoot)) {
  console.error(
    `Application directory not found: ${applicationRoot}`
  );

  process.exit(2);
}

if (!fs.existsSync(screenRequirementsRoot)) {
  console.error(
    `Generated screen requirement directory not found: ${screenRequirementsRoot}`
  );

  process.exit(2);
}

// ============================================================
// Screen list
// ============================================================

let screenIds;

try {
  screenIds = fs
    .readdirSync(
      screenRequirementsRoot,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith('SCR-') &&
        entry.name.endsWith('.json')
    )
    .map(
      (entry) =>
        entry.name.slice(
          0,
          -'.json'.length
        )
    )
    .sort();
} catch (error) {
  console.error(
    'Failed to read generated screen requirements.'
  );

  console.error(
    getErrorMessage(error)
  );

  process.exit(2);
}

if (screenIds.length === 0) {
  console.error(
    'No generated screen requirement JSON files found.'
  );

  process.exit(2);
}

/*
 * --screen指定あり:
 *   今回生成した1画面だけテストする。
 *
 * --screen指定なし:
 *   全画面をテストする。
 *   Cloud Buildの最終回帰テストはこちら。
 */
if (requestedScreen) {
  if (
    !screenIds.includes(
      requestedScreen
    )
  ) {
    console.error(
      `Unknown --screen value: ${requestedScreen}`
    );

    console.error(
      `Known screens: ${screenIds.join(', ')}`
    );

    process.exit(2);
  }

  screenIds = [
    requestedScreen,
  ];
}

// ============================================================
// Result directory
// ============================================================

try {
  fs.rmSync(
    resultsRoot,
    {
      recursive: true,
      force: true,
    }
  );

  fs.mkdirSync(
    resultsRoot,
    {
      recursive: true,
    }
  );
} catch (error) {
  console.error(
    'Failed to initialize test result directory.'
  );

  console.error(
    getErrorMessage(error)
  );

  process.exit(2);
}

// ============================================================
// Execution information
// ============================================================

console.log(
  `Found ${screenIds.length} screen(s) to test.`
);

console.log(
  `Integrated application: ${applicationRoot}`
);

console.log(
  `Screen test timeout: ${SCREEN_TEST_TIMEOUT_SECONDS} seconds`
);

if (isSingleScreenRun) {
  console.log(
    'Test mode: current screen only'
  );

  console.log(
    `Target screen: ${requestedScreen}`
  );
} else {
  console.log(
    'Test mode: full regression'
  );

  console.log(
    'All generated screens will be executed once.'
  );
}

// ============================================================
// Counters
// ============================================================

const summary = [];

let testFailed = 0;
let testTimeout = 0;
let infrastructureFailed = 0;
let infrastructureError = false;

// ============================================================
// Screen test execution
// ============================================================

for (
  let index = 0;
  index < screenIds.length;
  index += 1
) {
  const screenId = screenIds[index];

  let workspaceDir = null;

  console.log('');
  console.log(
    '='.repeat(60)
  );

  console.log(
    `[${index + 1}/${screenIds.length}] Testing: ${screenId}`
  );

  console.log(
    '='.repeat(60)
  );

  try {
    // ========================================================
    // Temporary workspace
    // ========================================================

    workspaceDir =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          `${screenId}-`
        )
      );

    /*
     * 各画面テストは、その時点の統合Application全体を
     * コピーしたworkspace上で実行する。
     *
     * --screen時も対象テスト自体は1画面だけだが、
     * 実行対象コードは最新の統合Application。
     */
    copyDir(
      applicationRoot,
      workspaceDir
    );

    /*
     * AI生成側のbuild/test設定は使わせない。
     * test-runner側の制御済み設定へ差し替える。
     */
    isolateRunnerInfrastructure(
      workspaceDir
    );

    // ========================================================
    // node_modules
    // ========================================================

    const runnerNodeModules =
      path.join(
        runnerRoot,
        'node_modules'
      );

    if (
      !fs.existsSync(
        runnerNodeModules
      )
    ) {
      throw new Error(
        `node_modules not found: ${runnerNodeModules}`
      );
    }

    fs.symlinkSync(
      runnerNodeModules,
      path.join(
        workspaceDir,
        'node_modules'
      ),
      'dir'
    );

    // ========================================================
    // Screen test directory
    // ========================================================

    const screenTestDirRelative =
      path.posix.join(
        'tests',
        screenId
      );

    const screenTestDir =
      path.join(
        workspaceDir,
        'tests',
        screenId
      );

    if (
      !fs.existsSync(
        screenTestDir
      )
    ) {
      testFailed += 1;

      const message =
        `Screen test directory not found: ${screenTestDirRelative}. ` +
        'Each screen implementation must generate at least one test ' +
        'under tests/<screen_id>/.';

      const detail = {
        screen:
          screenId,

        status:
          'TEST_FAILED',

        passed:
          false,

        exit_code:
          1,

        stdout:
          '',

        stderr:
          message,
      };

      writeJson(
        path.join(
          resultsRoot,
          `${screenId}.json`
        ),
        detail
      );

      summary.push({
        screen:
          screenId,

        status:
          'TEST_FAILED',

        passed:
          false,

        exit_code:
          1,
      });

      console.error(
        message
      );

      console.error(
        `FAIL: ${screenId}`
      );

      continue;
    }

    // ========================================================
    // Vitest executable
    // ========================================================

    const vitestBin =
      path.join(
        runnerRoot,
        'node_modules',
        '.bin',
        'vitest'
      );

    if (
      !fs.existsSync(
        vitestBin
      )
    ) {
      throw new Error(
        `Vitest executable not found: ${vitestBin}`
      );
    }

    // ========================================================
    // Vitest execution
    // ========================================================

    const result =
      spawnSync(
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
          cwd:
            workspaceDir,

          encoding:
            'utf8',

          /*
           * Vitestプロセスそのものの上限。
           *
           * テストケース単位のVitest timeoutとは別。
           * worker / Promise / timer / React effectなどで
           * プロセス自体が終了しない場合も60秒で止める。
           */
          timeout:
            SCREEN_TEST_TIMEOUT_MS,

          env: {
            ...process.env,

            CI:
              'true',

            NODE_OPTIONS: [
              process.env.NODE_OPTIONS,
              '--max-old-space-size=1024',
            ]
              .filter(Boolean)
              .join(' '),
          },
        }
      );

    // ========================================================
    // Process timeout
    // ========================================================

    const timedOut =
      result.error?.code ===
      'ETIMEDOUT';

    if (timedOut) {
      testTimeout += 1;

      const timeoutMessage =
        `Vitest process exceeded ` +
        `${SCREEN_TEST_TIMEOUT_SECONDS} seconds ` +
        'and was terminated.';

      const detail = {
        screen:
          screenId,

        status:
          'TEST_TIMEOUT',

        passed:
          false,

        exit_code:
          null,

        timeout_seconds:
          SCREEN_TEST_TIMEOUT_SECONDS,

        stdout:
          result.stdout ?? '',

        stderr:
          [
            result.stderr ?? '',
            timeoutMessage,
          ]
            .filter(Boolean)
            .join('\n'),
      };

      writeJson(
        path.join(
          resultsRoot,
          `${screenId}.json`
        ),
        detail
      );

      summary.push({
        screen:
          screenId,

        status:
          'TEST_TIMEOUT',

        passed:
          false,

        exit_code:
          null,

        timeout_seconds:
          SCREEN_TEST_TIMEOUT_SECONDS,
      });

      if (result.stdout) {
        process.stdout.write(
          result.stdout
        );
      }

      if (result.stderr) {
        process.stderr.write(
          result.stderr
        );
      }

      console.error(
        timeoutMessage
      );

      console.error(
        `TIMEOUT: ${screenId}`
      );

      continue;
    }

    // ========================================================
    // Infrastructure error
    // ========================================================

    if (result.error) {
      infrastructureError =
        true;

      infrastructureFailed +=
        1;

      const message =
        getErrorMessage(
          result.error
        );

      const detail = {
        screen:
          screenId,

        status:
          'INFRA_ERROR',

        passed:
          false,

        exit_code:
          2,

        stdout:
          result.stdout ?? '',

        stderr:
          message,
      };

      writeJson(
        path.join(
          resultsRoot,
          `${screenId}.json`
        ),
        detail
      );

      summary.push({
        screen:
          screenId,

        status:
          'INFRA_ERROR',

        passed:
          false,

        exit_code:
          2,
      });

      if (result.stdout) {
        process.stdout.write(
          result.stdout
        );
      }

      if (result.stderr) {
        process.stderr.write(
          result.stderr
        );
      }

      console.error(
        message
      );

      console.error(
        `INFRA ERROR: ${screenId}`
      );

      continue;
    }

    // ========================================================
    // Normal Vitest completion
    // ========================================================

    const exitCode =
      typeof result.status ===
      'number'
        ? result.status
        : 1;

    const passed =
      exitCode === 0;

    if (!passed) {
      testFailed += 1;
    }

    const status =
      passed
        ? 'PASSED'
        : 'TEST_FAILED';

    const detail = {
      screen:
        screenId,

      status,

      passed,

      exit_code:
        exitCode,

      stdout:
        result.stdout ?? '',

      stderr:
        result.stderr ?? '',
    };

    writeJson(
      path.join(
        resultsRoot,
        `${screenId}.json`
      ),
      detail
    );

    summary.push({
      screen:
        screenId,

      status,

      passed,

      exit_code:
        exitCode,
    });

    if (result.stdout) {
      process.stdout.write(
        result.stdout
      );
    }

    if (result.stderr) {
      process.stderr.write(
        result.stderr
      );
    }

    console.log(
      passed
        ? `PASS: ${screenId}`
        : `FAIL: ${screenId}`
    );
  } catch (error) {
    // ========================================================
    // Unexpected infrastructure error
    // ========================================================

    infrastructureError =
      true;

    infrastructureFailed +=
      1;

    const message =
      getErrorMessage(error);

    const detail = {
      screen:
        screenId,

      status:
        'INFRA_ERROR',

      passed:
        false,

      exit_code:
        2,

      stdout:
        '',

      stderr:
        message,
    };

    try {
      writeJson(
        path.join(
          resultsRoot,
          `${screenId}.json`
        ),
        detail
      );
    } catch (writeError) {
      console.error(
        'Failed to write infrastructure error result.'
      );

      console.error(
        getErrorMessage(
          writeError
        )
      );
    }

    summary.push({
      screen:
        screenId,

      status:
        'INFRA_ERROR',

      passed:
        false,

      exit_code:
        2,
    });

    console.error(
      message
    );

    console.error(
      `INFRA ERROR: ${screenId}`
    );
  } finally {
    // ========================================================
    // Cleanup
    // ========================================================

    if (workspaceDir) {
      try {
        fs.rmSync(
          workspaceDir,
          {
            recursive:
              true,

            force:
              true,
          }
        );
      } catch (error) {
        infrastructureError =
          true;

        infrastructureFailed +=
          1;

        console.error(
          `Failed to remove temporary workspace: ${workspaceDir}`
        );

        console.error(
          getErrorMessage(error)
        );
      }
    }
  }
}

// ============================================================
// Summary
// ============================================================

const passed =
  summary.filter(
    (item) =>
      item.status ===
      'PASSED'
  ).length;

const summaryFile = {
  mode:
    isSingleScreenRun
      ? 'single_screen'
      : 'full',

  requested_screen:
    requestedScreen,

  timeout_seconds:
    SCREEN_TEST_TIMEOUT_SECONDS,

  total:
    summary.length,

  passed,

  test_failed:
    testFailed,

  test_timeout:
    testTimeout,

  infrastructure_failed:
    infrastructureFailed,

  success:
    testFailed === 0 &&
    testTimeout === 0 &&
    infrastructureFailed === 0,

  /*
   * TEST_FAILED / TEST_TIMEOUTでも
   * runner自体は正常にテストを実行できている。
   *
   * INFRA_ERRORだけ
   * test_completed=false相当。
   */
  test_completed:
    infrastructureFailed === 0,

  screens:
    summary,
};

try {
  writeJson(
    path.join(
      resultsRoot,
      'summary.json'
    ),
    summaryFile
  );
} catch (error) {
  console.error(
    'Failed to write summary.json.'
  );

  console.error(
    getErrorMessage(error)
  );

  process.exit(2);
}

// ============================================================
// Console summary
// ============================================================

console.log('');
console.log(
  '='.repeat(60)
);

console.log(
  'Integrated Application Screen Test Summary'
);

console.log(
  '='.repeat(60)
);

console.log(
  `Mode                  : ${
    isSingleScreenRun
      ? 'single screen'
      : 'full'
  }`
);

console.log(
  `Total                 : ${summary.length}`
);

console.log(
  `Passed                : ${passed}`
);

console.log(
  `Test failed           : ${testFailed}`
);

console.log(
  `Test timeout          : ${testTimeout}`
);

console.log(
  `Infrastructure failed : ${infrastructureFailed}`
);

console.log(
  `Results               : ${resultsRoot}`
);

// ============================================================
// Exit
// ============================================================

if (infrastructureError) {
  console.error('');

  console.error(
    'Test infrastructure error detected.'
  );

  process.exit(2);
}

if (
  testFailed > 0 ||
  testTimeout > 0
) {
  console.log('');

  console.log(
    'Test failures or timeouts detected.'
  );

  process.exit(1);
}

console.log('');

console.log(
  isSingleScreenRun
    ? `Current screen test passed: ${requestedScreen}`
    : 'All integrated application screen tests passed.'
);

process.exit(0);