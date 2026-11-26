"""Aucun fichier du dépôt ne doit contenir de texte UTF-8 relu par erreur en Windows-1252
(un « é » devenu deux caractères, une apostrophe devenue trois). Règle 3 de AGENTS.md."""

import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".html", ".css", ".txt"}
# Écrit en séquences \u pour que ce test ne se signale pas lui-même.
# Première lettre d'un caractère UTF-8 relu en Windows-1252, suivie d'un octet de continuation.
_LEAD = "\u00c3\u00c4\u00c5\u00c8\u00c9\u00ca\u00cb\u00ce\u00cf\u00d0\u00d1\u00d8\u00d9\u00da\u00db"
_NEXT = (
    "\u0080-\u00bf\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122"
    "\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc"
)
PATTERN = re.compile(
    f"[{_LEAD}][{_NEXT}]|\u00e2\u20ac|\u00f0\u0178|\u00e4\u00b8|\u00c2[\u00a0\u00ab\u00bb\u00b0\u00b7\u00a9]"
)


class NoMojibakeTest(unittest.TestCase):
    def test_tracked_text_files_are_clean(self):
        try:
            listed = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        except (OSError, subprocess.CalledProcessError):
            self.skipTest("git indisponible")
        problems = []
        for name in listed.splitlines():
            path = ROOT / name
            if path.suffix not in EXTENSIONS or "node_modules" in path.parts or not path.is_file():
                continue
            try:
                text = path.read_text(encoding="utf-8-sig")
            except (UnicodeDecodeError, OSError):
                continue
            for number, line in enumerate(text.splitlines(), 1):
                if PATTERN.search(line):
                    problems.append(f"{name}:{number}: {line.strip()[:80]}")
        self.assertEqual(problems[:20], [], f"{len(problems)} ligne(s) avec des caractères corrompus")


if __name__ == "__main__":
    unittest.main()
