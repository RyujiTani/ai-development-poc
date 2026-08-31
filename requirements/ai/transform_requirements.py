from pathlib import Path
import argparse
import json
import re
from typing import Any, Dict, List, Tuple


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


def normalize_generated_files(
    files: Any,
) -> Dict[str, str]:
    """
    files配列を {path: content} に変換する。
    """

    if not isinstance(files, list):
        raise ValueError(
            "Generated files must be a list."
        )

    result: Dict[str, str] = {}

    for item in files:
        if not isinstance(item, dict):
            continue

        path = item.get("path")
        content = item.get("content", "")

        if not isinstance(path, str):
            continue

        if content is None:
            content = ""

        result[path.strip()] = str(content)

    if not result:
        raise ValueError(
            "Generated files list does not contain valid files."
        )

    return result


# ============================================================
# Generated files parser
# ============================================================

def parse_generated_files(
    response_text: str,
) -> Dict[str, str]:
    """
    Vertex AIのレスポンスから生成ファイルを取得する。

    対応形式:

    1. files配列形式

    {
      "files": [
        {
          "path": "app/page.tsx",
          "content": "..."
        }
      ]
    }

    2. ファイルパスをキーにした辞書形式

    {
      "app/page.tsx": "...",
      "components/Button.tsx": "..."
    }

    Vertex AIがJSONとして返した場合は、
    まずJSONとして解析する。

    JSONとして解析できない場合のみ、
    壊れたJSONからの復旧を試みる。
    """

    if not response_text:
        raise ValueError(
            "Vertex AI response is empty."
        )

    text = response_text.strip()

    # --------------------------------------------------------
    # 1. 正常なJSON
    # --------------------------------------------------------

    try:
        parsed = extract_json(text)

        # ----------------------------------------------------
        # 1-1. files配列形式
        # ----------------------------------------------------

        if isinstance(parsed, dict):
            files = parsed.get("files")

            if isinstance(files, list):
                return normalize_generated_files(files)

            # ------------------------------------------------
            # 1-2. ファイルパスをキーにした辞書形式
            # ------------------------------------------------

            if parsed:
                result: Dict[str, str] = {}

                for path, content in parsed.items():

                    if not isinstance(path, str):
                        continue

                    if content is None:
                        content = ""

                    if not isinstance(content, str):
                        content = str(content)

                    result[path.strip()] = content

                if result:
                    return result

        # ----------------------------------------------------
        # 1-3. files配列そのもの
        # ----------------------------------------------------

        if isinstance(parsed, list):
            return normalize_generated_files(parsed)

    except ValueError:
        pass

    # --------------------------------------------------------
    # 2. 壊れたJSONから files を復旧
    # --------------------------------------------------------

    recovered = recover_generated_files(text)

    if recovered:
        return recovered

    raise ValueError(
        "No generated files found in Vertex AI response."
    )

def recover_generated_files(
    text: str,
) -> Dict[str, str]:
    """
    Vertex AIがJSONとしては不正なレスポンスを返した場合に、
    path/content単位で生成ファイルを復旧する。

    JSON全体を修復するのではなく、
    各ファイルのcontentだけを個別に復元する。
    """

    result: Dict[str, str] = {}

    pattern = re.compile(
        r'"path"\s*:\s*"(?P<path>[^"]+)"'
        r'\s*,\s*'
        r'"content"\s*:\s*"',
        flags=re.DOTALL,
    )

    matches = list(pattern.finditer(text))

    if not matches:
        return result

    for index, match in enumerate(matches):
        path = match.group("path").strip()

        content_start = match.end()

        if index + 1 < len(matches):
            next_match = matches[index + 1]

            raw_content = text[
                content_start:next_match.start()
            ]

            raw_content = remove_file_object_tail(
                raw_content
            )
        else:
            raw_content = text[content_start:]
            raw_content = remove_final_json_tail(
                raw_content
            )

        content = decode_generated_content(
            raw_content
        )

        result[path] = content

    return result


def remove_file_object_tail(
    content: str,
) -> str:
    """
    次のpathの直前にあるJSONオブジェクト終了部分を削除する。
    """

    content = content.rstrip()

    if content.endswith("}"):
        content = content[:-1].rstrip()

    if content.endswith(","):
        content = content[:-1].rstrip()

    if content.endswith('"'):
        content = content[:-1]

    return content


def remove_final_json_tail(
    content: str,
) -> str:
    """
    最後のcontentからJSON全体の終了部分を削除する。
    """

    content = content.rstrip()

    # 典型的な:
    #
    # "
    #     }
    #   ]
    # }
    #
    # を除去する。

    match = re.search(
        r'"?\s*}\s*]\s*}\s*$',
        content,
        flags=re.DOTALL,
    )

    if match:
        content = content[:match.start()]

    return content


def decode_generated_content(
    raw_content: str,
) -> str:
    """
    JSON contentとして返されたコードを復元する。

    正常なJSONエスケープは維持し、
    Vertex AIがコード中の未エスケープの
    ダブルクォートを返した場合だけ補正する。
    """

    raw_content = raw_content.rstrip()

    if raw_content.endswith('"'):
        raw_content = raw_content[:-1]

    result: List[str] = []

    escaped = False

    for char in raw_content:
        if escaped:
            result.append("\\")
            result.append(char)
            escaped = False
            continue

        if char == "\\":
            escaped = True
            continue

        if char == '"':
            result.append('\\"')
        elif char == "\n":
            result.append("\\n")
        elif char == "\r":
            result.append("\\r")
        elif char == "\t":
            result.append("\\t")
        else:
            result.append(char)

    if escaped:
        result.append("\\")

    encoded = "".join(result)

    try:
        return json.loads(
            '"' + encoded + '"'
        )
    except json.JSONDecodeError:
        # 最終的にはコードとしてそのまま扱う
        return (
            raw_content
            .replace('\\"', '"')
        )


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


def save_generated_files(
    files: Dict[str, str],
    output_dir: Path,
) -> List[str]:

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    if not files:
        raise ValueError(
            "No generated files to save."
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

    response = vertex_client.generate(
        prompt
    )

    print()
    print("-" * 60)
    print("Vertex AI raw response:")
    print(response)
    print("-" * 60)
    print()

    generated_files = parse_generated_files(
        response
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
