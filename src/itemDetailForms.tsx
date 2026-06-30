import React from 'react';
import type { ItemDetails, ItemTypeId } from './types';
import { ElectricPanelForm } from './screens/itemDetails/ElectricPanelForm';
import { WaterMainForm } from './screens/itemDetails/WaterMainForm';
import { GasMainForm } from './screens/itemDetails/GasMainForm';
import { InternetForm } from './screens/itemDetails/InternetForm';
import { FurnaceForm } from './screens/itemDetails/FurnaceForm';
import { ApplianceForm } from './screens/itemDetails/ApplianceForm';
import { OtherItemForm } from './screens/itemDetails/OtherItemForm';

export function ItemDetailsForm(props: {
  itemTypeId: ItemTypeId;
  details: ItemDetails;
  onChange: (d: ItemDetails) => void;
}) {
  const { itemTypeId, details, onChange } = props;
  switch (itemTypeId) {
    case 'electric_panel':
      return (
        <ElectricPanelForm
          details={details.kind === 'electric_panel' ? details : { kind: 'electric_panel' }}
          onChange={onChange}
        />
      );
    case 'water_main':
      return (
        <WaterMainForm
          details={details.kind === 'water_main' ? details : { kind: 'water_main' }}
          onChange={onChange}
        />
      );
    case 'gas_main':
      return (
        <GasMainForm
          details={details.kind === 'gas_main' ? details : { kind: 'gas_main' }}
          onChange={onChange}
        />
      );
    case 'internet':
      return (
        <InternetForm
          details={details.kind === 'internet' ? details : { kind: 'internet' }}
          onChange={onChange}
        />
      );
    case 'furnace':
      return (
        <FurnaceForm
          details={details.kind === 'furnace' ? details : { kind: 'furnace' }}
          onChange={onChange}
        />
      );
    case 'appliance':
      return (
        <ApplianceForm
          details={details.kind === 'appliance' ? details : { kind: 'appliance' }}
          onChange={onChange}
        />
      );
    case 'other':
    default:
      return (
        <OtherItemForm
          details={details.kind === 'other' ? details : { kind: 'other' }}
          onChange={onChange}
        />
      );
  }
}
