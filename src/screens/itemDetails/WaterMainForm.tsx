import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { WaterMainDetails, WaterSource } from '../../types';
import { FormField } from './FormField';
import { sharedStyles, colors } from '../../theme';
import { VALVE_TYPE_OPTIONS, WATER_SOURCE_OPTIONS } from '../../waterMainSlots';

function OptionPicker<T extends string>(props: {
  label: string;
  options: { value: T; label: string }[];
  value?: T;
  onChange: (value: T | undefined) => void;
  columns?: number;
}) {
  const { label, options, value, onChange, columns = 3 } = props;
  const itemStyle =
    columns === 2
      ? { flexGrow: 1, flexBasis: '48%' as const }
      : { flex: 1 as const };

  return (
    <View>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(selected ? undefined : option.value)}
              style={[
                sharedStyles.secondaryBtn,
                {
                  ...itemStyle,
                  marginTop: 0,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  sharedStyles.secondaryBtnText,
                  {
                    fontSize: 13,
                    textAlign: 'center',
                    color: selected ? '#fff' : colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WaterSourcePickerWithNotSet(props: {
  value?: WaterSource;
  onChange: (value: WaterSource | undefined) => void;
}) {
  const { value, onChange } = props;
  return (
    <View>
      <Text style={sharedStyles.fieldLabel}>Water source</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {WATER_SOURCE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.label}
              onPress={() => onChange(option.value)}
              style={[
                sharedStyles.secondaryBtn,
                {
                  flex: 1,
                  marginTop: 0,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  sharedStyles.secondaryBtnText,
                  {
                    fontSize: 13,
                    textAlign: 'center',
                    color: selected ? '#fff' : colors.text,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

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
    });
  }

  return (
    <>
      <WaterSourcePickerWithNotSet value={details.waterSource} onChange={setWaterSource} />
      <FormField
        label="Shutoff location"
        value={details.shutoffLocation ?? ''}
        onChangeText={(shutoffLocation) => onChange({ ...details, shutoffLocation })}
        multiline
      />
      <OptionPicker
        label="Valve type"
        options={VALVE_TYPE_OPTIONS}
        value={details.valveType}
        onChange={(valveType) => onChange({ ...details, valveType })}
        columns={2}
      />
      {details.waterSource === 'municipal' ? (
        <FormField
          label="Meter number"
          value={details.meterNumber ?? ''}
          onChangeText={(meterNumber) => onChange({ ...details, meterNumber })}
        />
      ) : null}
    </>
  );
}

export function WaterMainNotesFields(props: {
  details: WaterMainDetails;
  onChange: (d: WaterMainDetails) => void;
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
