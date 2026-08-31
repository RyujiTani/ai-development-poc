from pathlib import Path
import argparse
import json
import re
from typing import Any, Dict, List, Tuple, Optional, Union


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
    AIレスポンスからJSONを抽出する。

    主に要件変換用。
    """
    if not text:
        raise ValueError(
            "Vertex AI response is empty."
        )

    text = text.strip()

    # ```json ... ```
    text = re.sub(
        r"^\s*```json\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\s*```\s*$",
        "",
        text,
    )

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Vertex AI response is not valid JSON."
        ) from exc


def _normalize_generated_files(
    files: Any,
) -> Dict[str, str]:
    """
    generated files を {path: content} に統一する。
    """

    if not isinstance(files, list):
        raise ValueError(
            "Generated files must be a list."
        )

    result: Dict[str, str] = {}

    for index, item in enumerate(files, start=1):

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
# Robust JSON repair
# ============================================================

def repair_malformed_json(text: str) -> str:
    """
    Vertex AIが返す「ほぼJSON」について、
    JSON文字列内の未エスケープ引用符を可能な範囲で修復する。

    典型例:

        "content": "const x = <div className="foo">"

    本来:

        "content": "const x = <div className=\"foo\">"

    のようになっているケースを修復する。
    """

    chars = list(text)

    result: List[str] = []

    in_string = False
    escaped = False

    length = len(chars)
    i = 0

    while i < length:
        ch = chars[i]

        if not in_string:
            result.append(ch)

            if ch == '"':
                in_string = True

            i += 1
            continue

        # ----------------------------------------------------
        # string mode
        # ----------------------------------------------------

        if escaped:
            result.append(ch)
            escaped = False
            i += 1
            continue

        if ch == "\\":
            result.append(ch)
            escaped = True
            i += 1
            continue

        if ch == '"':
            # 次の非空白文字を見る
            j = i + 1

            while j < length and chars[j] in " \t\r\n":
                j += 1

            next_char = (
                chars[j]
                if j < length
                else ""
            )

            # JSON文字列の終了と判断できるパターン
            #
            # "...",
            # "..."}
            # "..."]
            # "...":
            #
            if next_char in [",", "}", "]", ":"]:
                result.append('"')
                in_string = False
            else:
                # HTML/JSX等に含まれる未エスケープの "
                result.append('\\"')

            i += 1
            continue

        # JSONでは生の改行は許されない
        if ch == "\n":
            result.append("\\n")
        elif ch == "\r":
            result.append("\\r")
        else:
            result.append(ch)

        i += 1

    return "".join(result)


def _try_parse_generated_json(
    text: str,
) -> Optional[Dict[str, str]]:
    """
    通常JSON → 修復JSONの順で試す。
    """

    # --------------------------------------------------------
    # 1. 通常のJSON
    # --------------------------------------------------------

    try:
        parsed = json.loads(text)

        if isinstance(parsed, dict):
            files = parsed.get("files")

            if isinstance(files, list):
                return _normalize_generated_files(files)

        if isinstance(parsed, list):
            return _normalize_generated_files(parsed)

    except json.JSONDecodeError:
        pass

    # --------------------------------------------------------
    # 2. malformed JSON repair
    # --------------------------------------------------------

    repaired = repair_malformed_json(text)

    if repaired == text:
        return None

    try:
        parsed = json.loads(repaired)

        if isinstance(parsed, dict):
            files = parsed.get("files")

            if isinstance(files, list):
                return _normalize_generated_files(files)

        if isinstance(parsed, list):
            return _normalize_generated_files(parsed)

    except json.JSONDecodeError as exc:
        print(
            "DEBUG: repaired JSON still invalid: "
            f"{exc}"
        )

    return None


# ============================================================
# FILE format parser
# ============================================================

def parse_file_format(
    text: str,
) -> Dict[str, str]:
    """
    以下の形式を解析する。

    FILE: app/page.tsx
    ```typescript
    ...
    ```
    """

    pattern = re.compile(
        r"""
        ^FILE:\s*(?P<path>[^\r\n]+)
        \s*
        ```[a-zA-Z0-9_+#.-]*
        \s*
        (?P<content>.*?)
        ```
        """,
        flags=re.DOTALL | re.MULTILINE | re.VERBOSE,
    )

    matches = list(
        pattern.finditer(text)
    )

    print(
        f"DEBUG: FILE format matches = {len(matches)}"
    )

    result: Dict[str, str] = {}

    for match in matches:

        path = match.group("path").strip()
        content = match.group("content")

        if path:
            result[path] = content

    return result


# ============================================================
# Fallback parser for malformed JSON
# ============================================================

def parse_malformed_file_objects(
    text: str,
) -> Dict[str, str]:
    """
    JSONが壊れていてjson.loads()できない場合の
    最終フォールバック。

    以下のような構造を探す。

    {
      "path": "xxx",
      "content": "..."
    }

    content内にJSXの " が入っていても、
    次のファイルの {"path": ...} を境界として
    可能な限り抽出する。
    """

    result: Dict[str, str] = {}

    path_pattern = re.compile(
        r'"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"',
        flags=re.DOTALL,
    )

    matches = list(
        path_pattern.finditer(text)
    )

    print(
        "DEBUG: malformed object candidates = "
        f"{len(matches)}"
    )

    if not matches:
        return result

    for index, match in enumerate(matches):

        path = match.group(1)

        content_start = match.end()

        # 次の {"path": ... を探す
        next_match = None

        if index + 1 < len(matches):
            next_match = matches[index + 1]

        if next_match:
            content_end = next_match.start()

            raw_content = text[
                content_start:content_end
            ]

            # 次のJSONオブジェクト直前の
            # content終了部分を除去
            raw_content = re.sub(
                r'"\s*\},?\s*$',
                "",
                raw_content,
                flags=re.DOTALL,
            )

        else:
            # 最後のcontent
            raw_content = text[
                content_start:
            ]

            # 最終JSON終了部分を削る
            raw_content = re.sub(
                r'"\s*\}\s*\]\s*\}\s*$',
                "",
                raw_content,
                flags=re.DOTALL,
            )

            raw_content = re.sub(
                r'"\s*\}\s*\]\s*$',
                "",
                raw_content,
                flags=re.DOTALL,
            )

        # JSONのエスケープを戻す
        try:
            content = json.loads(
                '"' + raw_content + '"'
            )
        except json.JSONDecodeError:
            # JSON decodeできなければ
            # 最低限のエスケープ復元
            content = (
                raw_content
                .replace('\\"', '"')
                .replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\t", "\t")
                .replace("\\\\", "\\")
            )

        result[path] = content

    return result


# ============================================================
# Generated files parser
# ============================================================

def parse_generated_files(
    response_text: str,
) -> Dict[str, str]:
    """
    Vertex AI のレスポンスから生成ファイルを抽出する。

    対応形式:

    1. JSON object

       {
         "files": [
           {
             "path": "app/page.tsx",
             "content": "..."
           }
         ]
       }

    2. JSON array

       [
         {
           "path": "app/page.tsx",
           "content": "..."
         }
       ]

    3. Markdown code fence 内の JSON

    4. FILE: 形式

    5. 壊れたJSONからのフォールバック抽出
    """

    if not response_text:
        raise ValueError(
            "Vertex AI response is empty."
        )

    text = response_text.strip()

    print(
        "DEBUG: parse_generated_files() called"
    )

    print(
        f"DEBUG: response length = {len(text)}"
    )

    print(
        "DEBUG: response first 200 chars = "
        f"{text[:200]!r}"
    )

    # --------------------------------------------------------
    # 1. レスポンス全体をJSONとして解析
    # --------------------------------------------------------

    parsed_files = _try_parse_generated_json(
        text
    )

    if parsed_files:
        print(
            f"DEBUG: parsed {len(parsed_files)} "
            "files from JSON"
        )

        return parsed_files

    print(
        "DEBUG: full response could not be parsed "
        "as normal JSON."
    )

    # --------------------------------------------------------
    # 2. Markdown JSON code block
    # --------------------------------------------------------

    json_blocks = re.findall(
        r"```(?:json)?\s*(.*?)```",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )

    print(
        "DEBUG: markdown code blocks found = "
        f"{len(json_blocks)}"
    )

    for block in json_blocks:

        block = block.strip()

        parsed_files = _try_parse_generated_json(
            block
        )

        if parsed_files:
            print(
                "DEBUG: parsed "
                f"{len(parsed_files)} files "
                "from markdown JSON"
            )

            return parsed_files

    # --------------------------------------------------------
    # 3. JSON object部分だけを抽出
    # --------------------------------------------------------

    object_start = text.find("{")
    object_end = text.rfind("}")

    if (
        object_start >= 0
        and object_end > object_start
    ):
        candidate = text[
            object_start:object_end + 1
        ]

        parsed_files = _try_parse_generated_json(
            candidate
        )

        if parsed_files:
            print(
                "DEBUG: parsed "
                f"{len(parsed_files)} files "
                "from extracted JSON object"
            )

            return parsed_files

    # --------------------------------------------------------
    # 4. JSON array部分だけを抽出
    # --------------------------------------------------------

    array_start = text.find("[")
    array_end = text.rfind("]")

    if (
        array_start >= 0
        and array_end > array_start
    ):
        candidate = text[
            array_start:array_end + 1
        ]

        parsed_files = _try_parse_generated_json(
            candidate
        )

        if parsed_files:
            print(
                "DEBUG: parsed "
                f"{len(parsed_files)} files "
                "from extracted JSON array"
            )

            return parsed_files

    # --------------------------------------------------------
    # 5. FILE: 形式
    # --------------------------------------------------------

    file_result = parse_file_format(
        text
    )

    if file_result:
        print(
            "DEBUG: parsed "
            f"{len(file_result)} files "
            "from FILE format"
        )

        return file_result

    # --------------------------------------------------------
    # 6. 壊れたJSONからファイルを救出
    # --------------------------------------------------------

    fallback_result = (
        parse_malformed_file_objects(
            text
        )
    )

    if fallback_result:
        print(
            "DEBUG: parsed "
            f"{len(fallback_result)} files "
            "using malformed JSON fallback"
        )

        return fallback_result

    # --------------------------------------------------------
    # 7. 最終エラー
    # --------------------------------------------------------

    preview = text[:3000]

    raise ValueError(
        "No generated files found in "
        "Vertex AI response.\n\n"
        "Supported formats:\n"
        "\n"
        "1. JSON object:\n"
        "{\n"
        '  "files": [\n'
        "    {\n"
        '      "path": "app/page.tsx",\n'
        '      "content": "..."\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "\n"
        "2. JSON array:\n"
        "[\n"
        "  {\n"
        '    "path": "app/page.tsx",\n'
        '    "content": "..."\n'
        "  }\n"
        "]\n"
        "\n"
        "3. FILE format:\n"
        "FILE: relative/path/to/file.ts\n"
        "```typescript\n"
        "...\n"
        "```\n"
        "\n"
        "Response preview:\n"
        "----------------------------------------\n"
        f"{preview}\n"
        "----------------------------------------"
    )


# ============================================================
# Screen requirement transformation
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

    prompt_template = load_prompt(
        SYSTEM_PROMPT
    )

    prompt = inject_prompt(
        prompt_template,
        {
            "{{SYSTEM_REQUIREMENTS_MD}}":
                source_md,
        },
    )

    print(
        "Generating system_requirements.json..."
    )

    response = vertex_client.generate(
        prompt
    )

    data = extract_json(
        response
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

    prompt_template = load_prompt(
        TRACE_PROMPT
    )

    prompt = inject_prompt(
        prompt_template,
        {
            "{{TRACE_INDEX_MD}}":
                source_md,
        },
    )

    print(
        "Generating trace_index.json..."
    )

    response = vertex_client.generate(
        prompt
    )

    data = extract_json(
        response
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

    system_requirements = read_text(
        system_requirements_file
    )

    trace_index = read_text(
        trace_index_file
    )

    screen_design = read_text(
        screen_file
    )

    prompt_template = load_prompt(
        SCREEN_PROMPT
    )

    prompt = inject_prompt(
        prompt_template,
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                system_requirements,

            "{{TRACE_INDEX_JSON}}":
                trace_index,

            "{{SCREEN_DESIGN_MD}}":
                screen_design,

            "{{SCREEN_DESIGN_FILE}}":
                str(screen_file),
        },
    )

    screen_id = get_screen_id(
        screen_file
    )

    print(
        "Generating screen requirement: "
        f"{screen_id}"
    )

    response = vertex_client.generate(
        prompt
    )

    data = extract_json(
        response
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
        SCREEN_DIR.glob("*.md")
    )

    if not screen_files:
        raise FileNotFoundError(
            "Screen design files not found: "
            f"{SCREEN_DIR}"
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
            "Multiple screen requirement files "
            f"matched '{screen}': "
            + ", ".join(
                str(path)
                for path in candidates
            )
        )

    raise FileNotFoundError(
        "Screen requirement JSON not found: "
        f"{screen}"
    )


def _convert_generated_files(
    generated_files: Union[Dict[str, str], List],
) -> List[Tuple[str, str]]:
    """
    JSONのfiles配列またはdictを
    [(path, content), ...]
    に変換する。
    """

    if isinstance(
        generated_files,
        dict,
    ):
        if not generated_files:
            raise ValueError(
                "Vertex AI returned an empty files list."
            )

        return [
            (
                str(path),
                str(content),
            )
            for path, content
            in generated_files.items()
        ]

    if not isinstance(
        generated_files,
        list,
    ):
        raise ValueError(
            "Generated files must be "
            "a dict or list."
        )

    if not generated_files:
        raise ValueError(
            "Vertex AI returned an empty files list."
        )

    files: List[Tuple[str, str]] = []

    for index, file_data in enumerate(
        generated_files,
        start=1,
    ):

        if isinstance(
            file_data,
            dict,
        ):
            relative_path = (
                file_data.get("path")
            )

            content = (
                file_data.get("content")
            )

        elif (
            isinstance(
                file_data,
                (tuple, list),
            )
            and len(file_data) == 2
        ):
            relative_path, content = (
                file_data
            )

        else:
            raise ValueError(
                "Invalid file entry at index "
                f"{index}: {file_data!r}"
            )

        if not isinstance(
            relative_path,
            str,
        ):
            raise ValueError(
                "Generated file path is invalid "
                f"at index {index}."
            )

        if content is None:
            content = ""

        if not isinstance(
            content,
            str,
        ):
            content = str(content)

        relative_path = (
            relative_path.strip()
        )

        if not relative_path:
            raise ValueError(
                "Generated file path is empty "
                f"at index {index}."
            )

        files.append(
            (
                relative_path,
                content,
            )
        )

    return files


def validate_generated_file_path(
    relative_path: str,
) -> Path:
    """
    AIが生成したファイルパスが
    出力ディレクトリ外へ脱出しないことを確認する。
    """

    if not isinstance(
        relative_path,
        str,
    ):
        raise ValueError(
            "Generated file path must be a string."
        )

    # AIがWindowsパスを返した場合も正規化
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
            "Generated file path must be relative: "
            f"{relative_path}"
        )

    if ".." in path.parts:
        raise ValueError(
            "Generated file path must not contain "
            f"'..': {relative_path}"
        )

    # Windowsドライブ指定
    if re.match(
        r"^[A-Za-z]:",
        normalized,
    ):
        raise ValueError(
            "Generated file path must not contain "
            f"a drive letter: {relative_path}"
        )

    return path


def save_generated_files(
    files,
    output_dir: Path,
) -> List[str]:
    """
    生成ファイルをoutput_dirへ保存する。

    対応形式:

    1. dict

       {
           "app/page.tsx": "..."
       }

    2. list[dict]

       [
           {
               "path": "app/page.tsx",
               "content": "..."
           }
       ]

    3. list[tuple]

       [
           ("app/page.tsx", "...")
       ]
    """

    output_dir = Path(
        output_dir
    )

    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # dict -> list
    # --------------------------------------------------------

    if isinstance(
        files,
        dict,
    ):
        iterable = [
            (
                path,
                content,
            )
            for path, content
            in files.items()
        ]

    else:
        iterable = files

    if not iterable:
        raise ValueError(
            "No generated files to save."
        )

    saved_files: List[str] = []

    for file_item in iterable:

        # ----------------------------------------------------
        # JSON dict format
        # ----------------------------------------------------

        if isinstance(
            file_item,
            dict,
        ):
            relative_path = (
                file_item.get("path")
            )

            content = (
                file_item.get("content")
            )

        # ----------------------------------------------------
        # Tuple/list format
        # ----------------------------------------------------

        elif (
            isinstance(
                file_item,
                (tuple, list),
            )
            and len(file_item) == 2
        ):
            relative_path, content = (
                file_item
            )

        else:
            raise ValueError(
                "Invalid generated file format: "
                f"{file_item!r}"
            )

        if not relative_path:
            raise ValueError(
                "Generated file is missing path: "
                f"{file_item!r}"
            )

        if content is None:
            raise ValueError(
                "Generated file is missing content: "
                f"{relative_path}"
            )

        # ----------------------------------------------------
        # Path validation
        # ----------------------------------------------------

        relative = (
            validate_generated_file_path(
                str(relative_path)
            )
        )

        file_path = (
            output_dir / relative
        )

        # 念のためresolveして出力ディレクトリ外を防止
        output_root = (
            output_dir.resolve()
        )

        resolved_file = (
            file_path.resolve()
        )

        try:
            resolved_file.relative_to(
                output_root
            )
        except ValueError:
            raise ValueError(
                "Generated file path escapes "
                "output directory: "
                f"{relative_path}"
            )

        # ----------------------------------------------------
        # Save
        # ----------------------------------------------------

        file_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        file_path.write_text(
            str(content),
            encoding="utf-8",
        )

        saved_files.append(
            str(file_path)
        )

        print(
            f"Generated: {file_path}"
        )

    return saved_files


# ============================================================
# Implement screen
# ============================================================

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

    system_requirements = read_text(
        system_requirements_file
    )

    trace_index = read_text(
        trace_index_file
    )

    screen_requirement = read_text(
        screen_requirement_file
    )

    prompt_template = load_prompt(
        IMPLEMENT_SCREEN_PROMPT
    )

    prompt = inject_prompt(
        prompt_template,
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}":
                system_requirements,

            "{{TRACE_INDEX_JSON}}":
                trace_index,

            "{{SCREEN_REQUIREMENT_JSON}}":
                screen_requirement,
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
        "System requirements: "
        f"{system_requirements_file}"
    )

    print(
        "Trace index: "
        f"{trace_index_file}"
    )

    print(
        "Screen requirement: "
        f"{screen_requirement_file}"
    )

    print(
        "Generating implementation..."
    )

    # --------------------------------------------------------
    # Vertex AI
    # --------------------------------------------------------

    response = vertex_client.generate(
        prompt
    )

    # --------------------------------------------------------
    # Debug response保存
    # --------------------------------------------------------

    debug_response_file = (
        GENERATED_SCREEN_DIR
        / f"{screen_id}_implementation_response.txt"
    )

    write_text(
        debug_response_file,
        response,
    )

    print(
        "DEBUG: Vertex response saved: "
        f"{debug_response_file}"
    )

    # --------------------------------------------------------
    # Parse
    # --------------------------------------------------------

    generated_files = (
        parse_generated_files(
            response
        )
    )

    print(
        "DEBUG: generated files parsed = "
        f"{len(generated_files)}"
    )

    # --------------------------------------------------------
    # Output directory
    # --------------------------------------------------------

    output_dir = (
        IMPLEMENTED_SCREEN_DIR
        / screen_id
    )

    print(
        "DEBUG: implementation output dir = "
        f"{output_dir}"
    )

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # 正しい引数順:
    #
    # save_generated_files(
    #     generated_files,
    #     output_dir,
    # )
    #
    # --------------------------------------------------------

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
        "Implementation output: "
        f"{output_dir}"
    )


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
            "all",
            "implement",
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
        all
        implement
    """

    # --------------------------------------------------------
    # system
    # --------------------------------------------------------

    if args.target == "system":

        print(
            "=== System Requirements ==="
        )

        transform_system_requirement(
            vertex_client
        )

        return

    # --------------------------------------------------------
    # trace
    # --------------------------------------------------------

    if args.target == "trace":

        print(
            "=== Trace Index ==="
        )

        transform_trace_index(
            vertex_client
        )

        return

    # --------------------------------------------------------
    # screens
    # --------------------------------------------------------

    if args.target == "screens":

        print(
            "=== Screen Requirements ==="
        )

        transform_all_screens(
            vertex_client
        )

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
    # all
    # --------------------------------------------------------

    required_files = [
        SYSTEM_REQUIREMENTS_MD,
        TRACE_INDEX_MD,
        SYSTEM_PROMPT,
        TRACE_PROMPT,
        SCREEN_PROMPT,
    ]

    validate_required_files(
        required_files
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
        "=== Transformation completed ==="
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
