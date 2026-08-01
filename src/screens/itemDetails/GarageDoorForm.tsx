import React from 'react';
import type { GarageDoorDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function GarageDoorEquipmentFields(props: {
  details: GarageDoorDetails;
  onChange: (d: GarageDoorDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Opener make"
        value={details.openerMake ?? ''}
        onChangeText={(openerMake) => onChange({ ...details, openerMake })}
        placeholder="e.g. Chamberlain, LiftMaster"
      />
      <FormField
        label="Opener model"
        value={details.openerModel ?? ''}
        onChangeText={(openerModel) => onChange({ ...details, openerModel })}
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Opener serial number"
        value={details.openerSerialNumber ?? ''}
        onChangeText={(openerSerialNumber) => onChange({ ...details, openerSerialNumber })}
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Spring type"
        value={details.springType ?? ''}
        onChangeText={(springType) => onChange({ ...details, springType })}
        placeholder="e.g. Torsion, extension"
      />
      <FormField
        label="Programming notes"
        value={details.programmingNotes ?? ''}
        onChangeText={(programmingNotes) => onChange({ ...details, programmingNotes })}
        placeholder="Remote/keypad programming steps"
        multiline
      />
    </>
  );
}

export function GarageDoorInstallFields(props: {
  details: GarageDoorDetails;
  onChange: (d: GarageDoorDetails) => void;
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

export function GarageDoorServiceFields(props: {
  details: GarageDoorDetails;
  onChange: (d: GarageDoorDetails) => void;
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

export function GarageDoorNotesFields(props: {
  details: GarageDoorDetails;
  onChange: (d: GarageDoorDetails) => void;
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

export function GarageDoorForm(props: {
  details: GarageDoorDetails;
  onChange: (d: GarageDoorDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <GarageDoorEquipmentFields details={details} onChange={onChange} />
      <GarageDoorInstallFields details={details} onChange={onChange} />
      <GarageDoorServiceFields details={details} onChange={onChange} />
      <GarageDoorNotesFields details={details} onChange={onChange} />
    </>
  );
}
