import React from 'react';
import type { IrrigationDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function IrrigationSystemFields(props: {
  details: IrrigationDetails;
  onChange: (d: IrrigationDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Controller make"
        value={details.controllerMake ?? ''}
        onChangeText={(controllerMake) => onChange({ ...details, controllerMake })}
        placeholder="e.g. Rain Bird, Hunter"
      />
      <FormField
        label="Controller model"
        value={details.controllerModel ?? ''}
        onChangeText={(controllerModel) => onChange({ ...details, controllerModel })}
      />
      <FormField
        label="Zone count"
        value={details.zoneCount ?? ''}
        onChangeText={(zoneCount) => onChange({ ...details, zoneCount })}
        placeholder="e.g. 8"
        keyboardType="number-pad"
      />
      <FormField
        label="Backflow location"
        value={details.backflowLocation ?? ''}
        onChangeText={(backflowLocation) => onChange({ ...details, backflowLocation })}
        placeholder="e.g. Side yard near hose bib"
      />
      <FormField
        label="Winterize notes"
        value={details.winterizeNotes ?? ''}
        onChangeText={(winterizeNotes) => onChange({ ...details, winterizeNotes })}
        placeholder="Blowout instructions, compressor PSI, etc."
        multiline
      />
    </>
  );
}

export function IrrigationInstallFields(props: {
  details: IrrigationDetails;
  onChange: (d: IrrigationDetails) => void;
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

export function IrrigationServiceFields(props: {
  details: IrrigationDetails;
  onChange: (d: IrrigationDetails) => void;
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

export function IrrigationNotesFields(props: {
  details: IrrigationDetails;
  onChange: (d: IrrigationDetails) => void;
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

export function IrrigationForm(props: {
  details: IrrigationDetails;
  onChange: (d: IrrigationDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <IrrigationSystemFields details={details} onChange={onChange} />
      <IrrigationInstallFields details={details} onChange={onChange} />
      <IrrigationServiceFields details={details} onChange={onChange} />
      <IrrigationNotesFields details={details} onChange={onChange} />
    </>
  );
}
