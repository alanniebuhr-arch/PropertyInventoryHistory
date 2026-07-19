import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { ItemPhoto } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildEventPhotoTiles } from '../photoSectionBuilders';

type GalleryPhoto = Pick<ItemPhoto, 'id' | 'localUri' | 'caption' | 'notes' | 'favorite'>;

export function EventPhotoSection(props: {
  photos: GalleryPhoto[];
  onAddReceipt: (uri: string) => void | Promise<void>;
  onAddPhotos: (uris: string[]) => Promise<string[] | void> | string[] | void;
  onDeletePhoto: (photoId: string) => void;
  onLabelPhoto?: (photoId: string, label: string, notes: string) => void;
  onToggleFavorite?: (photoId: string, favorite: boolean) => void;
  title?: string;
}) {
  const {
    photos,
    onAddReceipt,
    onAddPhotos,
    onDeletePhoto,
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
        onDeleteReceipt: () => {
          if (receiptPhoto) onDeletePhoto(receiptPhoto.id);
        },
        onDeletePhoto,
        onLabelReceipt: onLabelPhoto
          ? (notes) => {
              if (receiptPhoto) onLabelPhoto(receiptPhoto.id, 'receipt', notes);
            }
          : undefined,
        onLabelPhoto,
        onToggleFavorite,
      }),
    [onDeletePhoto, onAddReceipt, onLabelPhoto, onToggleFavorite, otherPhotos, receiptPhoto]
  );

  return (
    <View>
      <PhotoSection tiles={photoTiles} title={title} onAddPhotos={onAddPhotos} />
    </View>
  );
}
