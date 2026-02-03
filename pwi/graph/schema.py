"""Schema validation for the PWI knowledge graph.

Validates nodes and edges against the schema defined in graph/schema.json.
"""

import json
from pathlib import Path


class SchemaValidator:
    """Validates nodes/edges against graph/schema.json."""

    def __init__(self, schema_path: str = "./graph/schema.json"):
        """Load schema from file.

        Args:
            schema_path: Path to the JSON schema file.
        """
        self._schema_path = Path(schema_path)
        self._schema: dict = {}
        self._load_schema()

    def _load_schema(self):
        """Load and parse the schema JSON file."""
        if self._schema_path.exists():
            with open(self._schema_path, "r") as f:
                self._schema = json.load(f)
        else:
            self._schema = {"entities": {}, "relationships": {}}

    def _parse_field_type(self, type_str: str) -> dict:
        """Parse a schema field type string into structured info.

        Examples:
            "string"        -> {"base": "string", "optional": False, "array": False}
            "string?"       -> {"base": "string", "optional": True, "array": False}
            "string[]"      -> {"base": "string", "optional": False, "array": True}
            "enum:a,b,c"    -> {"base": "enum", "optional": False, "array": False, "values": ["a","b","c"]}
            "ref:*[]"       -> {"base": "ref", "optional": False, "array": True}
        """
        optional = type_str.endswith("?")
        if optional:
            type_str = type_str[:-1]

        array = type_str.endswith("[]")
        if array:
            type_str = type_str[:-2]

        info = {"optional": optional, "array": array}

        if type_str.startswith("enum:"):
            info["base"] = "enum"
            info["values"] = type_str[5:].split(",")
        elif type_str.startswith("ref:"):
            info["base"] = "ref"
            info["ref_target"] = type_str[4:]
        else:
            info["base"] = type_str

        return info

    def _validate_field_value(self, value, field_info: dict) -> list[str]:
        """Validate a single field value against its type info."""
        errors = []
        base = field_info["base"]
        is_array = field_info["array"]

        if is_array:
            if not isinstance(value, list):
                errors.append(f"Expected array, got {type(value).__name__}")
                return errors
            for i, item in enumerate(value):
                sub_errors = self._validate_scalar(item, base, field_info)
                for e in sub_errors:
                    errors.append(f"[{i}]: {e}")
            return errors

        return self._validate_scalar(value, base, field_info)

    def _validate_scalar(self, value, base: str, field_info: dict) -> list[str]:
        """Validate a scalar value against a base type."""
        errors = []
        if base == "string":
            if not isinstance(value, str):
                errors.append(f"Expected string, got {type(value).__name__}")
        elif base == "number":
            if not isinstance(value, (int, float)):
                errors.append(f"Expected number, got {type(value).__name__}")
        elif base == "boolean":
            if not isinstance(value, bool):
                errors.append(f"Expected boolean, got {type(value).__name__}")
        elif base == "datetime" or base == "date":
            if not isinstance(value, str):
                errors.append(f"Expected {base} string, got {type(value).__name__}")
        elif base == "object":
            if not isinstance(value, dict):
                errors.append(f"Expected object, got {type(value).__name__}")
        elif base == "enum":
            allowed = field_info.get("values", [])
            if value not in allowed:
                errors.append(f"Value '{value}' not in allowed enum values: {allowed}")
        elif base == "ref":
            # References are strings (node IDs) - loose validation
            if not isinstance(value, str):
                errors.append(f"Expected ref string, got {type(value).__name__}")
        return errors

    def validate_node(self, node_type: str, data: dict) -> tuple[bool, list[str]]:
        """Validate node data against schema.

        Args:
            node_type: The entity type (e.g. "message", "event").
            data: The node data dictionary.

        Returns:
            Tuple of (is_valid, list_of_error_strings).
        """
        errors = []
        entities = self._schema.get("entities", {})

        if node_type not in entities:
            errors.append(f"Unknown node type: '{node_type}'")
            return (False, errors)

        entity_def = entities[node_type]
        fields = entity_def.get("fields", {})

        # Check required fields are present
        for field_name, type_str in fields.items():
            field_info = self._parse_field_type(type_str)
            if not field_info["optional"] and field_name not in data:
                errors.append(f"Missing required field: '{field_name}'")

        # Validate provided fields
        for field_name, value in data.items():
            if field_name not in fields:
                # Extra fields are allowed (extensible schema)
                continue
            type_str = fields[field_name]
            field_info = self._parse_field_type(type_str)
            field_errors = self._validate_field_value(value, field_info)
            for e in field_errors:
                errors.append(f"Field '{field_name}': {e}")

        return (len(errors) == 0, errors)

    def validate_edge(self, rel_type: str, source_type: str, target_type: str) -> tuple[bool, list[str]]:
        """Validate edge type is allowed between source and target types.

        Args:
            rel_type: The relationship type (e.g. "mentions", "attends").
            source_type: The source node entity type.
            target_type: The target node entity type.

        Returns:
            Tuple of (is_valid, list_of_error_strings).
        """
        errors = []
        relationships = self._schema.get("relationships", {})

        if rel_type not in relationships:
            errors.append(f"Unknown relationship type: '{rel_type}'")
            return (False, errors)

        rel_def = relationships[rel_type]
        # Parse relationship definition like "contact -> message[]" or "* -> *"
        parts = rel_def.replace(" ", "").split("->")
        if len(parts) != 2:
            errors.append(f"Malformed relationship definition: '{rel_def}'")
            return (False, errors)

        allowed_source = parts[0]
        allowed_target_raw = parts[1]

        # Strip trailing [] from target
        allowed_target = allowed_target_raw.rstrip("[]")

        # Check source type
        if allowed_source != "*" and source_type != allowed_source:
            errors.append(
                f"Relationship '{rel_type}' requires source type '{allowed_source}', "
                f"got '{source_type}'"
            )

        # Check target type -- may include pipe-separated alternatives like "issue|task"
        if allowed_target != "*":
            allowed_targets = allowed_target.split("|")
            if target_type not in allowed_targets:
                errors.append(
                    f"Relationship '{rel_type}' requires target type in {allowed_targets}, "
                    f"got '{target_type}'"
                )

        return (len(errors) == 0, errors)

    def get_required_fields(self, node_type: str) -> list[str]:
        """Get required fields for a node type.

        Args:
            node_type: The entity type.

        Returns:
            List of field names that are required (non-optional).
        """
        entities = self._schema.get("entities", {})
        if node_type not in entities:
            return []

        fields = entities[node_type].get("fields", {})
        required = []
        for field_name, type_str in fields.items():
            field_info = self._parse_field_type(type_str)
            if not field_info["optional"]:
                required.append(field_name)

        return required

    def get_node_types(self) -> list[str]:
        """Return all known entity/node types from the schema."""
        return list(self._schema.get("entities", {}).keys())

    def get_relationship_types(self) -> list[str]:
        """Return all known relationship types from the schema."""
        return list(self._schema.get("relationships", {}).keys())
