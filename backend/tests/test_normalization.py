"""
NAWI TestFlow — Normalization Module Tests

Tests for unit conversion and normalization.
All conversions must be exact and deterministic.
"""

import pytest

from engine.normalization import UnitNormalizer
from engine.types import RawObservation, MassUnit


class TestUnitConversion:
    """Tests for basic unit conversion."""
    
    def test_kg_to_g(self):
        result = UnitNormalizer.convert(1.0, MassUnit.KG, MassUnit.G)
        assert result == 1000.0
    
    def test_g_to_kg(self):
        result = UnitNormalizer.convert(1000.0, MassUnit.G, MassUnit.KG)
        assert result == 1.0
    
    def test_mg_to_g(self):
        result = UnitNormalizer.convert(1000.0, MassUnit.MG, MassUnit.G)
        assert result == 1.0
    
    def test_g_to_mg(self):
        result = UnitNormalizer.convert(1.0, MassUnit.G, MassUnit.MG)
        assert result == 1000.0
    
    def test_t_to_kg(self):
        result = UnitNormalizer.convert(1.0, MassUnit.T, MassUnit.KG)
        assert result == 1000.0
    
    def test_kg_to_t(self):
        result = UnitNormalizer.convert(1000.0, MassUnit.KG, MassUnit.T)
        assert result == 1.0
    
    def test_same_unit(self):
        result = UnitNormalizer.convert(5.0, MassUnit.KG, MassUnit.KG)
        assert result == 5.0
    
    def test_mg_to_kg(self):
        result = UnitNormalizer.convert(1_000_000.0, MassUnit.MG, MassUnit.KG)
        assert result == 1.0
    
    def test_kg_to_mg(self):
        result = UnitNormalizer.convert(1.0, MassUnit.KG, MassUnit.MG)
        assert result == 1_000_000.0
    
    def test_t_to_mg(self):
        result = UnitNormalizer.convert(1.0, MassUnit.T, MassUnit.MG)
        assert result == 1_000_000_000.0


class TestToKg:
    """Tests for converting to kilograms."""
    
    def test_g_to_kg(self):
        assert UnitNormalizer.to_kg(1000.0, MassUnit.G) == 1.0
    
    def test_mg_to_kg(self):
        assert UnitNormalizer.to_kg(1_000_000.0, MassUnit.MG) == 1.0
    
    def test_t_to_kg(self):
        assert UnitNormalizer.to_kg(1.0, MassUnit.T) == 1000.0
    
    def test_kg_to_kg(self):
        assert UnitNormalizer.to_kg(5.0, MassUnit.KG) == 5.0


class TestFromKg:
    """Tests for converting from kilograms."""
    
    def test_kg_to_g(self):
        assert UnitNormalizer.from_kg(1.0, MassUnit.G) == 1000.0
    
    def test_kg_to_mg(self):
        assert UnitNormalizer.from_kg(1.0, MassUnit.MG) == 1_000_000.0
    
    def test_kg_to_t(self):
        assert UnitNormalizer.from_kg(1000.0, MassUnit.T) == 1.0
    
    def test_kg_to_kg(self):
        assert UnitNormalizer.from_kg(5.0, MassUnit.KG) == 5.0


class TestNormalizeObservations:
    """Tests for observation normalization."""
    
    def test_same_unit(self):
        observations = [
            RawObservation(value=100.0, unit=MassUnit.G, observation_number=1),
            RawObservation(value=200.0, unit=MassUnit.G, observation_number=2),
        ]
        
        result = UnitNormalizer.normalize_observations(observations, MassUnit.G)
        
        assert len(result) == 2
        assert result[0].value == 100.0
        assert result[0].unit == MassUnit.G
        assert result[1].value == 200.0
    
    def test_mixed_units(self):
        observations = [
            RawObservation(value=1000.0, unit=MassUnit.G, observation_number=1),
            RawObservation(value=1.0, unit=MassUnit.KG, observation_number=2),
        ]
        
        result = UnitNormalizer.normalize_observations(observations, MassUnit.KG)
        
        assert len(result) == 2
        assert result[0].value == 1.0
        assert result[0].unit == MassUnit.KG
        assert result[1].value == 1.0
        assert result[1].unit == MassUnit.KG
    
    def test_preserves_metadata(self):
        observations = [
            RawObservation(
                value=1000.0,
                unit=MassUnit.G,
                observation_number=1,
                notes="Test note",
            ),
        ]
        
        result = UnitNormalizer.normalize_observations(observations, MassUnit.KG)
        
        assert result[0].observation_number == 1
        assert result[0].notes == "Test note"
    
    def test_empty_observations(self):
        result = UnitNormalizer.normalize_observations([], MassUnit.KG)
        assert result == []


class TestNormalizeValues:
    """Tests for value list normalization."""
    
    def test_same_unit(self):
        values = [1.0, 2.0, 3.0]
        result = UnitNormalizer.normalize_values(values, MassUnit.KG, MassUnit.KG)
        assert result == [1.0, 2.0, 3.0]
    
    def test_different_units(self):
        values = [1000.0, 2000.0]
        result = UnitNormalizer.normalize_values(values, MassUnit.G, MassUnit.KG)
        assert result == [1.0, 2.0]


class TestGetConversionFactor:
    """Tests for conversion factor calculation."""
    
    def test_same_unit_factor(self):
        assert UnitNormalizer.get_conversion_factor(MassUnit.KG, MassUnit.KG) == 1.0
    
    def test_g_to_kg_factor(self):
        assert UnitNormalizer.get_conversion_factor(MassUnit.G, MassUnit.KG) == 0.001
    
    def test_kg_to_g_factor(self):
        assert UnitNormalizer.get_conversion_factor(MassUnit.KG, MassUnit.G) == 1000.0


class TestGetDisplayValue:
    """Tests for display value formatting."""
    
    def test_display_kg(self):
        result = UnitNormalizer.get_display_value(1.0, MassUnit.KG)
        assert result == "1.0000 kg"
    
    def test_display_g(self):
        result = UnitNormalizer.get_display_value(1.0, MassUnit.G)
        assert result == "1000.0000 g"
    
    def test_display_decimals(self):
        result = UnitNormalizer.get_display_value(1.0, MassUnit.KG, decimals=2)
        assert result == "1.00 kg"
