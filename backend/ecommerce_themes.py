LEGACY_MODEL_ID = "legacy-v1"
LEGACY_MODEL_NAME = "Stockman Basic"
THEME_SCHEMA_VERSION = 1


def legacy_theme_identity() -> dict:
    return {
        "model_id": LEGACY_MODEL_ID,
        "model_name": LEGACY_MODEL_NAME,
        "theme_schema_version": THEME_SCHEMA_VERSION,
    }
