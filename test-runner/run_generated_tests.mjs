import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(process.cwd(), '..');

const implementationRoot = path.join(
  repoRoot,
  'requirements',
  'ai',
  'generated',
  'implementation'
);

const resultsRoot = path.join(
  repoRoot,
  'requirements',
  'ai',
  'generated',
  'test-results'
);

const runnerRoot = process.cwd();

const SCREEN_TEST_TIMEOUT_MS = 180_000;
const SCREEN_TEST_TIMEOUT_SECONDS = SCREEN_TEST_TIMEOUT_MS / 1000;


function copyDir(source, destination) {
  fs.mkdirSync(
    destination,
    { recursive: true }
  );

  for (
    const entry of fs.readdirSync(
      source,
      { withFileTypes: true }
    )
  ) {
    const src = path.join(
      source,
      entry.name
    );

    const dst = path.join(
      destination,
      entry.name
    );

    if (entry.isDirectory()) {
      copyDir(
        src,
        dst
      );
    } else {
      fs.copyFileSync(
        src,
        dst
      );
    }
  }
}


function writeJson(file, value) {
  fs.mkdirSync(
    path.dirname(file),
    { recursive: true }
  );

  fs.writeFileSync(
    file,
    JSON.stringify(
      value,
      null,
      2
    ) + '\n',
    'utf8'
  );
}


function getErrorMessage(error) {
  if (error instanceof Error) {
    return (
      error.stack ??
      error.message
    );
  }

  return String(error);
}


/*
 * Exit code:
 *
 * 0:
 *   全テスト成功
 *
 * 1:
 *   AI生成コードまたはテストに失敗あり
 *   → TEST_FAILED / TEST_TIMEOUT
 *   → 想定内
 *   → repair / PR作成へ進める
 *
 * 2:
 *   テスト基盤・runner自体のエラー
 *   → 想定外
 *   → Cloud Build / Actionsを失敗させる
 */


// ============================================================
// Pre-check
// ============================================================

if (
  !fs.existsSync(
    implementationRoot
  )
) {
  console.error(
    `Implementation directory not found: ${implementationRoot}`
  );

  process.exit(2);
}


let screenDirs;

try {
  screenDirs = fs
    .readdirSync(
      implementationRoot,
      { withFileTypes: true }
    )
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith('SCR-')
    )
    .map(
      (entry) => entry.name
    )
    .sort();

} catch (error) {
  console.error(
    'Failed to read implementation directory.'
  );

  console.error(
    getErrorMessage(error)
  );

  process.exit(2);
}


if (
  screenDirs.length === 0
) {
  console.error(
    'No generated screen implementation directories found.'
  );

  process.exit(2);
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
    { recursive: true }
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


console.log(
  `Found ${screenDirs.length} generated screen implementation(s).`
);


// ============================================================
// Counters
// ============================================================

const summary = [];

let testFailed = 0;
let testTimeout = 0;
let infrastructureFailed = 0;
let infrastructureError = false;


// ============================================================
// Execute screen tests
// ============================================================

for (
  let index = 0;
  index < screenDirs.length;
  index += 1
) {
  const screenId =
    screenDirs[index];

  const sourceDir =
    path.join(
      implementationRoot,
      screenId
    );

  let workspaceDir = null;

  console.log('');
  console.log(
    '='.repeat(60)
  );

  console.log(
    `[${index + 1}/${screenDirs.length}] Testing: ${screenId}`
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


    copyDir(
      sourceDir,
      workspaceDir
    );


    // ========================================================
    // Copy shared test-runner configuration
    // ========================================================

    for (
      const name of [
        'tsconfig.json',
        'vitest.config.ts',
        'setupTests.ts',
      ]
    ) {
      const sourceConfig =
        path.join(
          runnerRoot,
          name
        );

      const destinationConfig =
        path.join(
          workspaceDir,
          name
        );


      if (
        !fs.existsSync(
          sourceConfig
        )
      ) {
        throw new Error(
          `Required test-runner file not found: ${sourceConfig}`
        );
      }


      fs.copyFileSync(
        sourceConfig,
        destinationConfig
      );
    }


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


    const nodeModulesLink =
      path.join(
        workspaceDir,
        'node_modules'
      );


    fs.symlinkSync(
      runnerNodeModules,
      nodeModulesLink,
      'dir'
    );


    // ========================================================
    // Vitest
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


    const result =
      spawnSync(
        vitestBin,
        [
          'run',
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


    // ========================================================
    // Screen test timeout
    // ========================================================

    const timedOut =
      result.error?.code === 'ETIMEDOUT';


    if (
      timedOut
    ) {
      testTimeout += 1;


      const timeoutMessage =
        `Vitest process exceeded ${SCREEN_TEST_TIMEOUT_SECONDS} seconds and was terminated.`;


      const detail = {
        screen: screenId,
        status: 'TEST_TIMEOUT',
        passed: false,
        exit_code: null,
        timeout_seconds:
          SCREEN_TEST_TIMEOUT_SECONDS,
        stdout:
          result.stdout ?? '',
        stderr: [
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
      });


      if (
        result.stdout
      ) {
        process.stdout.write(
          result.stdout
        );
      }


      if (
        result.stderr
      ) {
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
    // spawnSync itself failed
    // ========================================================

    if (
      result.error
    ) {
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


      if (
        result.stdout
      ) {
        process.stdout.write(
          result.stdout
        );
      }


      if (
        result.stderr
      ) {
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
    // Vitest result
    // ========================================================

    const exitCode =
      typeof result.status === 'number'
        ? result.status
        : 1;


    const passed =
      exitCode === 0;


    if (
      !passed
    ) {
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
      exit_code: exitCode,

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
      exit_code: exitCode,
    });


    if (
      result.stdout
    ) {
      process.stdout.write(
        result.stdout
      );
    }


    if (
      result.stderr
    ) {
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
    // Test runner / infrastructure error
    // ========================================================

    infrastructureError = true;
    infrastructureFailed += 1;


    const message =
      getErrorMessage(
        error
      );


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
    // Cleanup
    // ========================================================

    if (
      workspaceDir
    ) {
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
          getErrorMessage(
            error
          )
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
    (
      testFailed === 0 &&
      testTimeout === 0 &&
      infrastructureFailed === 0
    ),

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
    getErrorMessage(
      error
    )
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
  'Generated Screen Test Summary'
);

console.log(
  '='.repeat(60)
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

if (
  infrastructureError
) {
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
  'All generated screen tests passed.'
);

process.exit(0);