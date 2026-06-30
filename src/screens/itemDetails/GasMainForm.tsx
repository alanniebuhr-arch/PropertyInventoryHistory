import React from 'react';
import type { GasMainDetails } from '../../types';
import { FormField } from './FormField';

export function GasMainForm(props: {
  details: GasMainDetails;
  onChange: (d: GasMainDetails) => void;
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
        label="Provider"
        value={details.provider ?? ''}
        onChangeText={(provider) => onChange({ ...details, provider })}
      />
      <FormField
        label="Meter number"
        value={details.meterNumber ?? ''}
        onChangeText={(meterNumber) => onChange({ ...details, meterNumber })}
      />
    </>
  );
}
