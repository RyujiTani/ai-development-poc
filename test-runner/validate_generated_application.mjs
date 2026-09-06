import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { builtinModules } from 'node:module';
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

const runnerPackageJsonPath = path.join(
  runnerRoot,
  'package.json'
);

/*
 * Generated Application側に存在していても、
 * controlled static/test runtimeの依存検査対象にはしない設定ファイル。
 *
 * これらはApplicationのbuild設定であり、
 * test-runner/node_modulesだけで解決できる必要はない。
 *
 * またStatic Check用workspaceでは削除し、
 * test-runner側の設定だけを使用する。
 */
const EXCLUDED_ROOT_CONFIG_FILES = new Set([
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',

  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
  'postcss.config.ts',

  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
  'vite.config.mts',

  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.ts',
  'vitest.config.mts',
]);

function copyDir(
  source,
  destination
) {
  fs.mkdirSync(
    destination,
    {
      recursive: true,
    }
  );

  for (
    const entry of fs.readdirSync(
      source,
      {
        withFileTypes: true,
      }
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

function getErrorMessage(error) {
  if (error instanceof Error) {
    return (
      error.stack ??
      error.message
    );
  }

  return String(error);
}

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      'utf8'
    )
  );
}

function removeIfExists(target) {
  fs.rmSync(
    target,
    {
      recursive: true,
      force: true,
    }
  );
}

function getPackageNameFromImport(
  specifier
) {
  if (
    !specifier ||
    specifier.startsWith('.') ||
    specifier.startsWith('/')
  ) {
    return null;
  }

  /*
   * Application内部alias。
   */
  if (
    specifier.startsWith('@/')
  ) {
    return null;
  }

  /*
   * Node.js builtin。
   */
  if (
    specifier.startsWith('node:')
  ) {
    return null;
  }

  /*
   * Scoped package
   *
   * @hookform/resolvers/zod
   * ->
   * @hookform/resolvers
   */
  if (
    specifier.startsWith('@')
  ) {
    const parts =
      specifier.split('/');

    return (
      parts.length >= 2
        ? `${parts[0]}/${parts[1]}`
        : specifier
    );
  }

  /*
   * Normal package
   *
   * react/jsx-runtime
   * ->
   * react
   */
  return specifier.split('/')[0];
}

function isExcludedRootConfigFile(
  root,
  filePath
) {
  const relative = path
    .relative(
      root,
      filePath
    )
    .replaceAll(
      path.sep,
      '/'
    );

  /*
   * root直下だけを除外する。
   *
   * 例えば
   * components/example/vite.config.ts
   * のような奇妙なsourceが存在した場合まで
   * 無条件に隠さない。
   */
  if (
    relative.includes('/')
  ) {
    return false;
  }

  return EXCLUDED_ROOT_CONFIG_FILES.has(
    relative
  );
}

function collectSourceFiles(root) {
  const result = [];

  function walk(current) {
    for (
      const entry of fs.readdirSync(
        current,
        {
          withFileTypes: true,
        }
      )
    ) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === 'dist' ||
        entry.name === 'coverage'
      ) {
        continue;
      }

      const fullPath = path.join(
        current,
        entry.name
      );

      if (
        entry.isDirectory()
      ) {
        walk(fullPath);
        continue;
      }

      /*
       * Application rootのbuild/test設定は
       * dependency allowlist検査対象外。
       */
      if (
        isExcludedRootConfigFile(
          root,
          fullPath
        )
      ) {
        continue;
      }

      if (
        /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(
          entry.name
        )
      ) {
        result.push(
          fullPath
        );
      }
    }
  }

  walk(root);

  return result;
}

function collectBareImports(root) {
  const imports = new Map();

  /*
   * PoC用の軽量import scanner。
   *
   * 対応:
   *
   * import x from 'pkg'
   * import { x } from 'pkg'
   * import 'pkg'
   * require('pkg')
   * import('pkg')
   */
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,

    /\bimport\s*["']([^"']+)["']/g,

    /\brequire\(\s*["']([^"']+)["']\s*\)/g,

    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (
    const filePath of collectSourceFiles(
      root
    )
  ) {
    const source =
      fs.readFileSync(
        filePath,
        'utf8'
      );

    for (
      const pattern of patterns
    ) {
      pattern.lastIndex = 0;

      let match;

      while (
        (
          match =
            pattern.exec(source)
        ) !== null
      ) {
        const packageName =
          getPackageNameFromImport(
            match[1]
          );

        if (
          !packageName
        ) {
          continue;
        }

        if (
          !imports.has(
            packageName
          )
        ) {
          imports.set(
            packageName,
            []
          );
        }

        imports
          .get(packageName)
          .push(
            path
              .relative(
                root,
                filePath
              )
              .replaceAll(
                path.sep,
                '/'
              )
          );
      }
    }
  }

  return imports;
}

function validateDependencyEnvironment() {
  if (
    !fs.existsSync(
      runnerPackageJsonPath
    )
  ) {
    throw new Error(
      `Required test-runner package.json not found: ` +
      `${runnerPackageJsonPath}`
    );
  }

  const runnerPackage =
    readJson(
      runnerPackageJsonPath
    );

  /*
   * controlled runtimeにinstallされるpackageだけを
   * Application sourceのimport許可対象にする。
   */
  const allowedPackages =
    new Set([
      ...Object.keys(
        runnerPackage.dependencies ??
          {}
      ),

      ...Object.keys(
        runnerPackage.devDependencies ??
          {}
      ),
    ]);

  /*
   * node:path 等だけでなく
   * path / fs / url といったbuiltin名にも対応する。
   */
  const builtins =
    new Set(
      builtinModules.flatMap(
        (name) => [
          name,
          name.replace(
            /^node:/,
            ''
          ),
        ]
      )
    );

  const imports =
    collectBareImports(
      applicationRoot
    );

  const disallowed = [];

  for (
    const [
      packageName,
      files,
    ] of imports.entries()
  ) {
    if (
      builtins.has(
        packageName
      )
    ) {
      continue;
    }

    if (
      !allowedPackages.has(
        packageName
      )
    ) {
      disallowed.push({
        packageName,

        files: [
          ...new Set(files),
        ].sort(),
      });
    }
  }

  if (
    disallowed.length > 0
  ) {
    console.error(
      'DEPENDENCY ALLOWLIST CHECK FAILED'
    );

    console.error('');

    console.error(
      'The generated application imports npm packages ' +
      'that are not installed by test-runner/package.json.'
    );

    console.error(
      'Do not hide this with tsconfig changes. ' +
      'Use an allowed dependency or update the ' +
      'controlled runtime intentionally.'
    );

    console.error('');

    for (
      const item of disallowed.sort(
        (a, b) =>
          a.packageName.localeCompare(
            b.packageName
          )
      )
    ) {
      console.error(
        `- ${item.packageName}`
      );

      for (
        const file of item.files
      ) {
        console.error(
          `    ${file}`
        );
      }
    }

    return false;
  }

  console.log(
    'Dependency allowlist check passed.'
  );

  return true;
}

function isolateStaticWorkspace(
  workspaceDir
) {
  /*
   * Generated Application側のbuild/test設定を
   * controlled Static Checkへ混入させない。
   *
   * 特に以下のような問題を防ぐ。
   *
   * - tailwind.config.ts がtailwindcssをimport
   * - vite.config.ts が未導入pluginをimport
   * - vitest.config.ts がtest環境を変更
   * - generated tsconfigがTypeScript検証を弱める
   */

  for (
    const name of
      EXCLUDED_ROOT_CONFIG_FILES
  ) {
    removeIfExists(
      path.join(
        workspaceDir,
        name
      )
    );
  }

  /*
   * Generated Applicationのtsconfigは
   * controlled validatorでは使用しない。
   */
  removeIfExists(
    path.join(
      workspaceDir,
      'tsconfig.json'
    )
  );

  removeIfExists(
    path.join(
      workspaceDir,
      'jsconfig.json'
    )
  );

  /*
   * test-runner側の固定tsconfigを使用する。
   */
  const tsconfigSource =
    path.join(
      runnerRoot,
      'tsconfig.json'
    );

  const tsconfigDestination =
    path.join(
      workspaceDir,
      'tsconfig.json'
    );

  if (
    !fs.existsSync(
      tsconfigSource
    )
  ) {
    throw new Error(
      `Required test-runner file not found: ` +
      `${tsconfigSource}`
    );
  }

  fs.copyFileSync(
    tsconfigSource,
    tsconfigDestination
  );
}

/*
 * Exit code
 *
 * 0:
 *   static validation passed
 *
 * 1:
 *   generated application error
 *   - dependency allowlist
 *   - TypeScript
 *   - import
 *   - module resolution
 *
 * 2:
 *   validator infrastructure error
 */

if (
  !fs.existsSync(
    applicationRoot
  )
) {
  console.error(
    `Application directory not found: ` +
    `${applicationRoot}`
  );

  process.exit(2);
}

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
  console.error(
    `node_modules not found: ` +
    `${runnerNodeModules}`
  );

  console.error(
    'Run npm install in test-runner ' +
    'before static validation.'
  );

  process.exit(2);
}

const tscBin =
  path.join(
    runnerNodeModules,
    '.bin',
    'tsc'
  );

if (
  !fs.existsSync(
    tscBin
  )
) {
  console.error(
    `TypeScript executable not found: ` +
    `${tscBin}`
  );

  process.exit(2);
}

let workspaceDir = null;

try {
  console.log(
    '='.repeat(60)
  );

  console.log(
    'Generated Application Static Validation'
  );

  console.log(
    '='.repeat(60)
  );

  console.log(
    `Application: ${applicationRoot}`
  );

  console.log('');

  /*
   * ----------------------------------------------------------
   * 1. Dependency allowlist
   * ----------------------------------------------------------
   *
   * Application sourceだけを検査する。
   *
   * Tailwind/PostCSS/Vite/Vitest configは
   * controlled runtimeのsource dependencyではないため
   * dependency scanから除外している。
   */
  if (
    !validateDependencyEnvironment()
  ) {
    process.exit(1);
  }

  /*
   * ----------------------------------------------------------
   * 2. Temporary static workspace
   * ----------------------------------------------------------
   */
  workspaceDir =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'generated-application-static-'
      )
    );

  /*
   * Application全体をコピー。
   */
  copyDir(
    applicationRoot,
    workspaceDir
  );

  /*
   * Application側のbuild/test configを除去し、
   * controlled static environmentへ置き換える。
   */
  isolateStaticWorkspace(
    workspaceDir
  );

  /*
   * controlled node_modulesを使用する。
   */
  const workspaceNodeModules =
    path.join(
      workspaceDir,
      'node_modules'
    );

  removeIfExists(
    workspaceNodeModules
  );

  fs.symlinkSync(
    runnerNodeModules,
    workspaceNodeModules,
    'dir'
  );

  console.log(
    `Workspace  : ${workspaceDir}`
  );

  console.log('');

  console.log(
    'Running: tsc --noEmit --project tsconfig.json'
  );

  console.log('');

  /*
   * ----------------------------------------------------------
   * 3. TypeScript static check
   * ----------------------------------------------------------
   */
  const result =
    spawnSync(
      tscBin,
      [
        '--noEmit',

        '--project',
        'tsconfig.json',

        '--pretty',
        'false',
      ],
      {
        cwd:
          workspaceDir,

        encoding:
          'utf8',

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

  /*
   * spawn自体が失敗した場合は
   * Application問題ではなくinfra error。
   */
  if (
    result.error
  ) {
    console.error(
      getErrorMessage(
        result.error
      )
    );

    process.exit(2);
  }

  const exitCode =
    typeof result.status ===
    'number'
      ? result.status
      : 1;

  if (
    exitCode !== 0
  ) {
    console.error('');

    console.error(
      'STATIC CHECK FAILED'
    );

    console.error(
      'The integrated application contains a ' +
      'TypeScript, import, or module-resolution error.'
    );

    process.exit(1);
  }

  console.log('');

  console.log(
    'STATIC CHECK PASSED'
  );

  process.exit(0);
} catch (error) {
  console.error(
    'Static validation infrastructure error.'
  );

  console.error(
    getErrorMessage(error)
  );

  process.exit(2);
} finally {
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
      console.error(
        `Failed to remove temporary workspace: ` +
        `${workspaceDir}`
      );

      console.error(
        getErrorMessage(error)
      );
    }
  }
}