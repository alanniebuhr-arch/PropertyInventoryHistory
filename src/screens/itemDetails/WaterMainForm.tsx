import React from 'react';
import type { WaterMainDetails } from '../../types';
import { FormField } from './FormField';

export function WaterMainForm(props: {
  details: WaterMainDetails;
  onChange: (d: WaterMainDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Shutoff location"
        value={details.shutoffLocation ?? ''}
        onChangeText={(shutoffLocation) => onChange({ ...details, shutoffLocation })}
        multiline
      />
      <FormField
        label="Valve type"
        value={details.valveType ?? ''}
        onChangeText={(valveType) => onChange({ ...details, valveType })}
      />
      <FormField
        label="Meter number"
        value={details.meterNumber ?? ''}
        onChangeText={(meterNumber) => onChange({ ...details, meterNumber })}
      />
    </>
  );
}
