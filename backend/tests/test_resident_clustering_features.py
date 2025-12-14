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


def test_relabel_clusters_for_palette_orders_semantics():
    # Create three clusters with distinct semantics:
    # - Cluster 7: affluent (highest income)
    # - Cluster 3: lean (non-affluent with higher savings rate)
    # - Cluster 5: stretched (lowest savings rate among non-affluent)
    merged = pd.DataFrame(
        {
            'Cluster': [7, 7, 3, 3, 5, 5],
            'Income': [10000, 11000, 4000, 4200, 3000, 3100],
            'CostOfLiving': [6000, 6500, 1500, 1600, 2500, 2600],
            'SavingsRate': [0.4, 0.35, 0.6, 0.55, 0.05, 0.1],
        }
    )

    relabeled = resident_service._relabel_clusters_for_palette(merged)

    # Affluent -> 2 (red)
    assert set(relabeled.loc[merged['Cluster'] == 7, 'Cluster']) == {2}
    # Lean -> 1 (orange)
    assert set(relabeled.loc[merged['Cluster'] == 3, 'Cluster']) == {1}
    # Stretched -> 0 (blue)
    assert set(relabeled.loc[merged['Cluster'] == 5, 'Cluster']) == {0}
