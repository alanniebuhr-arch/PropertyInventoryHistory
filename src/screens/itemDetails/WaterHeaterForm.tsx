import React from 'react';
import type { WaterHeaterDetails } from '../../types';
import { FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { FUEL_TYPE_OPTIONS, fuelTypeLabel } from '../../furnaceSlots';

export function WaterHeaterForm(props: {
  details: WaterHeaterDetails;
  onChange: (d: WaterHeaterDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="Fuel type"
        options={FUEL_TYPE_OPTIONS}
        value={details.fuelType}
        displayValue={fuelTypeLabel(details.fuelType, details.fuelTypeOther)}
        onChange={(fuelType) =>
          onChange({
            ...details,
            fuelType,
            fuelTypeOther: fuelType === 'other' ? details.fuelTypeOther : undefined,
          })
        }
      />
      {details.fuelType === 'other' ? (
        <FormField
          label="Fuel type (other)"
          value={details.fuelTypeOther ?? ''}
          onChangeText={(fuelTypeOther) => onChange({ ...details, fuelTypeOther })}
          placeholder="e.g. Solar, Heat pump"
        />
      ) : null}
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
      />
      <FormField
        label="Model"
        value={details.modelNumber ?? ''}
        onChangeText={(modelNumber) => onChange({ ...details, modelNumber })}
      />
      <FormField
        label="Serial number"
        value={details.serialNumber ?? ''}
        onChangeText={(serialNumber) => onChange({ ...details, serialNumber })}
      />
      <FormField
        label="Notes"
        value={details.notes ?? ''}
        onChangeText={(notes) => onChange({ ...details, notes })}
        multiline
      />
    </>
  );
}
