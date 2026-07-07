import React from 'react';
import type { AirConditionerDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { AC_TYPE_OPTIONS } from '../../airConditionerSlots';

export function AirConditionerEquipmentFields(props: {
  details: AirConditionerDetails;
  onChange: (d: AirConditionerDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="AC type"
        options={AC_TYPE_OPTIONS}
        value={details.acType}
        onChange={(acType) => onChange({ ...details, acType })}
      />
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Carrier, Trane, Lennox"
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
        label="Cooling capacity (tons)"
        value={details.tonnage ?? ''}
        onChangeText={(tonnage) => onChange({ ...details, tonnage })}
        placeholder="e.g. 2.5"
        keyboardType="decimal-pad"
      />
      <FormField
        label="Refrigerant type"
        value={details.refrigerantType ?? ''}
        onChangeText={(refrigerantType) => onChange({ ...details, refrigerantType })}
        placeholder="e.g. R-410A"
      />
      <FormField
        label="Filter size"
        value={details.filterSize ?? ''}
        onChangeText={(filterSize) => onChange({ ...details, filterSize })}
        placeholder="For central or ducted systems"
      />
      <FormField
        label="Location notes"
        value={details.locationNotes ?? ''}
        onChangeText={(locationNotes) => onChange({ ...details, locationNotes })}
        placeholder="Outdoor unit, air handler, window location…"
        multiline
      />
    </>
  );
}

export function AirConditionerInstallFields(props: {
  details: AirConditionerDetails;
  onChange: (d: AirConditionerDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <DateFormField
        label="Install date (MM/DD/YYYY)"
        value={details.installDateAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(installDateAtISO) =>
          onChange({
            ...details,
            installDateAtISO,
          })
        }
        placeholder="06/01/2020"
      />
      <FormField
        label="Install cost"
        value={details.installCost ?? ''}
        onChangeText={(installCost) => onChange({ ...details, installCost })}
        placeholder="0.00"
        keyboardType="decimal-pad"
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

export function AirConditionerServiceFields(props: {
  details: AirConditionerDetails;
  onChange: (d: AirConditionerDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Service company"
        value={details.serviceCompany ?? ''}
        onChangeText={(serviceCompany) => onChange({ ...details, serviceCompany })}
        placeholder="Preferred HVAC service vendor"
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

export function AirConditionerNotesFields(props: {
  details: AirConditionerDetails;
  onChange: (d: AirConditionerDetails) => void;
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

export function AirConditionerForm(props: {
  details: AirConditionerDetails;
  onChange: (d: AirConditionerDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <AirConditionerEquipmentFields details={details} onChange={onChange} />
      <AirConditionerInstallFields details={details} onChange={onChange} />
      <AirConditionerServiceFields details={details} onChange={onChange} />
      <AirConditionerNotesFields details={details} onChange={onChange} />
    </>
  );
}
