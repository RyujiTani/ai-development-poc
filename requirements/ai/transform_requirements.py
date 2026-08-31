from pathlib import Path
import argparse
import json
import re


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

SYSTEM_PROMPT = PROMPTS_DIR / "transform_system_requirement.md"
TRACE_PROMPT = PROMPTS_DIR / "transform_trace_index.md"
SCREEN_PROMPT = PROMPTS_DIR / "transform_screen_requirement.md"


def read_text(path: Path) -> str:
    """UTF-8 text fileを読み込む。"""
    return path.read_text(encoding="utf-8")


def load_prompt(path: Path) -> str:
    """変換プロンプトを読み込む。"""
    return read_text(path)


def inject_prompt(
    prompt: str,
    replacements: dict[str, str],
) -> str:
    """
    プロンプト内のプレースホルダを置換する。

    例:
        {{SYSTEM_REQUIREMENTS_MD}}
        {{TRACE_INDEX_MD}}
        {{SYSTEM_REQUIREMENTS_JSON}}
        {{TRACE_INDEX_JSON}}
        {{SCREEN_DESIGN_MD}}
        {{SCREEN_DESIGN_FILE}}
    """
    result = prompt

    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    return result


def extract_json(text: str) -> dict:
    """
    AIレスポンスからJSONを抽出する。

    プロンプトではJSONのみを要求するが、
    念のためコードフェンス等が含まれていても処理できるようにする。
    """
    text = text.strip()

    # ```json ... ``` を除去
    text = re.sub(
        r"^```json\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"\s*```$",
        "",
        text,
    )

    text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            "Vertex AI response is not valid JSON."
        ) from exc

    if not isinstance(data, dict):
        raise ValueError(
            "Vertex AI response must be a JSON object."
        )

    return data


def save_json(path: Path, data: dict) -> None:
    """JSONを整形して保存する。"""
    path.parent.mkdir(parents=True, exist_ok=True)

    path.write_text(
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )


def get_screen_id(screen_file: Path) -> str:
    """
    SCR-001.md -> SCR-001
    """
    return screen_file.stem


def validate_required_files(paths: list[Path]) -> None:
    """必要ファイルの存在を確認する。"""
    for path in paths:
        if not path.exists():
            raise FileNotFoundError(
                f"Required file not found: {path}"
            )


def transform_system_requirement(vertex_client) -> Path:
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

    source_md = read_text(SYSTEM_REQUIREMENTS_MD)
    prompt_template = load_prompt(SYSTEM_PROMPT)

    prompt = inject_prompt(
        prompt_template,
        {
            "{{SYSTEM_REQUIREMENTS_MD}}": source_md,
        },
    )

    print("Generating system_requirements.json...")

    response = vertex_client.generate(prompt)

    data = extract_json(response)

    output_file = (
        GENERATED_REQUIREMENTS_DIR
        / "system_requirements.json"
    )

    save_json(output_file, data)

    print(f"Generated: {output_file}")

    return output_file


def transform_trace_index(vertex_client) -> Path:
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

    source_md = read_text(TRACE_INDEX_MD)
    prompt_template = load_prompt(TRACE_PROMPT)

    prompt = inject_prompt(
        prompt_template,
        {
            "{{TRACE_INDEX_MD}}": source_md,
        },
    )

    print("Generating trace_index.json...")

    response = vertex_client.generate(prompt)

    data = extract_json(response)

    output_file = (
        GENERATED_REQUIREMENTS_DIR
        / "trace_index.json"
    )

    save_json(output_file, data)

    print(f"Generated: {output_file}")

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

    screen_design = read_text(screen_file)

    prompt_template = load_prompt(SCREEN_PROMPT)

    prompt = inject_prompt(
        prompt_template,
        {
            "{{SYSTEM_REQUIREMENTS_JSON}}": (
                system_requirements
            ),
            "{{TRACE_INDEX_JSON}}": trace_index,
            "{{SCREEN_DESIGN_MD}}": screen_design,
            "{{SCREEN_DESIGN_FILE}}": str(screen_file),
        },
    )

    screen_id = get_screen_id(screen_file)

    print(
        f"Generating screen requirement: "
        f"{screen_id}"
    )

    response = vertex_client.generate(prompt)

    data = extract_json(response)

    output_file = (
        GENERATED_SCREEN_DIR
        / f"{screen_id}.json"
    )

    save_json(output_file, data)

    print(f"Generated: {output_file}")

    return output_file


def transform_all_screens(vertex_client) -> None:
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


def parse_args() -> argparse.Namespace:
    """コマンドライン引数を解析する。"""
    parser = argparse.ArgumentParser(
        description=(
            "Transform system requirements, "
            "trace index, and screen requirements."
        )
    )

    parser.add_argument(
        "--target",
        choices=[
            "system",
            "trace",
            "screens",
            "all",
        ],
        default="all",
        help=(
            "Transformation target. "
            "default: all"
        ),
    )

    return parser.parse_args()


def main(vertex_client) -> None:
    """
    全変換処理。

    1. System Requirements
    2. Trace Index
    3. Screen Requirements
    """

    required_files = [
        SYSTEM_REQUIREMENTS_MD,
        TRACE_INDEX_MD,
        SYSTEM_PROMPT,
        TRACE_PROMPT,
        SCREEN_PROMPT,
    ]

    for path in required_files:
        if not path.exists():
            raise FileNotFoundError(
                f"Required file not found: {path}"
            )

    print("=== System Requirements ===")
    transform_system_requirement(vertex_client)

    print("=== Trace Index ===")
    transform_trace_index(vertex_client)

    print("=== Screen Requirements ===")
    transform_all_screens(vertex_client)

    print("=== Transformation completed ===")


if __name__ == "__main__":
    import sys
    from pathlib import Path

    project_root = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(project_root))

    from requirements.ai.vertex_client import VertexClient

    client = VertexClient()
    main(client)