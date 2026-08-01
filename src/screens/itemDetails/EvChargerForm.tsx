import React from 'react';
import type { EvChargerDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function EvChargerEquipmentFields(props: {
  details: EvChargerDetails;
  onChange: (d: EvChargerDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Tesla, ChargePoint, Grizzl-E"
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
        label="Amperage"
        value={details.amperage ?? ''}
        onChangeText={(amperage) => onChange({ ...details, amperage })}
        placeholder="e.g. 48A"
      />
      <FormField
        label="Connector type"
        value={details.connectorType ?? ''}
        onChangeText={(connectorType) => onChange({ ...details, connectorType })}
        placeholder="e.g. J1772, NACS"
      />
      <FormField
        label="Circuit breaker"
        value={details.circuitBreaker ?? ''}
        onChangeText={(circuitBreaker) => onChange({ ...details, circuitBreaker })}
        placeholder="e.g. 60A double pole, panel slot 12"
      />
    </>
  );
}

export function EvChargerInstallFields(props: {
  details: EvChargerDetails;
  onChange: (d: EvChargerDetails) => void;
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
        placeholder="Company or electrician name"
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

export function EvChargerNotesFields(props: {
  details: EvChargerDetails;
  onChange: (d: EvChargerDetails) => void;
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

export function EvChargerForm(props: {
  details: EvChargerDetails;
  onChange: (d: EvChargerDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <EvChargerEquipmentFields details={details} onChange={onChange} />
      <EvChargerInstallFields details={details} onChange={onChange} />
      <EvChargerNotesFields details={details} onChange={onChange} />
    </>
  );
}
