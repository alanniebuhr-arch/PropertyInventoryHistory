import type { ElectricPanelDetails } from './types';

export type ElectricPanelPhotoSlotKey =
  | 'panelDistancePhotoId'
  | 'panelInsideCoverPhotoId'
  | 'panelCircuitBreakersPhotoId';

export const ELECTRIC_PANEL_PHOTO_SLOTS: {
  key: ElectricPanelPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'panelDistancePhotoId',
    label: 'Panel from distance',
    hint: 'Photo of the panel from a few feet away',
    shortLabel: 'From distance',
  },
  {
    key: 'panelInsideCoverPhotoId',
    label: 'Panel inside cover',
    hint: 'Photo with the panel cover open showing the interior',
    shortLabel: 'Inside cover',
  },
  {
    key: 'panelCircuitBreakersPhotoId',
    label: 'Panel circuit breakers',
    hint: 'Close-up photo of the circuit breakers and labels',
    shortLabel: 'Circuit breakers',
  },
];

export function electricPanelPhotoSlots(): typeof ELECTRIC_PANEL_PHOTO_SLOTS {
  return ELECTRIC_PANEL_PHOTO_SLOTS;
}

export function electricPanelHasInfo(details: ElectricPanelDetails): boolean {
  return Boolean(
    details.name?.trim() ||
      details.amperage?.trim() ||
      details.brand?.trim() ||
      details.locationNotes?.trim() ||
      details.lastInspectedAtISO?.trim()
  );
}
