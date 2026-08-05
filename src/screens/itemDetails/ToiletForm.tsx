import React from 'react';
import type { ToiletDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { TOILET_FLUSH_TYPE_OPTIONS, toiletFlushTypeLabel } from '../../toiletSlots';

export function ToiletEquipmentFields(props: {
  details: ToiletDetails;
  onChange: (d: ToiletDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Toto, Kohler, American Standard"
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
      <FormPicker
        label="Flush type"
        options={TOILET_FLUSH_TYPE_OPTIONS}
        value={details.flushType}
        displayValue={toiletFlushTypeLabel(details.flushType, details.flushTypeOther)}
        onChange={(flushType) =>
          onChange({
            ...details,
            flushType,
            flushTypeOther: flushType === 'other' ? details.flushTypeOther : undefined,
          })
        }
      />
      {details.flushType === 'other' ? (
        <FormField
          label="Flush type (other)"
          value={details.flushTypeOther ?? ''}
          onChangeText={(flushTypeOther) => onChange({ ...details, flushTypeOther })}
          placeholder="e.g. Vacuum assist"
        />
      ) : null}
      <FormField
        label="Gallons per flush"
        value={details.gallonsPerFlush ?? ''}
        onChangeText={(gallonsPerFlush) => onChange({ ...details, gallonsPerFlush })}
        placeholder="e.g. 1.28"
        keyboardType="decimal-pad"
      />
    </>
  );
}

export function ToiletValvesFields(props: {
  details: ToiletDetails;
  onChange: (d: ToiletDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Flush valve kit"
        value={details.flushValveKit ?? ''}
        onChangeText={(flushValveKit) => onChange({ ...details, flushValveKit })}
        placeholder="Brand or part number"
      />
      <FormField
        label="Fill valve kit"
        value={details.fillValveKit ?? ''}
        onChangeText={(fillValveKit) => onChange({ ...details, fillValveKit })}
        placeholder="Brand or part number"
      />
    </>
  );
}

export function ToiletInstallFields(props: {
  details: ToiletDetails;
  onChange: (d: ToiletDetails) => void;
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

export function ToiletNotesFields(props: {
  details: ToiletDetails;
  onChange: (d: ToiletDetails) => void;
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

export function ToiletForm(props: {
  details: ToiletDetails;
  onChange: (d: ToiletDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <ToiletEquipmentFields details={details} onChange={onChange} />
      <ToiletValvesFields details={details} onChange={onChange} />
      <ToiletInstallFields details={details} onChange={onChange} />
      <ToiletNotesFields details={details} onChange={onChange} />
    </>
  );
}
