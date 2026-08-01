import React from 'react';
import type { SecuritySystemDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import {
  SECURITY_SYSTEM_TYPE_OPTIONS,
  securitySystemTypeLabel,
} from '../../securitySystemSlots';

export function SecuritySystemSystemFields(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="System type"
        options={SECURITY_SYSTEM_TYPE_OPTIONS}
        value={details.systemType}
        displayValue={securitySystemTypeLabel(details.systemType, details.systemTypeOther)}
        onChange={(systemType) =>
          onChange({
            ...details,
            systemType,
            systemTypeOther: systemType === 'other' ? details.systemTypeOther : undefined,
          })
        }
      />
      {details.systemType === 'other' ? (
        <FormField
          label="System type (other)"
          value={details.systemTypeOther ?? ''}
          onChangeText={(systemTypeOther) => onChange({ ...details, systemTypeOther })}
          placeholder="e.g. Doorbell cameras only"
        />
      ) : null}
      <FormField
        label="Control panel location"
        value={details.panelLocation ?? ''}
        onChangeText={(panelLocation) => onChange({ ...details, panelLocation })}
        placeholder="e.g. Basement utility room"
      />
      <FormField
        label="Keypad location"
        value={details.keypadLocation ?? ''}
        onChangeText={(keypadLocation) => onChange({ ...details, keypadLocation })}
        placeholder="e.g. Inside front door"
      />
      <FormField
        label="Access notes"
        value={details.accessNotes ?? ''}
        onChangeText={(accessNotes) => onChange({ ...details, accessNotes })}
        placeholder="Master code location, duress code, app login…"
        multiline
      />
    </>
  );
}

export function SecuritySystemMonitoringFields(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Monitoring company"
        value={details.monitoringCompany ?? ''}
        onChangeText={(monitoringCompany) => onChange({ ...details, monitoringCompany })}
        placeholder="e.g. ADT, Simplisafe, local monitoring"
      />
      <FormField
        label="Account number"
        value={details.accountNumber ?? ''}
        onChangeText={(accountNumber) => onChange({ ...details, accountNumber })}
      />
      <FormField
        label="Monitoring phone"
        value={details.monitoringPhone ?? ''}
        onChangeText={(monitoringPhone) => onChange({ ...details, monitoringPhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
    </>
  );
}

export function SecuritySystemEquipmentFields(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Honeywell, DSC, Ring"
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

export function SecuritySystemInstallFields(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
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

export function SecuritySystemServiceFields(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
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

export function SecuritySystemNotesFields(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
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

export function SecuritySystemForm(props: {
  details: SecuritySystemDetails;
  onChange: (d: SecuritySystemDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <SecuritySystemSystemFields details={details} onChange={onChange} />
      <SecuritySystemMonitoringFields details={details} onChange={onChange} />
      <SecuritySystemEquipmentFields details={details} onChange={onChange} />
      <SecuritySystemInstallFields details={details} onChange={onChange} />
      <SecuritySystemServiceFields details={details} onChange={onChange} />
      <SecuritySystemNotesFields details={details} onChange={onChange} />
    </>
  );
}
