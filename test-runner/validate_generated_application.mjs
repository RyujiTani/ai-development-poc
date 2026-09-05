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

const runnerPackageJsonPath = path.join(runnerRoot, 'package.json');

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getPackageNameFromImport(specifier) {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/')) {
    return null;
  }

  if (specifier.startsWith('@/')) {
    return null;
  }

  if (specifier.startsWith('node:')) {
    return null;
  }

  const first = specifier.split('/')[0];

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }

  return first;
}

function collectSourceFiles(root) {
  const result = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === 'dist' ||
        entry.name === 'coverage'
      ) {
        continue;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        result.push(fullPath);
      }
    }
  }

  walk(root);
  return result;
}

function collectBareImports(root) {
  const imports = new Map();

  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const filePath of collectSourceFiles(root)) {
    const source = fs.readFileSync(filePath, 'utf8');

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(source)) !== null) {
        const packageName = getPackageNameFromImport(match[1]);

        if (!packageName) {
          continue;
        }

        if (!imports.has(packageName)) {
          imports.set(packageName, []);
        }

        imports.get(packageName).push(
          path.relative(root, filePath).replaceAll(path.sep, '/')
        );
      }
    }
  }

  return imports;
}

function validateDependencyEnvironment() {
  if (!fs.existsSync(runnerPackageJsonPath)) {
    throw new Error(
      `Required test-runner package.json not found: ${runnerPackageJsonPath}`
    );
  }

  const runnerPackage = readJson(runnerPackageJsonPath);

  const allowedPackages = new Set([
    ...Object.keys(runnerPackage.dependencies ?? {}),
    ...Object.keys(runnerPackage.devDependencies ?? {}),
  ]);

  const builtins = new Set(
    builtinModules.flatMap((name) => [
      name,
      name.replace(/^node:/, ''),
    ])
  );

  const imports = collectBareImports(applicationRoot);
  const disallowed = [];

  for (const [packageName, files] of imports.entries()) {
    if (builtins.has(packageName)) {
      continue;
    }

    if (!allowedPackages.has(packageName)) {
      disallowed.push({
        packageName,
        files: [...new Set(files)].sort(),
      });
    }
  }

  if (disallowed.length > 0) {
    console.error('DEPENDENCY ALLOWLIST CHECK FAILED');
    console.error('');

    console.error(
      'The generated application imports npm packages that are not installed by test-runner/package.json.'
    );

    console.error(
      'Do not hide this with tsconfig changes. Use an allowed dependency or update the controlled runtime intentionally.'
    );

    console.error('');

    for (
      const item of disallowed.sort((a, b) =>
        a.packageName.localeCompare(b.packageName)
      )
    ) {
      console.error(`- ${item.packageName}`);

      for (const file of item.files) {
        console.error(`    ${file}`);
      }
    }

    return false;
  }

  console.log('Dependency allowlist check passed.');

  return true;
}

if (!fs.existsSync(applicationRoot)) {
  console.error(
    `Application directory not found: ${applicationRoot}`
  );

  process.exit(2);
}

const runnerNodeModules = path.join(
  runnerRoot,
  'node_modules'
);

if (!fs.existsSync(runnerNodeModules)) {
  console.error(
    `node_modules not found: ${runnerNodeModules}`
  );

  console.error(
    'Run npm install in test-runner before static validation.'
  );

  process.exit(2);
}

const tscBin = path.join(
  runnerNodeModules,
  '.bin',
  'tsc'
);

if (!fs.existsSync(tscBin)) {
  console.error(
    `TypeScript executable not found: ${tscBin}`
  );

  process.exit(2);
}

let workspaceDir = null;

try {
  console.log('='.repeat(60));
  console.log(
    'Generated Application Static Validation'
  );
  console.log('='.repeat(60));

  console.log(
    `Application: ${applicationRoot}`
  );

  console.log('');

  /*
   * ----------------------------------------------------------
   * Dependency allowlist validation
   * ----------------------------------------------------------
   *
   * test-runner/package.json is the controlled dependency
   * environment for generated applications.
   *
   * Any bare npm import used by generated source must exist in
   * dependencies or devDependencies of test-runner/package.json.
   *
   * This validation intentionally happens before TypeScript so
   * missing runtime dependencies are reported explicitly rather
   * than being mixed with normal TypeScript diagnostics.
   */
  if (!validateDependencyEnvironment()) {
    process.exit(1);
  }

  /*
   * ----------------------------------------------------------
   * Temporary workspace
   * ----------------------------------------------------------
   */

  workspaceDir = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'generated-application-static-'
    )
  );

  copyDir(
    applicationRoot,
    workspaceDir
  );

  /*
   * Always use the controlled test-runner tsconfig.
   *
   * A generated application must not be able to weaken static
   * validation by generating its own tsconfig.json.
   */
  const tsconfigSource = path.join(
    runnerRoot,
    'tsconfig.json'
  );

  const tsconfigDestination = path.join(
    workspaceDir,
    'tsconfig.json'
  );

  if (!fs.existsSync(tsconfigSource)) {
    throw new Error(
      `Required test-runner file not found: ${tsconfigSource}`
    );
  }

  fs.copyFileSync(
    tsconfigSource,
    tsconfigDestination
  );

  /*
   * Use exactly the same dependency environment installed for
   * the test runner.
   */
  fs.symlinkSync(
    runnerNodeModules,
    path.join(
      workspaceDir,
      'node_modules'
    ),
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
   * TypeScript static validation
   * ----------------------------------------------------------
   */

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
    process.stdout.write(
      result.stdout
    );
  }

  if (result.stderr) {
    process.stderr.write(
      result.stderr
    );
  }

  /*
   * spawnSync itself failed.
   *
   * This is considered infrastructure failure rather than
   * generated-code failure.
   */
  if (result.error) {
    console.error(
      getErrorMessage(result.error)
    );

    process.exit(2);
  }

  const exitCode =
    typeof result.status === 'number'
      ? result.status
      : 1;

  /*
   * TypeScript error / import resolution error /
   * generated-code error.
   */
  if (exitCode !== 0) {
    console.error('');

    console.error(
      'STATIC CHECK FAILED'
    );

    console.error(
      'The integrated application contains a TypeScript, import, or module-resolution error.'
    );

    process.exit(1);
  }

  console.log('');

  console.log(
    'STATIC CHECK PASSED'
  );

  process.exit(0);
} catch (error) {
  /*
   * Validator itself failed.
   *
   * Exit code 2 is intentionally reserved for infrastructure
   * errors so transform_requirements.py can distinguish these
   * from AI-generated application errors.
   */
  console.error(
    'Static validation infrastructure error.'
  );

  console.error(
    getErrorMessage(error)
  );

  process.exit(2);
} finally {
  /*
   * ----------------------------------------------------------
   * Cleanup
   * ----------------------------------------------------------
   */

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
      console.error(
        `Failed to remove temporary workspace: ${workspaceDir}`
      );

      console.error(
        getErrorMessage(error)
      );
    }
  }
}