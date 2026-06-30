import React from 'react';
import type { FurnaceDetails } from '../../types';
import { FormField } from './FormField';

function installDateEditValue(stored?: string): string {
  if (!stored) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(stored)) return stored.slice(0, 10);
  if (/^\d{4}T/.test(stored)) return '';
  return stored;
}

export function FurnaceForm(props: {
  details: FurnaceDetails;
  onChange: (d: FurnaceDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Carrier, Trane, Lennox"
      />
      <FormField
        label="Fuel type"
        value={details.fuelType ?? ''}
        onChangeText={(fuelType) => onChange({ ...details, fuelType })}
        placeholder="Gas, electric, oil…"
      />
      <FormField
        label="Model"
        value={details.modelNumber ?? ''}
        onChangeText={(modelNumber) => onChange({ ...details, modelNumber })}
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Serial number"
        value={details.serialNumber ?? ''}
        onChangeText={(serialNumber) => onChange({ ...details, serialNumber })}
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Filter size"
        value={details.filterSize ?? ''}
        onChangeText={(filterSize) => onChange({ ...details, filterSize })}
      />
      <FormField
        label="Install date (YYYY-MM-DD)"
        value={installDateEditValue(details.installDateAtISO)}
        onChangeText={(v) =>
          onChange({
            ...details,
            installDateAtISO: v || undefined,
          })
        }
        placeholder="2020-06-01"
        keyboardType="numbers-and-punctuation"
      />
      <FormField
        label="Installer name"
        value={details.installerName ?? ''}
        onChangeText={(installerName) => onChange({ ...details, installerName })}
        placeholder="Company or technician name"
      />
      <FormField
        label="Installer phone"
        value={details.installerPhone ?? ''}
        onChangeText={(installerPhone) => onChange({ ...details, installerPhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
    </>
  );
}
