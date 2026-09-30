"""Builds tea_dictionary.txt: the words the tea games accept.

Lowercase a-z words of 3+ letters from ENABLE, the public-domain word-game lexicon
(downloaded, checksum pinned, into wordlists/.cache/ like build_unjumble_dictionary.py),
without plurals and -ing forms of other words ("cats", "boxes", "baking", "running"), as in
Mudae's English tea games. ENABLE has no names or abbreviations, and every inflected form
it has comes with its base form, so those forms can be told apart reliably.

Run from the repo root:
python3 wordlists/build_tea_dictionary.py
"""

import hashlib
import urllib.request
from pathlib import Path

ENABLE_URL = "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt"
ENABLE_SHA256 = "3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89"
ENABLE_CACHE = Path("wordlists/.cache/enable1.txt")


def enable_words() -> set[str]:
    if not ENABLE_CACHE.exists():
        ENABLE_CACHE.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(ENABLE_URL) as response:
            ENABLE_CACHE.write_bytes(response.read())
    data = ENABLE_CACHE.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != ENABLE_SHA256:
        raise SystemExit(f"{ENABLE_CACHE}: unexpected sha256 {digest}; delete it to download again")
    return {w for w in data.decode().split() if w.isascii() and w.isalpha() and w.islower() and len(w) >= 3}


def inflected(word: str, words: set[str]) -> bool:
    """A plural or -ing form of another word in the list."""
    if word.endswith("ing"):
        stem = word[:-3]
        # a stem of 3+ letters: "thing" is not a form of "the"
        if len(stem) >= 3:
            forms = {stem, stem + "e"}
            if stem[-1] == stem[-2]:
                forms.add(stem[:-1])  # running -> run
            if forms & words:
                return True
    if word.endswith("s"):
        if word[:-1] in words:
            return True
        if word.endswith("es") and word[:-2] in words:
            return True
        if word.endswith("ies") and word[:-3] + "y" in words:
            return True  # cities -> city
    return False


words = enable_words()
kept = sorted(w for w in words if not inflected(w, words))
with open("wordlists/tea_dictionary.txt", "w") as f:
    f.write("\n".join(kept) + "\n")
print(f"wrote {len(kept)} of {len(words)} words")
