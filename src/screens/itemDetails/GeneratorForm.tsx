import React from 'react';
import type { GeneratorDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import { GENERATOR_FUEL_TYPE_OPTIONS, generatorFuelTypeLabel } from '../../generatorSlots';

export function GeneratorEquipmentFields(props: {
  details: GeneratorDetails;
  onChange: (d: GeneratorDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="Fuel type"
        options={GENERATOR_FUEL_TYPE_OPTIONS}
        value={details.fuelType}
        displayValue={generatorFuelTypeLabel(details.fuelType, details.fuelTypeOther)}
        onChange={(fuelType) =>
          onChange({
            ...details,
            fuelType,
            fuelTypeOther: fuelType === 'other' ? details.fuelTypeOther : undefined,
          })
        }
      />
      {details.fuelType === 'other' ? (
        <FormField
          label="Fuel type (other)"
          value={details.fuelTypeOther ?? ''}
          onChangeText={(fuelTypeOther) => onChange({ ...details, fuelTypeOther })}
          placeholder="e.g. Dual fuel"
        />
      ) : null}
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Generac, Kohler"
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
        label="Wattage"
        value={details.wattage ?? ''}
        onChangeText={(wattage) => onChange({ ...details, wattage })}
        placeholder="e.g. 22 kW"
      />
      <FormField
        label="Transfer switch location"
        value={details.transferSwitchLocation ?? ''}
        onChangeText={(transferSwitchLocation) =>
          onChange({ ...details, transferSwitchLocation })
        }
        placeholder="e.g. Next to main panel"
      />
    </>
  );
}

export function GeneratorExerciseFields(props: {
  details: GeneratorDetails;
  onChange: (d: GeneratorDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Runtime hours"
        value={details.runtimeHours ?? ''}
        onChangeText={(runtimeHours) => onChange({ ...details, runtimeHours })}
        placeholder="e.g. 128 hours"
      />
      <DateFormField
        label="Last exercise date"
        value={details.lastExerciseAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(lastExerciseAtISO) => onChange({ ...details, lastExerciseAtISO })}
        placeholder="06/01/2024"
      />
    </>
  );
}

export function GeneratorInstallFields(props: {
  details: GeneratorDetails;
  onChange: (d: GeneratorDetails) => void;
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

export function GeneratorServiceFields(props: {
  details: GeneratorDetails;
  onChange: (d: GeneratorDetails) => void;
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

export function GeneratorNotesFields(props: {
  details: GeneratorDetails;
  onChange: (d: GeneratorDetails) => void;
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

export function GeneratorForm(props: {
  details: GeneratorDetails;
  onChange: (d: GeneratorDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <GeneratorEquipmentFields details={details} onChange={onChange} />
      <GeneratorExerciseFields details={details} onChange={onChange} />
      <GeneratorInstallFields details={details} onChange={onChange} />
      <GeneratorServiceFields details={details} onChange={onChange} />
      <GeneratorNotesFields details={details} onChange={onChange} />
    </>
  );
}
