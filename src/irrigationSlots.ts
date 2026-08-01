import type { IrrigationDetails } from './types';

export type IrrigationPhotoSlotKey =
  | 'controllerPhotoId'
  | 'backflowPhotoId'
  | 'zoneValvePhotoId'
  | 'receiptPhotoId';

export const IRRIGATION_PHOTO_SLOTS: {
  key: IrrigationPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'controllerPhotoId',
    label: 'Controller',
    hint: 'Photo of the irrigation controller',
    shortLabel: 'Controller',
  },
  {
    key: 'backflowPhotoId',
    label: 'Backflow',
    hint: 'Photo of the backflow preventer',
    shortLabel: 'Backflow',
  },
  {
    key: 'zoneValvePhotoId',
    label: 'Zone valve',
    hint: 'Photo of a zone valve box',
    shortLabel: 'Zone valve',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export function irrigationHasSystemInfo(details: IrrigationDetails): boolean {
  return Boolean(
    details.controllerMake?.trim() ||
      details.controllerModel?.trim() ||
      details.zoneCount?.trim() ||
      details.backflowLocation?.trim() ||
      details.winterizeNotes?.trim()
  );
}

export function irrigationHasInstallInfo(details: IrrigationDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function irrigationHasServiceInfo(details: IrrigationDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
