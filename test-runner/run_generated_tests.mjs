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
 * incremental test で一度 TIMEOUT した画面を記録する。
 *
 * --through を使う incremental test の間だけ利用する。
 *
 * Cloud Build の通常実行では --through を付けないため、
 * この履歴は利用せず、全画面を必ず再テストする。
 */
const incrementalTimeoutStateFile = path.join(
  resultsRoot,
  'incremental-timeouts.json'
);

/*
 * 画面単位の Vitest プロセスタイムアウト。
 *
 * 通常の画面テストは数秒程度で完了するため、
 * 60秒を超えた場合はハング・無限待ち等と判断する。
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

const throughScreen = getArgValue('--through');

/*
 * --through が指定されている場合のみ incremental test とみなす。
 *
 * incremental:
 *   python の画面逐次生成中
 *
 * full:
 *   Cloud Build の最終全画面テスト
 */
const isIncrementalRun = Boolean(throughScreen);

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

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, 'utf8')
    );
  } catch (error) {
    console.warn(
      `WARNING: Failed to read JSON file: ${file}`
    );
    console.warn(getErrorMessage(error));
    return null;
  }
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
  /*
   * Generated application 側の設定ファイルによって
   * Vitest / TypeScript のテスト基盤が変更されないようにする。
   *
   * AI生成された設定ファイルを一旦削除し、
   * test-runner 側の制御済み設定をコピーする。
   */
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
      path.join(workspaceDir, name)
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
 * incremental TIMEOUT 履歴を読み込む。
 *
 * この関数は --through 実行時だけ使用する。
 *
 * 形式:
 *
 * {
 *   "screens": [
 *     "SCR-001_contractor_login",
 *     "SCR-003_punch_mode_select"
 *   ]
 * }
 */
function loadIncrementalTimeoutScreens() {
  if (!isIncrementalRun) {
    return new Set();
  }

  const state = readJsonIfExists(
    incrementalTimeoutStateFile
  );

  if (
    !state ||
    !Array.isArray(state.screens)
  ) {
    return new Set();
  }

  return new Set(
    state.screens.filter(
      (screenId) =>
        typeof screenId === 'string' &&
        screenId.length > 0
    )
  );
}

/*
 * incremental TIMEOUT 履歴を保存する。
 *
 * Cloud Build の full test では使用しない。
 */
function saveIncrementalTimeoutScreens(screenSet) {
  if (!isIncrementalRun) {
    return;
  }

  writeJson(
    incrementalTimeoutStateFile,
    {
      screens: [...screenSet].sort(),
    }
  );
}

/*
 * Exit code:
 *
 * 0:
 *   全画面テスト成功
 *
 * 1:
 *   AI生成実装またはテストの失敗
 *   TEST_FAILED / TEST_TIMEOUT
 *
 *   incremental 中:
 *     non-blocking として Python 側が次画面へ進む
 *
 *   Cloud Build:
 *     repair 対象として扱う
 *
 * 2:
 *   テスト基盤エラー
 *   INFRA_ERROR
 *
 *   blocking failure
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
 * incremental regression test の場合、
 * 今回生成した画面までを対象にする。
 */
if (throughScreen) {
  const throughIndex =
    screenIds.indexOf(throughScreen);

  if (throughIndex === -1) {
    console.error(
      `Unknown --through screen: ${throughScreen}`
    );

    console.error(
      `Known screens: ${screenIds.join(', ')}`
    );

    process.exit(2);
  }

  screenIds =
    screenIds.slice(
      0,
      throughIndex + 1
    );
}

// ============================================================
// Load incremental TIMEOUT history
// ============================================================

/*
 * resultsRoot はこのあと初期化するため、
 * 削除前に TIMEOUT 履歴だけメモリへ退避する。
 */
const incrementalTimeoutScreens =
  loadIncrementalTimeoutScreens();

// ============================================================
// Result directory
// ============================================================

try {
  /*
   * 前回のテスト結果は削除する。
   *
   * incremental TIMEOUT 履歴は上で既に
   * incrementalTimeoutScreens に読み込んでいる。
   */
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

  /*
   * incremental の場合のみ、
   * 削除前に読み込んだ TIMEOUT 履歴を復元する。
   *
   * full test（Cloud Build）の場合は復元しない。
   * つまり Cloud Build では TIMEOUT 履歴がクリアされる。
   */
  if (isIncrementalRun) {
    saveIncrementalTimeoutScreens(
      incrementalTimeoutScreens
    );
  }
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

if (isIncrementalRun) {
  console.log(
    'Test mode: incremental regression'
  );

  console.log(
    `Regression range: first screen through ${throughScreen}`
  );

  if (incrementalTimeoutScreens.size > 0) {
    console.log(
      'Previous incremental TIMEOUT screens:'
    );

    for (
      const screenId of
      [...incrementalTimeoutScreens].sort()
    ) {
      console.log(
        `  - ${screenId}`
      );
    }
  }
} else {
  console.log(
    'Test mode: full regression'
  );

  console.log(
    'Previous incremental TIMEOUT history will be ignored.'
  );

  console.log(
    'All screens will be executed.'
  );
}

// ============================================================
// Counters
// ============================================================

const summary = [];

let testFailed = 0;
let testTimeout = 0;
let skippedPreviousTimeout = 0;
let infrastructureFailed = 0;
let infrastructureError = false;

// ============================================================
// Screen tests
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

  /*
   * ==========================================================
   * Previous TIMEOUT skip
   * ==========================================================
   *
   * incremental test のときだけ適用する。
   *
   * 過去に TIMEOUT した画面は再実行しない。
   *
   * ただし今回の --through 対象画面そのものは
   * 必ず実行する。
   *
   * これにより、
   *
   * SCR-001 TIMEOUT
   *
   * SCR-002生成後:
   *   SCR-001 → SKIP
   *   SCR-002 → RUN
   *
   * SCR-003生成後:
   *   SCR-001 → SKIP
   *   SCR-002 → RUN
   *   SCR-003 → RUN
   *
   * となる。
   */
  const shouldSkipPreviousTimeout =
    isIncrementalRun &&
    screenId !== throughScreen &&
    incrementalTimeoutScreens.has(screenId);

  if (shouldSkipPreviousTimeout) {
    skippedPreviousTimeout += 1;

    /*
     * 現在も「未解決TIMEOUT画面」として扱うため、
     * testTimeout にも加算する。
     *
     * これにより exit code は 1 となり、
     * Python 側では従来どおり
     * TEST_TIMEOUT を含む regression failure として認識する。
     */
    testTimeout += 1;

    const message =
      'Skipped because this screen previously timed out ' +
      'during incremental regression testing. ' +
      'It will be executed again during the final full regression test.';

    const detail = {
      screen: screenId,
      status: 'TEST_TIMEOUT',
      passed: false,
      exit_code: null,
      timeout_seconds:
        SCREEN_TEST_TIMEOUT_SECONDS,
      skipped: true,
      skip_reason:
        'PREVIOUS_INCREMENTAL_TIMEOUT',
      stdout: '',
      stderr: message,
    };

    writeJson(
      path.join(
        resultsRoot,
        `${screenId}.json`
      ),
      detail
    );

    summary.push({
      screen: screenId,
      status: 'TEST_TIMEOUT',
      passed: false,
      exit_code: null,
      timeout_seconds:
        SCREEN_TEST_TIMEOUT_SECONDS,
      skipped: true,
      skip_reason:
        'PREVIOUS_INCREMENTAL_TIMEOUT',
    });

    console.log(
      `SKIP: ${screenId}`
    );

    console.log(
      'Reason: previous incremental TIMEOUT'
    );

    console.log(
      'This screen will be tested again in the final full regression test.'
    );

    continue;
  }

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
     * 各画面のテストは、
     * 現時点の統合 application 全体をコピーして実行する。
     */
    copyDir(
      applicationRoot,
      workspaceDir
    );

    /*
     * AI生成側の test/build config は使用しない。
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
        screen: screenId,
        status: 'TEST_FAILED',
        passed: false,
        exit_code: 1,
        stdout: '',
        stderr: message,
      };

      writeJson(
        path.join(
          resultsRoot,
          `${screenId}.json`
        ),
        detail
      );

      summary.push({
        screen: screenId,
        status: 'TEST_FAILED',
        passed: false,
        exit_code: 1,
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
          cwd: workspaceDir,
          encoding: 'utf8',

          /*
           * 画面単位のプロセスタイムアウト。
           */
          timeout:
            SCREEN_TEST_TIMEOUT_MS,

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

    // ========================================================
    // TIMEOUT
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

      /*
       * incremental test の場合は、
       * 次回以降の incremental regression で
       * この画面を SKIP するため履歴へ登録する。
       *
       * Cloud Build full test では登録しない。
       */
      if (isIncrementalRun) {
        incrementalTimeoutScreens.add(
          screenId
        );

        saveIncrementalTimeoutScreens(
          incrementalTimeoutScreens
        );
      }

      const detail = {
        screen: screenId,
        status: 'TEST_TIMEOUT',
        passed: false,
        exit_code: null,
        timeout_seconds:
          SCREEN_TEST_TIMEOUT_SECONDS,
        skipped: false,
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
        screen: screenId,
        status: 'TEST_TIMEOUT',
        passed: false,
        exit_code: null,
        timeout_seconds:
          SCREEN_TEST_TIMEOUT_SECONDS,
        skipped: false,
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

      if (isIncrementalRun) {
        console.error(
          'This screen was added to the incremental TIMEOUT skip list.'
        );

        console.error(
          'It will not be executed again during later incremental regression tests.'
        );

        console.error(
          'It will be executed again during the final full regression test.'
        );
      }

      continue;
    }

    // ========================================================
    // Process / infrastructure error
    // ========================================================

    if (result.error) {
      infrastructureError = true;
      infrastructureFailed += 1;

      const message =
        getErrorMessage(
          result.error
        );

      const detail = {
        screen: screenId,
        status: 'INFRA_ERROR',
        passed: false,
        exit_code: 2,
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
        screen: screenId,
        status: 'INFRA_ERROR',
        passed: false,
        exit_code: 2,
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
      typeof result.status === 'number'
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
      screen: screenId,
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
      screen: screenId,
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

    infrastructureError = true;
    infrastructureFailed += 1;

    const message =
      getErrorMessage(error);

    const detail = {
      screen: screenId,
      status: 'INFRA_ERROR',
      passed: false,
      exit_code: 2,
      stdout: '',
      stderr: message,
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
      screen: screenId,
      status: 'INFRA_ERROR',
      passed: false,
      exit_code: 2,
    });

    console.error(
      message
    );

    console.error(
      `INFRA ERROR: ${screenId}`
    );
  } finally {
    // ========================================================
    // Cleanup temporary workspace
    // ========================================================

    if (workspaceDir) {
      try {
        fs.rmSync(
          workspaceDir,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (error) {
        infrastructureError = true;
        infrastructureFailed += 1;

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
      item.status === 'PASSED'
  ).length;

const summaryFile = {
  mode:
    isIncrementalRun
      ? 'incremental'
      : 'full',

  through_screen:
    throughScreen,

  timeout_seconds:
    SCREEN_TEST_TIMEOUT_SECONDS,

  total:
    summary.length,

  passed,

  test_failed:
    testFailed,

  test_timeout:
    testTimeout,

  skipped_previous_timeout:
    skippedPreviousTimeout,

  infrastructure_failed:
    infrastructureFailed,

  success:
    testFailed === 0 &&
    testTimeout === 0 &&
    infrastructureFailed === 0,

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

  /*
   * incremental の場合、
   * 最終状態の TIMEOUT 履歴をもう一度保存しておく。
   */
  if (isIncrementalRun) {
    saveIncrementalTimeoutScreens(
      incrementalTimeoutScreens
    );
  }
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
    isIncrementalRun
      ? 'incremental'
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
  `Skipped prev timeout  : ${skippedPreviousTimeout}`
);

console.log(
  `Infrastructure failed : ${infrastructureFailed}`
);

console.log(
  `Results               : ${resultsRoot}`
);

if (
  isIncrementalRun &&
  incrementalTimeoutScreens.size > 0
) {
  console.log('');
  console.log(
    'Incremental TIMEOUT skip list:'
  );

  for (
    const screenId of
    [...incrementalTimeoutScreens].sort()
  ) {
    console.log(
      `  - ${screenId}`
    );
  }
}

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
  'All integrated application screen tests passed.'
);

process.exit(0);