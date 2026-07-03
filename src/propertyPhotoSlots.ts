export type PropertyPhotoSlotKey =
  | 'frontPhotoId'
  | 'leftSidePhotoId'
  | 'rightSidePhotoId'
  | 'backPhotoId'
  | 'fieldCardPhotoId'
  | 'plotPlanPhotoId';

export const PROPERTY_EXTERIOR_PHOTO_SLOTS: {
  key: PropertyPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'frontPhotoId',
    label: 'Front',
    hint: 'Photo of the front of the house',
    shortLabel: 'Front',
  },
  {
    key: 'leftSidePhotoId',
    label: 'Left side',
    hint: 'Photo of the left side of the house',
    shortLabel: 'Left',
  },
  {
    key: 'rightSidePhotoId',
    label: 'Right side',
    hint: 'Photo of the right side of the house',
    shortLabel: 'Right',
  },
  {
    key: 'backPhotoId',
    label: 'Back',
    hint: 'Photo of the back of the house',
    shortLabel: 'Back',
  },
];

export const PROPERTY_EXTERIOR_SIDE_PHOTO_SLOTS = PROPERTY_EXTERIOR_PHOTO_SLOTS.filter(
  (slot) => slot.key !== 'frontPhotoId'
);

export const PROPERTY_DOCUMENT_PHOTO_SLOTS: {
  key: PropertyPhotoSlotKey;
  label: string;
  hint: string;
  shortLabel: string;
}[] = [
  {
    key: 'fieldCardPhotoId',
    label: 'Field card',
    hint: 'Property field card or data sheet',
    shortLabel: 'Field card',
  },
  {
    key: 'plotPlanPhotoId',
    label: 'Plot plan',
    hint: 'Site or plot plan drawing',
    shortLabel: 'Plot plan',
  },
];

/** All property photo slots in display order: exterior first, documents last. */
export const PROPERTY_PHOTO_SLOTS = [
  ...PROPERTY_EXTERIOR_PHOTO_SLOTS,
  ...PROPERTY_DOCUMENT_PHOTO_SLOTS,
];
