import React from 'react';
import type { ElectricPanelDetails } from '../../types';
import { FormField } from './FormField';

export function ElectricPanelForm(props: {
  details: ElectricPanelDetails;
  onChange: (d: ElectricPanelDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Amperage"
        value={details.amperage ?? ''}
        onChangeText={(amperage) => onChange({ ...details, amperage })}
        placeholder="e.g. 200A"
      />
      <FormField
        label="Brand"
        value={details.brand ?? ''}
        onChangeText={(brand) => onChange({ ...details, brand })}
      />
      <FormField
        label="Location notes"
        value={details.locationNotes ?? ''}
        onChangeText={(locationNotes) => onChange({ ...details, locationNotes })}
        multiline
      />
      <FormField
        label="Last inspected (YYYY-MM-DD)"
        value={details.lastInspectedAtISO?.slice(0, 10) ?? ''}
        onChangeText={(v) =>
          onChange({ ...details, lastInspectedAtISO: v.trim() ? `${v.trim()}T12:00:00.000Z` : undefined })
        }
        placeholder="2024-06-01"
      />
    </>
  );
}
