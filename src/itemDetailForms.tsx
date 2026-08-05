import React from 'react';
import type { ItemDetails, ItemTypeId } from './types';
import { ElectricPanelForm } from './screens/itemDetails/ElectricPanelForm';
import { WaterMainForm } from './screens/itemDetails/WaterMainForm';
import { WasteWaterForm, WasteWaterNotesFields } from './screens/itemDetails/WasteWaterForm';
import { GasMainForm } from './screens/itemDetails/GasMainForm';
import { WaterHeaterForm } from './screens/itemDetails/WaterHeaterForm';
import { WaterTreatmentForm } from './screens/itemDetails/WaterTreatmentForm';
import { InternetForm } from './screens/itemDetails/InternetForm';
import { SecuritySystemForm } from './screens/itemDetails/SecuritySystemForm';
import { RadonMitigationForm } from './screens/itemDetails/RadonMitigationForm';
import { WellPumpForm } from './screens/itemDetails/WellPumpForm';
import { GeneratorForm } from './screens/itemDetails/GeneratorForm';
import { SumpPumpForm } from './screens/itemDetails/SumpPumpForm';
import { GarageDoorForm } from './screens/itemDetails/GarageDoorForm';
import { RoofForm } from './screens/itemDetails/RoofForm';
import { PoolForm } from './screens/itemDetails/PoolForm';
import { IrrigationForm } from './screens/itemDetails/IrrigationForm';
import { EvChargerForm } from './screens/itemDetails/EvChargerForm';
import { SolarForm } from './screens/itemDetails/SolarForm';
import { HotTubForm } from './screens/itemDetails/HotTubForm';
import { ToiletForm } from './screens/itemDetails/ToiletForm';
import { FurnaceForm } from './screens/itemDetails/FurnaceForm';
import { AirConditionerForm } from './screens/itemDetails/AirConditionerForm';
import { AutomobileForm } from './screens/itemDetails/AutomobileForm';
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
    case 'water_main': {
      const waterMain =
        details.kind === 'water_main' ? details : { kind: 'water_main' as const };
      return <WaterMainForm details={waterMain} onChange={onChange} />;
    }
    case 'waste_water': {
      const wasteWater =
        details.kind === 'waste_water' ? details : { kind: 'waste_water' as const };
      return (
        <>
          <WasteWaterForm details={wasteWater} onChange={onChange} />
          <WasteWaterNotesFields details={wasteWater} onChange={onChange} />
        </>
      );
    }
    case 'gas_main':
      return (
        <GasMainForm
          details={details.kind === 'gas_main' ? details : { kind: 'gas_main' }}
          onChange={onChange}
        />
      );
    case 'water_heater':
      return (
        <WaterHeaterForm
          details={details.kind === 'water_heater' ? details : { kind: 'water_heater' }}
          onChange={onChange}
        />
      );
    case 'water_treatment':
      return (
        <WaterTreatmentForm
          details={details.kind === 'water_treatment' ? details : { kind: 'water_treatment' }}
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
    case 'security_system':
      return (
        <SecuritySystemForm
          details={details.kind === 'security_system' ? details : { kind: 'security_system' }}
          onChange={onChange}
        />
      );
    case 'radon_mitigation':
      return (
        <RadonMitigationForm
          details={details.kind === 'radon_mitigation' ? details : { kind: 'radon_mitigation' }}
          onChange={onChange}
        />
      );
    case 'well_pump':
      return (
        <WellPumpForm
          details={details.kind === 'well_pump' ? details : { kind: 'well_pump' }}
          onChange={onChange}
        />
      );
    case 'generator':
      return (
        <GeneratorForm
          details={details.kind === 'generator' ? details : { kind: 'generator' }}
          onChange={onChange}
        />
      );
    case 'sump_pump':
      return (
        <SumpPumpForm
          details={details.kind === 'sump_pump' ? details : { kind: 'sump_pump' }}
          onChange={onChange}
        />
      );
    case 'garage_door':
      return (
        <GarageDoorForm
          details={details.kind === 'garage_door' ? details : { kind: 'garage_door' }}
          onChange={onChange}
        />
      );
    case 'roof':
      return (
        <RoofForm
          details={details.kind === 'roof' ? details : { kind: 'roof' }}
          onChange={onChange}
        />
      );
    case 'pool':
      return (
        <PoolForm
          details={details.kind === 'pool' ? details : { kind: 'pool' }}
          onChange={onChange}
        />
      );
    case 'irrigation':
      return (
        <IrrigationForm
          details={details.kind === 'irrigation' ? details : { kind: 'irrigation' }}
          onChange={onChange}
        />
      );
    case 'ev_charger':
      return (
        <EvChargerForm
          details={details.kind === 'ev_charger' ? details : { kind: 'ev_charger' }}
          onChange={onChange}
        />
      );
    case 'solar':
      return (
        <SolarForm
          details={details.kind === 'solar' ? details : { kind: 'solar' }}
          onChange={onChange}
        />
      );
    case 'hot_tub':
      return (
        <HotTubForm
          details={details.kind === 'hot_tub' ? details : { kind: 'hot_tub' }}
          onChange={onChange}
        />
      );
    case 'toilet':
      return (
        <ToiletForm
          details={details.kind === 'toilet' ? details : { kind: 'toilet' }}
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
    case 'air_conditioner':
      return (
        <AirConditionerForm
          details={details.kind === 'air_conditioner' ? details : { kind: 'air_conditioner' }}
          onChange={onChange}
        />
      );
    case 'automobile':
      return (
        <AutomobileForm
          details={details.kind === 'automobile' ? details : { kind: 'automobile' }}
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
