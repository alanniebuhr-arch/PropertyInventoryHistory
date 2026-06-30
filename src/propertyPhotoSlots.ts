export type PropertyPhotoSlotKey =
  | 'frontPhotoId'
  | 'leftSidePhotoId'
  | 'rightSidePhotoId'
  | 'backPhotoId';

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
