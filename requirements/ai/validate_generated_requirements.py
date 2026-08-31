from pathlib import Path
import json
import sys


BASE_DIR = Path(__file__).resolve().parent

GENERATED_DIR = BASE_DIR / "generated"
GENERATED_REQUIREMENTS_DIR = GENERATED_DIR / "requirements"
GENERATED_SCREEN_DIR = GENERATED_DIR / "screens"

SYSTEM_REQUIREMENTS_JSON = (
    GENERATED_REQUIREMENTS_DIR / "system_requirements.json"
)

TRACE_INDEX_JSON = (
    GENERATED_REQUIREMENTS_DIR / "trace_index.json"
)


class ValidationError:
    def __init__(self, message: str):
        self.message = message

    def __str__(self):
        return self.message


def load_json(path: Path):
    """
    JSONファイルを読み込む。
    """
    if not path.exists():
        raise FileNotFoundError(
            f"File not found: {path}"
        )

    try:
        return json.loads(
            path.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Invalid JSON: {path}\n"
            f"  line={e.lineno}, column={e.colno}\n"
            f"  {e.msg}"
        )


def require_key(
    data: dict,
    key: str,
    path: str,
    errors: list[ValidationError],
):
    """
    必須キーの存在を確認する。
    """
    if key not in data:
        errors.append(
            ValidationError(
                f"Missing required key: {path}.{key}"
            )
        )


def require_list(
    data: dict,
    key: str,
    path: str,
    errors: list[ValidationError],
):
    """
    指定キーが配列であることを確認する。
    """
    if key not in data:
        errors.append(
            ValidationError(
                f"Missing required key: {path}.{key}"
            )
        )
        return

    if not isinstance(data[key], list):
        errors.append(
            ValidationError(
                f"{path}.{key} must be an array"
            )
        )


def require_object(
    data: dict,
    key: str,
    path: str,
    errors: list[ValidationError],
):
    """
    指定キーがobjectであることを確認する。
    """
    if key not in data:
        errors.append(
            ValidationError(
                f"Missing required key: {path}.{key}"
            )
        )
        return

    if not isinstance(data[key], dict):
        errors.append(
            ValidationError(
                f"{path}.{key} must be an object"
            )
        )


def validate_system_requirements(
    data: dict,
) -> list[ValidationError]:

    errors = []

    if not isinstance(data, dict):
        return [
            ValidationError(
                "system_requirements.json root must be an object"
            )
        ]

    # --------------------------------------------------
    # Root
    # --------------------------------------------------

    required_root_keys = [
        "version",
        "source",
        "scope",
        "users",
        "technology",
        "architecture",
        "conventions",
        "authentication",
        "data_model",
        "seed",
        "non_functional",
        "testing",
        "implementation_constraints",
        "open_items",
        "traceability",
    ]

    for key in required_root_keys:
        require_key(
            data,
            key,
            "system_requirements",
            errors,
        )

    # --------------------------------------------------
    # source
    # --------------------------------------------------

    source = data.get("source")

    if isinstance(source, dict):

        for key in [
            "doc_type",
            "source_file",
            "source_version",
            "generated_at",
        ]:
            require_key(
                source,
                key,
                "source",
                errors,
            )

        if source.get("doc_type") != "system_requirements":
            errors.append(
                ValidationError(
                    "source.doc_type must be "
                    "'system_requirements'"
                )
            )

    # --------------------------------------------------
    # scope
    # --------------------------------------------------

    scope = data.get("scope")

    if isinstance(scope, dict):

        require_key(
            scope,
            "product",
            "scope",
            errors,
        )

        require_key(
            scope,
            "purpose",
            "scope",
            errors,
        )

        require_list(
            scope,
            "in",
            "scope",
            errors,
        )

        require_list(
            scope,
            "out",
            "scope",
            errors,
        )

        require_key(
            scope,
            "status",
            "scope",
            errors,
        )

    # --------------------------------------------------
    # users
    # --------------------------------------------------

    if "users" in data and not isinstance(
        data["users"],
        list,
    ):
        errors.append(
            ValidationError(
                "users must be an array"
            )
        )

    # --------------------------------------------------
    # technology
    # --------------------------------------------------

    if "technology" in data and not isinstance(
        data["technology"],
        list,
    ):
        errors.append(
            ValidationError(
                "technology must be an array"
            )
        )

    # --------------------------------------------------
    # architecture
    # --------------------------------------------------

    architecture = data.get("architecture")

    if isinstance(architecture, dict):

        require_list(
            architecture,
            "layers",
            "architecture",
            errors,
        )

        require_list(
            architecture,
            "directory_structure",
            "architecture",
            errors,
        )

        require_object(
            architecture,
            "repository",
            "architecture",
            errors,
        )

        require_object(
            architecture,
            "persistence",
            "architecture",
            errors,
        )

    # --------------------------------------------------
    # conventions
    # --------------------------------------------------

    conventions = data.get("conventions")

    if isinstance(conventions, dict):

        require_list(
            conventions,
            "naming",
            "conventions",
            errors,
        )

        require_object(
            conventions,
            "error_handling",
            "conventions",
            errors,
        )

        require_object(
            conventions,
            "logging",
            "conventions",
            errors,
        )

    # --------------------------------------------------
    # data_model
    # --------------------------------------------------

    data_model = data.get("data_model")

    if isinstance(data_model, dict):

        require_list(
            data_model,
            "stores",
            "data_model",
            errors,
        )

        require_list(
            data_model,
            "types",
            "data_model",
            errors,
        )

    # --------------------------------------------------
    # non_functional
    # --------------------------------------------------

    non_functional = data.get(
        "non_functional"
    )

    if isinstance(non_functional, dict):

        for key in [
            "performance",
            "security",
            "availability",
        ]:
            require_list(
                non_functional,
                key,
                "non_functional",
                errors,
            )

        require_object(
            non_functional,
            "audit_log",
            "non_functional",
            errors,
        )

    # --------------------------------------------------
    # testing
    # --------------------------------------------------

    testing = data.get("testing")

    if isinstance(testing, dict):

        require_list(
            testing,
            "ci",
            "testing",
            errors,
        )

        require_list(
            testing,
            "frameworks",
            "testing",
            errors,
        )

        require_key(
            testing,
            "coverage",
            "testing",
            errors,
        )

        require_list(
            testing,
            "pr_rules",
            "testing",
            errors,
        )

    # --------------------------------------------------
    # implementation_constraints
    # --------------------------------------------------

    constraints = data.get(
        "implementation_constraints"
    )

    if isinstance(constraints, dict):

        require_list(
            constraints,
            "allowed",
            "implementation_constraints",
            errors,
        )

        require_list(
            constraints,
            "forbidden",
            "implementation_constraints",
            errors,
        )

        forbidden = constraints.get(
            "forbidden",
            [],
        )

        if isinstance(forbidden, list):

            # 禁止事項が完全に空の場合だけ問題にする。
            #
            # 特定のキーワードが存在するかどうかは
            # Validator側で推測しない。
            if len(forbidden) == 0:
                errors.append(
                    ValidationError(
                        "implementation_constraints.forbidden "
                        "is empty"
                    )
                )

    # --------------------------------------------------
    # open_items
    # --------------------------------------------------

    open_items = data.get("open_items")

    if not isinstance(
        open_items,
        list,
    ):
        errors.append(
            ValidationError(
                "open_items must be an array"
            )
        )

    # --------------------------------------------------
    # traceability
    # --------------------------------------------------

    traceability = data.get(
        "traceability"
    )

    if not isinstance(
        traceability,
        dict,
    ):
        errors.append(
            ValidationError(
                "traceability must be an object"
            )
        )

    return errors


def validate_trace_index(
    data: dict,
) -> list[ValidationError]:

    errors = []

    if not isinstance(data, dict):
        errors.append(
            ValidationError(
                "trace_index.json root must be an object"
            )
        )
        return errors

    if len(data) == 0:
        errors.append(
            ValidationError(
                "trace_index.json is empty"
            )
        )

    return errors


def find_screen_files() -> list[Path]:
    """
    generated/screens/*.json を取得する。
    """
    if not GENERATED_SCREEN_DIR.exists():
        return []

    return sorted(
        GENERATED_SCREEN_DIR.glob("*.json")
    )


def validate_screen(
    path: Path,
) -> list[ValidationError]:

    errors = []

    try:
        data = load_json(path)

    except (
        FileNotFoundError,
        ValueError,
    ) as e:

        errors.append(
            ValidationError(str(e))
        )

        return errors

    # 画面JSONの具体的なスキーマは、
    # screen requirement prompt側で定義される。
    #
    # Validator側で screen_id / screen_name 等を
    # 勝手に必須化しない。

    if not isinstance(data, dict):

        errors.append(
            ValidationError(
                f"{path.name}: "
                "root must be an object"
            )
        )

        return errors

    if len(data) == 0:

        errors.append(
            ValidationError(
                f"{path.name}: "
                "JSON object is empty"
            )
        )

    return errors


def extract_screen_id(
    path: Path,
) -> str:
    """
    SCR-001_contractor_login.json
    ->
    SCR-001
    """
    match = path.stem.split("_", 1)

    return match[0]


def validate_screen_ids(
    screen_files: list[Path],
) -> list[ValidationError]:

    errors = []

    screen_ids = set()

    for path in screen_files:

        screen_id = extract_screen_id(path)

        if screen_id in screen_ids:

            errors.append(
                ValidationError(
                    f"Duplicate screen ID: "
                    f"{screen_id}"
                )
            )

        screen_ids.add(screen_id)

    return errors


def print_section(
    title: str,
):
    print()
    print("=" * 60)
    print(title)
    print("=" * 60)


def main() -> int:

    print(
        "=== Generated Requirements Validation ==="
    )

    errors: list[ValidationError] = []

    # ==================================================
    # 1. System Requirements
    # ==================================================

    print_section(
        "1. System Requirements"
    )

    try:

        system_requirements = load_json(
            SYSTEM_REQUIREMENTS_JSON
        )

        system_errors = (
            validate_system_requirements(
                system_requirements
            )
        )

        errors.extend(system_errors)

        if system_errors:

            print(
                f"NG: {len(system_errors)} problem(s)"
            )

            for error in system_errors:
                print(
                    f"  - {error}"
                )

        else:

            print(
                "OK: system_requirements.json"
            )

    except (
        FileNotFoundError,
        ValueError,
    ) as e:

        errors.append(
            ValidationError(str(e))
        )

        print("NG")
        print(e)

    # ==================================================
    # 2. Trace Index
    # ==================================================

    print_section(
        "2. Trace Index"
    )

    try:

        trace_index = load_json(
            TRACE_INDEX_JSON
        )

        trace_errors = (
            validate_trace_index(
                trace_index
            )
        )

        errors.extend(trace_errors)

        if trace_errors:

            print(
                f"NG: {len(trace_errors)} problem(s)"
            )

            for error in trace_errors:
                print(
                    f"  - {error}"
                )

        else:

            print(
                "OK: trace_index.json"
            )

    except (
        FileNotFoundError,
        ValueError,
    ) as e:

        errors.append(
            ValidationError(str(e))
        )

        print("NG")
        print(e)

    # ==================================================
    # 3. Screen Requirements
    # ==================================================

    print_section(
        "3. Screen Requirements"
    )

    screen_files = find_screen_files()

    if not screen_files:

        errors.append(
            ValidationError(
                "No screen requirement JSON files found"
            )
        )

        print(
            "NG: no screen JSON files"
        )

    else:

        print(
            f"Found {len(screen_files)} "
            "screen JSON file(s)"
        )

        for screen_file in screen_files:

            screen_errors = validate_screen(
                screen_file
            )

            errors.extend(
                screen_errors
            )

            if screen_errors:

                print(
                    f"NG: {screen_file.name}"
                )

                for error in screen_errors:

                    print(
                        f"  - {error}"
                    )

            else:

                print(
                    f"OK: {screen_file.name}"
                )

        id_errors = (
            validate_screen_ids(
                screen_files
            )
        )

        errors.extend(id_errors)

        if id_errors:

            for error in id_errors:

                print(
                    f"NG: {error}"
                )

    # ==================================================
    # 4. Summary
    # ==================================================

    print_section(
        "Validation Result"
    )

    if errors:

        print(
            f"FAILED: {len(errors)} problem(s)"
        )

        return 1

    print(
        "PASSED: All generated JSON files "
        "passed structural validation."
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
