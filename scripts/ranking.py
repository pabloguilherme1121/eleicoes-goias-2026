"""Ordenação nominal determinística para snapshots eleitorais."""


def rank_candidates(candidates):
    """Posiciona candidaturas com votação (inclusive zero) antes das sem registro."""
    candidates.sort(key=lambda candidate: (
        candidate['votos'] is None,
        -(candidate['votos'] or 0),
        candidate['nome'],
    ))
    position = 0
    for candidate in candidates:
        if candidate['votos'] is None:
            candidate['ranking'] = None
        else:
            position += 1
            candidate['ranking'] = position
    return candidates
