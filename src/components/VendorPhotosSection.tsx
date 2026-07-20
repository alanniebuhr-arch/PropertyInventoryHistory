import React, { useMemo } from 'react';
import type { AppState } from '../types';
import { PhotoSection } from './PhotoSection';
import { DocumentListSection } from './DocumentListSection';
import { buildExtraOnlyPhotoTiles } from '../photoSectionBuilders';
import {
  addVendorPhotos,
  photosForVendor,
  removeVendorPhoto,
} from '../vendorPhotos';
import {
  vendorDocumentRows,
  addVendorDocuments,
  removeVendorDocument,
} from '../vendorDocuments';
import { setVendorPhotoCaptionAndNotes } from '../photoMeta';

export function VendorPhotosSection(props: {
  state: AppState;
  vendorId: string;
  onSave: (state: AppState) => void;
}) {
  const { state, vendorId, onSave } = props;
  const vendor = state.projectVendors.find((v) => v.id === vendorId);
  const extraPhotos = photosForVendor(state, vendorId);

  const photoTiles = useMemo(
    () =>
      buildExtraOnlyPhotoTiles({
        photos: extraPhotos.map((photo) => ({
          id: photo.id,
          localUri: photo.localUri,
          caption: photo.caption,
          notes: photo.notes,
        })),
        onDeletePhoto: (photoId) => {
          void removeVendorPhoto(state, vendorId, photoId).then(onSave);
        },
        onLabelPhoto: (photoId, label, notes) => {
          onSave(setVendorPhotoCaptionAndNotes(state, photoId, label, notes));
        },
      }),
    [extraPhotos, onSave, vendorId, state]
  );

  async function handleAddPhotos(sourceUris: string[]) {
    if (sourceUris.length === 0) return;
    const next = await addVendorPhotos(state, vendorId, sourceUris);
    onSave(next);
    const added = photosForVendor(next, vendorId).slice(-sourceUris.length);
    return added.map((photo) => photo.id);
  }

  const documentRows = vendorDocumentRows(state, vendor, (documentId) => {
    void removeVendorDocument(state, vendorId, documentId).then(onSave);
  });

  return (
    <>
      <PhotoSection
        tiles={photoTiles}
        title="Photos"
        onAddPhotos={handleAddPhotos}
        onAddDocuments={async (picked) => {
          if (picked.length === 0) return;
          const next = await addVendorDocuments(state, vendorId, picked);
          onSave(next);
        }}
      />
      <DocumentListSection rows={documentRows} />
    </>
  );
}
