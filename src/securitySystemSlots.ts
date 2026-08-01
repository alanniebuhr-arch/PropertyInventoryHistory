import type { SecuritySystemDetails, SecuritySystemType } from './types';

export type SecuritySystemPhotoSlotKey =
  | 'controlPanelPhotoId'
  | 'keypadPhotoId'
  | 'manufacturerTagPhotoId'
  | 'receiptPhotoId';

export const SECURITY_SYSTEM_TYPE_OPTIONS: { value: SecuritySystemType; label: string }[] = [
  { value: 'alarm', label: 'Alarm' },
  { value: 'cameras', label: 'Cameras' },
  { value: 'alarm_and_cameras', label: 'Alarm & cameras' },
  { value: 'other', label: 'Other' },
];

export const SECURITY_SYSTEM_PHOTO_SLOTS: {
  key: SecuritySystemPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'controlPanelPhotoId',
    label: 'Control panel',
    hint: 'Photo of the main security control panel',
    shortLabel: 'Control panel',
  },
  {
    key: 'keypadPhotoId',
    label: 'Keypad',
    hint: 'Photo of the keypad or touchscreen',
    shortLabel: 'Keypad',
  },
  {
    key: 'manufacturerTagPhotoId',
    label: 'Manufacture tag',
    hint: 'Model and serial number sticker or plate',
    shortLabel: 'Manufacture tag',
  },
  {
    key: 'receiptPhotoId',
    label: 'Receipt',
    hint: 'Photo of the purchase or install receipt',
    shortLabel: 'Receipt',
  },
];

export function securitySystemTypeLabel(
  systemType?: SecuritySystemType,
  systemTypeOther?: string
): string | undefined {
  if (!systemType) return undefined;
  if (systemType === 'other') {
    const custom = systemTypeOther?.trim();
    return custom || 'Other';
  }
  return SECURITY_SYSTEM_TYPE_OPTIONS.find((o) => o.value === systemType)?.label ?? systemType;
}

export function normalizeSecuritySystemType(raw?: string): SecuritySystemType | undefined {
  if (
    raw === 'alarm' ||
    raw === 'cameras' ||
    raw === 'alarm_and_cameras' ||
    raw === 'other'
  ) {
    return raw;
  }
  return undefined;
}

export function securitySystemHasSystemInfo(details: SecuritySystemDetails): boolean {
  return Boolean(
    securitySystemTypeLabel(details.systemType, details.systemTypeOther) ||
      details.panelLocation?.trim() ||
      details.keypadLocation?.trim() ||
      details.accessNotes?.trim()
  );
}

export function securitySystemHasMonitoringInfo(details: SecuritySystemDetails): boolean {
  return Boolean(
    details.monitoringCompany?.trim() ||
      details.accountNumber?.trim() ||
      details.monitoringPhone?.trim()
  );
}

export function securitySystemHasEquipmentInfo(details: SecuritySystemDetails): boolean {
  return Boolean(
    details.make?.trim() || details.modelNumber?.trim() || details.serialNumber?.trim()
  );
}

export function securitySystemHasInstallInfo(details: SecuritySystemDetails): boolean {
  return Boolean(
    details.installDateAtISO?.trim() ||
      details.installerName?.trim() ||
      details.installerPhone?.trim()
  );
}

export function securitySystemHasServiceInfo(details: SecuritySystemDetails): boolean {
  return Boolean(details.serviceCompany?.trim() || details.servicePhone?.trim());
}
