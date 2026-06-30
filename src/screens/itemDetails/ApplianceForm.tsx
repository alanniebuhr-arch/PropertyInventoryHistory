import React from 'react';
import type { ApplianceDetails } from '../../types';
import { FormField } from './FormField';

export function purchaseDateEditValue(stored?: string): string {
  if (!stored) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(stored)) return stored.slice(0, 10);
  if (/^\d{4}T/.test(stored)) return '';
  return stored;
}

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
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Serial #"
        value={details.serialNumber ?? ''}
        onChangeText={(serialNumber) => onChange({ ...details, serialNumber })}
        placeholder="From manufacturer tag"
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
      <FormField
        label="Date purchased (YYYY-MM-DD)"
        value={purchaseDateEditValue(details.purchaseDateAtISO)}
        onChangeText={(v) =>
          onChange({
            ...details,
            purchaseDateAtISO: v || undefined,
          })
        }
        placeholder="2024-06-01"
        keyboardType="numbers-and-punctuation"
      />
      <FormField
        label="How much paid"
        value={details.purchasePrice ?? ''}
        onChangeText={(purchasePrice) => onChange({ ...details, purchasePrice })}
        placeholder="0.00"
        keyboardType="decimal-pad"
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
