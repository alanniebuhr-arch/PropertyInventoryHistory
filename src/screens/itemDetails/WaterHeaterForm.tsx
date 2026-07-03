import React from 'react';
import type { WaterHeaterDetails } from '../../types';
import { FormField } from './FormField';

export function WaterHeaterForm(props: {
  details: WaterHeaterDetails;
  onChange: (d: WaterHeaterDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
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
