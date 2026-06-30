import React from 'react';
import type { InternetDetails } from '../../types';
import { FormField } from './FormField';

export function InternetForm(props: {
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
        label="Account / login notes"
        value={details.accountNotes ?? ''}
        onChangeText={(accountNotes) => onChange({ ...details, accountNotes })}
        multiline
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
