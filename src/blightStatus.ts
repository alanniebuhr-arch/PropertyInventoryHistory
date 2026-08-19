import { colors } from './theme';
import type { BlightStatus } from './types';

export const BLIGHT_STATUS_OPTIONS: { id: BlightStatus; label: string }[] = [
  { id: 'complaint_filed', label: 'Complaint filed' },
  { id: 'property_inspected', label: 'Property inspected' },
  { id: 'on_blight_board', label: 'On Blight Docket' },
  { id: 'received_notice_of_violation', label: 'Received Notice of Violation' },
  { id: 'received_municipal_citation', label: 'Received Municipal Citation' },
  { id: 'closed', label: 'Closed' },
];

export function isBlightStatus(value: string): value is BlightStatus {
  return BLIGHT_STATUS_OPTIONS.some((opt) => opt.id === value);
}

export function normalizeBlightStatus(raw: unknown): BlightStatus {
  return typeof raw === 'string' && isBlightStatus(raw) ? raw : 'complaint_filed';
}

export function blightStatusLabel(status: BlightStatus): string {
  return BLIGHT_STATUS_OPTIONS.find((opt) => opt.id === status)?.label ?? status;
}

export function blightStatusColor(status: BlightStatus): string {
  switch (status) {
    case 'received_notice_of_violation':
    case 'received_municipal_citation':
      return colors.dueSoon;
    case 'closed':
      return colors.lastService;
    default:
      return colors.primary;
  }
}
