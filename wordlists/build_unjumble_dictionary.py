"""Builds unjumble_dictionary.txt: the words unjumble accepts as answers.

Lowercase a-z words of 3-10 letters, one per line, sorted, from:
- Monkeytype's english_450k (GPL-3.0). It keeps only the capitalised form of words that are
  also names ("Chin", "State", "Ring"), and those are left out here;
- ENABLE, the public-domain word-game lexicon, which brings the everyday words back without
  names or abbreviations; it is downloaded (checksum pinned) into wordlists/.cache/;
- our english and english_1k lists, since every word unjumble can ask for must be accepted.

Run from the repo root with the monkeytype checkout present:
python3 wordlists/build_unjumble_dictionary.py
"""

import hashlib
import json
import urllib.request
from pathlib import Path

ENABLE_URL = "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt"
ENABLE_SHA256 = "3f16130220645692ed49c7134e24a18504c2ca55b3c012f7290e3e77c63b1a89"
ENABLE_CACHE = Path("wordlists/.cache/enable1.txt")

JSON_SOURCES = [
    "monkeytype/frontend/static/languages/english_450k.json",
    "wordlists/english.json",
    "wordlists/english_1k.json",
]


def keep(word: str) -> bool:
    return word.isascii() and word.isalpha() and word.islower() and 3 <= len(word) <= 10


def enable_words() -> list[str]:
    if not ENABLE_CACHE.exists():
        ENABLE_CACHE.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(ENABLE_URL) as response:
            ENABLE_CACHE.write_bytes(response.read())
    data = ENABLE_CACHE.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != ENABLE_SHA256:
        raise SystemExit(f"{ENABLE_CACHE}: unexpected sha256 {digest}; delete it to download again")
    return data.decode().split()


words = {w for w in enable_words() if keep(w)}
for path in JSON_SOURCES:
    with open(path) as f:
        words.update(w for w in json.load(f)["words"] if keep(w))

with open("wordlists/unjumble_dictionary.txt", "w") as f:
    f.write("\n".join(sorted(words)) + "\n")
print(f"wrote {len(words)} words")
