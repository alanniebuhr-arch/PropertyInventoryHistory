import type { ItemPhoto } from './types';
import type { PhotoTile } from './components/PhotoSection';
import { promptPickOrTakeSingle } from './photoPicker';
import { PROPERTY_PHOTO_SLOTS } from './propertyPhotoSlots';

/**
 * Photo list contract (all screens with named slots + Add photo):
 * - Tap + on a named slot → fills only that slot.
 * - Tap Add photo → appends new photo(s) after slots, never into empty placeholders.
 */

type SlotDefinition = {
  key: string;
  shortLabel: string;
};

export function buildPropertyPhotoTiles(options: {
  getSlotUri: (key: string) => string | undefined;
  onAddSlot: (key: string, uri: string) => void | Promise<void>;
  onDeleteSlot: (key: string) => void | Promise<void>;
  extraPhotos: { id: string; localUri: string; caption?: string }[];
  onDeleteExtra: (photoId: string) => void | Promise<void>;
  onLabelExtra?: (photoId: string, label: string) => void | Promise<void>;
}): PhotoTile[] {
  return buildSlotAndExtraPhotoTiles({
    slots: PROPERTY_PHOTO_SLOTS,
    ...options,
  });
}

export function buildSlotAndExtraPhotoTiles(options: {
  slots: SlotDefinition[];
  getSlotUri: (key: string) => string | undefined;
  onAddSlot: (key: string, uri: string) => void | Promise<void>;
  onDeleteSlot: (key: string) => void | Promise<void>;
  extraPhotos: Pick<ItemPhoto, 'id' | 'localUri' | 'caption'>[];
  onDeleteExtra: (photoId: string) => void | Promise<void>;
  onLabelExtra?: (photoId: string, label: string) => void | Promise<void>;
}): PhotoTile[] {
  const {
    slots,
    getSlotUri,
    onAddSlot,
    onDeleteSlot,
    extraPhotos,
    onDeleteExtra,
    onLabelExtra,
  } = options;

  const tiles: PhotoTile[] = slots.map((slot) => {
    const uri = getSlotUri(slot.key);
    return {
      kind: 'reserved' as const,
      key: slot.key,
      shortLabel: slot.shortLabel,
      uri,
      onAdd: () => {
        promptPickOrTakeSingle((pickedUri) => onAddSlot(slot.key, pickedUri));
      },
      onDelete: uri
        ? () => {
            void onDeleteSlot(slot.key);
          }
        : undefined,
    };
  });

  for (const photo of extraPhotos) {
    const caption = photo.caption?.trim();
    tiles.push({
      kind: 'extra',
      id: photo.id,
      shortLabel: caption || undefined,
      uri: photo.localUri,
      onDelete: () => {
        void onDeleteExtra(photo.id);
      },
      onLabelChange: onLabelExtra
        ? (label) => {
            void onLabelExtra(photo.id, label);
          }
        : undefined,
    });
  }

  return tiles;
}

export function buildExtraOnlyPhotoTiles(options: {
  photos: Pick<ItemPhoto, 'id' | 'localUri' | 'caption'>[];
  onDeletePhoto: (photoId: string) => void | Promise<void>;
  onLabelPhoto?: (photoId: string, label: string) => void | Promise<void>;
}): PhotoTile[] {
  const { photos, onDeletePhoto, onLabelPhoto } = options;

  const tiles: PhotoTile[] = photos.map((photo) => {
    const caption = photo.caption?.trim();
    return {
      kind: 'extra' as const,
      id: photo.id,
      shortLabel: caption || undefined,
      uri: photo.localUri,
      onDelete: () => {
        void onDeletePhoto(photo.id);
      },
      onLabelChange: onLabelPhoto
        ? (label) => {
            void onLabelPhoto(photo.id, label);
          }
        : undefined,
    };
  });

  return tiles;
}

export function buildEventPhotoTiles(options: {
  receiptPhoto?: Pick<ItemPhoto, 'id' | 'localUri' | 'caption'>;
  otherPhotos: Pick<ItemPhoto, 'id' | 'localUri' | 'caption'>[];
  onAddReceipt: (uri: string) => void | Promise<void>;
  onDeleteReceipt: () => void;
  onDeletePhoto: (photoId: string) => void;
  onLabelPhoto?: (photoId: string, label: string) => void | Promise<void>;
}): PhotoTile[] {
  const { receiptPhoto, otherPhotos, onAddReceipt, onDeleteReceipt, onDeletePhoto, onLabelPhoto } =
    options;

  const tiles: PhotoTile[] = [
    {
      kind: 'reserved',
      key: 'receipt',
      shortLabel: 'Receipt',
      uri: receiptPhoto?.localUri,
      onAdd: () => {
        promptPickOrTakeSingle(onAddReceipt);
      },
      onDelete: receiptPhoto
        ? () => {
            onDeleteReceipt();
          }
        : undefined,
    },
  ];

  for (const photo of otherPhotos) {
    const caption = photo.caption?.trim();
    tiles.push({
      kind: 'extra',
      id: photo.id,
      shortLabel: caption || undefined,
      uri: photo.localUri,
      onDelete: () => {
        onDeletePhoto(photo.id);
      },
      onLabelChange: onLabelPhoto
        ? (label) => {
            void onLabelPhoto(photo.id, label);
          }
        : undefined,
    });
  }

  return tiles;
}
