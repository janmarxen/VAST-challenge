"""Unit tests for resident clustering feature construction.

These tests focus on ensuring categorical attributes are incorporated correctly
into the KMeans feature matrix (one-hot encoding + boolean coercion).

Run tests with: pytest tests/test_resident_clustering_features.py
"""

import pandas as pd

from services import resident_service


def test_build_resident_cluster_features_includes_one_hot_and_haveKids():
    merged = pd.DataFrame(
        {
            'age': [30, 40],
            'householdSize': [2, 3],
            'Income': [1000.0, 1000.0],
            'CostOfLiving': [500.0, 500.0],
            'Education': [0.0, 0.0],
            'SavingsRate': [0.5, 0.5],
            'educationLevel': ['Bachelors', None],
            'haveKids': [True, 'false'],
        }
    )

    features = resident_service._build_resident_cluster_features(merged)

    assert 'haveKids' in features.columns
    assert int(features.loc[0, 'haveKids']) == 1
    assert int(features.loc[1, 'haveKids']) == 0

    for category in resident_service._EDUCATION_LEVEL_CATEGORIES:
        assert f'educationLevel_{category}' in features.columns

    assert int(features.loc[0, 'educationLevel_Bachelors']) == 1
    assert int(features.loc[1, 'educationLevel_Unknown']) == 1


def test_coerce_have_kids_to_int_handles_common_inputs():
    s = pd.Series([True, False, 'TRUE', 'no', 1, 0, None])
    out = resident_service._coerce_have_kids_to_int(s)
    assert out.tolist() == [1, 0, 1, 0, 1, 0, 0]
