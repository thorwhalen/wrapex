"""Tests for wrapex data access API."""

import pytest
import wrapex


class TestListSkills:
    def test_returns_12_skills(self):
        skills = wrapex.list_skills()
        assert len(skills) == 12

    def test_skills_are_sorted(self):
        skills = wrapex.list_skills()
        assert skills == sorted(skills)

    def test_first_skill_is_diagnose(self):
        skills = wrapex.list_skills()
        assert skills[0] == "01-diagnose.md"


class TestGetSkill:
    def test_exact_name(self):
        content = wrapex.get_skill("01-diagnose.md")
        assert len(content) > 0
        assert "diagnos" in content.lower()

    def test_name_without_extension(self):
        content = wrapex.get_skill("01-diagnose")
        assert len(content) > 0

    def test_prefix_match(self):
        content = wrapex.get_skill("01")
        assert len(content) > 0

    def test_missing_raises(self):
        with pytest.raises(FileNotFoundError):
            wrapex.get_skill("99-nonexistent")


class TestListRules:
    def test_returns_3_rules(self):
        rules = wrapex.list_rules()
        assert len(rules) == 3

    def test_includes_naming(self):
        rules = wrapex.list_rules()
        assert "command-naming.md" in rules


class TestGetRule:
    def test_exact_name(self):
        content = wrapex.get_rule("command-naming.md")
        assert len(content) > 0

    def test_prefix_match(self):
        content = wrapex.get_rule("command-naming")
        assert len(content) > 0

    def test_missing_raises(self):
        with pytest.raises(FileNotFoundError):
            wrapex.get_rule("nonexistent-rule")


class TestListExamples:
    def test_returns_4_examples(self):
        examples = wrapex.list_examples()
        assert len(examples) == 4

    def test_includes_zustand(self):
        examples = wrapex.list_examples()
        assert "zustand-store-wrap" in examples


class TestGetExample:
    def test_exact_name(self):
        content = wrapex.get_example("zustand-store-wrap")
        assert len(content) > 0

    def test_prefix_match(self):
        content = wrapex.get_example("zustand")
        assert len(content) > 0

    def test_missing_raises(self):
        with pytest.raises(FileNotFoundError):
            wrapex.get_example("nonexistent-example")


class TestListTemplates:
    def test_returns_at_least_one(self):
        templates = wrapex.list_templates()
        assert len(templates) >= 1


class TestGetTemplate:
    def test_command_definition_template(self):
        content = wrapex.get_template("command-definition")
        assert len(content) > 0


class TestListSchemas:
    def test_returns_schema_files(self):
        schemas = wrapex.list_schemas_ts()
        assert len(schemas) >= 3
        names = [s for s in schemas if s.endswith(".schema.ts")]
        assert len(names) >= 3


class TestGetSchemaTs:
    def test_command_candidate(self):
        content = wrapex.get_schema_ts("command-candidate")
        assert "CommandCandidate" in content

    def test_missing_raises(self):
        with pytest.raises(FileNotFoundError):
            wrapex.get_schema_ts("nonexistent-schema")


class TestListSrc:
    def test_returns_src_files(self):
        src = wrapex.list_src()
        assert len(src) >= 3
        assert "index.ts" in src


class TestGetSrc:
    def test_define_command(self):
        content = wrapex.get_src("define-command")
        assert "defineCommand" in content


class TestGetSkillMd:
    def test_returns_content(self):
        content = wrapex.get_skill_md()
        assert len(content) > 0
        assert "SKILL" in content.upper() or "wrapex" in content.lower()
