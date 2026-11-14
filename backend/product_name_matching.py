import re
import unicodedata
from difflib import SequenceMatcher


def _words(name: str) -> tuple[str, ...]:
    text = unicodedata.normalize("NFKD", name.casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return tuple(
        word[:-1] if (len(word) > 3 and word.endswith("s")) or word.endswith("eaux") else word
        for word in re.findall(r"[^\W_]+", text)
    )


def product_name_similarity(name: str, other_name: str) -> float:
    left, right = _words(name), _words(other_name)
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    shorter, longer = sorted((left, right), key=len)
    if len(shorter) == 1 and len(shorter[0]) >= 3 and shorter[0] == longer[0]:
        return 0.9
    left_numbers = set(re.findall(r"\d+", name))
    right_numbers = set(re.findall(r"\d+", other_name))
    if left_numbers and right_numbers and left_numbers != right_numbers:
        return 0.0
    a, b = " ".join(left), " ".join(right)
    return SequenceMatcher(None, a, b, autojunk=False).ratio() if min(len(a), len(b)) >= 5 else 0.0


POTENTIAL_DUPLICATE_THRESHOLD = 0.84
