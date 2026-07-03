import React from 'react';
import type { InternetDetails } from '../../types';
import { FormField } from './FormField';

export function InternetServiceFields(props: {
  details: InternetDetails;
  onChange: (d: InternetDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="ISP"
        value={details.isp ?? ''}
        onChangeText={(isp) => onChange({ ...details, isp })}
      />
      <FormField
        label="Router model"
        value={details.routerModel ?? ''}
        onChangeText={(routerModel) => onChange({ ...details, routerModel })}
      />
      <FormField
        label="Wi‑Fi SSID"
        value={details.wifiSsid ?? ''}
        onChangeText={(wifiSsid) => onChange({ ...details, wifiSsid })}
      />
    </>
  );
}

export function InternetAccountFields(props: {
  details: InternetDetails;
  onChange: (d: InternetDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <FormField
      label="Account / login notes"
      value={details.accountNotes ?? ''}
      onChangeText={(accountNotes) => onChange({ ...details, accountNotes })}
      multiline
    />
  );
}

export function InternetForm(props: {
  details: InternetDetails;
  onChange: (d: InternetDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <InternetServiceFields details={details} onChange={onChange} />
      <InternetAccountFields details={details} onChange={onChange} />
    </>
  );
}
