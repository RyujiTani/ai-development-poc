from pathlib import Path
import argparse
import json
import re
import shutil
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

# 実装コードの出力先
IMPLEMENTED_SCREEN_DIR = (
    GENERATED_DIR / "implementation"
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
# Common utilities
# ============================================================

def read_text(path: Path) -> str:
    """UTF-8 text fileを読み込む。"""
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    """UTF-8 text fileへ書き込む。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


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
        result = result.replace(placeholder, value)

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

def extract_json(text: str) -> Any:
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
        flags=re.DOTALL | re.IGNORECASE,
    )

    if match:
        text = match.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Vertex AI response is not valid JSON."
        ) from exc



# ============================================================
# Generated implementation FILE parser
# ============================================================

FILE_START_MARKER = "<<<FILE_START>>>"
CONTENT_START_MARKER = "<<<CONTENT_START>>>"
CONTENT_END_MARKER = "<<<CONTENT_END>>>"
FILE_END_MARKER = "<<<FILE_END>>>"


def parse_generated_files(
    response_text: str,
) -> Dict[str, str]:
    """
    Vertex AIの実装レスポンスからFILEブロックを取得する。

    対応形式:

    <<<FILE_START>>>
    PATH: app/page.tsx
    <<<CONTENT_START>>>
    ... raw source code ...
    <<<CONTENT_END>>>
    <<<FILE_END>>>
    """

    if not response_text:
        raise ValueError(
            "Vertex AI response is empty."
        )

    text = response_text.strip()

    if not text.startswith(FILE_START_MARKER):
        raise ValueError(
            "Generated response must start with "
            f"{FILE_START_MARKER}."
        )

    if not text.endswith(FILE_END_MARKER):
        raise ValueError(
            "Generated response must end with "
            f"{FILE_END_MARKER}."
        )

    pattern = re.compile(
        r"^<<<FILE_START>>>\r?\n"
        r"PATH:[ \t]*(?P<path>[^\r\n]+)\r?\n"
        r"<<<CONTENT_START>>>\r?\n"
        r"(?P<content>.*?)"
        r"\r?\n<<<CONTENT_END>>>\r?\n"
        r"<<<FILE_END>>>"
        r"(?=\r?\n<<<FILE_START>>>|\Z)",
        flags=re.DOTALL | re.MULTILINE,
    )

    matches = list(
        pattern.finditer(text)
    )

    if not matches:
        raise ValueError(
            "No valid FILE blocks found in "
            "Vertex AI response."
        )

    cursor = 0

    for match in matches:
        between = text[
            cursor:match.start()
        ]

        if between.strip():
            raise ValueError(
                "Unexpected text exists outside "
                "FILE blocks."
            )

        cursor = match.end()

    if text[cursor:].strip():
        raise ValueError(
            "Unexpected trailing text exists "
            "outside FILE blocks."
        )

    result: Dict[str, str] = {}

    for index, match in enumerate(
        matches
    ):
        relative_path = (
            match.group("path")
            .strip()
        )

        content = match.group(
            "content"
        )

        if not relative_path:
            raise ValueError(
                f"FILE block {index + 1} has "
                "an empty PATH."
            )

        if not content.strip():
            raise ValueError(
                f"Generated file is empty: "
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
                    f"{marker}: {relative_path}"
                )

        result[
            relative_path
        ] = content

    return result


def generate_implementation_files(
    vertex_client,
    prompt: str,
    max_attempts: int = 3,
) -> Dict[str, str]:
    """
    Vertex AIへ実装生成を依頼する。

    FILE形式を解析できない場合は、
    不完全な生成物を保存せず再生成する。
    """

    if max_attempts < 1:
        raise ValueError(
            "max_attempts must be greater than "
            "or equal to 1."
        )

    last_error: Optional[Exception] = None

    for attempt in range(
        1,
        max_attempts + 1,
    ):
        print(
            f"Generation attempt "
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
                f"Vertex AI raw response "
                f"(attempt {attempt}/{max_attempts}):"
            )
            print(response)
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
        ) + "\n",
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
        load_prompt(SYSTEM_PROMPT),
        {
            "{{SYSTEM_REQUIREMENTS_MD}}": source_md,
        },
    )

    print(
        "Generating system_requirements.json..."
    )

    response = vertex_client.generate(prompt)

    data = extract_json(response)

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
        load_prompt(TRACE_PROMPT),
        {
            "{{TRACE_INDEX_MD}}": source_md,
        },
    )

    print(
        "Generating trace_index.json..."
    )

    response = vertex_client.generate(prompt)

    data = extract_json(response)

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
        load_prompt(SCREEN_PROMPT),
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                read_text(system_requirements_file),

            "{{TRACE_INDEX_JSON}}":
                read_text(trace_index_file),

            "{{SCREEN_DESIGN_MD}}":
                read_text(screen_file),

            "{{SCREEN_DESIGN_FILE}}":
                str(screen_file),
        },
    )

    screen_id = get_screen_id(
        screen_file
    )

    print(
        f"Generating screen requirement: {screen_id}"
    )

    response = vertex_client.generate(prompt)

    data = extract_json(response)

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
        SCREEN_DIR.glob("*.md")
    )

    if not screen_files:
        raise FileNotFoundError(
            f"Screen design files not found: {SCREEN_DIR}"
        )

    print(
        f"Found {len(screen_files)} screen files."
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
    print("Generated Requirements Validation")
    print("=" * 60)

    # --------------------------------------------------------
    # Structural validation
    # --------------------------------------------------------

    print()
    print("=== Structural Validation ===")
    print()

    from requirements.ai.validate_generated_requirements import (
        main as validate_structure,
    )

    structural_result = validate_structure()

    if structural_result != 0:
        raise RuntimeError(
            "Generated requirements structural validation failed."
        )

    # --------------------------------------------------------
    # Semantic validation
    # --------------------------------------------------------

    print()
    print("=== Semantic Validation ===")
    print()

    from requirements.ai.validate_generated_semantics import (
        main as validate_semantics,
    )

    semantic_result = validate_semantics()

    if semantic_result != 0:
        raise RuntimeError(
            "Generated requirements semantic validation failed."
        )

    print()
    print("=" * 60)
    print("All generated requirement validations passed.")
    print("=" * 60)


# ============================================================
# Implementation
# ============================================================

def find_screen_requirement_file(
    screen: str,
) -> Path:
    """
    指定された画面IDから画面要件JSONを取得する。

    例:
        SCR-001
        SCR-001_contractor_login

    のどちらでも検索できるようにする。
    """

    exact_file = (
        GENERATED_SCREEN_DIR
        / f"{screen}.json"
    )

    if exact_file.exists():
        return exact_file

    candidates = sorted(
        GENERATED_SCREEN_DIR.glob(
            f"{screen}_*.json"
        )
    )

    if len(candidates) == 1:
        return candidates[0]

    if len(candidates) > 1:
        raise RuntimeError(
            f"Multiple screen requirement files matched "
            f"'{screen}': "
            + ", ".join(
                str(path)
                for path in candidates
            )
        )

    raise FileNotFoundError(
        f"Screen requirement JSON not found: {screen}"
    )


def validate_generated_file_path(
    relative_path: str,
) -> Path:
    """
    AIが生成したファイルパスが
    出力ディレクトリ外へ脱出しないことを確認する。
    """

    normalized = (
        relative_path
        .replace("\\", "/")
        .strip()
    )

    if not normalized:
        raise ValueError(
            "Generated file path is empty."
        )

    path = Path(normalized)

    if path.is_absolute():
        raise ValueError(
            f"Generated file path must be relative: "
            f"{relative_path}"
        )

    if ".." in path.parts:
        raise ValueError(
            f"Generated file path must not contain '..': "
            f"{relative_path}"
        )

    # Windowsドライブ指定
    if re.match(
        r"^[A-Za-z]:",
        normalized,
    ):
        raise ValueError(
            f"Generated file path must not contain "
            f"a drive letter: {relative_path}"
        )

    return path


def validate_generated_content(
    relative_path: str,
    content: str,
) -> None:
    """
    生成ファイル内容の最低限のValidationを行う。
    """

    if not content.strip():
        raise ValueError(
            "Generated file content is empty: "
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
                "Generated source contains reserved "
                f"parser marker {marker}: "
                f"{relative_path}"
            )


def validate_generated_files_content(

    files: Dict[str, str],
) -> None:
    """
    保存前に全生成ファイルの内容をValidationする。
    """

    if not files:
        raise ValueError(
            "No generated files to validate."
        )

    for relative_path, content in files.items():
        validate_generated_file_path(
            relative_path
        )

        validate_generated_content(
            relative_path,
            content,
        )


def save_generated_files(
    files: Dict[str, str],
    output_dir: Path,
) -> List[str]:

    if not files:
        raise ValueError(
            "No generated files to save."
        )

    validate_generated_files_content(
        files
    )

    # 同じ画面を再生成した際に過去のファイルが残ると、
    # 重複実装や古いテストが混在するため、
    # 保存直前に画面単位の出力ディレクトリを作り直す。
    if output_dir.exists():
        shutil.rmtree(
            output_dir
        )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_root = output_dir.resolve()

    saved_files: List[str] = []

    for relative_path, content in files.items():

        relative = validate_generated_file_path(
            relative_path
        )

        file_path = (
            output_dir / relative
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
                "Generated file path escapes "
                f"output directory: {relative_path}"
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
            str(file_path)
        )

    return saved_files


def implement_screen(
    vertex_client,
    screen: str,
) -> None:
    """
    生成済みJSONから1画面を実装する。

    system_requirements.json
    +
    trace_index.json
    +
    SCR-xxx.json
    +
    implement_screen.md
    ↓
    Next.jsコード
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
        find_screen_requirement_file(screen)
    )

    validate_required_files(
        [
            system_requirements_file,
            trace_index_file,
            screen_requirement_file,
            IMPLEMENT_SCREEN_PROMPT,
        ]
    )

    prompt = inject_prompt(
        load_prompt(IMPLEMENT_SCREEN_PROMPT),
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                read_text(system_requirements_file),

            "{{TRACE_INDEX_JSON}}":
                read_text(trace_index_file),

            "{{SCREEN_REQUIREMENT_JSON}}":
                read_text(screen_requirement_file),
        },
    )

    screen_id = (
        screen_requirement_file.stem
    )

    print()
    print("=" * 60)
    print(
        f"Implementing screen: {screen_id}"
    )
    print("=" * 60)

    print(
        "Generating implementation..."
    )

    generated_files = generate_implementation_files(
        vertex_client,
        prompt,
        max_attempts=3,
    )

    output_dir = (
        IMPLEMENTED_SCREEN_DIR
        / screen_id
    )

    saved_files = save_generated_files(
        generated_files,
        output_dir,
    )

    print()
    print(
        f"Generated {len(saved_files)} file(s):"
    )

    for path in saved_files:
        print(
            f"  {path}"
        )

    print()
    print(
        f"Implementation output: {output_dir}"
    )


def implement_all_screens(
    vertex_client,
) -> None:
    """
    生成済みの全画面要件JSONから
    すべての画面を実装する。

    generated/screens/*.json
    ↓
    1画面ずつ実装
    ↓
    generated/implementation/<screen_id>/
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
        GENERATED_SCREEN_DIR.glob("*.json")
    )

    if not screen_requirement_files:
        raise FileNotFoundError(
            f"Screen requirement JSON files not found: "
            f"{GENERATED_SCREEN_DIR}"
        )

    print(
        f"Found {len(screen_requirement_files)} "
        f"screen requirement files."
    )

    print()
    print("=" * 60)
    print("Starting implementation of all screens")
    print("=" * 60)

    for index, screen_requirement_file in enumerate(
        screen_requirement_files,
        start=1,
    ):
        screen_id = screen_requirement_file.stem

        print()
        print(
            f"[{index}/{len(screen_requirement_files)}] "
            f"Implementing: {screen_id}"
        )

        implement_screen(
            vertex_client,
            screen_id,
        )

    print()
    print("=" * 60)
    print("All screen implementations completed.")
    print("=" * 60)


# ============================================================
# Repair
# ============================================================

from pathlib import Path
import json
from typing import Dict, List, Optional


def serialize_generated_files(
    screen_dir: Path,
) -> str:
    """
    現在生成済みの画面ファイルをrepair promptへ渡すため、
    読み取り専用の専用形式へ変換する。
    """

    if not screen_dir.exists():
        raise FileNotFoundError(
            f"Implementation directory not found: {screen_dir}"
        )

    blocks: List[str] = []

    files = sorted(
        path
        for path in screen_dir.rglob("*")
        if path.is_file()
        and path.name != ".ai-repair-unresolved.txt"
    )

    if not files:
        raise FileNotFoundError(
            f"No implementation files found: {screen_dir}"
        )

    for file_path in files:
        relative_path = (
            file_path
            .relative_to(screen_dir)
            .as_posix()
        )

        content = file_path.read_text(
            encoding="utf-8"
        )

        blocks.append(
            "\n".join(
                [
                    "<<<EXISTING_FILE_START>>>",
                    f"PATH: {relative_path}",
                    "<<<EXISTING_CONTENT_START>>>",
                    content,
                    "<<<EXISTING_CONTENT_END>>>",
                    "<<<EXISTING_FILE_END>>>",
                ]
            )
        )

    return "\n\n".join(blocks)


def load_test_result(
    screen_id: str,
) -> Dict:
    """
    generated/test-results/<screen_id>.json を取得する。
    """

    result_file = (
        GENERATED_DIR
        / "test-results"
        / f"{screen_id}.json"
    )

    if not result_file.exists():
        raise FileNotFoundError(
            f"Test result not found: {result_file}"
        )

    try:
        return json.loads(
            result_file.read_text(
                encoding="utf-8"
            )
        )
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Test result is not valid JSON: {result_file}"
        ) from exc


def build_error_log(
    test_result: Dict,
    max_chars: int = 60000,
) -> str:
    """
    stdout / stderrをrepair prompt用のエラーログへまとめる。

    ログが極端に大きい場合は末尾を優先して制限する。
    VitestのFailed Testsやstack traceは末尾に出ることが多いため。
    """

    stdout = test_result.get(
        "stdout",
        "",
    )

    stderr = test_result.get(
        "stderr",
        "",
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
        + text[-max_chars:]
    )


def apply_repaired_files(
    files: Dict[str, str],
    output_dir: Path,
) -> List[str]:
    """
    repair結果を既存実装へ上書きする。

    初回生成とは異なりoutput_dir全体は削除しない。
    AIが返した修正対象ファイルだけを置換する。
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

    output_root = output_dir.resolve()

    saved_files: List[str] = []

    for relative_path, content in files.items():
        relative = validate_generated_file_path(
            relative_path
        )

        file_path = (
            output_dir / relative
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
                f"output directory: {relative_path}"
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
            str(file_path)
        )

    return saved_files


def repair_screen(
    vertex_client,
    screen: str,
    max_attempts: int = 2,
) -> None:
    """
    1画面のテスト失敗をAIへ返し、既存生成物を最小修正する。

    Inputs:
        system_requirements.json
        trace_index.json
        screen requirement json
        current generated files
        test result json
        stdout / stderr

    Output:
        修正が必要なファイルのみ既存implementationへ上書き
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
        IMPLEMENTED_SCREEN_DIR
        / screen_id
    )

    generated_files_text = (
        serialize_generated_files(
            implementation_dir
        )
    )

    test_result = load_test_result(
        screen_id
    )

    if test_result.get("status") == "PASSED":
        print(
            f"Skip repair because screen already passed: "
            f"{screen_id}"
        )
        return

    test_result_json = json.dumps(
        test_result,
        ensure_ascii=False,
        indent=2,
    )

    error_log = build_error_log(
        test_result
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

    # specification gapの場合
    if (
        ".ai-repair-unresolved.txt"
        in repaired_files
    ):
        message = repaired_files[
            ".ai-repair-unresolved.txt"
        ].strip()

        if message == "SPECIFICATION_GAP":
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

    saved_files = apply_repaired_files(
        repaired_files,
        implementation_dir,
    )

    print()
    print(
        f"Repaired {len(saved_files)} file(s):"
    )

    for file_path in saved_files:
        print(
            f"  {file_path}"
        )


def get_failed_screens() -> List[str]:
    """
    summary.jsonからTEST_FAILED画面だけ取得する。
    """

    summary_file = (
        GENERATED_DIR
        / "test-results"
        / "summary.json"
    )

    if not summary_file.exists():
        raise FileNotFoundError(
            f"Test summary not found: {summary_file}"
        )

    try:
        summary = json.loads(
            summary_file.read_text(
                encoding="utf-8"
            )
        )
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Test summary is not valid JSON: "
            f"{summary_file}"
        ) from exc

    screens = summary.get(
        "screens",
        []
    )

    result: List[str] = []

    for item in screens:
        if not isinstance(
            item,
            dict,
        ):
            continue

        if (
            item.get("status")
            == "TEST_FAILED"
        ):
            screen_id = item.get(
                "screen"
            )

            if isinstance(
                screen_id,
                str,
            ) and screen_id:
                result.append(
                    screen_id
                )

    return result


def repair_failed_screens(
    vertex_client,
    max_attempts: int = 2,
) -> None:
    """
    summary.jsonでTEST_FAILEDとなった画面を順番に修正する。

    PASSEDは対象外。
    INFRASTRUCTURE_FAILEDも自動修正対象外。
    """

    failed_screens = (
        get_failed_screens()
    )

    if not failed_screens:
        print(
            "No TEST_FAILED screens found."
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
        "TEST_FAILED screen(s)."
    )

    for index, screen_id in enumerate(
        failed_screens,
        start=1,
    ):
        print()
        print(
            f"[{index}/{len(failed_screens)}] "
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
    """コマンドライン引数を解析する。"""

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
        help="Execution target. default: all",
    )

    parser.add_argument(
        "--screen",
        help=(
            "Screen to implement. "
            "Example: SCR-001_contractor_login"
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

    if args.target == "system":
        transform_system_requirement(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # trace
    # --------------------------------------------------------

    if args.target == "trace":
        transform_trace_index(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # screens
    # --------------------------------------------------------

    if args.target == "screens":
        transform_all_screens(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # validate
    # --------------------------------------------------------

    if args.target == "validate":
        validate_generated_requirements()
        return

    # --------------------------------------------------------
    # implement
    # --------------------------------------------------------

    if args.target == "implement":
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

    if args.target == "implement-all":
        implement_all_screens(
            vertex_client
        )
        return

    # --------------------------------------------------------
    # repair
    # --------------------------------------------------------

    if args.target == "repair":
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

    if args.target == "repair-all":
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
        "=== Generated Requirements Validation ==="
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
    import sys

    project_root = (
        Path(__file__).resolve().parents[2]
    )

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
