import os
import json
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any
import google.generativeai as genai


logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, api_key: str, root_dir: Path):
        self.api_key = api_key
        self.root_dir = root_dir
        self.index_path = root_dir / "vector_index.json"
        self.docs_dir = root_dir / "docs"
        self.guides_path = root_dir.parent / "frontend" / "constants" / "guides.ts"
        self.index = []
        
        genai.configure(api_key=api_key)
        self.model = "models/text-embedding-004"

    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text chunk (async)."""
        try:
            # genai.embed_content is sync, so we run it in a thread
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: genai.embed_content(
                    model=self.model,
                    content=text,
                    task_type="retrieval_document"
                )
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return []

    def _chunk_markdown(self, text: str, source: str) -> List[Dict[str, Any]]:
        """Chunk markdown text into smaller pieces."""
        chunks = []
        # Split by H2 or H3 headers
        sections = []
        current_section = ""
        lines = text.split('\n')
        
        for line in lines:
            if line.startswith('## ') or line.startswith('### '):
                if current_section.strip():
                    sections.append(current_section.strip())
                current_section = line + "\n"
            else:
                current_section += line + "\n"
        
        if current_section.strip():
            sections.append(current_section.strip())

        for section in sections:
            # If section is too large, split by paragraph
            if len(section) > 1500:
                parts = section.split('\n\n')
                for part in parts:
                    if part.strip():
                        chunks.append({"content": part.strip(), "source": source})
            else:
                chunks.append({"content": section, "source": source})
        
        return chunks

    def _chunk_guides(self) -> List[Dict[str, Any]]:
        """Parse and chunk guides.ts."""
        chunks = []
        if not self.guides_path.exists():
            return chunks

        try:
            with open(self.guides_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Simple regex-based parsing for the Constant structure
            import re
            # Extract blocks like: products: { title: "...", steps: [...] }
            # This is a bit fragile but works for the current structure
            guide_blocks = re.findall(r'(\w+):\s*{\s*title:\s*"([^"]+)",\s*steps:\s*\[([\s\S]*?)\]\s*}', content)
            
            for key, title, steps_content in guide_blocks:
                # Extract individual steps
                steps = re.findall(r'{\s*icon:\s*"[^"]*",\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"\s*}', steps_content)
                for step_title, step_desc in steps:
                    text = f"Guide {title} - {step_title}: {step_desc}"
                    chunks.append({"content": text, "source": f"guides.ts:{key}"})
        except Exception as e:
            logger.error(f"Error parsing guides: {e}")
            
        return chunks

    async def index_documents(self):
        """Index all documentation and guides (async)."""
        all_chunks = []
        
        # 1. Process Markdown files
        if self.docs_dir.exists():
            for md_file in self.docs_dir.glob("*.md"):
                try:
                    with open(md_file, "r", encoding="utf-8") as f:
                        content = f.read()
                    all_chunks.extend(self._chunk_markdown(content, md_file.name))
                except Exception as e:
                    logger.error(f"Error reading {md_file}: {e}")

        # 2. Process Guides
        all_chunks.extend(self._chunk_guides())

        logger.info(f"Indexing {len(all_chunks)} chunks...")
        
        self.index = []
        for chunk in all_chunks:
            embedding = await self._generate_embedding(chunk["content"])
            if embedding:
                chunk["embedding"] = embedding
                self.index.append(chunk)

        # Save to cache
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: json.dump(self.index, open(self.index_path, "w", encoding="utf-8"), ensure_ascii=False)
        )
        
        logger.info("Indexing complete.")

    async def load_index(self):
        """Load index from cache."""
        if self.index_path.exists():
            loop = asyncio.get_event_loop()
            self.index = await loop.run_in_executor(
                None,
                lambda: json.load(open(self.index_path, "r", encoding="utf-8"))
            )
            logger.info(f"Loaded {len(self.index)} chunks from index.")
            return True
        return False

    async def get_relevant_context(self, query: str, limit: int = 5) -> str:
        """Find most relevant chunks for a query using manual cosine similarity."""
        if not self.index:
            if not await self.load_index():
                return ""

        query_embedding = await self._generate_embedding(query)
        if not query_embedding:
            return ""

        def dot_product(v1, v2):
            return sum(x * y for x, y in zip(v1, v2))

        def magnitude(v):
            return sum(x * x for x in v) ** 0.5

        # Calculate cosine similarity
        similarities = []
        q_mag = magnitude(query_embedding)
        
        for chunk in self.index:
            c_emb = chunk["embedding"]
            c_mag = magnitude(c_emb)
            
            if q_mag == 0 or c_mag == 0:
                score = 0
            else:
                score = dot_product(query_embedding, c_emb) / (q_mag * c_mag)
            
            similarities.append((score, chunk))

        # Sort by score descending
        similarities.sort(key=lambda x: x[0], reverse=True)
        
        # Format results
        top_chunks = similarities[:limit]
        context = "\n\n".join([f"--- [Source: {c['source']}] ---\n{c['content']}" for score, c in top_chunks if score > 0.4])
        
        return context
