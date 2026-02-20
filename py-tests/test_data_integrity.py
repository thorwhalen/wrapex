"""Tests for wrapex data integrity — ensures bundled files are non-empty and consistent."""

import wrapex


class TestSkillsIntegrity:
    def test_all_skills_are_non_empty(self):
        for name in wrapex.list_skills():
            content = wrapex.get_skill(name)
            assert len(content.strip()) > 0, f"Skill {name} is empty"

    def test_skills_are_markdown(self):
        for name in wrapex.list_skills():
            content = wrapex.get_skill(name)
            # Each skill should have at least one heading
            assert "#" in content, f"Skill {name} has no markdown heading"


class TestRulesIntegrity:
    def test_all_rules_are_non_empty(self):
        for name in wrapex.list_rules():
            content = wrapex.get_rule(name)
            assert len(content.strip()) > 0, f"Rule {name} is empty"


class TestExamplesIntegrity:
    def test_all_examples_are_non_empty(self):
        for name in wrapex.list_examples():
            content = wrapex.get_example(name)
            assert len(content.strip()) > 0, f"Example {name} is empty"


class TestSchemasIntegrity:
    def test_all_schemas_are_non_empty(self):
        for name in wrapex.list_schemas_ts():
            content = wrapex.get_schema_ts(name)
            assert len(content.strip()) > 0, f"Schema {name} is empty"

    def test_schemas_contain_zod(self):
        for name in wrapex.list_schemas_ts():
            content = wrapex.get_schema_ts(name)
            # Schema files should import from zod (except index.ts)
            if name != "index.ts":
                assert "zod" in content.lower() or "z." in content, (
                    f"Schema {name} doesn't appear to use Zod"
                )
