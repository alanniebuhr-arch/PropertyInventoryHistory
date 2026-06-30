import React from 'react';
import type { OtherItemDetails } from '../../types';
import { FormField } from './FormField';

export function OtherItemForm(props: {
  details: OtherItemDetails;
  onChange: (d: OtherItemDetails) => void;
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
