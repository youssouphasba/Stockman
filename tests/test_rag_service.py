import asyncio
import sys
import tempfile
import types
import unittest
from pathlib import Path

# La bibliothèque Google n'est pas nécessaire pour ces tests : on la simule.
fake_genai = types.ModuleType("google.generativeai")
fake_genai.configure = lambda **_kwargs: None
fake_google = sys.modules.setdefault("google", types.ModuleType("google"))
fake_google.generativeai = fake_genai
sys.modules["google.generativeai"] = fake_genai

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from services.rag_service import RAGService  # noqa: E402


def run(coro):
    return asyncio.run(coro)


def fake_embed(model, content, task_type, output_dimensionality=None):
    texts = content if isinstance(content, list) else [content]
    vectors = [[1.0, 0.0] if "produit" in text.lower() else [0.0, 1.0] for text in texts]
    return {"embedding": vectors if isinstance(content, list) else vectors[0]}


def failing_embed(**_kwargs):
    raise RuntimeError("429 Your prepayment credits are depleted")


class RagServiceTests(unittest.TestCase):
    def make_service(self):
        root = Path(tempfile.mkdtemp())
        service = RAGService(api_key="test", root_dir=root)
        service.index_path = root / "index.json"
        service.index = [
            {"content": "## Créer un produit\\nOuvrez Produits puis Ajouter.", "source": "features.md", "audience": "all", "language": "fr"},
            {"content": "## Clients\\nLa fiche client montre les achats.", "source": "features.md", "audience": "all", "language": "fr"},
        ]
        return service

    def test_keyword_search_keeps_working_when_embeddings_fail(self):
        fake_genai.embed_content = failing_embed
        service = self.make_service()
        run(service._fill_missing_embeddings())
        context = run(service.get_relevant_context("comment creer un produit"))
        self.assertIn("Créer un produit", context)
        self.assertEqual(service.status()["mode"], "keywords")
        self.assertIn("prepayment", service.status()["last_error"])

    def test_embeddings_are_filled_once_the_service_answers(self):
        fake_genai.embed_content = fake_embed
        service = self.make_service()
        run(service._fill_missing_embeddings())
        self.assertEqual(service.status()["embedded_chunks"], 2)
        context = run(service.get_relevant_context("ajouter un produit", limit=1))
        self.assertIn("Créer un produit", context)
        self.assertEqual(service.status()["mode"], "semantic")

    def test_failure_is_retried_after_delay_instead_of_forever(self):
        fake_genai.embed_content = failing_embed
        service = self.make_service()
        run(service._fill_missing_embeddings())
        self.assertGreater(service.status()["next_retry_in_seconds"], 0)
        service.embedding_retry_at = 0
        fake_genai.embed_content = fake_embed
        run(service._fill_missing_embeddings())
        self.assertEqual(service.status()["embedded_chunks"], 2)


if __name__ == "__main__":
    unittest.main()
