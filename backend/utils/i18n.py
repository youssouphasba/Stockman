import json
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class TranslationHelper:
    _instance = None
    _translations: Dict[str, Dict[str, Any]] = {}
    _locales_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "locales")

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TranslationHelper, cls).__new__(cls)
            cls._instance._load_translations()
        return cls._instance

    def _load_translations(self):
        """Load all JSON translation files from the frontend locales directory."""
        if not os.path.exists(self._locales_path):
            logger.error(f"Locales path not found: {self._locales_path}")
            return

        for filename in os.listdir(self._locales_path):
            if filename.endswith(".json"):
                lang = filename.split(".")[0]
                filepath = os.path.join(self._locales_path, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        self._translations[lang] = json.load(f)
                    logger.info(f"Loaded translations for language: {lang}")
                except Exception as e:
                    logger.error(f"Error loading translation file {filename}: {e}")

    def t(self, key: str, lang: str = "fr", **kwargs) -> str:
        """
        Translate a key into the specified language.
        Usage: t("dashboard.title", "fr", name="Stockman")
        """
        if not lang:
            lang = "fr"
        
        # Normalize lang (e.g., fr-FR -> fr)
        lang_code = lang.split("-")[0].lower()
        
        # Fallback order: requested lang -> fr -> en -> raw key
        translations = self._translations.get(lang_code)
        if not translations:
            translations = self._translations.get("fr", {})

        parts = key.split(".")
        value = translations
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                value = None
                break
        
        # If not found in requested lang, try fallback to FR
        if value is None and lang_code != "fr":
            value = self._get_nested_value(self._translations.get("fr", {}), parts)
            
        if value is None:
            return key
            
        try:
            if kwargs:
                return str(value).format(**kwargs)
            return str(value)
        except Exception as e:
            logger.warning(f"Formatting error for key {key} in lang {lang_code}: {e}")
            return str(value)

    def _get_nested_value(self, data: Dict[str, Any], parts: list) -> Optional[Any]:
        value = data
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        return value

# Singleton instance
i18n = TranslationHelper()
