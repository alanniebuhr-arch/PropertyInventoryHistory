import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { ItemPhoto } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildEventPhotoTiles } from '../photoSectionBuilders';
import type { DocumentListRow } from './DocumentListSection';
import type { PhotoReorderDirection } from '../photoReorder';

type GalleryPhoto = Pick<ItemPhoto, 'id' | 'localUri' | 'caption' | 'notes' | 'favorite'>;

export function EventPhotoSection(props: {
  photos: GalleryPhoto[];
  onAddReceipt?: (uri: string) => void | Promise<void>;
  onAddPhotos?: (uris: string[]) => Promise<string[] | void> | string[] | void;
  onAddDocuments?: (
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) => void | Promise<void>;
  extraDocumentRows?: DocumentListRow[];
  onDeletePhoto?: (photoId: string) => void;
  onReorderPhoto?: (photoId: string, direction: PhotoReorderDirection) => void;
  onLabelPhoto?: (photoId: string, label: string, notes: string) => void;
  onToggleFavorite?: (photoId: string, favorite: boolean) => void;
  title?: string;
}) {
  const {
    photos,
    onAddReceipt,
    onAddPhotos,
    onAddDocuments,
    extraDocumentRows,
    onDeletePhoto,
    onReorderPhoto,
    onLabelPhoto,
    onToggleFavorite,
    title = 'Event photos',
  } = props;

  const receiptPhoto = photos.find((photo) => photo.caption === 'receipt');
  const otherPhotos = photos.filter((photo) => photo.caption !== 'receipt');

  const photoTiles = useMemo(
    () =>
      buildEventPhotoTiles({
        receiptPhoto,
        otherPhotos,
        onAddReceipt,
        onDeleteReceipt:
          onDeletePhoto && receiptPhoto
            ? () => {
                onDeletePhoto(receiptPhoto.id);
              }
            : undefined,
        onDeletePhoto,
        onReorderPhoto,
        onLabelReceipt: onLabelPhoto
          ? (notes) => {
              if (receiptPhoto) onLabelPhoto(receiptPhoto.id, 'receipt', notes);
            }
          : undefined,
        onLabelPhoto,
        onToggleFavorite,
      }),
    [
      onDeletePhoto,
      onReorderPhoto,
      onAddReceipt,
      onLabelPhoto,
      onToggleFavorite,
      otherPhotos,
      receiptPhoto,
    ]
  );

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        title={title}
        onAddPhotos={onAddPhotos}
        onAddDocuments={onAddDocuments}
        extraDocumentRows={extraDocumentRows}
      />
    </View>
  );
}
