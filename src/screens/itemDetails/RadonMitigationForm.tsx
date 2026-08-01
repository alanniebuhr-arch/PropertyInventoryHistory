import React from 'react';
import type { RadonMitigationDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import {
  RADON_MITIGATION_SYSTEM_TYPE_OPTIONS,
  radonMitigationSystemTypeLabel,
} from '../../radonMitigationSlots';

export function RadonMitigationSystemFields(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="System type"
        options={RADON_MITIGATION_SYSTEM_TYPE_OPTIONS}
        value={details.systemType}
        displayValue={radonMitigationSystemTypeLabel(details.systemType, details.systemTypeOther)}
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
          placeholder="e.g. Combination system"
        />
      ) : null}
      <FormField
        label="Fan location"
        value={details.fanLocation ?? ''}
        onChangeText={(fanLocation) => onChange({ ...details, fanLocation })}
        placeholder="e.g. Attic, exterior side of house"
      />
      <FormField
        label="Suction point location"
        value={details.suctionPointLocation ?? ''}
        onChangeText={(suctionPointLocation) => onChange({ ...details, suctionPointLocation })}
        placeholder="e.g. Basement slab near sump"
      />
      <FormField
        label="Discharge location"
        value={details.dischargeLocation ?? ''}
        onChangeText={(dischargeLocation) => onChange({ ...details, dischargeLocation })}
        placeholder="e.g. Above roof on north side"
      />
      <FormField
        label="Manometer reading"
        value={details.manometerReading ?? ''}
        onChangeText={(manometerReading) => onChange({ ...details, manometerReading })}
        placeholder="e.g. 1.5 in. WC"
      />
    </>
  );
}

export function RadonMitigationEquipmentFields(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Fan make"
        value={details.fanMake ?? ''}
        onChangeText={(fanMake) => onChange({ ...details, fanMake })}
        placeholder="e.g. RadonAway, Fantech"
      />
      <FormField
        label="Fan model"
        value={details.fanModel ?? ''}
        onChangeText={(fanModel) => onChange({ ...details, fanModel })}
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Fan serial number"
        value={details.fanSerialNumber ?? ''}
        onChangeText={(fanSerialNumber) => onChange({ ...details, fanSerialNumber })}
        placeholder="From manufacturer tag"
      />
    </>
  );
}

export function RadonMitigationTestFields(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <DateFormField
        label="Last test date"
        value={details.lastTestDateAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(lastTestDateAtISO) => onChange({ ...details, lastTestDateAtISO })}
        placeholder="06/01/2024"
      />
      <FormField
        label="Last test result"
        value={details.lastTestResult ?? ''}
        onChangeText={(lastTestResult) => onChange({ ...details, lastTestResult })}
        placeholder="e.g. 1.2 pCi/L"
      />
    </>
  );
}

export function RadonMitigationInstallFields(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
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

export function RadonMitigationServiceFields(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
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

export function RadonMitigationNotesFields(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
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

export function RadonMitigationForm(props: {
  details: RadonMitigationDetails;
  onChange: (d: RadonMitigationDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <RadonMitigationSystemFields details={details} onChange={onChange} />
      <RadonMitigationEquipmentFields details={details} onChange={onChange} />
      <RadonMitigationTestFields details={details} onChange={onChange} />
      <RadonMitigationInstallFields details={details} onChange={onChange} />
      <RadonMitigationServiceFields details={details} onChange={onChange} />
      <RadonMitigationNotesFields details={details} onChange={onChange} />
    </>
  );
}
