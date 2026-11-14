import asyncio
import json
import logging
import os
import re
import time
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

import google.generativeai as genai


logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self, api_key: str, root_dir: Path):
        self.api_key = api_key
        self.root_dir = root_dir
        self.index_version = 52
        self.index_path = root_dir / "vector_index.json"
        self.docs_dir = root_dir / "docs"
        self.web_guides_dir = self.docs_dir / "web-guides"
        self.backend_server_path = root_dir / "server.py"
        self.enterprise_access_path = root_dir / "enterprise_access.py"
        self.guides_path = root_dir.parent / "frontend" / "constants" / "guides.ts"
        self.help_content_path = root_dir.parent / "frontend" / "constants" / "helpContent.ts"
        self.frontend_locales_dir = root_dir.parent / "frontend" / "locales"
        self.mobile_root_dir = root_dir.parent / "frontend"
        self.web_root_dir = root_dir.parent / "web-app"
        self.index: List[Dict[str, Any]] = []

        genai.configure(api_key=api_key)
        # text-embedding-004 et embedding-001 ont été retirés par Google (erreur 404) :
        # gemini-embedding-001, réduit à 768 dimensions pour garder un index léger.
        configured_model = (os.getenv("RAG_EMBED_MODEL") or "").strip()
        default_candidates = ["models/gemini-embedding-001"]
        self.embedding_models = [configured_model, *default_candidates] if configured_model else default_candidates
        self.embedding_models = list(dict.fromkeys([m for m in self.embedding_models if m]))
        self.model = self.embedding_models[0]
        self.embedding_dimensions = int(os.getenv("RAG_EMBED_DIMENSIONS") or 768)
        # Une panne (crédit épuisé, quota) ne coupe plus les embeddings pour toujours : nouvel essai après un délai.
        self.embedding_retry_at = 0.0
        self.embedding_retry_delay = 600.0
        self.last_embedding_error: Optional[str] = None
        self.last_embedding_error_at: Optional[float] = None
        self._embedding_fill_task: Optional[asyncio.Task] = None

    def _embedding_available(self) -> bool:
        return time.time() >= self.embedding_retry_at

    def _record_embedding_failure(self, error: Exception) -> None:
        self.last_embedding_error = str(error)[:300]
        self.last_embedding_error_at = time.time()
        self.embedding_retry_at = time.time() + self.embedding_retry_delay
        logger.error("RAG embedding unavailable (%s). Next attempt in %ss. Error: %s", self.embedding_models, int(self.embedding_retry_delay), error)
        try:
            import ai_health
            ai_health.record_failure(error, "recherche documentaire")
        except Exception:
            pass

    def _embed_call(self, model: str, content: Any, task_type: str) -> Any:
        kwargs = {"model": model, "content": content, "task_type": task_type}
        if self.embedding_dimensions:
            try:
                return genai.embed_content(output_dimensionality=self.embedding_dimensions, **kwargs)
            except TypeError:
                # Ancienne version de la bibliothèque sans réduction de dimension.
                pass
        return genai.embed_content(**kwargs)

    async def _embed(self, contents: List[str], task_type: str) -> List[List[float]]:
        """Embeddings d'une liste de textes ; liste vide si le service est indisponible."""
        if not contents or not self._embedding_available():
            return []
        loop = asyncio.get_event_loop()
        last_error: Optional[Exception] = None
        for candidate in self.embedding_models:
            try:
                payload: Any = contents if len(contents) > 1 else contents[0]
                result = await loop.run_in_executor(None, lambda c=candidate: self._embed_call(c, payload, task_type))
                vectors = result.get("embedding", []) or []
                if vectors and not isinstance(vectors[0], list):
                    vectors = [vectors]
                if len(vectors) != len(contents):
                    raise ValueError(f"{len(vectors)} embeddings reçus pour {len(contents)} textes")
                if self.model != candidate:
                    logger.info(f"RAG embedding model switched to {candidate}")
                self.model = candidate
                self.last_embedding_error = None
                return vectors
            except Exception as e:
                last_error = e
        self._record_embedding_failure(last_error or RuntimeError("embedding failed"))
        return []

    async def _generate_embedding(self, text: str, task_type: str = "retrieval_document") -> List[float]:
        vectors = await self._embed([text], task_type)
        return vectors[0] if vectors else []

    async def _fill_missing_embeddings(self) -> None:
        """Calcule les embeddings manquants par lots, puis met le cache à jour."""
        missing = [chunk for chunk in self.index if not chunk.get("embedding")]
        if not missing:
            return
        batch_size = 50
        filled = 0
        for start in range(0, len(missing), batch_size):
            batch = missing[start:start + batch_size]
            vectors = await self._embed([chunk["content"] for chunk in batch], "retrieval_document")
            if not vectors:
                break
            for chunk, vector in zip(batch, vectors):
                chunk["embedding"] = vector
            filled += len(batch)
            await asyncio.sleep(0.2)
        if filled:
            await self._save_index()
        logger.info("RAG embeddings: %s/%s chunks embedded.", sum(1 for c in self.index if c.get("embedding")), len(self.index))

    def _schedule_embedding_fill(self) -> None:
        if self._embedding_fill_task and not self._embedding_fill_task.done():
            return
        if not self._embedding_available() or all(chunk.get("embedding") for chunk in self.index):
            return
        try:
            self._embedding_fill_task = asyncio.get_event_loop().create_task(self._fill_missing_embeddings())
        except RuntimeError:
            pass

    async def _save_index(self) -> None:
        loop = asyncio.get_event_loop()
        snapshot = {"version": self.index_version, "model": self.model, "chunks": self.index}

        def write():
            with open(self.index_path, "w", encoding="utf-8") as handle:
                json.dump(snapshot, handle, ensure_ascii=False)

        await loop.run_in_executor(None, write)

    def status(self) -> Dict[str, Any]:
        """État de la recherche documentaire, pour le monitoring de l'admin."""
        embedded = sum(1 for chunk in self.index if chunk.get("embedding"))
        return {
            "chunks": len(self.index),
            "embedded_chunks": embedded,
            "model": self.model,
            "mode": "semantic" if embedded else ("keywords" if self.index else "empty"),
            "last_error": self.last_embedding_error,
            "last_error_at": self.last_embedding_error_at,
            "next_retry_in_seconds": max(0, int(self.embedding_retry_at - time.time())) if self.embedding_retry_at else 0,
        }

    def _chunk_markdown(
        self,
        text: str,
        source: str,
        audience: str = "all",
        language: str = "fr",
    ) -> List[Dict[str, Any]]:
        """Chunk markdown text into smaller pieces."""
        chunks: List[Dict[str, Any]] = []
        sections: List[str] = []
        current_section = ""

        for line in text.split("\n"):
            if line.startswith("## ") or line.startswith("### "):
                if current_section.strip():
                    sections.append(current_section.strip())
                current_section = line + "\n"
            else:
                current_section += line + "\n"

        if current_section.strip():
            sections.append(current_section.strip())

        for section in sections:
            if len(section) > 1500:
                for part in section.split("\n\n"):
                    if part.strip():
                        chunks.append(
                            {
                                "content": part.strip(),
                                "source": source,
                                "audience": audience,
                                "language": language,
                            }
                        )
            else:
                chunks.append(
                    {
                        "content": section,
                        "source": source,
                        "audience": audience,
                        "language": language,
                    }
                )

        return chunks

    def _guide_audience(self, key: str) -> str:
        if key.startswith("restaurant"):
            return "restaurant"
        if key.startswith("supplier"):
            return "supplier"
        return "default"

    def _doc_audience(self, key: str) -> str:
        normalized = (key or "").lower()
        if normalized.startswith("restaurant") or normalized in {"cuisine", "reservations", "tables"}:
            return "restaurant"
        if normalized.startswith("supplier") or "fournisseur" in normalized:
            return "supplier"
        return "default"

    def _source_audience(self, source: str) -> str:
        normalized = source.lower()
        if "supplier" in normalized or "fournisseur" in normalized:
            return "supplier"
        if any(keyword in normalized for keyword in ("restaurant", "kitchen", "reservation", "table")):
            return "restaurant"
        return "default"

    def _source_platform(self, source: str) -> str:
        normalized = source.lower()
        if normalized.startswith("web/") or "web-app" in normalized:
            return "web"
        if normalized.startswith("mobile/") or "\\frontend\\" in normalized or "/frontend/" in normalized:
            return "mobile"
        return "all"

    def _chunk_code_file(
        self,
        path: Path,
        source: str,
        audience: Optional[str] = None,
        platform: Optional[str] = None,
        chunk_size: int = 80,
        overlap: int = 10,
    ) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        if not path.exists():
            return chunks

        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except Exception as e:
            logger.error(f"Error reading code file {path}: {e}")
            return chunks

        resolved_audience = audience or self._source_audience(source)
        resolved_platform = platform or self._source_platform(source)
        step = max(1, chunk_size - overlap)

        for start in range(0, len(lines), step):
            end = min(len(lines), start + chunk_size)
            snippet_lines = lines[start:end]
            if not any(line.strip() for line in snippet_lines):
                continue

            header = (
                f"Code metier source={source} plateforme={resolved_platform} "
                f"audience={resolved_audience} lignes={start + 1}-{end}"
            )
            content = header + "\n" + "\n".join(snippet_lines).strip()
            chunks.append(
                {
                    "content": content,
                    "source": source,
                    "audience": resolved_audience,
                    "language": "code",
                    "platform": resolved_platform,
                }
            )
            if end >= len(lines):
                break

        return chunks

    def _chunk_business_code(self) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []

        backend_files = [
            (self.backend_server_path, "backend/server.py", "default", "all"),
            (self.enterprise_access_path, "backend/enterprise_access.py", "default", "all"),
        ]
        for path, source, audience, platform in backend_files:
            chunks.extend(
                self._chunk_code_file(
                    path,
                    source,
                    audience=audience,
                    platform=platform,
                    chunk_size=90,
                    overlap=12,
                )
            )

        mobile_files = [
            ("app/(tabs)/products.tsx", "mobile/products.tsx"),
            ("app/(tabs)/orders.tsx", "mobile/orders.tsx"),
            ("app/(tabs)/suppliers.tsx", "mobile/suppliers.tsx"),
            ("app/(tabs)/subscription.tsx", "mobile/subscription.tsx"),
            ("app/(tabs)/settings.tsx", "mobile/settings.tsx"),
            ("app/(tabs)/accounting.tsx", "mobile/accounting.tsx"),
            ("app/(tabs)/crm.tsx", "mobile/crm.tsx"),
            ("app/(supplier-tabs)/orders.tsx", "mobile/supplier-orders.tsx"),
            ("app/(supplier-tabs)/catalog.tsx", "mobile/supplier-catalog.tsx"),
            ("app/(auth)/login.tsx", "mobile/auth-login.tsx"),
            ("app/(auth)/register.tsx", "mobile/auth-register.tsx"),
            ("services/api.ts", "mobile/services-api.ts"),
        ]
        for rel_path, source in mobile_files:
            chunks.extend(
                self._chunk_code_file(
                    self.mobile_root_dir / rel_path,
                    source,
                    platform="mobile",
                    chunk_size=75,
                    overlap=8,
                )
            )

        web_files = [
            ("src/components/Inventory.tsx", "web/inventory.tsx"),
            ("src/components/Suppliers.tsx", "web/suppliers.tsx"),
            ("src/components/Accounting.tsx", "web/accounting.tsx"),
            ("src/components/CRM.tsx", "web/crm.tsx"),
            ("src/components/POS.tsx", "web/pos.tsx"),
            ("src/components/Settings.tsx", "web/settings.tsx"),
            ("src/components/Subscription.tsx", "web/subscription.tsx"),
            ("src/components/AdminDashboard.tsx", "web/admin-dashboard.tsx"),
            ("src/services/api.ts", "web/services-api.ts"),
        ]
        for rel_path, source in web_files:
            chunks.extend(
                self._chunk_code_file(
                    self.web_root_dir / rel_path,
                    source,
                    platform="web",
                    chunk_size=75,
                    overlap=8,
                )
            )

        return chunks

    def _chunk_guides(self) -> List[Dict[str, Any]]:
        """Parse and chunk guides.ts."""
        chunks: List[Dict[str, Any]] = []
        if not self.guides_path.exists():
            return chunks

        try:
            content = self.guides_path.read_text(encoding="utf-8")
            guide_blocks = re.findall(
                r'(\w+):\s*{\s*title:\s*"([^"]+)",\s*steps:\s*\[([\s\S]*?)\]\s*}',
                content,
            )
            for key, title, steps_content in guide_blocks:
                audience = self._guide_audience(key)
                steps = re.findall(
                    r'{\s*icon:\s*"[^"]*",\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)"\s*}',
                    steps_content,
                )
                for step_title, step_desc in steps:
                    chunks.append(
                        {
                            "content": f"Guide {title} - {step_title}: {step_desc}",
                            "source": f"guides.ts:{key}",
                            "audience": audience,
                            "language": "fr",
                        }
                    )
        except Exception as e:
            logger.error(f"Error parsing guides: {e}")

        return chunks

    def _chunk_help_content(self) -> List[Dict[str, Any]]:
        """Parse literal mobile help content that is not fully represented in locale files."""
        chunks: List[Dict[str, Any]] = []
        if not self.help_content_path.exists():
            return chunks

        try:
            content = self.help_content_path.read_text(encoding="utf-8")
            module_blocks = re.findall(
                r"key:\s*'([^']+)'.*?title:\s*(?:'([^']+)'|\"([^\"]+)\").*?features:\s*\[([\s\S]*?)\]\s*,\s*role:",
                content,
            )
            for key, title_single, title_double, features_block in module_blocks:
                module_title = (title_single or title_double or key).strip()
                audience = self._guide_audience(key)
                feature_matches = re.findall(
                    r"title:\s*(?:'([^']+)'|\"([^\"]+)\"),\s*description:\s*(?:'([^']+)'|\"([^\"]+)\")",
                    features_block,
                )
                for title_a, title_b, desc_a, desc_b in feature_matches:
                    feature_title = (title_a or title_b or "").strip()
                    feature_desc = (desc_a or desc_b or "").strip()
                    if not feature_title or not feature_desc:
                        continue
                    if feature_title.startswith("help.") or feature_desc.startswith("help."):
                        continue
                    chunks.append(
                        {
                            "content": f"Centre d'aide {module_title} - {feature_title}: {feature_desc}",
                            "source": f"helpContent.ts:{key}",
                            "audience": audience,
                            "language": "fr",
                        }
                    )
        except Exception as e:
            logger.error(f"Error parsing help content: {e}")

        return chunks

    def _chunk_localized_help(self) -> List[Dict[str, Any]]:
        """Extract FAQ and help module content from locale files for better support answers."""
        chunks: List[Dict[str, Any]] = []
        locale_files = {
            "fr": self.frontend_locales_dir / "fr.json",
            "en": self.frontend_locales_dir / "en.json",
        }

        for lang, path in locale_files.items():
            if not path.exists():
                continue
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception as e:
                logger.error(f"Error loading locale file {path}: {e}")
                continue

            faq = (((data.get("help") or {}).get("faq")) or {})
            for key, value in faq.items():
                if not isinstance(value, dict):
                    continue
                question = str(value.get("q", "")).strip()
                answer = str(value.get("a", "")).strip()
                if not question or not answer:
                    continue
                audience = "restaurant" if key.startswith(("q13", "q14", "q15", "q16", "q17", "q18")) else "default"
                chunks.append(
                    {
                        "content": f"FAQ: {question}\nReponse: {answer}",
                        "source": f"locales/{lang}.json:help.faq.{key}",
                        "audience": audience,
                        "language": lang,
                    }
                )

            modules = (((data.get("help") or {}).get("modules")) or {})
            for module_key, module_value in modules.items():
                if not isinstance(module_value, dict):
                    continue
                module_title = str(module_value.get("title", "")).strip()
                audience = self._guide_audience(module_key)
                for feature_key, feature_value in module_value.items():
                    if not isinstance(feature_value, dict):
                        continue
                    feature_title = str(feature_value.get("t", "")).strip()
                    feature_desc = str(feature_value.get("d", "")).strip()
                    if not feature_title or not feature_desc:
                        continue
                    chunks.append(
                        {
                            "content": f"Module {module_title or module_key} - {feature_title}: {feature_desc}",
                            "source": f"locales/{lang}.json:help.modules.{module_key}.{feature_key}",
                            "audience": audience,
                            "language": lang,
                        }
                    )

        return chunks

    def _chunk_web_guides(self) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        if not self.web_guides_dir.exists():
            return chunks

        for md_file in self.web_guides_dir.glob("*.md"):
            try:
                content = md_file.read_text(encoding="utf-8")
                chunks.extend(
                    self._chunk_markdown(
                        content,
                        f"web-guides/{md_file.name}",
                        audience=self._doc_audience(md_file.stem),
                        language="fr",
                    )
                )
            except Exception as e:
                logger.error(f"Error reading web guide {md_file}: {e}")

        return chunks

    async def index_documents(self):
        """Index all documentation and guides (async)."""
        all_chunks: List[Dict[str, Any]] = []

        if self.docs_dir.exists():
            for md_file in self.docs_dir.glob("*.md"):
                try:
                    content = md_file.read_text(encoding="utf-8")
                    all_chunks.extend(self._chunk_markdown(content, md_file.name))
                except Exception as e:
                    logger.error(f"Error reading {md_file}: {e}")

        all_chunks.extend(self._chunk_guides())
        all_chunks.extend(self._chunk_help_content())
        all_chunks.extend(self._chunk_localized_help())
        all_chunks.extend(self._chunk_web_guides())
        all_chunks.extend(self._chunk_business_code())

        logger.info(f"Indexing {len(all_chunks)} chunks...")

        # Tous les passages restent dans l'index, même sans embedding : la recherche par mots-clés
        # les trouve, et les embeddings manquants sont recalculés dès que le service répond.
        self.index = all_chunks
        await self._fill_missing_embeddings()
        await self._save_index()

        logger.info("Indexing complete.")

    async def load_index(self):
        """Load index from cache."""
        if self.index_path.exists():
            loop = asyncio.get_event_loop()
            payload = await loop.run_in_executor(
                None,
                lambda: json.load(open(self.index_path, "r", encoding="utf-8")),
            )
            if isinstance(payload, dict) and payload.get("version") == self.index_version and payload.get("chunks"):
                self.index = payload.get("chunks", [])
                self._schedule_embedding_fill()
            else:
                logger.info("RAG index cache is outdated; rebuilding.")
                return False
            logger.info(f"Loaded {len(self.index)} chunks from index.")
            return True
        return False

    def _audience_matches(self, chunk_audience: str, sector: Optional[str]) -> bool:
        if chunk_audience == "all":
            return True
        if sector == "restaurant":
            return chunk_audience in {"restaurant", "all"}
        if sector == "supplier":
            return chunk_audience in {"supplier", "all"}
        return chunk_audience in {"default", "all"}

    def _platform_matches(self, chunk_platform: str, platform: Optional[str]) -> bool:
        if not platform or chunk_platform in {"all", "", None}:
            return True
        return chunk_platform == platform

    @staticmethod
    def _tokens(text: str) -> List[str]:
        """Mots de 3 lettres ou plus, sans accents : « créer » et « creer » se rejoignent."""
        normalized = unicodedata.normalize("NFKD", (text or "").lower())
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        return re.findall(r"[a-z0-9_]{3,}", normalized)

    def _keyword_fallback_context(
        self,
        query: str,
        limit: int = 7,
        sector: Optional[str] = None,
        language: str = "fr",
        platform: Optional[str] = None,
    ) -> str:
        query_tokens = set(self._tokens(query))
        if not query_tokens:
            return ""

        scored: List[tuple[int, Dict[str, Any]]] = []
        for chunk in self.index:
            if not self._audience_matches(chunk.get("audience", "all"), sector):
                continue
            if not self._platform_matches(chunk.get("platform", "all"), platform):
                continue
            chunk_lang = chunk.get("language")
            if chunk_lang and chunk_lang not in {language, "fr", "en", "code"}:
                continue

            content = (chunk.get("content") or "").lower()
            content_tokens = set(self._tokens(content))
            overlap = len(query_tokens.intersection(content_tokens))
            if overlap <= 0:
                continue
            scored.append((overlap, chunk))

        scored.sort(key=lambda item: item[0], reverse=True)
        top_chunks = scored[:limit]
        return "\n\n".join(
            [
                f"--- [Source: {chunk['source']}] ---\n{chunk['content']}"
                for score, chunk in top_chunks
                if score > 0
            ]
        )

    async def get_relevant_context(
        self,
        query: str,
        limit: int = 7,
        sector: Optional[str] = None,
        language: str = "fr",
        platform: Optional[str] = None,
    ) -> str:
        """Find most relevant chunks for a query using manual cosine similarity."""
        if not self.index:
            if not await self.load_index():
                return ""

        self._schedule_embedding_fill()
        has_embeddings = any(chunk.get("embedding") for chunk in self.index)
        query_embedding = await self._generate_embedding(query, "retrieval_query") if has_embeddings else []
        if not query_embedding:
            return self._keyword_fallback_context(
                query=query,
                limit=limit,
                sector=sector,
                language=language,
                platform=platform,
            )

        def dot_product(v1, v2):
            return sum(x * y for x, y in zip(v1, v2))

        def magnitude(v):
            return sum(x * x for x in v) ** 0.5

        similarities = []
        q_mag = magnitude(query_embedding)

        for chunk in self.index:
            if not self._audience_matches(chunk.get("audience", "all"), sector):
                continue
            if not self._platform_matches(chunk.get("platform", "all"), platform):
                continue
            chunk_lang = chunk.get("language")
            if chunk_lang and chunk_lang not in {language, "fr", "en", "code"}:
                continue

            c_emb = chunk.get("embedding") or []
            if not c_emb:
                continue
            c_mag = magnitude(c_emb)
            if q_mag == 0 or c_mag == 0:
                score = 0
            else:
                score = dot_product(query_embedding, c_emb) / (q_mag * c_mag)

            if chunk_lang == language:
                score += 0.03
            if platform and chunk.get("platform") == platform:
                score += 0.05
            if sector == "restaurant" and chunk.get("audience") == "restaurant":
                score += 0.05
            if sector == "supplier" and chunk.get("audience") == "supplier":
                score += 0.05
            similarities.append((score, chunk))

        similarities.sort(key=lambda x: x[0], reverse=True)
        top_chunks = similarities[:limit]
        return "\n\n".join(
            [
                f"--- [Source: {chunk['source']}] ---\n{chunk['content']}"
                for score, chunk in top_chunks
                if score > 0.24
            ]
        )

