import React from 'react';
import type { FurnaceDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';
import { FormPicker } from './FormPicker';
import {
  FUEL_TYPE_OPTIONS,
  HEAT_DISTRIBUTION_OPTIONS,
  HEAT_SOURCE_OPTIONS,
  fuelTankLocationLabel,
  fuelTankSizeLabel,
  fuelTypeLabel,
  furnaceUsesFuelTank,
  heatDistributionLabel,
} from '../../furnaceSlots';

export function FurnaceEquipmentFields(props: {
  details: FurnaceDetails;
  onChange: (d: FurnaceDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormPicker
        label="Heat source"
        options={HEAT_SOURCE_OPTIONS}
        value={details.systemType}
        onChange={(systemType) => onChange({ ...details, systemType })}
      />
      <FormPicker
        label="Heat distribution"
        options={HEAT_DISTRIBUTION_OPTIONS}
        value={details.heatDistribution}
        displayValue={heatDistributionLabel(details.heatDistribution, details.heatDistributionOther)}
        onChange={(heatDistribution) =>
          onChange({
            ...details,
            heatDistribution,
            heatDistributionOther:
              heatDistribution === 'other' ? details.heatDistributionOther : undefined,
          })
        }
      />
      {details.heatDistribution === 'other' ? (
        <FormField
          label="Heat distribution (other)"
          value={details.heatDistributionOther ?? ''}
          onChangeText={(heatDistributionOther) => onChange({ ...details, heatDistributionOther })}
          placeholder="e.g. Radiant floor, Steam"
        />
      ) : null}
      <FormPicker
        label="Fuel type"
        options={FUEL_TYPE_OPTIONS}
        value={details.fuelType}
        displayValue={fuelTypeLabel(details.fuelType, details.fuelTypeOther)}
        onChange={(fuelType) =>
          onChange({
            ...details,
            fuelType,
            fuelTypeOther: fuelType === 'other' ? details.fuelTypeOther : undefined,
            ...(furnaceUsesFuelTank(fuelType)
              ? {}
              : {
                  fuelTankLocation: undefined,
                  fuelTankSize: undefined,
                }),
          })
        }
      />
      {details.fuelType === 'other' ? (
        <FormField
          label="Fuel type (other)"
          value={details.fuelTypeOther ?? ''}
          onChangeText={(fuelTypeOther) => onChange({ ...details, fuelTypeOther })}
          placeholder="e.g. Wood, Pellet, Geothermal"
        />
      ) : null}
      {furnaceUsesFuelTank(details.fuelType) ? (
        <>
          <FormField
            label={fuelTankLocationLabel(details.fuelType)}
            value={details.fuelTankLocation ?? ''}
            onChangeText={(fuelTankLocation) => onChange({ ...details, fuelTankLocation })}
            placeholder="e.g. Basement, Side of house"
          />
          <FormField
            label={fuelTankSizeLabel(details.fuelType)}
            value={details.fuelTankSize ?? ''}
            onChangeText={(fuelTankSize) => onChange({ ...details, fuelTankSize })}
            placeholder="e.g. 275 gallons"
          />
        </>
      ) : null}
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Carrier, Trane, Lennox"
      />
      <FormField
        label="Model"
        value={details.modelNumber ?? ''}
        onChangeText={(modelNumber) => onChange({ ...details, modelNumber })}
        placeholder="From manufacture tag"
      />
      <FormField
        label="Serial number"
        value={details.serialNumber ?? ''}
        onChangeText={(serialNumber) => onChange({ ...details, serialNumber })}
        placeholder="From manufacture tag"
      />
      <FormField
        label="Filter size"
        value={details.filterSize ?? ''}
        onChangeText={(filterSize) => onChange({ ...details, filterSize })}
      />
    </>
  );
}

export function FurnaceInstallFields(props: {
  details: FurnaceDetails;
  onChange: (d: FurnaceDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <DateFormField
        label="Install date (MM/DD/YYYY)"
        value={details.installDateAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(installDateAtISO) =>
          onChange({
            ...details,
            installDateAtISO,
          })
        }
        placeholder="06/01/2020"
      />
      <FormField
        label="Install cost"
        value={details.installCost ?? ''}
        onChangeText={(installCost) => onChange({ ...details, installCost })}
        placeholder="0.00"
        keyboardType="decimal-pad"
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

export function FurnaceNotesFields(props: {
  details: FurnaceDetails;
  onChange: (d: FurnaceDetails) => void;
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

export function FurnaceForm(props: {
  details: FurnaceDetails;
  onChange: (d: FurnaceDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FurnaceEquipmentFields details={details} onChange={onChange} />
      <FurnaceInstallFields details={details} onChange={onChange} />
      <FurnaceNotesFields details={details} onChange={onChange} />
    </>
  );
}
