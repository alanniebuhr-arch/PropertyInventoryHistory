import type { ItemPhoto } from './types';
import type { PhotoTile, SlotDocumentTileInfo } from './components/PhotoSection';
import { promptPickOrTakeSingle, promptSlotAttachment } from './photoPicker';
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

type ExtraPhoto = Pick<ItemPhoto, 'id' | 'localUri' | 'caption' | 'notes' | 'favorite'>;

type SlotAndExtraOptions = {
  slots: SlotDefinition[];
  getSlotUri: (key: string) => string | undefined;
  getSlotDocument?: (key: string) => SlotDocumentTileInfo | undefined;
  getSlotNotes?: (key: string) => string | undefined;
  getSlotPhotoId?: (key: string) => string | undefined;
  getSlotFavorite?: (key: string) => boolean | undefined;
  onAddSlot: (key: string, uri: string) => void | Promise<void>;
  onAddSlotDocument?: (key: string, picked: { uri: string; fileName: string; mimeType?: string }) => void | Promise<void>;
  onDeleteSlot: (key: string) => void | Promise<void>;
  onDeleteSlotDocument?: (key: string) => void | Promise<void>;
  onLabelSlot?: (key: string, notes: string) => void | Promise<void>;
  onToggleFavorite?: (photoId: string, favorite: boolean) => void | Promise<void>;
  extraPhotos: ExtraPhoto[];
  onDeleteExtra: (photoId: string) => void | Promise<void>;
  onLabelExtra?: (photoId: string, label: string, notes: string) => void | Promise<void>;
};

export function buildPropertyPhotoTiles(
  options: Omit<SlotAndExtraOptions, 'slots'>
): PhotoTile[] {
  return buildSlotAndExtraPhotoTiles({
    slots: PROPERTY_PHOTO_SLOTS,
    ...options,
  });
}

export function buildSlotAndExtraPhotoTiles(options: SlotAndExtraOptions): PhotoTile[] {
  const {
    slots,
    getSlotUri,
    getSlotDocument,
    getSlotNotes,
    getSlotPhotoId,
    getSlotFavorite,
    onAddSlot,
    onAddSlotDocument,
    onDeleteSlot,
    onDeleteSlotDocument,
    onLabelSlot,
    onToggleFavorite,
    extraPhotos,
    onDeleteExtra,
    onLabelExtra,
  } = options;

  const tiles: PhotoTile[] = slots.map((slot) => {
    const uri = getSlotUri(slot.key);
    const document = getSlotDocument?.(slot.key);
    const supportsDocuments = onAddSlotDocument != null;
    const photoId = getSlotPhotoId?.(slot.key);
    return {
      kind: 'reserved' as const,
      key: slot.key,
      shortLabel: slot.shortLabel,
      uri,
      document,
      notes: getSlotNotes?.(slot.key),
      photoId,
      favorite: getSlotFavorite?.(slot.key) === true,
      onAdd: () => {
        if (supportsDocuments) {
          promptSlotAttachment({
            onPhoto: (pickedUri) => onAddSlot(slot.key, pickedUri),
            onDocument: (picked) => onAddSlotDocument!(slot.key, picked),
          });
        } else {
          promptPickOrTakeSingle((pickedUri) => onAddSlot(slot.key, pickedUri));
        }
      },
      onDelete: uri
        ? () => {
            void onDeleteSlot(slot.key);
          }
        : undefined,
      onDeleteDocument: document
        ? () => {
            void onDeleteSlotDocument?.(slot.key);
          }
        : undefined,
      onLabelChange: uri && onLabelSlot
        ? (_label, notes) => {
            void onLabelSlot(slot.key, notes);
          }
        : undefined,
      onToggleFavorite:
        photoId && onToggleFavorite
          ? (favorite) => {
              void onToggleFavorite(photoId, favorite);
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
      notes: photo.notes,
      favorite: photo.favorite === true,
      onDelete: () => {
        void onDeleteExtra(photo.id);
      },
      onLabelChange: onLabelExtra
        ? (label, notes) => {
            void onLabelExtra(photo.id, label, notes);
          }
        : undefined,
      onToggleFavorite: onToggleFavorite
        ? (favorite) => {
            void onToggleFavorite(photo.id, favorite);
          }
        : undefined,
    });
  }

  return tiles;
}

export function buildExtraOnlyPhotoTiles(options: {
  photos: ExtraPhoto[];
  onDeletePhoto: (photoId: string) => void | Promise<void>;
  onLabelPhoto?: (photoId: string, label: string, notes: string) => void | Promise<void>;
  onToggleFavorite?: (photoId: string, favorite: boolean) => void | Promise<void>;
}): PhotoTile[] {
  const { photos, onDeletePhoto, onLabelPhoto, onToggleFavorite } = options;

  const tiles: PhotoTile[] = photos.map((photo) => {
    const caption = photo.caption?.trim();
    return {
      kind: 'extra' as const,
      id: photo.id,
      shortLabel: caption || undefined,
      uri: photo.localUri,
      notes: photo.notes,
      favorite: photo.favorite === true,
      onDelete: () => {
        void onDeletePhoto(photo.id);
      },
      onLabelChange: onLabelPhoto
        ? (label, notes) => {
            void onLabelPhoto(photo.id, label, notes);
          }
        : undefined,
      onToggleFavorite: onToggleFavorite
        ? (favorite) => {
            void onToggleFavorite(photo.id, favorite);
          }
        : undefined,
    };
  });

  return tiles;
}

export function buildEventPhotoTiles(options: {
  receiptPhoto?: ExtraPhoto;
  otherPhotos: ExtraPhoto[];
  onAddReceipt: (uri: string) => void | Promise<void>;
  onDeleteReceipt: () => void;
  onDeletePhoto: (photoId: string) => void;
  onLabelReceipt?: (notes: string) => void | Promise<void>;
  onLabelPhoto?: (photoId: string, label: string, notes: string) => void | Promise<void>;
  onToggleFavorite?: (photoId: string, favorite: boolean) => void | Promise<void>;
}): PhotoTile[] {
  const {
    receiptPhoto,
    otherPhotos,
    onAddReceipt,
    onDeleteReceipt,
    onDeletePhoto,
    onLabelReceipt,
    onLabelPhoto,
    onToggleFavorite,
  } = options;

  const tiles: PhotoTile[] = [
    {
      kind: 'reserved',
      key: 'receipt',
      shortLabel: 'Receipt',
      uri: receiptPhoto?.localUri,
      notes: receiptPhoto?.notes,
      photoId: receiptPhoto?.id,
      favorite: receiptPhoto?.favorite === true,
      onAdd: () => {
        promptPickOrTakeSingle(onAddReceipt);
      },
      onDelete: receiptPhoto
        ? () => {
            onDeleteReceipt();
          }
        : undefined,
      onLabelChange: receiptPhoto && onLabelReceipt
        ? (_label, notes) => {
            void onLabelReceipt(notes);
          }
        : undefined,
      onToggleFavorite:
        receiptPhoto && onToggleFavorite
          ? (favorite) => {
              void onToggleFavorite(receiptPhoto.id, favorite);
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
      notes: photo.notes,
      favorite: photo.favorite === true,
      onDelete: () => {
        onDeletePhoto(photo.id);
      },
      onLabelChange: onLabelPhoto
        ? (label, notes) => {
            void onLabelPhoto(photo.id, label, notes);
          }
        : undefined,
      onToggleFavorite: onToggleFavorite
        ? (favorite) => {
            void onToggleFavorite(photo.id, favorite);
          }
        : undefined,
    });
  }

  return tiles;
}
