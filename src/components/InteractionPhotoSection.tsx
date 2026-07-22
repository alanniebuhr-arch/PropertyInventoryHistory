import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { VendorPhoto } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildExtraOnlyPhotoTiles } from '../photoSectionBuilders';

type GalleryPhoto = Pick<VendorPhoto, 'id' | 'localUri' | 'caption' | 'notes'>;

/** Mirrors EventPhotoSection without the receipt reserved slot. */
export function InteractionPhotoSection(props: {
  photos: GalleryPhoto[];
  onAddPhotos: (uris: string[]) => Promise<string[] | void> | string[] | void;
  onDeletePhoto: (photoId: string) => void;
  onLabelPhoto?: (photoId: string, label: string, notes: string) => void;
  title?: string;
  hint?: string;
}) {
  const {
    photos,
    onAddPhotos,
    onDeletePhoto,
    onLabelPhoto,
    title = 'Photos',
    hint,
  } = props;

  const photoTiles = useMemo(
    () =>
      buildExtraOnlyPhotoTiles({
        photos,
        onDeletePhoto,
        onLabelPhoto,
      }),
    [onDeletePhoto, onLabelPhoto, photos]
  );

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        title={title}
        hint={hint}
        onAddPhotos={onAddPhotos}
      />
    </View>
  );
}
