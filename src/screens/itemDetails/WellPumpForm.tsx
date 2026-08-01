import React from 'react';
import type { WellPumpDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function WellPumpEquipmentFields(props: {
  details: WellPumpDetails;
  onChange: (d: WellPumpDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Pump make"
        value={details.pumpMake ?? ''}
        onChangeText={(pumpMake) => onChange({ ...details, pumpMake })}
        placeholder="e.g. Goulds, Franklin Electric"
      />
      <FormField
        label="Pump model"
        value={details.pumpModel ?? ''}
        onChangeText={(pumpModel) => onChange({ ...details, pumpModel })}
        placeholder="From manufacturer tag"
      />
      <FormField
        label="Pump serial number"
        value={details.pumpSerialNumber ?? ''}
        onChangeText={(pumpSerialNumber) => onChange({ ...details, pumpSerialNumber })}
        placeholder="From manufacturer tag"
      />
    </>
  );
}

export function WellPumpWellFields(props: {
  details: WellPumpDetails;
  onChange: (d: WellPumpDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Well depth"
        value={details.wellDepth ?? ''}
        onChangeText={(wellDepth) => onChange({ ...details, wellDepth })}
        placeholder="e.g. 180 ft"
      />
      <FormField
        label="Yield (GPM)"
        value={details.yieldGpm ?? ''}
        onChangeText={(yieldGpm) => onChange({ ...details, yieldGpm })}
        placeholder="e.g. 8 gpm"
      />
      <FormField
        label="Pressure tank size"
        value={details.pressureTankSize ?? ''}
        onChangeText={(pressureTankSize) => onChange({ ...details, pressureTankSize })}
        placeholder="e.g. 20 gal"
      />
      <FormField
        label="Location notes"
        value={details.locationNotes ?? ''}
        onChangeText={(locationNotes) => onChange({ ...details, locationNotes })}
        placeholder="e.g. Basement utility room"
      />
    </>
  );
}

export function WellPumpInstallFields(props: {
  details: WellPumpDetails;
  onChange: (d: WellPumpDetails) => void;
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

export function WellPumpServiceFields(props: {
  details: WellPumpDetails;
  onChange: (d: WellPumpDetails) => void;
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

export function WellPumpNotesFields(props: {
  details: WellPumpDetails;
  onChange: (d: WellPumpDetails) => void;
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

export function WellPumpForm(props: {
  details: WellPumpDetails;
  onChange: (d: WellPumpDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <WellPumpEquipmentFields details={details} onChange={onChange} />
      <WellPumpWellFields details={details} onChange={onChange} />
      <WellPumpInstallFields details={details} onChange={onChange} />
      <WellPumpServiceFields details={details} onChange={onChange} />
      <WellPumpNotesFields details={details} onChange={onChange} />
    </>
  );
}
