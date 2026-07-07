import React from 'react';
import type { AutomobileDetails } from '../../types';
import { parseDateInputValue } from '../../utils';
import { DateFormField, FormField } from './FormField';

export function AutomobileVehicleFields(props: {
  details: AutomobileDetails;
  onChange: (d: AutomobileDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Nickname (optional)"
        value={details.nickname ?? ''}
        onChangeText={(nickname) => onChange({ ...details, nickname })}
        placeholder="e.g. Family SUV, Work truck"
      />
      <FormField
        label="Year"
        value={details.year ?? ''}
        onChangeText={(year) => onChange({ ...details, year })}
        placeholder="2020"
        keyboardType="number-pad"
      />
      <FormField
        label="Make"
        value={details.make ?? ''}
        onChangeText={(make) => onChange({ ...details, make })}
        placeholder="e.g. Toyota, Ford, Honda"
      />
      <FormField
        label="Model"
        value={details.model ?? ''}
        onChangeText={(model) => onChange({ ...details, model })}
        placeholder="e.g. Camry, F-150"
      />
      <FormField
        label="Trim"
        value={details.trim ?? ''}
        onChangeText={(trim) => onChange({ ...details, trim })}
        placeholder="e.g. XLE, Lariat"
      />
      <FormField
        label="VIN"
        value={details.vin ?? ''}
        onChangeText={(vin) => onChange({ ...details, vin })}
        placeholder="17-character vehicle ID"
      />
      <FormField
        label="License plate"
        value={details.licensePlate ?? ''}
        onChangeText={(licensePlate) => onChange({ ...details, licensePlate })}
        placeholder="Plate number"
      />
      <FormField
        label="Color"
        value={details.color ?? ''}
        onChangeText={(color) => onChange({ ...details, color })}
        placeholder="e.g. Silver, Blue"
      />
    </>
  );
}

export function AutomobilePurchaseFields(props: {
  details: AutomobileDetails;
  onChange: (d: AutomobileDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <DateFormField
        label="Purchase date (MM/DD/YYYY)"
        value={details.purchaseDateAtISO}
        parseStored={parseDateInputValue}
        onChangeStored={(purchaseDateAtISO) => onChange({ ...details, purchaseDateAtISO })}
        placeholder="06/01/2020"
      />
      <FormField
        label="Purchase price"
        value={details.purchasePrice ?? ''}
        onChangeText={(purchasePrice) => onChange({ ...details, purchasePrice })}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <FormField
        label="Where purchased"
        value={details.purchaseLocation ?? ''}
        onChangeText={(purchaseLocation) => onChange({ ...details, purchaseLocation })}
        placeholder="Dealer name or seller"
      />
      <FormField
        label="Mileage at purchase"
        value={details.purchaseMileage ?? ''}
        onChangeText={(purchaseMileage) => onChange({ ...details, purchaseMileage })}
        placeholder="e.g. 45,000"
        keyboardType="number-pad"
      />
    </>
  );
}

export function AutomobileMaintenanceFields(props: {
  details: AutomobileDetails;
  onChange: (d: AutomobileDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Current mileage"
        value={details.currentMileage ?? ''}
        onChangeText={(currentMileage) => onChange({ ...details, currentMileage })}
        placeholder="Odometer reading"
        keyboardType="number-pad"
      />
      <FormField
        label="Oil type"
        value={details.oilType ?? ''}
        onChangeText={(oilType) => onChange({ ...details, oilType })}
        placeholder="e.g. 5W-30 synthetic"
      />
      <FormField
        label="Oil filter"
        value={details.oilFilter ?? ''}
        onChangeText={(oilFilter) => onChange({ ...details, oilFilter })}
        placeholder="Filter part number or size"
      />
      <FormField
        label="Tire size"
        value={details.tireSize ?? ''}
        onChangeText={(tireSize) => onChange({ ...details, tireSize })}
        placeholder="e.g. 225/65R17"
      />
    </>
  );
}

export function AutomobileServiceFields(props: {
  details: AutomobileDetails;
  onChange: (d: AutomobileDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <FormField
        label="Service shop"
        value={details.serviceCompany ?? ''}
        onChangeText={(serviceCompany) => onChange({ ...details, serviceCompany })}
        placeholder="Preferred mechanic or dealer"
      />
      <FormField
        label="Service phone"
        value={details.servicePhone ?? ''}
        onChangeText={(servicePhone) => onChange({ ...details, servicePhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
      <FormField
        label="Insurance company"
        value={details.insuranceCompany ?? ''}
        onChangeText={(insuranceCompany) => onChange({ ...details, insuranceCompany })}
        placeholder="Auto insurance provider"
      />
      <FormField
        label="Insurance phone"
        value={details.insurancePhone ?? ''}
        onChangeText={(insurancePhone) => onChange({ ...details, insurancePhone })}
        placeholder="(555) 555-5555"
        keyboardType="phone-pad"
      />
      <FormField
        label="Policy number"
        value={details.insurancePolicyNumber ?? ''}
        onChangeText={(insurancePolicyNumber) => onChange({ ...details, insurancePolicyNumber })}
        placeholder="Insurance policy #"
      />
    </>
  );
}

export function AutomobileNotesFields(props: {
  details: AutomobileDetails;
  onChange: (d: AutomobileDetails) => void;
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

export function AutomobileForm(props: {
  details: AutomobileDetails;
  onChange: (d: AutomobileDetails) => void;
}) {
  const { details, onChange } = props;
  return (
    <>
      <AutomobileVehicleFields details={details} onChange={onChange} />
      <AutomobilePurchaseFields details={details} onChange={onChange} />
      <AutomobileMaintenanceFields details={details} onChange={onChange} />
      <AutomobileServiceFields details={details} onChange={onChange} />
      <AutomobileNotesFields details={details} onChange={onChange} />
    </>
  );
}
