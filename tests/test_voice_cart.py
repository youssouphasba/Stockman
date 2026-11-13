import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from voice_cart import analyze_text, match_products_from_text  # noqa: E402


def product(name):
    return {"product_id": name, "name": name}


CATALOG = [
    product("Gaze pièce"),
    product("Eau pour préparation injectable - XXI- INSULINES ET AUTRES"),
    product("Oxybuprocaïne 40mg collyre - Cébésine"),
    product("Coca-Cola 33cl"),
    product("Savon de Marseille"),
    product("Savon liquide"),
]


def names(results):
    return [(item["product"]["name"], item["qty"]) for item in results]


class VoiceCartMatchingTest(unittest.TestCase):
    def test_spelling_close_to_the_product_name(self):
        self.assertEqual(names(match_products_from_text("gaz pièce", CATALOG)), [("Gaze pièce", 1)])
        self.assertEqual(names(match_products_from_text("Gazes pieces.", CATALOG)), [("Gaze pièce", 1)])

    def test_accents_and_case_are_ignored(self):
        self.assertEqual(names(match_products_from_text("GAZE PIECE", CATALOG)), [("Gaze pièce", 1)])

    def test_partial_name_when_only_one_product_matches(self):
        self.assertEqual(
            names(match_products_from_text("trois oxybuprocaine", CATALOG)),
            [("Oxybuprocaïne 40mg collyre - Cébésine", 3)],
        )

    def test_ambiguous_partial_name_is_not_added(self):
        self.assertEqual(match_products_from_text("savon", CATALOG), [])
        self.assertEqual(names(match_products_from_text("savon liquide", CATALOG)), [("Savon liquide", 1)])

    def test_ambiguous_name_is_offered_as_a_choice(self):
        result = analyze_text("deux savon et gaz pièce", CATALOG)
        self.assertEqual(names(result["matches"]), [("Gaze pièce", 1)])
        self.assertEqual(len(result["suggestions"]), 1)
        suggestion = result["suggestions"][0]
        self.assertEqual(suggestion["said"], "savon")
        self.assertEqual(suggestion["qty"], 2)
        self.assertEqual(
            sorted(item["name"] for item in suggestion["products"]),
            ["Savon de Marseille", "Savon liquide"],
        )

    def test_word_beginning_is_enough_when_the_end_is_garbled(self):
        self.assertEqual(
            names(match_products_from_text("oxybupreakain", CATALOG)),
            [("Oxybuprocaïne 40mg collyre - Cébésine", 1)],
        )
        # Même début pour deux produits : on propose, on ne choisit pas à la place du commerçant.
        result = analyze_text("savonxyz", CATALOG)
        self.assertEqual(result["matches"], [])
        self.assertEqual(len(result["suggestions"][0]["products"]), 2)

    def test_distant_spelling_is_offered_not_added(self):
        result = analyze_text("oxibuprokaine", CATALOG)
        self.assertEqual(result["matches"], [])
        self.assertEqual(
            [item["name"] for item in result["suggestions"][0]["products"]],
            ["Oxybuprocaïne 40mg collyre - Cébésine"],
        )

    def test_recognized_product_is_not_suggested_again(self):
        result = analyze_text("savon liquide", CATALOG)
        self.assertEqual(names(result["matches"]), [("Savon liquide", 1)])
        self.assertEqual(result["suggestions"], [])

    def test_quantities(self):
        self.assertEqual(
            names(match_products_from_text("2 gaze pièce et coca cola fois 4", CATALOG)),
            [("Gaze pièce", 2), ("Coca-Cola 33cl", 4)],
        )
        self.assertEqual(
            names(match_products_from_text("deux boîtes de gaz pièce", CATALOG)),
            [("Gaze pièce", 2)],
        )

    def test_unknown_words_match_nothing(self):
        self.assertEqual(match_products_from_text("bonjour comment ça va", CATALOG), [])
        self.assertEqual(match_products_from_text("", CATALOG), [])


if __name__ == "__main__":
    unittest.main()
