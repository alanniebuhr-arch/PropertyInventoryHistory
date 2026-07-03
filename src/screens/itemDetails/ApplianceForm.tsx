import React from 'react';
import type { ApplianceDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

type ApplianceFieldsProps = {
  details: ApplianceDetails;
  onChange: (d: ApplianceDetails) => void;
};

export function ApplianceIdentityFields(props: ApplianceFieldsProps) {
  const { details, onChange } = props;

  return (
    <>
      <FormField
        label="Appliance name (optional)"
        value={details.nickname ?? ''}
        onChangeText={(nickname) => onChange({ ...details, nickname })}
        placeholder="e.g. Kitchen refrigerator"
      />
      <FormField
        label="Manufacturer"
        value={details.manufacturer ?? ''}
        onChangeText={(manufacturer) => onChange({ ...details, manufacturer })}
        placeholder="e.g. Whirlpool, GE, Samsung"
      />
      <FormField
        label="Model #"
        value={details.modelNumber ?? ''}
        onChangeText={(modelNumber) => onChange({ ...details, modelNumber })}
        placeholder="From manufacture tag"
      />
      <FormField
        label="Serial #"
        value={details.serialNumber ?? ''}
        onChangeText={(serialNumber) => onChange({ ...details, serialNumber })}
        placeholder="From manufacture tag"
      />
      <FormField
        label="Notes"
        value={details.notes ?? ''}
        onChangeText={(notes) => onChange({ ...details, notes })}
        placeholder="General notes about this appliance"
        multiline
      />
    </>
  );
}

export function AppliancePurchaseFields(props: ApplianceFieldsProps) {
  const { details, onChange } = props;

  return (
    <>
      <FormField
        label="Where purchased"
        value={details.purchaseLocation ?? ''}
        onChangeText={(purchaseLocation) => onChange({ ...details, purchaseLocation })}
        placeholder="Store name or website"
      />
      <DateFormField
        label="Date purchased (MM/DD/YYYY)"
        value={details.purchaseDateAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(purchaseDateAtISO) =>
          onChange({
            ...details,
            purchaseDateAtISO,
          })
        }
        placeholder="06/01/2024"
      />
      <FormField
        label="Total paid"
        value={details.purchasePrice ?? ''}
        onChangeText={(purchasePrice) => onChange({ ...details, purchasePrice })}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <FormField
        label="Purchase notes"
        value={details.purchaseNotes ?? ''}
        onChangeText={(purchaseNotes) => onChange({ ...details, purchaseNotes })}
        placeholder="e.g. Warranty info, delivery details"
        multiline
      />
    </>
  );
}

export function ApplianceRepairFields(props: ApplianceFieldsProps) {
  const { details, onChange } = props;

  return (
    <>
      <FormField
        label="Repair company"
        value={details.repairCompany ?? ''}
        onChangeText={(repairCompany) => onChange({ ...details, repairCompany })}
        placeholder="Preferred repair vendor"
      />
      <FormField
        label="Repair phone"
        value={details.repairPhone ?? ''}
        onChangeText={(repairPhone) => onChange({ ...details, repairPhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
      <FormField
        label="Repair website"
        value={details.repairWebsite ?? ''}
        onChangeText={(repairWebsite) => onChange({ ...details, repairWebsite })}
        placeholder="https://example.com"
        keyboardType="url"
      />
    </>
  );
}

export function ApplianceForm(props: ApplianceFieldsProps) {
  const { details, onChange } = props;

  return (
    <>
      <ApplianceIdentityFields details={details} onChange={onChange} />
      <AppliancePurchaseFields details={details} onChange={onChange} />
      <ApplianceRepairFields details={details} onChange={onChange} />
    </>
  );
}
