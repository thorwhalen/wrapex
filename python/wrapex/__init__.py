"""
wrapex — Command Dispatch Refactoring Toolkit.

Programmatic access to AI agent skills, rules, schemas, templates,
and examples for incremental command-pattern adoption.

Usage::

    import wrapex

    # List available skills
    wrapex.list_skills()

    # Read a skill file
    content = wrapex.get_skill('01-diagnose')

    # Prefix matching
    content = wrapex.get_skill('01')
"""

__version__ = "0.1.0"

from wrapex._data import (
    get_skill,
    get_rule,
    get_example,
    get_template,
    get_schema_ts,
    get_src,
    get_skill_md,
    list_skills,
    list_rules,
    list_examples,
    list_templates,
    list_schemas_ts,
    list_src,
)

__all__ = [
    "get_skill",
    "get_rule",
    "get_example",
    "get_template",
    "get_schema_ts",
    "get_src",
    "get_skill_md",
    "list_skills",
    "list_rules",
    "list_examples",
    "list_templates",
    "list_schemas_ts",
    "list_src",
]
