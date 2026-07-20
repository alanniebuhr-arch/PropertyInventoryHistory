import type { VendorContactMethod } from './types';

export const VENDOR_CONTACT_METHOD_OPTIONS: { id: VendorContactMethod; label: string }[] = [
  { id: 'website_quote', label: 'Website quote request' },
  { id: 'text_message', label: 'Text message' },
  { id: 'email', label: 'Email' },
  { id: 'phone_call', label: 'Phone call' },
  { id: 'in_person', label: 'In-person meeting' },
  { id: 'other', label: 'Other' },
];

export function vendorContactMethodLabel(method: VendorContactMethod): string {
  return VENDOR_CONTACT_METHOD_OPTIONS.find((opt) => opt.id === method)?.label ?? method;
}
