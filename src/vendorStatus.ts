import { colors } from './theme';
import type { VendorStatus } from './types';

export const VENDOR_STATUS_OPTIONS: { id: VendorStatus; label: string }[] = [
  { id: 'researching', label: 'Researching' },
  { id: 'initial_contact', label: 'Initial contact' },
  { id: 'meeting_setup', label: 'Meeting setup' },
  { id: 'vendor_onsite', label: 'Vendor onsite' },
  { id: 'waiting_for_quote', label: 'Waiting for quote' },
  { id: 'quote_received', label: 'Quote received' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

export function vendorStatusLabel(status: VendorStatus): string {
  return VENDOR_STATUS_OPTIONS.find((opt) => opt.id === status)?.label ?? status;
}

export function vendorStatusColor(status: VendorStatus): string {
  switch (status) {
    case 'waiting_for_quote':
    case 'meeting_setup':
      return colors.dueSoon;
    case 'quote_received':
    case 'accepted':
      return colors.lastService;
    case 'rejected':
      return colors.overdue;
    case 'researching':
    case 'initial_contact':
    case 'vendor_onsite':
    default:
      return colors.primary;
  }
}
