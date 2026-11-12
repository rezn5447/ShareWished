"""Embeddings and cosine similarity spike on fixture wishlist items.

Run:  python ai/spikes/similarity.py

Uses Voyage AI when VOYAGE_API_KEY is set (in the environment or ai/.env),
otherwise a small local model. See ai/README.md for what the output means.
"""

from __future__ import annotations

import hashlib
import json
import os
import statistics
import sys
from itertools import combinations
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

AI_DIR = Path(__file__).resolve().parent.parent
FIXTURES = AI_DIR / "fixtures"
CACHE_FILE = AI_DIR / ".cache" / "embeddings.json"

# Voyage's current general-purpose model (docs.voyageai.com, Nov 2026).
VOYAGE_MODEL = "voyage-4"
LOCAL_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity, by hand: the angle between two vectors, ignoring their length."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def cache_key(model: str, input_type: str, text: str) -> str:
    # Model and input type are part of the key, so vectors from one model
    # (or a query embedding) are never reused for another.
    return hashlib.sha256(f"{model}\0{input_type}\0{text}".encode()).hexdigest()


class Embedder:
    """Turns texts into vectors, caching them on disk so reruns don't re-bill."""

    def __init__(self) -> None:
        load_dotenv(AI_DIR / ".env")
        key = os.environ.get("VOYAGE_API_KEY")
        if key:
            import voyageai

            self.model = VOYAGE_MODEL
            self.is_fallback = False
            client = voyageai.Client(api_key=key)
            self._embed = lambda texts, input_type: client.embed(
                texts, model=VOYAGE_MODEL, input_type=input_type
            ).embeddings
        else:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError:
                sys.exit(
                    "No VOYAGE_API_KEY set and the local fallback isn't installed.\n"
                    "Either put VOYAGE_API_KEY in ai/.env, or run:\n"
                    "  pip install -r ai/requirements-local.txt"
                )
            self.model = LOCAL_MODEL
            self.is_fallback = True
            local = SentenceTransformer(LOCAL_MODEL)
            # MiniLM has no query/document modes, so input_type is ignored here.
            self._embed = lambda texts, input_type: local.encode(texts).tolist()

        self._cache: dict[str, list[float]] = (
            json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}
        )

    def embed(self, texts: list[str], input_type: str) -> list[np.ndarray]:
        missing = [t for t in dict.fromkeys(texts) if cache_key(self.model, input_type, t) not in self._cache]
        if missing:
            for text, vector in zip(missing, self._embed(missing, input_type)):
                self._cache[cache_key(self.model, input_type, text)] = list(map(float, vector))
            CACHE_FILE.parent.mkdir(exist_ok=True)
            CACHE_FILE.write_text(json.dumps(self._cache))
        return [np.array(self._cache[cache_key(self.model, input_type, t)]) for t in texts]


def item_text(item: dict, with_note: bool = True) -> str:
    """What gets embedded: the title, plus the owner's note when there is one. Never the category."""
    if with_note and item.get("note"):
        return f"{item['title']}. {item['note']}"
    return item["title"]


def check_pairs(pairs: list[dict], sim) -> list[dict]:
    """Scores each expected pair: passes when the anchor is closer to `closer` than to `farther`."""
    results = []
    for pair in pairs:
        to_closer = sim(pair["anchor"], pair["closer"])
        to_farther = sim(pair["anchor"], pair["farther"])
        results.append({**pair, "to_closer": to_closer, "to_farther": to_farther, "passed": to_closer > to_farther})
    return results


def load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


def similarity_table(vectors: dict[str, np.ndarray]):
    """All item-to-item scores, and a lookup by id."""
    scores = {(a, b): cosine(vectors[a], vectors[b]) for a, b in combinations(vectors, 2)}
    return scores, lambda a, b: scores.get((a, b), scores.get((b, a)))


def neighbors(item_id: str, sim, ids: list[str], k: int = 3) -> list[tuple[str, float]]:
    others = [(other, sim(item_id, other)) for other in ids if other != item_id]
    return sorted(others, key=lambda pair: pair[1], reverse=True)[:k]


def spread(values: list[float]) -> str:
    return f"min {min(values):.3f}  median {statistics.median(values):.3f}  max {max(values):.3f}  (n={len(values)})"


def heading(text: str) -> None:
    print(f"\n== {text} " + "=" * max(0, 70 - len(text)))


def main() -> None:
    fixture = load("items.json")
    items = fixture["items"]
    by_id = {item["id"]: item for item in items}
    ids = list(by_id)
    queries = load("queries.json")["queries"]
    pairs = load("expected_pairs.json")["pairs"]
    duplicates = [tuple(pair) for pair in fixture["near_duplicates"]]

    embedder = Embedder()
    with_note = dict(zip(ids, embedder.embed([item_text(i) for i in items], "document")))
    title_only = dict(zip(ids, embedder.embed([item_text(i, with_note=False) for i in items], "document")))
    query_vectors = embedder.embed(queries, "query")

    scores, sim = similarity_table(with_note)
    _, sim_title = similarity_table(title_only)
    first = next(iter(with_note.values()))

    print("FIXTURE DATA: made-up wishlist items, not real products.")
    print(f"model: {embedder.model}" + ("  (LOCAL FALLBACK: no VOYAGE_API_KEY set)" if embedder.is_fallback else ""))
    print(f"dimension: {len(first)}   norm of one item vector: {np.linalg.norm(first):.4f}")
    print(f"items: {len(items)}   queries: {len(queries)}   expected pairs: {len(pairs)}")

    heading("1. Nearest neighbors (title + note)")
    for item_id in ids:
        found = ", ".join(f"{other} {score:.3f}" for other, score in neighbors(item_id, sim, ids))
        print(f"{item_id:<20} -> {found}")

    heading("2. Query rankings (top 5)")
    for query, q in zip(queries, query_vectors):
        ranked = sorted(((cosine(q, with_note[i]), i) for i in ids), reverse=True)[:5]
        print(f'"{query}"')
        for score, item_id in ranked:
            print(f"   {score:.3f}  {item_id:<20} [{by_id[item_id]['category']}]")

    heading("3. Expected pairs")
    results = check_pairs(pairs, sim)
    title_results = check_pairs(pairs, sim_title)
    for r, t in zip(results, title_results):
        mark = "PASS" if r["passed"] else "FAIL"
        print(
            f"{mark}  {r['anchor']}: {r['closer']} {r['to_closer']:.3f} vs {r['farther']} {r['to_farther']:.3f}"
            f"   (title only: {'pass' if t['passed'] else 'FAIL'})"
        )
    passed = sum(r["passed"] for r in results)
    print(f"\nexpected pairs: {passed}/{len(results)} passed")
    print(f"expected pairs, title only: {sum(r['passed'] for r in title_results)}/{len(title_results)} passed")
    for r in results:
        if not r["passed"]:
            print(f"  failed: {r['anchor']} should be closer to {r['closer']} than {r['farther']} ({r['why']})")

    heading("4. Does the note change things?")
    for item in items:
        if not item.get("note"):
            continue
        item_id = item["id"]
        drift = cosine(with_note[item_id], title_only[item_id])
        before = [other for other, _ in neighbors(item_id, sim_title, ids)]
        after = [other for other, _ in neighbors(item_id, sim, ids)]
        print(f"{item_id:<16} note {item['note']!r}")
        print(f"   title vs title+note vector: {drift:.3f}")
        print(f"   neighbors title only: {', '.join(before)}")
        print(f"   neighbors with note:  {', '.join(after)}" + ("" if before == after else "   <- changed"))

    heading("5. Where is the cutoff? (all item pairs, title + note)")
    dup_set = {frozenset(pair) for pair in duplicates}
    dup_scores, same_cat, diff_cat = [], [], []
    for (a, b), score in scores.items():
        if frozenset((a, b)) in dup_set:
            dup_scores.append(score)
        elif by_id[a]["category"] == by_id[b]["category"]:
            same_cat.append(score)
        else:
            diff_cat.append(score)
    print(f"near-duplicates     {spread(dup_scores)}")
    print(f"same category       {spread(same_cat)}")
    print(f"different category  {spread(diff_cat)}")
    top_unrelated = sorted(
        ((s, a, b) for (a, b), s in scores.items() if by_id[a]["category"] != by_id[b]["category"]), reverse=True
    )[:5]
    print("highest-scoring pairs across categories:")
    for score, a, b in top_unrelated:
        print(f"   {score:.3f}  {a} / {b}")

    heading("6. Would it catch the same item saved from two shops?")
    for a, b in duplicates:
        rank = [other for other, _ in neighbors(a, sim, ids, k=len(ids))].index(b) + 1
        beaten_by = sum(1 for (x, y), s in scores.items() if s >= sim(a, b) and frozenset((x, y)) not in dup_set)
        print(
            f"{a} / {b}: {sim(a, b):.3f}, rank {rank} among {a}'s neighbors; "
            f"{beaten_by} non-duplicate pairs score as high or higher"
        )


if __name__ == "__main__":
    main()
