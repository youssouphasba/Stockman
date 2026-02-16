import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend to sys.path
ROOT_DIR = Path(__file__).parent
sys.path.append(str(ROOT_DIR))

from services.rag_service import RAGService

load_dotenv(ROOT_DIR / '.env')

def test_rag():
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GOOGLE_API_KEY not found")
        return

    rag = RAGService(api_key, ROOT_DIR)

    print("--- 1. Indexing Documents ---")
    rag.index_documents()

    print("\n--- 2. Testing Retrieval (Guide) ---")
    query = "Comment ajouter un produit ?"
    context = rag.get_relevant_context(query)
    print(f"Query: {query}")
    print(f"Context found:\n{context[:500]}...")

    print("\n--- 3. Testing Retrieval (CGU) ---")
    query = "Quelles sont les règles sur la vie privée ?"
    context = rag.get_relevant_context(query)
    print(f"Query: {query}")
    print(f"Context found:\n{context[:500]}...")

if __name__ == "__main__":
    test_rag()
