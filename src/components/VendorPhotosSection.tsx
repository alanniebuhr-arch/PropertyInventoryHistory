import React, { useMemo } from 'react';
import type { AppState } from '../types';
import { PhotoSection } from './PhotoSection';
import { DocumentListSection } from './DocumentListSection';
import { buildSlotAndExtraPhotoTiles } from '../photoSectionBuilders';
import {
  addVendorPhotos,
  extraPhotosForVendor,
  removeVendorPhoto,
  setVendorImagePhoto,
  VENDOR_IMAGE_CAPTION,
  vendorImagePhoto,
} from '../vendorPhotos';
import {
  vendorDocumentRows,
  addVendorDocuments,
  removeVendorDocument,
} from '../vendorDocuments';
import { setVendorPhotoCaptionAndNotes } from '../photoMeta';
import { withReorderedVendorPhotoIds } from '../photoReorder';

const VENDOR_PHOTO_SLOTS = [{ key: VENDOR_IMAGE_CAPTION, shortLabel: 'Vendor image' }] as const;

export function VendorPhotosSection(props: {
  state: AppState;
  vendorId: string;
  onSave: (state: AppState) => void;
  children?: React.ReactNode;
  showReorderArrows?: boolean;
  onToggleReorderArrows?: () => void;
}) {
  const { state, vendorId, onSave, children, showReorderArrows, onToggleReorderArrows } = props;
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  const imagePhoto = vendorImagePhoto(state, vendorId);
  const extraPhotos = extraPhotosForVendor(state, vendorId);

  const photoTiles = useMemo(
    () =>
      buildSlotAndExtraPhotoTiles({
        slots: [...VENDOR_PHOTO_SLOTS],
        getSlotUri: () => imagePhoto?.localUri,
        getSlotNotes: () => imagePhoto?.notes,
        getSlotPhotoId: () => imagePhoto?.id,
        onAddSlot: (_key, uri) => {
          void setVendorImagePhoto(state, vendorId, uri).then(onSave);
        },
        onDeleteSlot: () => {
          if (!imagePhoto) return;
          void removeVendorPhoto(state, vendorId, imagePhoto.id).then(onSave);
        },
        onLabelSlot: (_key, notes) => {
          if (!imagePhoto) return;
          onSave(
            setVendorPhotoCaptionAndNotes(state, imagePhoto.id, VENDOR_IMAGE_CAPTION, notes)
          );
        },
        extraPhotos: extraPhotos.map((photo) => ({
          id: photo.id,
          localUri: photo.localUri,
          caption: photo.caption,
          notes: photo.notes,
        })),
        onDeleteExtra: (photoId) => {
          void removeVendorPhoto(state, vendorId, photoId).then(onSave);
        },
        onReorderExtra: (photoId, direction) => {
          onSave(
            withReorderedVendorPhotoIds(
              state,
              vendorId,
              photoId,
              direction,
              extraPhotos.map((p) => p.id)
            )
          );
        },
        onLabelExtra: (photoId, label, notes) => {
          onSave(setVendorPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [extraPhotos, imagePhoto, onSave, vendorId, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return;
    const next = await addVendorPhotos(state, vendorId, sourceUris);
    onSave(next);
    const added = extraPhotosForVendor(next, vendorId).slice(-sourceUris.length);
    return added.map((photo) => photo.id);
  }

  const documentRows = vendorDocumentRows(state, vendor, (documentId) => {
    void removeVendorDocument(state, vendorId, documentId).then(onSave);
  });

  return (
    <>
      <PhotoSection
        tiles={photoTiles}
        showReorderArrows={showReorderArrows}
        onToggleReorderArrows={onToggleReorderArrows}
        title="Photos"
        heroResizeMode="contain"
        onAddPhotos={handleAddPhotos}
        onAddDocuments={async (picked) => {
          if (picked.length === 0) return;
          const next = await addVendorDocuments(state, vendorId, picked);
          onSave(next);
        }}
      >
        {children}
      </PhotoSection>
      <DocumentListSection rows={documentRows} />
    </>
  );
}
