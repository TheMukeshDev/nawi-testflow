"""
NAWI Sahayak — Unit Normalization Module

Converts observations to consistent units for calculation.
All calculations are performed in the base unit (kg for mass).

Unit hierarchy:
    mg → g → kg → t
    (divide by 1000 at each step)
"""

from .types import MassUnit, RawObservation


# Conversion factors to base unit (kg)
CONVERSION_TO_KG = {
    MassUnit.MG: 1e-6,      # 1 mg = 0.000001 kg
    MassUnit.G: 1e-3,       # 1 g = 0.001 kg
    MassUnit.KG: 1.0,       # 1 kg = 1 kg
    MassUnit.T: 1e3,        # 1 t = 1000 kg
}

# Conversion factors from base unit (kg)
CONVERSION_FROM_KG = {
    MassUnit.MG: 1e6,       # 1 kg = 1,000,000 mg
    MassUnit.G: 1e3,        # 1 kg = 1,000 g
    MassUnit.KG: 1.0,       # 1 kg = 1 kg
    MassUnit.T: 1e-3,       # 1 kg = 0.001 t
}


class UnitNormalizer:
    """
    Normalizes mass measurements to a common unit.
    
    All internal calculations use kg as the base unit.
    Results are converted back to the original unit for display.
    """
    
    @staticmethod
    def to_kg(value: float, unit: MassUnit) -> float:
        """
        Convert a value to kilograms.
        
        Args:
            value: Numeric value
            unit: Source unit
            
        Returns:
            Value in kilograms
        """
        if unit not in CONVERSION_TO_KG:
            raise ValueError(f"Unknown unit: {unit}")
        return value * CONVERSION_TO_KG[unit]
    
    @staticmethod
    def from_kg(value_kg: float, target_unit: MassUnit) -> float:
        """
        Convert from kilograms to target unit.
        
        Args:
            value_kg: Value in kilograms
            target_unit: Target unit
            
        Returns:
            Value in target unit
        """
        if target_unit not in CONVERSION_FROM_KG:
            raise ValueError(f"Unknown unit: {target_unit}")
        return value_kg * CONVERSION_FROM_KG[target_unit]
    
    @staticmethod
    def convert(value: float, from_unit: MassUnit, to_unit: MassUnit) -> float:
        """
        Convert a value between mass units.
        
        Args:
            value: Numeric value
            from_unit: Source unit
            to_unit: Target unit
            
        Returns:
            Converted value
        """
        if from_unit == to_unit:
            return value
        
        kg_value = UnitNormalizer.to_kg(value, from_unit)
        return UnitNormalizer.from_kg(kg_value, to_unit)
    
    @staticmethod
    def normalize_observations(
        observations: list[RawObservation],
        target_unit: MassUnit,
    ) -> list[RawObservation]:
        """
        Normalize all observations to a target unit.
        
        Args:
            observations: List of observations (may have different units)
            target_unit: Unit to normalize to
            
        Returns:
            List of observations in target unit
        """
        normalized = []
        for obs in observations:
            if obs.unit == target_unit:
                normalized.append(obs)
            else:
                converted_value = UnitNormalizer.convert(
                    obs.value, obs.unit, target_unit
                )
                normalized.append(RawObservation(
                    value=converted_value,
                    unit=target_unit,
                    observation_number=obs.observation_number,
                    notes=obs.notes,
                ))
        return normalized
    
    @staticmethod
    def normalize_values(
        values: list[float],
        from_unit: MassUnit,
        to_unit: MassUnit,
    ) -> list[float]:
        """
        Normalize a list of values to a target unit.
        
        Args:
            values: List of numeric values
            from_unit: Source unit
            to_unit: Target unit
            
        Returns:
            List of values in target unit
        """
        if from_unit == to_unit:
            return values.copy()
        
        return [UnitNormalizer.convert(v, from_unit, to_unit) for v in values]
    
    @staticmethod
    def get_display_value(value_kg: float, unit: MassUnit, decimals: int = 4) -> str:
        """
        Format a value in kg for display in the target unit.
        
        Args:
            value_kg: Value in kilograms
            target_unit: Unit to display in
            decimals: Number of decimal places
            
        Returns:
            Formatted string with unit
        """
        display_value = UnitNormalizer.from_kg(value_kg, unit)
        return f"{display_value:.{decimals}f} {unit.value}"
    
    @staticmethod
    def get_conversion_factor(from_unit: MassUnit, to_unit: MassUnit) -> float:
        """
        Get the conversion factor between two units.
        
        Args:
            from_unit: Source unit
            to_unit: Target unit
            
        Returns:
            Conversion factor (multiply source value by this to get target)
        """
        if from_unit == to_unit:
            return 1.0
        kg_per_source = CONVERSION_TO_KG[from_unit]
        target_per_kg = CONVERSION_FROM_KG[to_unit]
        return kg_per_source * target_per_kg


# Common conversions for reference
UNIT_INFO = {
    MassUnit.MG: {"name": "milligram", "symbol": "mg", "factor_to_kg": 1e-6},
    MassUnit.G: {"name": "gram", "symbol": "g", "factor_to_kg": 1e-3},
    MassUnit.KG: {"name": "kilogram", "symbol": "kg", "factor_to_kg": 1.0},
    MassUnit.T: {"name": "tonne", "symbol": "t", "factor_to_kg": 1e3},
}
