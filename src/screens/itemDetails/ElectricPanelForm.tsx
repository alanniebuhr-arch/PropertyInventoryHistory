import React from 'react';
import type { ElectricPanelDetails } from '../../types';
import { parseDateInputToISO } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function ElectricPanelForm(props: {
  details: ElectricPanelDetails;
  onChange: (d: ElectricPanelDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Name"
        value={details.name ?? ''}
        onChangeText={(name) => onChange({ ...details, name })}
        placeholder="e.g. Main panel, Subpanel"
      />
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
      <DateFormField
        label="Last inspected (MM/DD/YYYY)"
        value={details.lastInspectedAtISO}
        parseStored={parseDateInputToISO}
        onChangeStored={(lastInspectedAtISO) =>
          onChange({ ...details, lastInspectedAtISO })
        }
        placeholder="06/01/2024"
      />
    </>
  );
}
