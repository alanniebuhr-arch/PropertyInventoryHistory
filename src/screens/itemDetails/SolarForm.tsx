import React from 'react';
import type { SolarDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function SolarSystemFields(props: {
  details: SolarDetails;
  onChange: (d: SolarDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="System size (kW)"
        value={details.systemSizeKw ?? ''}
        onChangeText={(systemSizeKw) => onChange({ ...details, systemSizeKw })}
        placeholder="e.g. 8.4 kW"
      />
      <FormField
        label="Panel make"
        value={details.panelMake ?? ''}
        onChangeText={(panelMake) => onChange({ ...details, panelMake })}
        placeholder="e.g. Qcells, REC"
      />
      <FormField
        label="Panel model"
        value={details.panelModel ?? ''}
        onChangeText={(panelModel) => onChange({ ...details, panelModel })}
      />
      <FormField
        label="Panel count"
        value={details.panelCount ?? ''}
        onChangeText={(panelCount) => onChange({ ...details, panelCount })}
        placeholder="e.g. 24"
        keyboardType="number-pad"
      />
    </>
  );
}

export function SolarInverterFields(props: {
  details: SolarDetails;
  onChange: (d: SolarDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Inverter make"
        value={details.inverterMake ?? ''}
        onChangeText={(inverterMake) => onChange({ ...details, inverterMake })}
        placeholder="e.g. Enphase, SolarEdge"
      />
      <FormField
        label="Inverter model"
        value={details.inverterModel ?? ''}
        onChangeText={(inverterModel) => onChange({ ...details, inverterModel })}
      />
      <FormField
        label="Inverter serial number"
        value={details.inverterSerialNumber ?? ''}
        onChangeText={(inverterSerialNumber) => onChange({ ...details, inverterSerialNumber })}
      />
    </>
  );
}

export function SolarProductionFields(props: {
  details: SolarDetails;
  onChange: (d: SolarDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <FormField
      label="Production account notes"
      value={details.productionAccountNotes ?? ''}
      onChangeText={(productionAccountNotes) => onChange({ ...details, productionAccountNotes })}
      placeholder="Monitoring app login, account number, net metering notes"
      multiline
    />
  );
}

export function SolarInstallFields(props: {
  details: SolarDetails;
  onChange: (d: SolarDetails) => void;
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
        placeholder="Company name"
      />
      <FormField
        label="Installer phone"
        value={details.installerPhone ?? ''}
        onChangeText={(installerPhone) => onChange({ ...details, installerPhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
      <FormField
        label="Warranty notes"
        value={details.warrantyNotes ?? ''}
        onChangeText={(warrantyNotes) => onChange({ ...details, warrantyNotes })}
        placeholder="Panel/inverter/labor warranty terms"
        multiline
      />
    </>
  );
}

export function SolarNotesFields(props: {
  details: SolarDetails;
  onChange: (d: SolarDetails) => void;
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

export function SolarForm(props: {
  details: SolarDetails;
  onChange: (d: SolarDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <SolarSystemFields details={details} onChange={onChange} />
      <SolarInverterFields details={details} onChange={onChange} />
      <SolarProductionFields details={details} onChange={onChange} />
      <SolarInstallFields details={details} onChange={onChange} />
      <SolarNotesFields details={details} onChange={onChange} />
    </>
  );
}
