from pathlib import Path
import argparse
import json
import re
import shutil
import subprocess
import sys
from typing import Any, Dict, List, Optional, Tuple


# ============================================================
# Paths
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BASE_DIR = PROJECT_ROOT / "requirements" / "ai"

ORIGINAL_DIR = BASE_DIR / "original"
GENERATED_DIR = BASE_DIR / "generated"
PROMPTS_DIR = BASE_DIR / "prompts"

SYSTEM_REQUIREMENTS_MD = (
    ORIGINAL_DIR / "requirements" / "system_requirements.md"
)

TRACE_INDEX_MD = (
    ORIGINAL_DIR / "requirements" / "_trace_index.md"
)

SCREEN_DIR = ORIGINAL_DIR / "screens"

GENERATED_REQUIREMENTS_DIR = (
    GENERATED_DIR / "requirements"
)

GENERATED_SCREEN_DIR = (
    GENERATED_DIR / "screens"
)

# 統合Applicationの出力先
APPLICATION_DIR = (
    GENERATED_DIR / "application"
)

SYSTEM_PROMPT = (
    PROMPTS_DIR / "transform_system_requirement.md"
)

TRACE_PROMPT = (
    PROMPTS_DIR / "transform_trace_index.md"
)

SCREEN_PROMPT = (
    PROMPTS_DIR / "transform_screen_requirement.md"
)

IMPLEMENT_SCREEN_PROMPT = (
    PROMPTS_DIR / "implement_screen.md"
)

REPAIR_SCREEN_PROMPT = (
    PROMPTS_DIR / "repair_screen.md"
)


# ============================================================
# Repair protected files
# ============================================================

# AI repair must never modify the validation/test infrastructure.
# These files are owned by the controlled runner environment or are
# application build configuration that must not be changed merely to
# make validation pass.
REPAIR_PROTECTED_EXACT_PATHS = {
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "tsconfig.json",
    "jsconfig.json",
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mts",
    "vitest.config.mjs",
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mts",
    "vite.config.mjs",
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "postcss.config.ts",
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
    "tailwind.config.ts",
}


def validate_repair_file_paths(
    files: Dict[str, str],
) -> None:
    """
    AI repairが保護対象のtest/build infrastructureを
    変更しようとしていないことを確認する。
    """

    violations: List[str] = []

    for relative_path in files:
        normalized = (
            relative_path
            .replace("\\", "/")
            .strip()
            .lstrip("./")
        )

        if normalized == ".ai-repair-unresolved.txt":
            continue

        if normalized in REPAIR_PROTECTED_EXACT_PATHS:
            violations.append(
                normalized
            )

    if violations:
        raise ValueError(
            "AI repair attempted to modify protected "
            "test/build infrastructure: "
            + ", ".join(
                sorted(violations)
            )
            + ". Repair application/test source instead; "
            "controlled runner files must not be changed "
            "by AI repair."
        )


# ============================================================
# Common utilities
# ============================================================

def read_text(path: Path) -> str:
    """UTF-8 text fileを読み込む。"""

    return path.read_text(
        encoding="utf-8"
    )


def write_text(
    path: Path,
    content: str,
) -> None:
    """UTF-8 text fileへ書き込む。"""

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        content,
        encoding="utf-8",
    )


def load_prompt(path: Path) -> str:
    """プロンプトを読み込む。"""

    return read_text(path)


def inject_prompt(
    prompt: str,
    replacements: Dict[str, str],
) -> str:
    """
    プロンプト内のプレースホルダを置換する。
    """

    result = prompt

    for placeholder, value in replacements.items():
        result = result.replace(
            placeholder,
            value,
        )

    return result


def validate_required_files(
    paths: List[Path],
) -> None:
    """必要ファイルの存在を確認する。"""

    for path in paths:
        if not path.exists():
            raise FileNotFoundError(
                f"Required file not found: {path}"
            )


# ============================================================
# JSON utilities
# ============================================================

def extract_json(
    text: str,
) -> Any:
    """
    AIレスポンスからJSONを取得する。

    ```json
    {...}
    ```

    のようなコードブロックにも対応する。
    """

    if not text:
        raise ValueError(
            "Vertex AI response is empty."
        )

    text = text.strip()

    match = re.search(
        r"```json\s*(.*?)\s*```",
        text,
        flags=(
            re.DOTALL
            | re.IGNORECASE
        ),
    )

    if match:
        text = (
            match
            .group(1)
            .strip()
        )

    try:
        return json.loads(
            text
        )

    except json.JSONDecodeError as exc:
        raise ValueError(
            "Vertex AI response is not valid JSON."
        ) from exc


def generate_json_with_retry(
    vertex_client,
    prompt: str,
    max_attempts: int = 3,
) -> Any:
    """
    Vertex AIへJSON生成を依頼し、
    JSONとして解析できない場合のみ再生成する。

    max_attemptsには初回生成を含む。
    """

    if max_attempts < 1:
        raise ValueError(
            "max_attempts must be greater than "
            "or equal to 1."
        )

    last_error: Optional[
        Exception
    ] = None

    for attempt in range(
        1,
        max_attempts + 1,
    ):
        print(
            "JSON generation attempt "
            f"{attempt}/{max_attempts}"
        )

        response = (
            vertex_client.generate(
                prompt
            )
        )

        try:
            data = extract_json(
                response
            )

            print(
                "Generated JSON format "
                "validation passed."
            )

            return data

        except ValueError as exc:
            last_error = exc

            print(
                "Invalid JSON response: "
                f"{exc}"
            )

            print()
            print("-" * 60)

            print(
                "Vertex AI raw JSON response "
                f"(attempt {attempt}/"
                f"{max_attempts}):"
            )

            print(
                response
            )

            print("-" * 60)
            print()

            if attempt < max_attempts:
                print(
                    "Retrying JSON generation..."
                )

    raise RuntimeError(
        "Failed to generate valid JSON after "
        f"{max_attempts} attempts."
    ) from last_error


# ============================================================
# Generated implementation FILE parser
# ============================================================

FILE_START_MARKER = (
    "<<<FILE_START>>>"
)

CONTENT_START_MARKER = (
    "<<<CONTENT_START>>>"
)

CONTENT_END_MARKER = (
    "<<<CONTENT_END>>>"
)

FILE_END_MARKER = (
    "<<<FILE_END>>>"
)


def parse_generated_files(
    response_text: str,
) -> Dict[str, str]:
    """
    Vertex AIの実装レスポンスから
    FILEブロックを取得する。

    対応形式:

    <<<FILE_START>>>
    PATH: app/page.tsx
    <<<CONTENT_START>>>
    ... raw source code ...
    <<<CONTENT_END>>>
    <<<FILE_END>>>

    FILEブロック間の空行は許可する。
    """

    if not response_text:
        raise ValueError(
            "Vertex AI response is empty."
        )

    text = (
        response_text
        .strip()
    )

    if not text.startswith(
        FILE_START_MARKER
    ):
        raise ValueError(
            "Generated response must start with "
            f"{FILE_START_MARKER}."
        )

    if not text.endswith(
        FILE_END_MARKER
    ):
        raise ValueError(
            "Generated response must end with "
            f"{FILE_END_MARKER}."
        )

    pattern = re.compile(
        r"<<<FILE_START>>>\r?\n"
        r"PATH:[ \t]*(?P<path>[^\r\n]+)\r?\n"
        r"<<<CONTENT_START>>>\r?\n"
        r"(?P<content>.*?)"
        r"\r?\n<<<CONTENT_END>>>\r?\n"
        r"<<<FILE_END>>>",
        flags=re.DOTALL,
    )

    matches = list(
        pattern.finditer(
            text
        )
    )

    if not matches:
        raise ValueError(
            "No valid FILE blocks found in "
            "Vertex AI response."
        )

    # FILEブロック間は空白・改行のみ許可
    cursor = 0

    for match in matches:
        between = text[
            cursor:
            match.start()
        ]

        if between.strip():
            raise ValueError(
                "Unexpected text exists outside "
                "FILE blocks."
            )

        cursor = match.end()

    trailing = text[
        cursor:
    ]

    if trailing.strip():
        raise ValueError(
            "Unexpected trailing text exists "
            "outside FILE blocks."
        )

    result: Dict[
        str,
        str,
    ] = {}

    for index, match in enumerate(
        matches,
        start=1,
    ):
        relative_path = (
            match
            .group("path")
            .strip()
        )

        content = match.group(
            "content"
        )

        if not relative_path:
            raise ValueError(
                f"FILE block {index} "
                "has an empty PATH."
            )

        if not content.strip():
            raise ValueError(
                "Generated file is empty: "
                f"{relative_path}"
            )

        if relative_path in result:
            raise ValueError(
                "Duplicate generated file path: "
                f"{relative_path}"
            )

        for marker in (
            FILE_START_MARKER,
            CONTENT_START_MARKER,
            CONTENT_END_MARKER,
            FILE_END_MARKER,
        ):
            if marker in content:
                raise ValueError(
                    "Generated source contains "
                    "reserved parser marker "
                    f"{marker}: "
                    f"{relative_path}"
                )

        result[
            relative_path
        ] = content

    return result


def validate_screen_test_path(
    files: Dict[str, str],
    screen_id: str,
) -> None:
    """
    対象画面のテストが、
    完全なscreen_idを使用した

    tests/<screen_id>/

    配下に生成されていることを確認する。

    例:

      screen_id =
      SCR-001_contractor_login

    OK:

      tests/SCR-001_contractor_login/page.test.tsx

    NG:

      tests/SCR-001/page.test.tsx
      tests/contractor_login/page.test.tsx
    """

    expected_prefix = (
        f"tests/{screen_id}/"
    )

    generated_test_files: List[
        str
    ] = []

    invalid_test_files: List[
        str
    ] = []

    for relative_path in files:
        normalized = (
            relative_path
            .replace(
                "\\",
                "/",
            )
            .strip()
            .lstrip("./")
        )

        if not normalized.startswith(
            "tests/"
        ):
            continue

        generated_test_files.append(
            normalized
        )

        if not normalized.startswith(
            expected_prefix
        ):
            invalid_test_files.append(
                normalized
            )

    if invalid_test_files:
        raise ValueError(
            "Generated screen test path "
            "is invalid. "
            "Expected all generated tests "
            f"under '{expected_prefix}', "
            "but found: "
            + ", ".join(
                sorted(
                    invalid_test_files
                )
            )
        )

    if not generated_test_files:
        raise ValueError(
            "No test file was generated for "
            "the target screen. "
            "At least one test file must be "
            "generated under "
            f"'{expected_prefix}'."
        )

    print(
        "Screen test path validation "
        "passed: "
        f"{expected_prefix}"
    )


def generate_implementation_files(
    vertex_client,
    prompt: str,
    max_attempts: int = 3,
    expected_screen_test_id:
        Optional[str] = None,
) -> Dict[str, str]:
    """
    Vertex AIへ実装生成を依頼する。

    FILE形式を解析できない場合、
    内容Validationに失敗した場合、
    または対象画面のテストパスが
    不正な場合は、

    不完全な生成物を保存せず再生成する。
    """

    if max_attempts < 1:
        raise ValueError(
            "max_attempts must be greater than "
            "or equal to 1."
        )

    last_error: Optional[
        Exception
    ] = None

    for attempt in range(
        1,
        max_attempts + 1,
    ):
        print(
            "Generation attempt "
            f"{attempt}/{max_attempts}"
        )

        response = (
            vertex_client.generate(
                prompt
            )
        )

        try:
            generated_files = (
                parse_generated_files(
                    response
                )
            )

            validate_generated_files_content(
                generated_files
            )

            if expected_screen_test_id:
                validate_screen_test_path(
                    generated_files,
                    expected_screen_test_id,
                )

            print(
                "Generated FILE format "
                "validation passed."
            )

            return generated_files

        except ValueError as exc:
            last_error = exc

            print(
                "Invalid implementation response: "
                f"{exc}"
            )

            print()
            print("-" * 60)

            print(
                "Vertex AI raw response "
                f"(attempt {attempt}/"
                f"{max_attempts}):"
            )

            print(
                response
            )

            print("-" * 60)
            print()

            if attempt < max_attempts:
                print(
                    "Retrying implementation "
                    "generation..."
                )

    raise RuntimeError(
        "Failed to generate a valid "
        "implementation after "
        f"{max_attempts} attempts."
    ) from last_error


# ============================================================
# JSON file output
# ============================================================

def save_json(
    path: Path,
    data: Any,
) -> None:
    """JSONを整形して保存する。"""

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


# ============================================================
# Screen requirement transformation
# ============================================================

def get_screen_id(
    screen_file: Path,
) -> str:
    """
    SCR-001_contractor_login.md
    ->
    SCR-001_contractor_login
    """

    return screen_file.stem


def transform_system_requirement(
    vertex_client,
) -> Path:
    """
    system_requirements.md
    ↓
    system_requirements.json
    """

    validate_required_files(
        [
            SYSTEM_REQUIREMENTS_MD,
            SYSTEM_PROMPT,
        ]
    )

    source_md = read_text(
        SYSTEM_REQUIREMENTS_MD
    )

    prompt = inject_prompt(
        load_prompt(
            SYSTEM_PROMPT
        ),
        {
            "{{SYSTEM_REQUIREMENTS_MD}}":
                source_md,
        },
    )

    print(
        "Generating "
        "system_requirements.json..."
    )

    data = generate_json_with_retry(
        vertex_client,
        prompt,
        max_attempts=3,
    )

    output_file = (
        GENERATED_REQUIREMENTS_DIR
        / "system_requirements.json"
    )

    save_json(
        output_file,
        data,
    )

    print(
        f"Generated: {output_file}"
    )

    return output_file


def transform_trace_index(
    vertex_client,
) -> Path:
    """
    _trace_index.md
    ↓
    trace_index.json
    """

    validate_required_files(
        [
            TRACE_INDEX_MD,
            TRACE_PROMPT,
        ]
    )

    source_md = read_text(
        TRACE_INDEX_MD
    )

    prompt = inject_prompt(
        load_prompt(
            TRACE_PROMPT
        ),
        {
            "{{TRACE_INDEX_MD}}":
                source_md,
        },
    )

    print(
        "Generating trace_index.json..."
    )

    data = generate_json_with_retry(
        vertex_client,
        prompt,
        max_attempts=3,
    )

    output_file = (
        GENERATED_REQUIREMENTS_DIR
        / "trace_index.json"
    )

    save_json(
        output_file,
        data,
    )

    print(
        f"Generated: {output_file}"
    )

    return output_file


def transform_screen_requirement(
    vertex_client,
    screen_file: Path,
) -> Path:
    """
    1画面分の画面要件を変換する。

    system_requirements.json
    +
    trace_index.json
    +
    screen_design.md
    ↓
    SCR-xxx.json
    """

    system_requirements_file = (
        GENERATED_REQUIREMENTS_DIR
        / "system_requirements.json"
    )

    trace_index_file = (
        GENERATED_REQUIREMENTS_DIR
        / "trace_index.json"
    )

    validate_required_files(
        [
            system_requirements_file,
            trace_index_file,
            SCREEN_PROMPT,
            screen_file,
        ]
    )

    prompt = inject_prompt(
        load_prompt(
            SCREEN_PROMPT
        ),
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                read_text(
                    system_requirements_file
                ),

            "{{TRACE_INDEX_JSON}}":
                read_text(
                    trace_index_file
                ),

            "{{SCREEN_DESIGN_MD}}":
                read_text(
                    screen_file
                ),

            "{{SCREEN_DESIGN_FILE}}":
                str(
                    screen_file
                ),
        },
    )

    screen_id = get_screen_id(
        screen_file
    )

    print(
        "Generating screen requirement: "
        f"{screen_id}"
    )

    data = generate_json_with_retry(
        vertex_client,
        prompt,
        max_attempts=3,
    )

    output_file = (
        GENERATED_SCREEN_DIR
        / f"{screen_id}.json"
    )

    save_json(
        output_file,
        data,
    )

    print(
        f"Generated: {output_file}"
    )

    return output_file


def transform_all_screens(
    vertex_client,
) -> None:
    """
    screens/*.md をすべて処理する。
    """

    validate_required_files(
        [
            GENERATED_REQUIREMENTS_DIR
            / "system_requirements.json",

            GENERATED_REQUIREMENTS_DIR
            / "trace_index.json",

            SCREEN_PROMPT,
        ]
    )

    screen_files = sorted(
        SCREEN_DIR.glob(
            "*.md"
        )
    )

    if not screen_files:
        raise FileNotFoundError(
            "Screen design files not found: "
            f"{SCREEN_DIR}"
        )

    print(
        f"Found {len(screen_files)} "
        "screen files."
    )

    for index, screen_file in enumerate(
        screen_files,
        start=1,
    ):
        print(
            f"[{index}/{len(screen_files)}] "
            f"Transforming: {screen_file}"
        )

        transform_screen_requirement(
            vertex_client,
            screen_file,
        )


# ============================================================
# Generated requirement validation
# ============================================================

def validate_generated_requirements() -> None:
    """
    生成された要件JSONに対して、
    構造ValidationとSemantic Validationを実行する。

    どちらか一方でも失敗した場合は、
    実装処理へ進まず例外を発生させる。
    """

    print()
    print("=" * 60)
    print(
        "Generated Requirements Validation"
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Structural validation
    # --------------------------------------------------------

    print()
    print(
        "=== Structural Validation ==="
    )
    print()

    from requirements.ai.validate_generated_requirements import (
        main as validate_structure,
    )

    structural_result = (
        validate_structure()
    )

    if structural_result != 0:
        raise RuntimeError(
            "Generated requirements structural "
            "validation failed."
        )

    # --------------------------------------------------------
    # Semantic validation
    # --------------------------------------------------------

    print()
    print(
        "=== Semantic Validation ==="
    )
    print()

    from requirements.ai.validate_generated_semantics import (
        main as validate_semantics,
    )

    semantic_result = (
        validate_semantics()
    )

    if semantic_result != 0:
        raise RuntimeError(
            "Generated requirements semantic "
            "validation failed."
        )

    print()
    print("=" * 60)
    print(
        "All generated requirement "
        "validations passed."
    )
    print("=" * 60)


# ============================================================
# Generated file validation
# ============================================================

def validate_generated_file_path(
    relative_path: str,
) -> Path:
    """
    AIが返した相対パスが、
    出力ディレクトリ外へ脱出しないことを確認する。
    """

    if not isinstance(
        relative_path,
        str,
    ):
        raise ValueError(
            "Generated file path must be string."
        )

    normalized = (
        relative_path
        .replace(
            "\\",
            "/",
        )
        .strip()
    )

    if not normalized:
        raise ValueError(
            "Generated file path is empty."
        )

    path = Path(
        normalized
    )

    if path.is_absolute():
        raise ValueError(
            "Generated file path must be relative: "
            f"{relative_path}"
        )

    if ".." in path.parts:
        raise ValueError(
            "Generated file path contains '..': "
            f"{relative_path}"
        )

    return path


def validate_generated_files_content(
    files: Dict[str, str],
) -> None:
    """
    AI生成ファイルの最低限の内容Validation。

    主目的:
      - 空ファイル防止
      - Markdown fence混入防止
      - FILE parser marker混入防止
      - obvious diff output防止
    """

    if not files:
        raise ValueError(
            "No generated files."
        )

    reserved_markers = (
        FILE_START_MARKER,
        CONTENT_START_MARKER,
        CONTENT_END_MARKER,
        FILE_END_MARKER,
    )

    for relative_path, content in files.items():
        validate_generated_file_path(
            relative_path
        )

        if not isinstance(
            content,
            str,
        ):
            raise ValueError(
                "Generated file content must be "
                f"string: {relative_path}"
            )

        if not content.strip():
            raise ValueError(
                "Generated file content is empty: "
                f"{relative_path}"
            )

        for marker in reserved_markers:
            if marker in content:
                raise ValueError(
                    "Generated source contains "
                    "reserved parser marker "
                    f"{marker}: "
                    f"{relative_path}"
                )

        stripped = content.lstrip()

        if stripped.startswith(
            "```"
        ):
            raise ValueError(
                "Generated source must not contain "
                "Markdown code fence: "
                f"{relative_path}"
            )

        if (
            stripped.startswith(
                "*** Begin Patch"
            )
            or stripped.startswith(
                "--- a/"
            )
            or stripped.startswith(
                "+++ b/"
            )
        ):
            raise ValueError(
                "Generated source must not contain "
                "diff/patch format: "
                f"{relative_path}"
            )


# ============================================================
# Existing application serialization
# ============================================================

def serialize_existing_application(
    application_dir: Path,
) -> str:
    """
    現在の統合Application全体を
    implement / repair promptへ渡す形式に変換する。

    Format:

    <<<EXISTING_FILE_START>>>
    PATH: app/page.tsx
    <<<EXISTING_CONTENT_START>>>
    ...
    <<<EXISTING_CONTENT_END>>>
    <<<EXISTING_FILE_END>>>
    """

    if not application_dir.exists():
        return (
            "(NO_EXISTING_APPLICATION)"
        )

    files = sorted(
        [
            path
            for path in application_dir.rglob(
                "*"
            )
            if path.is_file()
        ]
    )

    if not files:
        return (
            "(NO_EXISTING_APPLICATION)"
        )

    blocks: List[str] = []

    for file_path in files:
        relative_path = (
            file_path
            .relative_to(
                application_dir
            )
            .as_posix()
        )

        if (
            relative_path
            == ".ai-repair-unresolved.txt"
        ):
            continue

        try:
            content = (
                file_path.read_text(
                    encoding="utf-8"
                )
            )

        except UnicodeDecodeError:
            # binary fileはpromptへ含めない。
            continue

        block = (
            "<<<EXISTING_FILE_START>>>\n"
            f"PATH: {relative_path}\n"
            "<<<EXISTING_CONTENT_START>>>\n"
            f"{content}\n"
            "<<<EXISTING_CONTENT_END>>>\n"
            "<<<EXISTING_FILE_END>>>"
        )

        blocks.append(
            block
        )

    if not blocks:
        return (
            "(NO_EXISTING_APPLICATION)"
        )

    return "\n\n".join(
        blocks
    )


# ============================================================
# Screen lookup
# ============================================================

def find_screen_requirement_file(
    screen: str,
) -> Path:
    """
    screen IDからgenerated/screens配下の
    対象JSONを取得する。

    完全一致を優先する。

    Example:
        SCR-001_contractor_login
    """

    if not screen:
        raise ValueError(
            "screen is required."
        )

    exact_file = (
        GENERATED_SCREEN_DIR
        / f"{screen}.json"
    )

    if exact_file.exists():
        return exact_file

    matches = sorted(
        GENERATED_SCREEN_DIR.glob(
            f"{screen}*.json"
        )
    )

    if not matches:
        raise FileNotFoundError(
            "Screen requirement JSON not found: "
            f"{screen}"
        )

    if len(matches) > 1:
        raise ValueError(
            "Multiple screen requirement files "
            f"matched '{screen}': "
            + ", ".join(
                str(path)
                for path in matches
            )
        )

    return matches[0]


# ============================================================
# Validation / test utilities
# ============================================================

def build_validation_error_log(
    stdout: str,
    stderr: str,
    max_chars: int = 60000,
) -> str:
    """
    静的検証等のstdout/stderrを
    repair用ログへまとめる。
    """

    text = (
        "=== STDOUT ===\n"
        f"{stdout or ''}\n\n"
        "=== STDERR ===\n"
        f"{stderr or ''}"
    )

    if len(text) <= max_chars:
        return text

    return (
        "[ERROR LOG TRUNCATED: LAST "
        f"{max_chars} CHARACTERS]\n"
        + text[
            -max_chars:
        ]
    )


def run_static_validation(
    static_validator: Path,
) -> subprocess.CompletedProcess:
    """
    generated/application を
    test-runner/validate_generated_application.mjs
    で静的検証する。

    Exit:
        0 = pass
        1 = generated application failure
        2 = infrastructure failure
    """

    return subprocess.run(
        [
            "node",
            str(
                static_validator
            ),
        ],
        cwd=PROJECT_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def run_regression_tests(
    test_runner: Path,
    screen_id: str,
) -> subprocess.CompletedProcess:
    """
    先頭画面からscreen_idまでの
    accumulated regression testsを実行する。

    stdout/stderrをcaptureしつつ、
    GitHub Actionsログにも出力する。
    """

    result = subprocess.run(
        [
            "node",
            str(
                test_runner
            ),
            "--through",
            screen_id,
        ],
        cwd=PROJECT_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if result.stdout:
        print(
            result.stdout,
            end=(
                ""
                if result.stdout.endswith(
                    "\n"
                )
                else "\n"
            ),
        )

    if result.stderr:
        print(
            result.stderr,
            end=(
                ""
                if result.stderr.endswith(
                    "\n"
                )
                else "\n"
            ),
            file=sys.stderr,
        )

    return result


def repair_screen_with_result(
    vertex_client,
    screen: str,
    validation_result: Dict[
        str,
        Any,
    ],
    error_log: str,
    max_attempts: int = 2,
) -> None:
    """
    test-resultsファイルを経由せず、
    任意の検証結果を直接repairへ渡す。

    主用途:
        - STATIC_CHECK_FAILED
        - TEST_FAILED

    TEST_RESULT_JSONというplaceholder名は
    既存repair promptとの互換性のため維持する。
    """

    system_requirements_file = (
        GENERATED_REQUIREMENTS_DIR
        / "system_requirements.json"
    )

    trace_index_file = (
        GENERATED_REQUIREMENTS_DIR
        / "trace_index.json"
    )

    screen_requirement_file = (
        find_screen_requirement_file(
            screen
        )
    )

    validate_required_files(
        [
            system_requirements_file,
            trace_index_file,
            screen_requirement_file,
            REPAIR_SCREEN_PROMPT,
        ]
    )

    screen_id = (
        screen_requirement_file.stem
    )

    generated_files_text = (
        serialize_existing_application(
            APPLICATION_DIR
        )
    )

    result_json = json.dumps(
        validation_result,
        ensure_ascii=False,
        indent=2,
    )

    prompt = inject_prompt(
        load_prompt(
            REPAIR_SCREEN_PROMPT
        ),
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                read_text(
                    system_requirements_file
                ),

            "{{TRACE_INDEX_JSON}}":
                read_text(
                    trace_index_file
                ),

            "{{SCREEN_REQUIREMENT_JSON}}":
                read_text(
                    screen_requirement_file
                ),

            "{{GENERATED_FILES}}":
                generated_files_text,

            "{{TEST_RESULT_JSON}}":
                result_json,

            "{{ERROR_LOG}}":
                error_log,
        },
    )

    print()
    print("=" * 60)
    print(
        "Repairing generated application "
        "after validation failure: "
        f"{screen_id}"
    )
    print("=" * 60)

    repaired_files = (
        generate_implementation_files(
            vertex_client,
            prompt,
            max_attempts=max_attempts,
        )
    )

    if (
        ".ai-repair-unresolved.txt"
        in repaired_files
    ):
        message = repaired_files[
            ".ai-repair-unresolved.txt"
        ].strip()

        if (
            message
            == "SPECIFICATION_GAP"
        ):
            unresolved_file = (
                APPLICATION_DIR
                / ".ai-repair-unresolved.txt"
            )

            unresolved_file.write_text(
                message + "\n",
                encoding="utf-8",
            )

            raise RuntimeError(
                "Automatic repair stopped because "
                "a specification gap was detected: "
                f"{screen_id}"
            )

    validate_repair_file_paths(
        repaired_files
    )

    saved_files = (
        apply_repaired_files(
            repaired_files,
            APPLICATION_DIR,
        )
    )

    print()
    print(
        f"Applied {len(saved_files)} "
        "repaired file(s):"
    )

    for file_path in saved_files:
        print(
            f"  {file_path}"
        )


def run_static_check_with_auto_repair(
    vertex_client,
    screen_id: str,
    static_validator: Path,
    max_static_repair_count: int = 2,
    reason: str = "post_implementation",
) -> None:
    """
    static validationを実行し、
    generated application error(exit 1)なら
    AI repairして再検証する。

    exit 2はinfra errorなので
    AI repairしない。
    """

    static_repair_count = 0

    while True:
        print(
            "Running static validation..."
        )

        static_result = (
            run_static_validation(
                static_validator
            )
        )

        if static_result.stdout:
            print(
                static_result.stdout,
                end=(
                    ""
                    if static_result.stdout.endswith(
                        "\n"
                    )
                    else "\n"
                ),
            )

        if static_result.stderr:
            print(
                static_result.stderr,
                end=(
                    ""
                    if static_result.stderr.endswith(
                        "\n"
                    )
                    else "\n"
                ),
                file=sys.stderr,
            )

        if static_result.returncode == 0:
            print(
                "Static validation passed."
            )
            return

        if static_result.returncode == 2:
            raise RuntimeError(
                "Static validation infrastructure "
                "failed. AI repair was not attempted."
            )

        if (
            static_repair_count
            >= max_static_repair_count
        ):
            raise RuntimeError(
                "Static validation still failed "
                "after "
                f"{static_repair_count} "
                "automatic repair(s) "
                f"for {screen_id}. "
                "The generated application was "
                "not allowed to proceed to the "
                "next screen."
            )

        static_repair_count += 1

        print()
        print(
            "Static validation failed. "
            "Starting automatic repair "
            f"{static_repair_count}/"
            f"{max_static_repair_count}..."
        )

        validation_result: Dict[
            str,
            Any,
        ] = {
            "screen":
                screen_id,

            "status":
                "STATIC_CHECK_FAILED",

            "phase":
                "typescript",

            "reason":
                reason,

            "command":
                "tsc --noEmit "
                "--project tsconfig.json",

            "exit_code":
                static_result.returncode,

            "repair_attempt":
                static_repair_count,
        }

        error_log = (
            build_validation_error_log(
                static_result.stdout
                or "",

                static_result.stderr
                or "",
            )
        )

        repair_screen_with_result(
            vertex_client,
            screen_id,
            validation_result,
            error_log,
            max_attempts=2,
        )

        print()
        print(
            "Re-running static validation "
            "after repair..."
        )

def run_post_implementation_check(
    vertex_client,
    screen_id: str,
    max_static_repair_count: int = 2,
    max_test_repair_count: int = 2,
) -> None:
    """
    1画面をApplicationへ追加した直後に検証する。

    Flow:
        1. static validation
        2. static failureならAI repair
        3. accumulated regression tests
        4. test failureならAI repair
        5. repair後にstatic validation
        6. regression tests再実行

    ここをPASSしない限り、
    次画面の実装へ進ませない。
    """

    static_validator = (
        PROJECT_ROOT
        / "test-runner"
        / "validate_generated_application.mjs"
    )

    test_runner = (
        PROJECT_ROOT
        / "test-runner"
        / "run_generated_tests.mjs"
    )

    validate_required_files(
        [
            static_validator,
            test_runner,
            REPAIR_SCREEN_PROMPT,
        ]
    )

    print()
    print("=" * 60)
    print(
        f"Post implementation check: {screen_id}"
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Initial static validation
    # --------------------------------------------------------

    run_static_check_with_auto_repair(
        vertex_client=vertex_client,
        screen_id=screen_id,
        static_validator=static_validator,
        max_static_repair_count=(
            max_static_repair_count
        ),
        reason="post_implementation",
    )

    # --------------------------------------------------------
    # Accumulated regression tests + automatic repair
    # --------------------------------------------------------

    test_repair_count = 0

    while True:
        print()
        print(
            "Running regression tests through "
            f"{screen_id}..."
        )

        test_result = (
            run_regression_tests(
                test_runner,
                screen_id,
            )
        )

        if test_result.returncode == 0:
            print()
            print(
                "Post implementation check "
                f"passed: {screen_id}"
            )
            return

        # exit 2 = controlled test runner側の
        # infrastructure failure。
        # ApplicationをAI修正しても意味がないためrepairしない。
        if test_result.returncode == 2:
            raise RuntimeError(
                "Test infrastructure failed "
                "immediately after implementing "
                f"{screen_id}. "
                "AI repair was not attempted."
            )

        if (
            test_repair_count
            >= max_test_repair_count
        ):
            raise RuntimeError(
                "Regression test still failed after "
                f"{test_repair_count} automatic "
                f"repair(s) for {screen_id}. "
                "The generated application was "
                "not allowed to proceed to the "
                "next screen."
            )

        test_repair_count += 1

        print()
        print(
            "Regression test failed. "
            "Starting automatic test repair "
            f"{test_repair_count}/"
            f"{max_test_repair_count}..."
        )

        validation_result: Dict[
            str,
            Any,
        ] = {
            "screen":
                screen_id,

            "status":
                "TEST_FAILED",

            "phase":
                "regression_test",

            "command":
                "node "
                "test-runner/"
                "run_generated_tests.mjs "
                f"--through {screen_id}",

            "exit_code":
                test_result.returncode,

            "repair_attempt":
                test_repair_count,

            "regression_through":
                screen_id,
        }

        error_log = (
            build_validation_error_log(
                test_result.stdout
                or "",

                test_result.stderr
                or "",
            )
        )

        repair_screen_with_result(
            vertex_client,
            screen_id,
            validation_result,
            error_log,
            max_attempts=2,
        )

        # Test repairでTypeScript/importを
        # 壊していないことを必ず確認する。
        print()
        print(
            "Running static validation "
            "after test repair..."
        )

        run_static_check_with_auto_repair(
            vertex_client=vertex_client,
            screen_id=screen_id,
            static_validator=static_validator,
            max_static_repair_count=(
                max_static_repair_count
            ),
            reason=(
                "after_regression_test_repair_"
                f"{test_repair_count}"
            ),
        )

        print()
        print(
            "Re-running regression tests "
            "after repair..."
        )


# ============================================================
# Implementation
# ============================================================

def implement_screen(
    vertex_client,
    screen: str,
) -> None:
    """
    生成済みJSONから対象画面を
    統合Applicationへ追加実装する。

    system_requirements.json
    +
    trace_index.json
    +
    SCR-xxx.json
    +
    現在のApplicationコード
    +
    implement_screen.md
    ↓
    変更が必要なファイルだけを生成
    ↓
    generated/application/へ追加・上書き

    さらに、対象画面のテストは必ず

        tests/<FULL_SCREEN_ID>/

    配下に生成させる。

    不正なテストパスの場合は
    generate_implementation_files() 内で
    実装生成そのものを再試行する。
    """

    system_requirements_file = (
        GENERATED_REQUIREMENTS_DIR
        / "system_requirements.json"
    )

    trace_index_file = (
        GENERATED_REQUIREMENTS_DIR
        / "trace_index.json"
    )

    screen_requirement_file = (
        find_screen_requirement_file(
            screen
        )
    )

    validate_required_files(
        [
            system_requirements_file,
            trace_index_file,
            screen_requirement_file,
            IMPLEMENT_SCREEN_PROMPT,
        ]
    )

    # --------------------------------------------------------
    # IMPORTANT
    # --------------------------------------------------------
    #
    # FULL_SCREEN_IDをpromptへ注入するため、
    # prompt生成より前にscreen_idを確定する。
    #
    # Example:
    #
    # SCR-001_contractor_login
    #
    # --------------------------------------------------------

    screen_id = (
        screen_requirement_file.stem
    )

    existing_application = (
        serialize_existing_application(
            APPLICATION_DIR
        )
    )

    prompt = inject_prompt(
        load_prompt(
            IMPLEMENT_SCREEN_PROMPT
        ),
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                read_text(
                    system_requirements_file
                ),

            "{{TRACE_INDEX_JSON}}":
                read_text(
                    trace_index_file
                ),

            "{{SCREEN_REQUIREMENT_JSON}}":
                read_text(
                    screen_requirement_file
                ),

            "{{EXISTING_APPLICATION}}":
                existing_application,

            # 完全なscreen IDを明示的に渡す。
            "{{FULL_SCREEN_ID}}":
                screen_id,
        },
    )

    print()
    print("=" * 60)
    print(
        "Implementing screen into application: "
        f"{screen_id}"
    )
    print("=" * 60)

    if (
        existing_application
        == "(NO_EXISTING_APPLICATION)"
    ):
        print(
            "Existing application: "
            "none (initial screen)"
        )

    else:
        print(
            "Existing application: loaded"
        )

    print(
        "Expected test directory: "
        f"tests/{screen_id}/"
    )

    print(
        "Generating incremental "
        "implementation..."
    )

    # --------------------------------------------------------
    # Implementation generation
    # --------------------------------------------------------
    #
    # FILE formatだけでなく、
    #
    # tests/<FULL_SCREEN_ID>/
    #
    # も機械Validationする。
    #
    # 例えばAIが
    #
    # tests/SCR-001/page.test.tsx
    #
    # と省略した場合、
    # 保存せずGeneration retryになる。
    #
    # --------------------------------------------------------

    generated_files = (
        generate_implementation_files(
            vertex_client,
            prompt,
            max_attempts=3,
            expected_screen_test_id=screen_id,
        )
    )

    # 初回生成でも追加実装でも、
    # AIが返した変更ファイルだけを
    # 統合Applicationへ追加・上書きする。
    saved_files = (
        apply_repaired_files(
            generated_files,
            APPLICATION_DIR,
        )
    )

    print()
    print(
        f"Applied {len(saved_files)} file(s):"
    )

    for file_path in saved_files:
        print(
            f"  {file_path}"
        )

    print()
    print(
        f"Application output: "
        f"{APPLICATION_DIR}"
    )


def implement_all_screens(
    vertex_client,
) -> None:
    """
    生成済みの全画面要件JSONを
    1件ずつ処理し、
    1つの統合Applicationを順次育てる。

    Flow:

        SCR-001
        ↓
        implement
        ↓
        static check
        ↓
        SCR-001 tests
        ↓
        PASS

        SCR-002
        ↓
        existing SCR-001 Application
        + SCR-002
        ↓
        static check
        ↓
        SCR-001 + SCR-002 tests
        ↓
        PASS

        ...

        SCR-015

    各画面のPost Implementation Checkを
    PASSしない限り次画面へ進まない。
    """

    validate_required_files(
        [
            GENERATED_REQUIREMENTS_DIR
            / "system_requirements.json",

            GENERATED_REQUIREMENTS_DIR
            / "trace_index.json",

            IMPLEMENT_SCREEN_PROMPT,
        ]
    )

    screen_requirement_files = sorted(
        GENERATED_SCREEN_DIR.glob(
            "*.json"
        )
    )

    if not screen_requirement_files:
        raise FileNotFoundError(
            "Screen requirement JSON files "
            "not found: "
            f"{GENERATED_SCREEN_DIR}"
        )

    # --------------------------------------------------------
    # Clean application
    # --------------------------------------------------------
    #
    # implement-all / allでは
    # 毎回クリーンなApplicationから開始。
    #
    # 個別の
    #
    # --target implement --screen ...
    #
    # ではimplement_screen()だけ呼ばれるので、
    # 既存Applicationは維持される。
    #
    # --------------------------------------------------------

    if APPLICATION_DIR.exists():
        shutil.rmtree(
            APPLICATION_DIR
        )

    APPLICATION_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    print(
        f"Found "
        f"{len(screen_requirement_files)} "
        "screen requirement files."
    )

    print()
    print("=" * 60)
    print(
        "Starting incremental "
        "application implementation"
    )
    print("=" * 60)

    for index, screen_requirement_file in enumerate(
        screen_requirement_files,
        start=1,
    ):
        screen_id = (
            screen_requirement_file.stem
        )

        print()
        print(
            f"[{index}/"
            f"{len(screen_requirement_files)}] "
            "Implementing into application: "
            f"{screen_id}"
        )

        # ----------------------------------------------------
        # 1. Implement current screen
        # ----------------------------------------------------

        implement_screen(
            vertex_client,
            screen_id,
        )

        # ----------------------------------------------------
        # 2. Static + accumulated regression tests
        # ----------------------------------------------------

        run_post_implementation_check(
            vertex_client,
            screen_id,
        )

    print()
    print("=" * 60)
    print(
        "Integrated application "
        "implementation completed."
    )

    print(
        f"Application output: "
        f"{APPLICATION_DIR}"
    )

    print("=" * 60)


# ============================================================
# Repair result utilities
# ============================================================

def load_test_result(
    screen_id: str,
) -> Dict:
    """
    generated/test-results/<screen_id>.json
    を取得する。
    """

    result_file = (
        GENERATED_DIR
        / "test-results"
        / f"{screen_id}.json"
    )

    if not result_file.exists():
        raise FileNotFoundError(
            "Test result not found: "
            f"{result_file}"
        )

    try:
        return json.loads(
            result_file.read_text(
                encoding="utf-8"
            )
        )

    except json.JSONDecodeError as exc:
        raise ValueError(
            "Test result is not valid JSON: "
            f"{result_file}"
        ) from exc


def build_error_log(
    test_result: Dict,
    max_chars: int = 60000,
) -> str:
    """
    stdout / stderrをrepair prompt用の
    エラーログへまとめる。

    ログが極端に大きい場合は
    末尾を優先して制限する。

    VitestのFailed Testsやstack traceは
    末尾に出ることが多いため。
    """

    stdout = (
        test_result.get(
            "stdout",
            "",
        )
    )

    stderr = (
        test_result.get(
            "stderr",
            "",
        )
    )

    text = (
        "=== STDOUT ===\n"
        f"{stdout}\n\n"
        "=== STDERR ===\n"
        f"{stderr}"
    )

    if len(text) <= max_chars:
        return text

    return (
        "[ERROR LOG TRUNCATED: LAST "
        f"{max_chars} CHARACTERS]\n"
        + text[
            -max_chars:
        ]
    )


def apply_repaired_files(
    files: Dict[str, str],
    output_dir: Path,
) -> List[str]:
    """
    AI生成・repair結果を
    既存Applicationへ追加・上書きする。

    output_dir全体は削除しない。

    AIが返したファイルだけを
    追加・置換する。
    """

    if not files:
        raise ValueError(
            "No repaired files to apply."
        )

    validate_generated_files_content(
        files
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_root = (
        output_dir.resolve()
    )

    saved_files: List[str] = []

    for relative_path, content in files.items():
        relative = (
            validate_generated_file_path(
                relative_path
            )
        )

        file_path = (
            output_dir
            / relative
        )

        resolved_file = (
            file_path.resolve()
        )

        try:
            resolved_file.relative_to(
                output_root
            )

        except ValueError as exc:
            raise ValueError(
                "Repaired file path escapes "
                "output directory: "
                f"{relative_path}"
            ) from exc

        file_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        file_path.write_text(
            content,
            encoding="utf-8",
        )

        saved_files.append(
            str(
                file_path
            )
        )

    return saved_files

# ============================================================
# Repair
# ============================================================

def repair_screen(
    vertex_client,
    screen: str,
    max_attempts: int = 2,
) -> None:
    """
    1画面のテスト失敗をAIへ返し、
    既存生成物を最小修正する。

    Inputs:
        system_requirements.json
        trace_index.json
        screen requirement json
        current generated files
        test result json
        stdout / stderr

    Output:
        修正が必要なファイルのみ
        統合Applicationへ上書きする。
    """

    system_requirements_file = (
        GENERATED_REQUIREMENTS_DIR
        / "system_requirements.json"
    )

    trace_index_file = (
        GENERATED_REQUIREMENTS_DIR
        / "trace_index.json"
    )

    screen_requirement_file = (
        find_screen_requirement_file(
            screen
        )
    )

    validate_required_files(
        [
            system_requirements_file,
            trace_index_file,
            screen_requirement_file,
            REPAIR_SCREEN_PROMPT,
        ]
    )

    screen_id = (
        screen_requirement_file.stem
    )

    implementation_dir = (
        APPLICATION_DIR
    )

    generated_files_text = (
        serialize_existing_application(
            implementation_dir
        )
    )

    test_result = (
        load_test_result(
            screen_id
        )
    )

    if (
        test_result.get(
            "status"
        )
        == "PASSED"
    ):
        print(
            "Skip repair because screen "
            "already passed: "
            f"{screen_id}"
        )
        return

    test_result_json = (
        json.dumps(
            test_result,
            ensure_ascii=False,
            indent=2,
        )
    )

    error_log = (
        build_error_log(
            test_result
        )
    )

    prompt = inject_prompt(
        load_prompt(
            REPAIR_SCREEN_PROMPT
        ),
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                read_text(
                    system_requirements_file
                ),

            "{{TRACE_INDEX_JSON}}":
                read_text(
                    trace_index_file
                ),

            "{{SCREEN_REQUIREMENT_JSON}}":
                read_text(
                    screen_requirement_file
                ),

            "{{GENERATED_FILES}}":
                generated_files_text,

            "{{TEST_RESULT_JSON}}":
                test_result_json,

            "{{ERROR_LOG}}":
                error_log,
        },
    )

    print()
    print("=" * 60)
    print(
        f"Repairing screen: {screen_id}"
    )
    print("=" * 60)

    repaired_files = (
        generate_implementation_files(
            vertex_client,
            prompt,
            max_attempts=max_attempts,
        )
    )

    # --------------------------------------------------------
    # Specification gap
    # --------------------------------------------------------

    if (
        ".ai-repair-unresolved.txt"
        in repaired_files
    ):
        message = (
            repaired_files[
                ".ai-repair-unresolved.txt"
            ]
            .strip()
        )

        if (
            message
            == "SPECIFICATION_GAP"
        ):
            unresolved_file = (
                implementation_dir
                / ".ai-repair-unresolved.txt"
            )

            unresolved_file.write_text(
                message + "\n",
                encoding="utf-8",
            )

            print(
                "Repair stopped because "
                "specification gap was detected."
            )

            return

    # --------------------------------------------------------
    # Protected infrastructure guard
    # --------------------------------------------------------

    validate_repair_file_paths(
        repaired_files
    )

    saved_files = (
        apply_repaired_files(
            repaired_files,
            implementation_dir,
        )
    )

    print()
    print(
        f"Repaired {len(saved_files)} "
        "file(s):"
    )

    for file_path in saved_files:
        print(
            f"  {file_path}"
        )


def get_failed_screens() -> List[str]:
    """
    summary.jsonからrepair対象画面を取得する。

    対象:
        TEST_FAILED
        TEST_TIMEOUT

    INFRA_ERROR /
    infrastructure failureは対象外。
    """

    summary_file = (
        GENERATED_DIR
        / "test-results"
        / "summary.json"
    )

    if not summary_file.exists():
        raise FileNotFoundError(
            "Test summary not found: "
            f"{summary_file}"
        )

    try:
        summary = json.loads(
            summary_file.read_text(
                encoding="utf-8"
            )
        )

    except json.JSONDecodeError as exc:
        raise ValueError(
            "Test summary is not valid JSON: "
            f"{summary_file}"
        ) from exc

    screens = (
        summary.get(
            "screens",
            [],
        )
    )

    result: List[str] = []

    for item in screens:
        if not isinstance(
            item,
            dict,
        ):
            continue

        if (
            item.get(
                "status"
            )
            in {
                "TEST_FAILED",
                "TEST_TIMEOUT",
            }
        ):
            screen_id = (
                item.get(
                    "screen"
                )
            )

            if (
                isinstance(
                    screen_id,
                    str,
                )
                and screen_id
            ):
                result.append(
                    screen_id
                )

    return result


def repair_failed_screens(
    vertex_client,
    max_attempts: int = 2,
) -> None:
    """
    summary.jsonでrepair対象となった
    画面を順番に修正する。

    対象:
        TEST_FAILED
        TEST_TIMEOUT

    PASSEDは対象外。

    INFRA_ERROR /
    INFRASTRUCTURE_FAILEDも
    自動修正対象外。
    """

    failed_screens = (
        get_failed_screens()
    )

    if not failed_screens:
        print(
            "No repairable TEST_FAILED / "
            "TEST_TIMEOUT screens found."
        )
        return

    print()
    print("=" * 60)
    print(
        "Starting repair of failed screens"
    )
    print("=" * 60)

    print(
        f"Found {len(failed_screens)} "
        "repairable TEST_FAILED / "
        "TEST_TIMEOUT screen(s)."
    )

    for index, screen_id in enumerate(
        failed_screens,
        start=1,
    ):
        print()
        print(
            f"[{index}/"
            f"{len(failed_screens)}] "
            f"Repairing: {screen_id}"
        )

        repair_screen(
            vertex_client,
            screen_id,
            max_attempts=max_attempts,
        )

    print()
    print("=" * 60)
    print(
        "Failed screen repair completed."
    )
    print("=" * 60)


# ============================================================
# CLI
# ============================================================

def parse_args() -> argparse.Namespace:
    """
    コマンドライン引数を解析する。
    """

    parser = argparse.ArgumentParser(
        description=(
            "Transform requirements and "
            "generate screen implementations."
        )
    )

    parser.add_argument(
        "--target",
        choices=[
            "system",
            "trace",
            "screens",
            "validate",
            "all",
            "implement",
            "implement-all",
            "repair",
            "repair-all",
        ],
        default="all",
        help=(
            "Execution target. "
            "default: all"
        ),
    )

    parser.add_argument(
        "--screen",
        help=(
            "Screen to implement or repair. "
            "Example: "
            "SCR-001_contractor_login"
        ),
    )

    return parser.parse_args()


# ============================================================
# Main
# ============================================================

def main(
    vertex_client,
    args: argparse.Namespace,
) -> None:
    """
    実行処理。

    target:
        system
        trace
        screens
        validate
        all
        implement
        implement-all
        repair
        repair-all
    """

    # --------------------------------------------------------
    # system
    # --------------------------------------------------------

    if (
        args.target
        == "system"
    ):
        transform_system_requirement(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # trace
    # --------------------------------------------------------

    if (
        args.target
        == "trace"
    ):
        transform_trace_index(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # screens
    # --------------------------------------------------------

    if (
        args.target
        == "screens"
    ):
        transform_all_screens(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # validate
    # --------------------------------------------------------

    if (
        args.target
        == "validate"
    ):
        validate_generated_requirements()
        return

    # --------------------------------------------------------
    # implement
    # --------------------------------------------------------

    if (
        args.target
        == "implement"
    ):
        if not args.screen:
            raise ValueError(
                "--screen is required when "
                "--target implement is specified."
            )

        implement_screen(
            vertex_client,
            args.screen,
        )

        return

    # --------------------------------------------------------
    # implement-all
    # --------------------------------------------------------

    if (
        args.target
        == "implement-all"
    ):
        implement_all_screens(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # repair
    # --------------------------------------------------------

    if (
        args.target
        == "repair"
    ):
        if not args.screen:
            raise ValueError(
                "--screen is required when "
                "--target repair is specified."
            )

        repair_screen(
            vertex_client,
            args.screen,
            max_attempts=2,
        )

        return

    # --------------------------------------------------------
    # repair-all
    # --------------------------------------------------------

    if (
        args.target
        == "repair-all"
    ):
        repair_failed_screens(
            vertex_client,
            max_attempts=2,
        )

        return

    # --------------------------------------------------------
    # all
    # --------------------------------------------------------

    validate_required_files(
        [
            SYSTEM_REQUIREMENTS_MD,
            TRACE_INDEX_MD,
            SYSTEM_PROMPT,
            TRACE_PROMPT,
            SCREEN_PROMPT,
            IMPLEMENT_SCREEN_PROMPT,
            REPAIR_SCREEN_PROMPT,
        ]
    )

    print(
        "=== System Requirements ==="
    )

    transform_system_requirement(
        vertex_client
    )

    print(
        "=== Trace Index ==="
    )

    transform_trace_index(
        vertex_client
    )

    print(
        "=== Screen Requirements ==="
    )

    transform_all_screens(
        vertex_client
    )

    print(
        "=== Generated Requirements "
        "Validation ==="
    )

    validate_generated_requirements()

    print(
        "=== Screen Implementation ==="
    )

    implement_all_screens(
        vertex_client
    )

    print(
        "=== All processing completed ==="
    )


# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    # requirements.ai.vertex_client を
    # repository rootからimportできるようにする。
    project_root = (
        Path(__file__)
        .resolve()
        .parents[2]
    )

    if (
        str(project_root)
        not in sys.path
    ):
        sys.path.insert(
            0,
            str(project_root),
        )

    from requirements.ai.vertex_client import (
        VertexClient,
    )

    client = VertexClient()

    args = parse_args()

    main(
        client,
        args,
    )