"""Regressões da classificação nominal gravada pelo importador."""
import unittest
from ranking import rank_candidates


class RankingTests(unittest.TestCase):
    def test_zero_votes_ranked_before_missing_votes(self):
        records = [
            {'nome': 'A SEM REGISTRO', 'votos': None},
            {'nome': 'Z ZERO VOTOS', 'votos': 0},
            {'nome': 'B COM VOTOS', 'votos': 120},
        ]
        self.assertEqual(
            [(entry['nome'], entry['ranking']) for entry in rank_candidates(records)],
            [('B COM VOTOS', 1), ('Z ZERO VOTOS', 2), ('A SEM REGISTRO', None)],
        )

    def test_equal_vote_totals_are_sorted_by_name(self):
        records = [
            {'nome': 'ZETA', 'votos': 10},
            {'nome': 'ALFA', 'votos': 10},
            {'nome': 'OMEGA', 'votos': None},
        ]
        rank_candidates(records)
        self.assertEqual([(c['nome'], c['ranking']) for c in records],
                         [('ALFA', 1), ('ZETA', 2), ('OMEGA', None)])

    def test_only_missing_results_have_no_rank(self):
        records = [
            {'nome': 'B', 'votos': None},
            {'nome': 'A', 'votos': None},
        ]
        rank_candidates(records)
        self.assertEqual([(c['nome'], c['ranking']) for c in records],
                         [('A', None), ('B', None)])


if __name__ == '__main__':
    unittest.main()
