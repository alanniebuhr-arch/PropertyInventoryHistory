import React from 'react';
import type { WaterTreatmentDetails } from '../../types';
import { FormField } from './FormField';

export function WaterTreatmentForm(props: {
  details: WaterTreatmentDetails;
  onChange: (d: WaterTreatmentDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="System type"
        value={details.systemType ?? ''}
        onChangeText={(systemType) => onChange({ ...details, systemType })}
        placeholder="Softener, filter, UV…"
      />
      <FormField
        label="Filter name"
        value={details.filterName ?? ''}
        onChangeText={(filterName) => onChange({ ...details, filterName })}
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
