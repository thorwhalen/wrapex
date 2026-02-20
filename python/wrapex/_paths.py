"""Path resolution for wrapex bundled data."""

from pathlib import Path

_DATA_DIR = Path(__file__).parent / "data"

SKILLS_DIR = _DATA_DIR / "skills"
RULES_DIR = _DATA_DIR / "rules"
EXAMPLES_DIR = _DATA_DIR / "examples"
TEMPLATES_DIR = _DATA_DIR / "templates"
SRC_DIR = _DATA_DIR / "src"
SKILL_MD = _DATA_DIR / "SKILL.md"
