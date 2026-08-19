import React, { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import type { VendorPhoto } from '../types';
import { PhotoSection } from './PhotoSection';
import {
  buildExtraOnlyPhotoTiles,
  buildSlotAndExtraPhotoTiles,
} from '../photoSectionBuilders';
import type { DocumentListRow } from './DocumentListSection';
import type { PhotoReorderDirection } from '../photoReorder';
import { isComplaintFormPhoto } from '../interactionPhotos';

type GalleryPhoto = Pick<VendorPhoto, 'id' | 'localUri' | 'caption' | 'notes'>;

/** Mirrors EventPhotoSection; blight interactions can show a complaint-form reserved slot. */
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
  /** When true, show the reserved Complaint form slot (blight + filed checkbox). */
  showComplaintFormSlot?: boolean;
  onAddComplaintForm?: (uri: string) => void | Promise<void>;
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
    showComplaintFormSlot = false,
    onAddComplaintForm,
    title = 'Photos',
    hint,
    children,
  } = props;

  const complaintFormPhoto = photos.find(isComplaintFormPhoto);
  const extraPhotos = photos.filter((photo) => !isComplaintFormPhoto(photo));

  const photoTiles = useMemo(() => {
    if (!showComplaintFormSlot) {
      return buildExtraOnlyPhotoTiles({
        photos: extraPhotos,
        onDeletePhoto,
        onReorderPhoto,
        onLabelPhoto,
      });
    }
    return buildSlotAndExtraPhotoTiles({
      slots: [{ key: 'complaint_form', shortLabel: 'Complaint form' }],
      getSlotUri: () => complaintFormPhoto?.localUri,
      getSlotNotes: () => complaintFormPhoto?.notes,
      getSlotPhotoId: () => complaintFormPhoto?.id,
      onAddSlot: (_key, uri) => {
        void onAddComplaintForm?.(uri);
      },
      onDeleteSlot: () => {
        if (complaintFormPhoto && onDeletePhoto) onDeletePhoto(complaintFormPhoto.id);
      },
      onLabelSlot: onLabelPhoto && complaintFormPhoto
        ? (_key, notes) => {
            onLabelPhoto(complaintFormPhoto.id, 'complaint_form', notes);
          }
        : undefined,
      extraPhotos,
      onDeleteExtra: (photoId) => {
        onDeletePhoto?.(photoId);
      },
      onReorderExtra: onReorderPhoto,
      onLabelExtra: onLabelPhoto,
    });
  }, [
    complaintFormPhoto,
    extraPhotos,
    onAddComplaintForm,
    onDeletePhoto,
    onLabelPhoto,
    onReorderPhoto,
    showComplaintFormSlot,
  ]);

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
