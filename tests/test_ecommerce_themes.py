import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from ecommerce_themes import legacy_theme_identity


class BasicThemeTests(unittest.TestCase):
    def test_identity_is_additive_and_has_no_commercial_values(self):
        self.assertEqual(legacy_theme_identity(), {
            "model_id": "legacy-v1", "model_name": "Stockman Basic", "theme_schema_version": 1,
        })
