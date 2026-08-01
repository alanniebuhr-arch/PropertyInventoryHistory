import type { SumpPumpDetails, SumpPumpRole } from './types';

export type SumpPumpPhotoSlotKey =
  | 'pumpPhotoId'
  | 'dischargePhotoId'
  | 'batteryBackupPhotoId'
  | 'receiptPhotoId';

export const SUMP_PUMP_ROLE_OPTIONS: { value: SumpPumpRole; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'backup', label: 'Backup' },
  { value: 'primary_and_backup', label: 'Primary & backup' },
];

export const SUMP_PUMP_PHOTO_SLOTS: {
  key: SumpPumpPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'pumpPhotoId',
    label: 'Pump',
    hint: 'Photo of the sump pump',
    shortLabel: 'Pump',
  },
  {
    key: 'dischargePhotoId',
    label: 'Discharge',
    hint: 'Photo of the discharge line/exit',
    shortLabel: 'Discharge',
  },
  {
    key: 'batteryBackupPhotoId',
    label: 'Battery backup',
    hint: 'Photo of the battery backup system',
    shortLabel: 'Battery backup',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export function sumpPumpRoleLabel(role?: SumpPumpRole): string | undefined {
  if (!role) return undefined;
  return SUMP_PUMP_ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export function normalizeSumpPumpRole(raw?: string): SumpPumpRole | undefined {
  if (raw === 'primary' || raw === 'backup' || raw === 'primary_and_backup') return raw;
  return undefined;
}

export function sumpPumpHasSystemInfo(details: SumpPumpDetails): boolean {
  return Boolean(
    sumpPumpRoleLabel(details.pumpRole) ||
      details.locationNotes?.trim() ||
      details.dischargeLocation?.trim() ||
      details.batteryBackupNotes?.trim()
  );
}

export function sumpPumpHasEquipmentInfo(details: SumpPumpDetails): boolean {
  return Boolean(
    details.make?.trim() || details.modelNumber?.trim() || details.serialNumber?.trim()
  );
}

export function sumpPumpHasInstallInfo(details: SumpPumpDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function sumpPumpHasServiceInfo(details: SumpPumpDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
