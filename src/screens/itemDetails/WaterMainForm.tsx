import React from 'react';
import type { WaterMainDetails, WaterSource } from '../../types';
import { FormField } from './FormField';
import { FormPicker } from './FormPicker';
import {
  VALVE_TYPE_OPTIONS,
  WATER_SOURCE_PICKER_OPTIONS,
  valveTypeLabel,
  waterSourceLabel,
} from '../../waterMainSlots';

export function WaterMainForm(props: {
  details: WaterMainDetails;
  onChange: (d: WaterMainDetails) => void;
}) {
  const { details, onChange } = props;

  function setWaterSource(waterSource: WaterSource | undefined) {
    onChange({
      ...details,
      waterSource,
      meterNumber: waterSource === 'municipal' ? details.meterNumber : undefined,
      wellHeadLocation: waterSource === 'well' ? details.wellHeadLocation : undefined,
    });
  }

  return (
    <>
      <FormPicker
        label="Water source"
        options={WATER_SOURCE_PICKER_OPTIONS}
        value={details.waterSource}
        displayValue={waterSourceLabel(details.waterSource)}
        onChange={setWaterSource}
      />
      <FormField
        label="Shutoff location"
        value={details.shutoffLocation ?? ''}
        onChangeText={(shutoffLocation) => onChange({ ...details, shutoffLocation })}
        multiline
      />
      <FormPicker
        label="Valve type"
        options={VALVE_TYPE_OPTIONS}
        value={details.valveType}
        displayValue={valveTypeLabel(details.valveType)}
        onChange={(valveType) => onChange({ ...details, valveType })}
      />
      {details.waterSource === 'municipal' ? (
        <FormField
          label="Meter number"
          value={details.meterNumber ?? ''}
          onChangeText={(meterNumber) => onChange({ ...details, meterNumber })}
        />
      ) : null}
      {details.waterSource === 'well' ? (
        <FormField
          label="Well head location"
          value={details.wellHeadLocation ?? ''}
          onChangeText={(wellHeadLocation) => onChange({ ...details, wellHeadLocation })}
          placeholder="e.g. Side yard, near garage"
        />
      ) : null}
      <FormField
        label="Notes"
        value={details.notes ?? ''}
        onChangeText={(notes) => onChange({ ...details, notes })}
        multiline
      />
    </>
  );
}
