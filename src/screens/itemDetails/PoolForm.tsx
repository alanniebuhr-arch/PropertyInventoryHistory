import React from 'react';
import type { PoolDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { POOL_TYPE_OPTIONS, poolTypeLabel } from '../../poolSlots';

export function PoolPoolFields(props: {
  details: PoolDetails;
  onChange: (d: PoolDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="Pool type"
        options={POOL_TYPE_OPTIONS}
        value={details.poolType}
        displayValue={poolTypeLabel(details.poolType, details.poolTypeOther)}
        onChange={(poolType) =>
          onChange({
            ...details,
            poolType,
            poolTypeOther: poolType === 'other' ? details.poolTypeOther : undefined,
          })
        }
      />
      {details.poolType === 'other' ? (
        <FormField
          label="Pool type (other)"
          value={details.poolTypeOther ?? ''}
          onChangeText={(poolTypeOther) => onChange({ ...details, poolTypeOther })}
          placeholder="e.g. Plunge pool"
        />
      ) : null}
      <FormField
        label="Volume (gallons)"
        value={details.volumeGallons ?? ''}
        onChangeText={(volumeGallons) => onChange({ ...details, volumeGallons })}
        placeholder="e.g. 18,000 gal"
      />
    </>
  );
}

export function PoolEquipmentFields(props: {
  details: PoolDetails;
  onChange: (d: PoolDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Filter make"
        value={details.filterMake ?? ''}
        onChangeText={(filterMake) => onChange({ ...details, filterMake })}
      />
      <FormField
        label="Filter model"
        value={details.filterModel ?? ''}
        onChangeText={(filterModel) => onChange({ ...details, filterModel })}
      />
      <FormField
        label="Pump make"
        value={details.pumpMake ?? ''}
        onChangeText={(pumpMake) => onChange({ ...details, pumpMake })}
      />
      <FormField
        label="Pump model"
        value={details.pumpModel ?? ''}
        onChangeText={(pumpModel) => onChange({ ...details, pumpModel })}
      />
      <FormField
        label="Heater type"
        value={details.heaterType ?? ''}
        onChangeText={(heaterType) => onChange({ ...details, heaterType })}
        placeholder="e.g. Gas, heat pump, solar"
      />
      <FormField
        label="Chemical notes"
        value={details.chemicalNotes ?? ''}
        onChangeText={(chemicalNotes) => onChange({ ...details, chemicalNotes })}
        placeholder="e.g. Chlorine, salt system"
        multiline
      />
    </>
  );
}

export function PoolInstallFields(props: {
  details: PoolDetails;
  onChange: (d: PoolDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <DateFormField
      label="Install date"
      value={details.installDateAtISO}
      parseStored={parseDateInputValue}
      onChangeStored={(installDateAtISO) => onChange({ ...details, installDateAtISO })}
      placeholder="06/01/2020"
    />
  );
}

export function PoolServiceFields(props: {
  details: PoolDetails;
  onChange: (d: PoolDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Service company"
        value={details.serviceCompany ?? ''}
        onChangeText={(serviceCompany) => onChange({ ...details, serviceCompany })}
      />
      <FormField
        label="Service phone"
        value={details.servicePhone ?? ''}
        onChangeText={(servicePhone) => onChange({ ...details, servicePhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
    </>
  );
}

export function PoolNotesFields(props: {
  details: PoolDetails;
  onChange: (d: PoolDetails) => void;
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

export function PoolForm(props: {
  details: PoolDetails;
  onChange: (d: PoolDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <PoolPoolFields details={details} onChange={onChange} />
      <PoolEquipmentFields details={details} onChange={onChange} />
      <PoolInstallFields details={details} onChange={onChange} />
      <PoolServiceFields details={details} onChange={onChange} />
      <PoolNotesFields details={details} onChange={onChange} />
    </>
  );
}
