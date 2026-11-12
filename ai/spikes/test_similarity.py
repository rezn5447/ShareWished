"""Checks the hand-written math and the pass/fail scoring. No model or network needed.

Run:  python -m unittest discover ai/spikes
"""

import unittest

import numpy as np

from similarity import cache_key, check_pairs, cosine, item_text


class CosineTest(unittest.TestCase):
    def test_known_angles(self):
        a = np.array([1.0, 0.0])
        self.assertAlmostEqual(cosine(a, a), 1.0)
        self.assertAlmostEqual(cosine(a, np.array([0.0, 2.0])), 0.0)
        self.assertAlmostEqual(cosine(a, np.array([-3.0, 0.0])), -1.0)

    def test_length_does_not_matter(self):
        a, b = np.array([1.0, 2.0, 3.0]), np.array([2.0, 0.5, 1.0])
        self.assertAlmostEqual(cosine(a, b), cosine(a * 10, b))


class CheckPairsTest(unittest.TestCase):
    def test_passes_only_when_closer_scores_higher(self):
        scores = {("a", "b"): 0.9, ("a", "c"): 0.4}
        pairs = [
            {"anchor": "a", "closer": "b", "farther": "c"},
            {"anchor": "a", "closer": "c", "farther": "b"},
        ]
        results = check_pairs(pairs, lambda x, y: scores[(x, y)])
        self.assertEqual([r["passed"] for r in results], [True, False])

    def test_a_tie_is_a_failure(self):
        [result] = check_pairs([{"anchor": "a", "closer": "b", "farther": "c"}], lambda x, y: 0.5)
        self.assertFalse(result["passed"])


class EmbedInputTest(unittest.TestCase):
    def test_cache_key_separates_models_and_input_types(self):
        keys = {cache_key("m1", "document", "mug"), cache_key("m2", "document", "mug"), cache_key("m1", "query", "mug")}
        self.assertEqual(len(keys), 3)

    def test_category_is_never_embedded(self):
        item = {"title": "Mug", "note": "Blue", "category": "kitchen"}
        self.assertEqual(item_text(item), "Mug. Blue")
        self.assertEqual(item_text(item, with_note=False), "Mug")


if __name__ == "__main__":
    unittest.main()
