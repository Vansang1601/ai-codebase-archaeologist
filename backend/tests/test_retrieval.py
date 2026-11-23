from app.retrieval import hash_vector, cosine, lexical_score


def test_hash_vector_is_deterministic_and_normalized():
    a = hash_vector("authentication token middleware")
    b = hash_vector("authentication token middleware")
    assert a == b
    assert 0.999 < cosine(a, a) <= 1.001


def test_lexical_score_rewards_overlap():
    good = lexical_score("authentication middleware", "authentication middleware validates a token")
    bad = lexical_score("authentication middleware", "database migration helper")
    assert good > bad
