from pathlib import Path
import json
import re
import sys
from typing import Any


# ============================================================
# Paths
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

ORIGINAL_DIR = BASE_DIR / "original"
GENERATED_DIR = BASE_DIR / "generated"

ORIGINAL_REQUIREMENTS_DIR = ORIGINAL_DIR / "requirements"
ORIGINAL_SCREEN_DIR = ORIGINAL_DIR / "screens"

GENERATED_REQUIREMENTS_DIR = GENERATED_DIR / "requirements"
GENERATED_SCREEN_DIR = GENERATED_DIR / "screens"

SYSTEM_REQUIREMENTS_MD = (
    ORIGINAL_REQUIREMENTS_DIR / "system_requirements.md"
)

TRACE_INDEX_MD = (
    ORIGINAL_REQUIREMENTS_DIR / "_trace_index.md"
)

SYSTEM_REQUIREMENTS_JSON = (
    GENERATED_REQUIREMENTS_DIR / "system_requirements.json"
)

TRACE_INDEX_JSON = (
    GENERATED_REQUIREMENTS_DIR / "trace_index.json"
)


# ============================================================
# Result
# ============================================================

class ValidationResult:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0


# ============================================================
# File helpers
# ============================================================

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# Normalization
# ============================================================

def normalize_text(value: str) -> str:
    """
    比較用にMarkdown/JSON中の文字列を正規化する。

    完全一致ではなく、
    - 改行
    - 連続空白
    - Markdown強調
    などの表現差をある程度吸収する。
    """

    value = value.strip()

    value = value.replace("\r\n", "\n")
    value = value.replace("\r", "\n")

    # Markdown emphasis
    value = re.sub(r"\*\*(.*?)\*\*", r"\1", value)
    value = re.sub(r"__(.*?)__", r"\1", value)

    # code marker
    value = value.replace("`", "")

    # whitespace
    value = re.sub(r"\s+", " ", value)

    return value.strip().lower()


def flatten_strings(value: Any) -> list[str]:
    """
    JSON内に存在するすべての文字列を取得する。
    """

    result: list[str] = []

    if isinstance(value, str):
        result.append(value)

    elif isinstance(value, dict):
        for key, child in value.items():
            result.append(str(key))
            result.extend(flatten_strings(child))

    elif isinstance(value, list):
        for child in value:
            result.extend(flatten_strings(child))

    return result


def normalized_json_text(data: Any) -> str:
    """
    JSON全体を比較用の1文字列へ変換。
    """

    strings = flatten_strings(data)

    return " ".join(
        normalize_text(value)
        for value in strings
        if value.strip()
    )


# ============================================================
# TODO validation
# ============================================================

def extract_todos(markdown: str) -> list[str]:
    """
    [TODO: ...] を抽出する。
    """

    matches = re.findall(
        r"\[TODO:\s*([^\]]+)\]",
        markdown,
        flags=re.IGNORECASE,
    )

    return [m.strip() for m in matches]


def validate_todos(
    markdown: str,
    generated: Any,
    result: ValidationResult,
    label: str,
) -> None:

    todos = extract_todos(markdown)

    if not todos:
        print(f"  OK: {label}: no TODO items")
        return

    generated_text = normalized_json_text(generated)

    missing = []

    for todo in todos:
        if normalize_text(todo) not in generated_text:
            missing.append(todo)

    if missing:
        for todo in missing:
            result.error(
                f"{label}: TODO missing from generated JSON: {todo}"
            )
    else:
        print(
            f"  OK: {label}: {len(todos)} TODO item(s) preserved"
        )


# ============================================================
# ASSUMPTION validation
# ============================================================

def extract_assumptions(markdown: str) -> list[str]:
    """
    [ASSUMPTION] を含む行を取得。
    """

    lines = markdown.splitlines()

    result = []

    for line in lines:
        if "[ASSUMPTION]" in line:
            cleaned = re.sub(
                r"\[ASSUMPTION\]",
                "",
                line,
                flags=re.IGNORECASE,
            ).strip()

            if cleaned:
                result.append(cleaned)

    return result


def validate_assumptions(
    markdown: str,
    generated: Any,
    result: ValidationResult,
    label: str,
) -> None:

    assumptions = extract_assumptions(markdown)

    if not assumptions:
        print(f"  OK: {label}: no ASSUMPTION markers")
        return

    generated_text = normalized_json_text(generated)

    missing = []

    for assumption in assumptions:
        normalized = normalize_text(assumption)

        if normalized not in generated_text:
            missing.append(assumption)

    if missing:
        result.warning(
            f"{label}: {len(missing)} ASSUMPTION item(s) "
            "may not have been preserved"
        )

        for item in missing:
            result.warning(
                f"  ASSUMPTION not found: {item}"
            )
    else:
        print(
            f"  OK: {label}: "
            f"{len(assumptions)} ASSUMPTION item(s) preserved"
        )


# ============================================================
# Forbidden / OUT validation
# ============================================================

FORBIDDEN_KEYWORDS = [
    "App Engine",
    "Cloud Run",
    "Spanner",
    "Cloud Storage",
    "Secret Manager",
    "external database",
    "外部DB",
    "外部データベース",
    "external http",
    "外部HTTP",
    "外部HTTP通信",
    "native app",
    "ネイティブアプリ",
    "給与計算本体",
]


def validate_forbidden_constraints(
    markdown: str,
    generated: Any,
    result: ValidationResult,
) -> None:

    generated_text = normalized_json_text(generated)

    missing = []

    for keyword in FORBIDDEN_KEYWORDS:
        if normalize_text(keyword) in normalize_text(markdown):
            if normalize_text(keyword) not in generated_text:
                missing.append(keyword)

    if missing:
        for keyword in missing:
            result.error(
                "System Requirements: forbidden/out constraint "
                f"may be missing: {keyword}"
            )
    else:
        print(
            "  OK: forbidden / OUT constraints preserved"
        )


# ============================================================
# Scope validation
# ============================================================

def validate_scope(
    generated: Any,
    result: ValidationResult,
) -> None:

    if not isinstance(generated, dict):
        result.error(
            "System Requirements: generated JSON is not an object"
        )
        return

    scope = generated.get("scope")

    if not isinstance(scope, dict):
        result.error(
            "System Requirements: scope is missing"
        )
        return

    required_keys = [
        "product",
        "purpose",
        "in",
        "out",
        "status",
    ]

    for key in required_keys:
        if key not in scope:
            result.error(
                f"System Requirements: scope.{key} is missing"
            )

    print("  OK: scope structure")


# ============================================================
# Technology validation
# ============================================================

def validate_technology(
    markdown: str,
    generated: Any,
    result: ValidationResult,
) -> None:

    technologies = [
        "Next.js 14",
        "TypeScript 5",
        "Node.js 20",
        "React 18",
        "Tailwind CSS 3",
        "shadcn/ui",
        "React Hook Form",
        "Zod",
        "Zustand",
        "IndexedDB",
        "idb",
        "HTML5",
        "getUserMedia",
        "papaparse",
    ]

    source_normalized = normalize_text(markdown)
    generated_normalized = normalized_json_text(generated)

    missing = []

    for technology in technologies:
        if normalize_text(technology) in source_normalized:
            if normalize_text(technology) not in generated_normalized:
                missing.append(technology)

    if missing:
        for technology in missing:
            result.error(
                "System Requirements: technology may be missing: "
                f"{technology}"
            )
    else:
        print("  OK: technology constraints preserved")


# ============================================================
# Source metadata validation
# ============================================================

def validate_source_metadata(
    generated: Any,
    result: ValidationResult,
) -> None:

    source = generated.get("source")

    if not isinstance(source, dict):
        result.error(
            "System Requirements: source is missing"
        )
        return

    if source.get("doc_type") != "system_requirements":
        result.error(
            "System Requirements: source.doc_type is invalid"
        )

    expected = (
        "requirements/ai/original/"
        "requirements/system_requirements.md"
    )

    actual = source.get("source_file")

    if actual != expected:
        result.warning(
            "System Requirements: source.source_file differs "
            f"from expected value: {actual}"
        )
    else:
        print("  OK: source metadata")


# ============================================================
# Trace Index validation
# ============================================================

TRACE_ID_PATTERN = re.compile(
    r"\bTR-[A-Z0-9_-]+\b",
    re.IGNORECASE,
)

SCREEN_ID_PATTERN = re.compile(
    r"\bSCR-\d{3}\b",
    re.IGNORECASE,
)


def extract_trace_ids(text: str) -> set[str]:
    return {
        value.upper()
        for value in TRACE_ID_PATTERN.findall(text)
    }


def extract_screen_ids(text: str) -> set[str]:
    return {
        value.upper()
        for value in SCREEN_ID_PATTERN.findall(text)
    }


def validate_trace_index(
    result: ValidationResult,
) -> None:

    if not TRACE_INDEX_MD.exists():
        result.error(
            f"Trace Index source not found: {TRACE_INDEX_MD}"
        )
        return

    if not TRACE_INDEX_JSON.exists():
        result.error(
            f"Trace Index JSON not found: {TRACE_INDEX_JSON}"
        )
        return

    source_md = read_text(TRACE_INDEX_MD)
    generated = read_json(TRACE_INDEX_JSON)

    source_traces = extract_trace_ids(source_md)
    generated_traces = extract_trace_ids(
        json.dumps(generated, ensure_ascii=False)
    )

    missing_traces = source_traces - generated_traces

    if missing_traces:
        for trace_id in sorted(missing_traces):
            result.error(
                "Trace Index: missing Trace ID: "
                f"{trace_id}"
            )
    else:
        print(
            "  OK: Trace IDs preserved "
            f"({len(source_traces)})"
        )

    source_screens = extract_screen_ids(source_md)
    generated_screens = extract_screen_ids(
        json.dumps(generated, ensure_ascii=False)
    )

    missing_screens = source_screens - generated_screens

    if missing_screens:
        for screen_id in sorted(missing_screens):
            result.error(
                "Trace Index: missing Screen ID: "
                f"{screen_id}"
            )
    else:
        print(
            "  OK: Screen IDs preserved "
            f"({len(source_screens)})"
        )


# ============================================================
# Screen validation
# ============================================================

def validate_screen(
    screen_file: Path,
    result: ValidationResult,
) -> None:

    screen_id = screen_file.stem.split("_")[0]

    generated_file = GENERATED_SCREEN_DIR / f"{screen_file.stem}.json"

    if not generated_file.exists():
        result.error(
            f"{screen_file.name}: generated JSON not found"
        )
        return

    source_md = read_text(screen_file)
    generated = read_json(generated_file)

    generated_text = json.dumps(
        generated,
        ensure_ascii=False,
    )

    # --------------------------------------------------------
    # Screen ID
    # --------------------------------------------------------

    if screen_id.upper() not in generated_text.upper():
        result.error(
            f"{screen_file.name}: screen_id may be missing"
        )

    # --------------------------------------------------------
    # TODO
    # --------------------------------------------------------

    validate_todos(
        source_md,
        generated,
        result,
        screen_file.name,
    )

    # --------------------------------------------------------
    # ASSUMPTION
    # --------------------------------------------------------

    validate_assumptions(
        source_md,
        generated,
        result,
        screen_file.name,
    )

    # --------------------------------------------------------
    # Empty JSON check
    # --------------------------------------------------------

    if isinstance(generated, dict):
        meaningful_values = []

        for key, value in generated.items():
            if key in {
                "version",
                "source",
                "screen_id",
                "screen_name",
            }:
                continue

            if value not in (
                None,
                "",
                [],
                {},
            ):
                meaningful_values.append(value)

        if not meaningful_values:
            result.error(
                f"{screen_file.name}: generated JSON contains "
                "almost no requirement data"
            )

    print(f"  OK: {screen_file.name}")


def validate_all_screens(
    result: ValidationResult,
) -> None:

    screen_files = sorted(
        ORIGINAL_SCREEN_DIR.glob("*.md")
    )

    if not screen_files:
        result.error(
            f"No screen Markdown files found: "
            f"{ORIGINAL_SCREEN_DIR}"
        )
        return

    print(
        f"Found {len(screen_files)} screen source file(s)"
    )

    for screen_file in screen_files:
        validate_screen(
            screen_file,
            result,
        )


# ============================================================
# Cross validation
# ============================================================

def validate_screen_file_counts(
    result: ValidationResult,
) -> None:

    source_files = sorted(
        ORIGINAL_SCREEN_DIR.glob("*.md")
    )

    generated_files = sorted(
        GENERATED_SCREEN_DIR.glob("*.json")
    )

    if len(source_files) != len(generated_files):
        result.error(
            "Screen file count mismatch: "
            f"source={len(source_files)}, "
            f"generated={len(generated_files)}"
        )
    else:
        print(
            "  OK: screen file count "
            f"({len(source_files)})"
        )


# ============================================================
# Main validation
# ============================================================

def validate_system_requirements(
    result: ValidationResult,
) -> None:

    print("=" * 60)
    print("1. System Requirements")
    print("=" * 60)

    if not SYSTEM_REQUIREMENTS_MD.exists():
        result.error(
            f"Source not found: {SYSTEM_REQUIREMENTS_MD}"
        )
        return

    if not SYSTEM_REQUIREMENTS_JSON.exists():
        result.error(
            f"Generated JSON not found: "
            f"{SYSTEM_REQUIREMENTS_JSON}"
        )
        return

    source_md = read_text(SYSTEM_REQUIREMENTS_MD)
    generated = read_json(SYSTEM_REQUIREMENTS_JSON)

    validate_scope(
        generated,
        result,
    )

    validate_source_metadata(
        generated,
        result,
    )

    validate_todos(
        source_md,
        generated,
        result,
        "System Requirements",
    )

    validate_assumptions(
        source_md,
        generated,
        result,
        "System Requirements",
    )

    validate_forbidden_constraints(
        source_md,
        generated,
        result,
    )

    validate_technology(
        source_md,
        generated,
        result,
    )


def main() -> int:

    result = ValidationResult()

    print()
    print("=== Semantic Validation ===")
    print()

    # --------------------------------------------------------
    # 1. System Requirements
    # --------------------------------------------------------

    validate_system_requirements(
        result
    )

    print()

    # --------------------------------------------------------
    # 2. Trace Index
    # --------------------------------------------------------

    print("=" * 60)
    print("2. Trace Index")
    print("=" * 60)

    validate_trace_index(
        result
    )

    print()

    # --------------------------------------------------------
    # 3. Screens
    # --------------------------------------------------------

    print("=" * 60)
    print("3. Screen Requirements")
    print("=" * 60)

    validate_screen_file_counts(
        result
    )

    validate_all_screens(
        result
    )

    print()

    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    print("=" * 60)
    print("Semantic Validation Result")
    print("=" * 60)

    if result.warnings:
        print()
        print(
            f"Warnings: {len(result.warnings)}"
        )

        for warning in result.warnings:
            print(f"WARNING: {warning}")

    if result.errors:
        print()
        print(
            f"Errors: {len(result.errors)}"
        )

        for error in result.errors:
            print(f"NG: {error}")

        print()
        print("FAILED")

        return 1

    print()
    print("PASSED: Semantic validation completed successfully.")

    return 0


if __name__ == "__main__":
    sys.exit(main())

