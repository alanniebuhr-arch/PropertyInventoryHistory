import React from 'react';
import type { HotTubDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function HotTubEquipmentFields(props: {
  details: HotTubDetails;
  onChange: (d: HotTubDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Jacuzzi, Hot Spring"
      />
      <FormField
        label="Model"
        value={details.modelNumber ?? ''}
        onChangeText={(modelNumber) => onChange({ ...details, modelNumber })}
      />
      <FormField
        label="Serial number"
        value={details.serialNumber ?? ''}
        onChangeText={(serialNumber) => onChange({ ...details, serialNumber })}
      />
      <FormField
        label="Capacity (persons)"
        value={details.capacityPersons ?? ''}
        onChangeText={(capacityPersons) => onChange({ ...details, capacityPersons })}
        placeholder="e.g. 6"
        keyboardType="number-pad"
      />
    </>
  );
}

export function HotTubMaintenanceFields(props: {
  details: HotTubDetails;
  onChange: (d: HotTubDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Filter model"
        value={details.filterModel ?? ''}
        onChangeText={(filterModel) => onChange({ ...details, filterModel })}
      />
      <FormField
        label="Heater type"
        value={details.heaterType ?? ''}
        onChangeText={(heaterType) => onChange({ ...details, heaterType })}
        placeholder="e.g. Electric, gas"
      />
      <FormField
        label="Chemical notes"
        value={details.chemicalNotes ?? ''}
        onChangeText={(chemicalNotes) => onChange({ ...details, chemicalNotes })}
        placeholder="e.g. Bromine, chlorine"
        multiline
      />
    </>
  );
}

export function HotTubInstallFields(props: {
  details: HotTubDetails;
  onChange: (d: HotTubDetails) => void;
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

export function HotTubServiceFields(props: {
  details: HotTubDetails;
  onChange: (d: HotTubDetails) => void;
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

export function HotTubNotesFields(props: {
  details: HotTubDetails;
  onChange: (d: HotTubDetails) => void;
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

export function HotTubForm(props: {
  details: HotTubDetails;
  onChange: (d: HotTubDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <HotTubEquipmentFields details={details} onChange={onChange} />
      <HotTubMaintenanceFields details={details} onChange={onChange} />
      <HotTubInstallFields details={details} onChange={onChange} />
      <HotTubServiceFields details={details} onChange={onChange} />
      <HotTubNotesFields details={details} onChange={onChange} />
    </>
  );
}
