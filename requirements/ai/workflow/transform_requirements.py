from pathlib import Path

BASE_DIR = Path("requirements/ai")

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





def read_file(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    return path.read_text(encoding="utf-8")


def build_prompt(prompt_path: Path, variables: dict[str, str]) -> str:
    prompt = read_file(prompt_path)

    for key, value in variables.items():
        placeholder = "{{" + key + "}}"
        prompt = prompt.replace(placeholder, value)

    return prompt

def build_system_requirement_prompt() -> str:
    system_requirements_md = read_file(SYSTEM_REQUIREMENTS_MD)

    return build_prompt(
        SYSTEM_PROMPT,
        {
            "SYSTEM_REQUIREMENTS_MD": system_requirements_md,
        },
    )

def build_trace_index_prompt() -> str:
    trace_index_md = read_file(TRACE_INDEX_MD)

    return build_prompt(
        TRACE_PROMPT,
        {
            "source_markdown": trace_index_md,
        },
    )