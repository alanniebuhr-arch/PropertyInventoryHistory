import React from 'react';
import type { SumpPumpDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { SUMP_PUMP_ROLE_OPTIONS, sumpPumpRoleLabel } from '../../sumpPumpSlots';

export function SumpPumpSystemFields(props: {
  details: SumpPumpDetails;
  onChange: (d: SumpPumpDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="Pump role"
        options={SUMP_PUMP_ROLE_OPTIONS}
        value={details.pumpRole}
        displayValue={sumpPumpRoleLabel(details.pumpRole)}
        onChange={(pumpRole) => onChange({ ...details, pumpRole })}
      />
      <FormField
        label="Location notes"
        value={details.locationNotes ?? ''}
        onChangeText={(locationNotes) => onChange({ ...details, locationNotes })}
        placeholder="e.g. Basement sump pit"
      />
      <FormField
        label="Discharge location"
        value={details.dischargeLocation ?? ''}
        onChangeText={(dischargeLocation) => onChange({ ...details, dischargeLocation })}
        placeholder="e.g. Exits north side of house"
      />
      <FormField
        label="Battery backup notes"
        value={details.batteryBackupNotes ?? ''}
        onChangeText={(batteryBackupNotes) => onChange({ ...details, batteryBackupNotes })}
        placeholder="e.g. Battery replaced yearly"
        multiline
      />
    </>
  );
}

export function SumpPumpEquipmentFields(props: {
  details: SumpPumpDetails;
  onChange: (d: SumpPumpDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Zoeller, WAYNE"
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
    </>
  );
}

export function SumpPumpInstallFields(props: {
  details: SumpPumpDetails;
  onChange: (d: SumpPumpDetails) => void;
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

export function SumpPumpServiceFields(props: {
  details: SumpPumpDetails;
  onChange: (d: SumpPumpDetails) => void;
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

export function SumpPumpNotesFields(props: {
  details: SumpPumpDetails;
  onChange: (d: SumpPumpDetails) => void;
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

export function SumpPumpForm(props: {
  details: SumpPumpDetails;
  onChange: (d: SumpPumpDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <SumpPumpSystemFields details={details} onChange={onChange} />
      <SumpPumpEquipmentFields details={details} onChange={onChange} />
      <SumpPumpInstallFields details={details} onChange={onChange} />
      <SumpPumpServiceFields details={details} onChange={onChange} />
      <SumpPumpNotesFields details={details} onChange={onChange} />
    </>
  );
}
