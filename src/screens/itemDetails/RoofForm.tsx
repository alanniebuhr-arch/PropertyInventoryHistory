import React from 'react';
import type { RoofDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { ROOF_MATERIAL_OPTIONS, roofMaterialLabel } from '../../roofSlots';

export function RoofRoofFields(props: {
  details: RoofDetails;
  onChange: (d: RoofDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="Material"
        options={ROOF_MATERIAL_OPTIONS}
        value={details.material}
        displayValue={roofMaterialLabel(details.material, details.materialOther)}
        onChange={(material) =>
          onChange({
            ...details,
            material,
            materialOther: material === 'other' ? details.materialOther : undefined,
          })
        }
      />
      {details.material === 'other' ? (
        <FormField
          label="Material (other)"
          value={details.materialOther ?? ''}
          onChangeText={(materialOther) => onChange({ ...details, materialOther })}
          placeholder="e.g. Wood shake"
        />
      ) : null}
      <FormField
        label="Color"
        value={details.color ?? ''}
        onChangeText={(color) => onChange({ ...details, color })}
        placeholder="e.g. Charcoal"
      />
    </>
  );
}

export function RoofWarrantyFields(props: {
  details: RoofDetails;
  onChange: (d: RoofDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <DateFormField
        label="Install date"
        value={details.installDateAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(installDateAtISO) => onChange({ ...details, installDateAtISO })}
        placeholder="06/01/2020"
      />
      <DateFormField
        label="Warranty expires"
        value={details.warrantyExpiresAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(warrantyExpiresAtISO) => onChange({ ...details, warrantyExpiresAtISO })}
        placeholder="06/01/2040"
      />
      <DateFormField
        label="Last inspected"
        value={details.lastInspectedAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(lastInspectedAtISO) => onChange({ ...details, lastInspectedAtISO })}
        placeholder="06/01/2024"
      />
    </>
  );
}

export function RoofContractorFields(props: {
  details: RoofDetails;
  onChange: (d: RoofDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Contractor name"
        value={details.contractorName ?? ''}
        onChangeText={(contractorName) => onChange({ ...details, contractorName })}
      />
      <FormField
        label="Contractor phone"
        value={details.contractorPhone ?? ''}
        onChangeText={(contractorPhone) => onChange({ ...details, contractorPhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
    </>
  );
}

export function RoofNotesFields(props: {
  details: RoofDetails;
  onChange: (d: RoofDetails) => void;
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

export function RoofForm(props: {
  details: RoofDetails;
  onChange: (d: RoofDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <RoofRoofFields details={details} onChange={onChange} />
      <RoofWarrantyFields details={details} onChange={onChange} />
      <RoofContractorFields details={details} onChange={onChange} />
      <RoofNotesFields details={details} onChange={onChange} />
    </>
  );
}
