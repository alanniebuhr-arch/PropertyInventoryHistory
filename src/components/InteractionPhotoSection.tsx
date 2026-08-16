import React, { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import type { VendorPhoto } from '../types';
import { PhotoSection } from './PhotoSection';
import { buildExtraOnlyPhotoTiles } from '../photoSectionBuilders';
import type { DocumentListRow } from './DocumentListSection';
import type { PhotoReorderDirection } from '../photoReorder';

type GalleryPhoto = Pick<VendorPhoto, 'id' | 'localUri' | 'caption' | 'notes'>;

/** Mirrors EventPhotoSection without the receipt reserved slot. */
export function InteractionPhotoSection(props: {
  photos: GalleryPhoto[];
  onAddPhotos?: (uris: string[]) => Promise<string[] | void> | string[] | void;
  onAddDocuments?: (
    picked: { uri: string; fileName: string; mimeType: string }[]
  ) => void | Promise<void>;
  extraDocumentRows?: DocumentListRow[];
  onDeletePhoto?: (photoId: string) => void;
  onReorderPhoto?: (photoId: string, direction: PhotoReorderDirection) => void;
  onLabelPhoto?: (photoId: string, label: string, notes: string) => void;
  title?: string;
  hint?: string;
  children?: ReactNode;
}) {
  const {
    photos,
    onAddPhotos,
    onAddDocuments,
    extraDocumentRows,
    onDeletePhoto,
    onReorderPhoto,
    onLabelPhoto,
    title = 'Photos',
    hint,
    children,
  } = props;

  const photoTiles = useMemo(
    () =>
      buildExtraOnlyPhotoTiles({
        photos,
        onDeletePhoto,
        onReorderPhoto,
        onLabelPhoto,
      }),
    [onDeletePhoto, onReorderPhoto, onLabelPhoto, photos]
  );

  return (
    <View>
      <PhotoSection
        tiles={photoTiles}
        title={title}
        hint={hint}
        onAddPhotos={onAddPhotos}
        onAddDocuments={onAddDocuments}
        extraDocumentRows={extraDocumentRows}
      >
        {children}
      </PhotoSection>
    </View>
  );
}
