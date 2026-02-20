"""Data access API for wrapex bundled content."""

from pathlib import Path
from typing import List

from wrapex._paths import (
    SKILLS_DIR,
    RULES_DIR,
    EXAMPLES_DIR,
    TEMPLATES_DIR,
    SRC_DIR,
    SKILL_MD,
)


def _resolve(directory: Path, name: str, suffix: str = ".md") -> Path:
    """Resolve a file by exact name or prefix match."""
    # Try exact match first
    exact = directory / name
    if exact.is_file():
        return exact

    # Try with suffix
    with_suffix = directory / (name + suffix)
    if with_suffix.is_file():
        return with_suffix

    # Try prefix match
    candidates = sorted(directory.glob(f"{name}*"))
    files = [c for c in candidates if c.is_file()]
    if len(files) == 1:
        return files[0]
    if len(files) > 1:
        names = [f.name for f in files]
        raise FileNotFoundError(
            f"Ambiguous prefix '{name}' in {directory.name}/: matches {names}"
        )

    raise FileNotFoundError(
        f"No file matching '{name}' in {directory.name}/. "
        f"Available: {[f.name for f in sorted(directory.iterdir()) if f.is_file()]}"
    )


def _list_files(directory: Path, suffix: str = "") -> List[str]:
    """List file names in a directory, optionally filtering by suffix."""
    if not directory.is_dir():
        return []
    files = sorted(directory.iterdir())
    if suffix:
        return [f.name for f in files if f.is_file() and f.suffix == suffix]
    return [f.name for f in files if f.is_file()]


def _list_dirs(directory: Path) -> List[str]:
    """List subdirectory names in a directory."""
    if not directory.is_dir():
        return []
    return sorted(d.name for d in directory.iterdir() if d.is_dir())


# ── Skills ──────────────────────────────────────────────────────────────────


def list_skills() -> List[str]:
    """List available skill file names."""
    return _list_files(SKILLS_DIR, suffix=".md")


def get_skill(name: str) -> str:
    """Get a skill file's content by name or prefix (e.g., '01' or '01-diagnose')."""
    return _resolve(SKILLS_DIR, name).read_text(encoding="utf-8")


# ── Rules ───────────────────────────────────────────────────────────────────


def list_rules() -> List[str]:
    """List available rule file names."""
    return _list_files(RULES_DIR, suffix=".md")


def get_rule(name: str) -> str:
    """Get a rule file's content by name or prefix."""
    return _resolve(RULES_DIR, name).read_text(encoding="utf-8")


# ── Examples ────────────────────────────────────────────────────────────────


def list_examples() -> List[str]:
    """List available example directory names."""
    return _list_dirs(EXAMPLES_DIR)


def get_example(name: str) -> str:
    """Get an example's README.md content by directory name or prefix."""
    # Resolve directory
    exact = EXAMPLES_DIR / name
    if exact.is_dir():
        readme = exact / "README.md"
        if readme.is_file():
            return readme.read_text(encoding="utf-8")
        raise FileNotFoundError(f"No README.md in examples/{name}/")

    # Prefix match on directories
    candidates = sorted(d for d in EXAMPLES_DIR.iterdir() if d.is_dir() and d.name.startswith(name))
    if len(candidates) == 1:
        readme = candidates[0] / "README.md"
        if readme.is_file():
            return readme.read_text(encoding="utf-8")
        raise FileNotFoundError(f"No README.md in examples/{candidates[0].name}/")
    if len(candidates) > 1:
        raise FileNotFoundError(
            f"Ambiguous prefix '{name}' in examples/: matches {[d.name for d in candidates]}"
        )
    raise FileNotFoundError(
        f"No example matching '{name}'. Available: {list_examples()}"
    )


# ── Templates ───────────────────────────────────────────────────────────────


def list_templates() -> List[str]:
    """List available template file names."""
    return _list_files(TEMPLATES_DIR)


def get_template(name: str) -> str:
    """Get a template file's content by name or prefix."""
    return _resolve(TEMPLATES_DIR, name, suffix=".ts.template").read_text(encoding="utf-8")


# ── TypeScript Schemas ──────────────────────────────────────────────────────


def list_schemas_ts() -> List[str]:
    """List available TypeScript schema file names from src/schemas/."""
    schemas_dir = SRC_DIR / "schemas"
    return _list_files(schemas_dir, suffix=".ts")


def get_schema_ts(name: str) -> str:
    """Get a TypeScript schema file's content by name or prefix."""
    schemas_dir = SRC_DIR / "schemas"
    return _resolve(schemas_dir, name, suffix=".ts").read_text(encoding="utf-8")


# ── TypeScript Source ───────────────────────────────────────────────────────


def list_src() -> List[str]:
    """List TypeScript source files in src/."""
    return _list_files(SRC_DIR, suffix=".ts")


def get_src(name: str) -> str:
    """Get a TypeScript source file's content by name or prefix."""
    return _resolve(SRC_DIR, name, suffix=".ts").read_text(encoding="utf-8")


# ── SKILL.md ────────────────────────────────────────────────────────────────


def get_skill_md() -> str:
    """Get the master SKILL.md content."""
    return SKILL_MD.read_text(encoding="utf-8")
