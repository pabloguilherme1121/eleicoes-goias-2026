"""Regressões da classificação nominal gravada pelo importador."""
import unittest
import json
from pathlib import Path
from enrich_regions import enrich
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


    def test_existing_snapshot_reconciles_ranks_without_changing_vote_totals(self):
        root = Path(__file__).resolve().parents[1]
        snapshot = json.loads((root / 'data/candidatos.json').read_text(encoding='utf8'))
        before = {c['id']: c['votos'] for c in snapshot['candidatos']}
        records = enrich(snapshot)['candidatos']
        with_votes = [c for c in records if c['votos'] is not None]
        without_votes = [c for c in records if c['votos'] is None]
        self.assertEqual([c['ranking'] for c in with_votes], list(range(1, len(with_votes) + 1)))
        self.assertTrue(all(c['ranking'] is None for c in without_votes))
        self.assertEqual([c['votos'] for c in with_votes], sorted(
            [c['votos'] for c in with_votes], reverse=True))
        self.assertEqual({c['id']: c['votos'] for c in records}, before)


if __name__ == '__main__':
    unittest.main()
