import React from 'react';
import type { WasteWaterDetails } from '../../types';
import { FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { WASTE_WATER_SYSTEM_OPTIONS, wasteWaterSystemLabel } from '../../wasteWaterSlots';

export function WasteWaterForm(props: {
  details: WasteWaterDetails;
  onChange: (d: WasteWaterDetails) => void;
}) {
  const { details, onChange } = props;

  return (
    <>
      <FormPicker
        label="System"
        options={WASTE_WATER_SYSTEM_OPTIONS}
        value={details.system}
        displayValue={wasteWaterSystemLabel(details.system, details.systemOther)}
        onChange={(system) =>
          onChange({
            ...details,
            system,
            systemOther: system === 'other' ? details.systemOther : undefined,
            gallons: system === 'septic' ? details.gallons : undefined,
          })
        }
      />
      {details.system === 'other' ? (
        <FormField
          label="System (other)"
          value={details.systemOther ?? ''}
          onChangeText={(systemOther) => onChange({ ...details, systemOther })}
          placeholder="Describe the waste water system"
        />
      ) : null}
      {details.system === 'septic' ? (
        <FormField
          label="Number of gallons"
          value={details.gallons ?? ''}
          onChangeText={(gallons) => onChange({ ...details, gallons })}
          placeholder="e.g. 1000"
          keyboardType="number-pad"
        />
      ) : null}
    </>
  );
}

export function WasteWaterNotesFields(props: {
  details: WasteWaterDetails;
  onChange: (d: WasteWaterDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <FormField
      label="Notes"
      value={details.notes ?? ''}
      onChangeText={(notes) => onChange({ ...details, notes })}
      multiline
    />
  );
}
