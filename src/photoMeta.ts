import type { AppState } from './types';

/** Update caption and notes on an item (or event) photo. */
export function setItemPhotoCaptionAndNotes(
  state: AppState,
  photoId: string,
  caption: string,
  notes: string
): AppState {
  const nextCaption = caption.trim() || undefined;
  const nextNotes = notes.trim() || undefined;
  return {
    ...state,
    photos: state.photos.map((photo) =>
      photo.id === photoId
        ? { ...photo, caption: nextCaption, notes: nextNotes }
        : photo
    ),
  };
}

/** Update notes only on an item photo (named slots keep their fixed label). */
export function setItemPhotoNotes(
  state: AppState,
  photoId: string,
  notes: string
): AppState {
  const nextNotes = notes.trim() || undefined;
  return {
    ...state,
    photos: state.photos.map((photo) =>
      photo.id === photoId ? { ...photo, notes: nextNotes } : photo
    ),
  };
}

/** Update caption and notes on a property photo. */
export function setPropertyPhotoCaptionAndNotes(
  state: AppState,
  photoId: string,
  caption: string,
  notes: string
): AppState {
  const nextCaption = caption.trim() || undefined;
  const nextNotes = notes.trim() || undefined;
  return {
    ...state,
    propertyPhotos: state.propertyPhotos.map((photo) =>
      photo.id === photoId
        ? { ...photo, caption: nextCaption, notes: nextNotes }
        : photo
    ),
  };
}

/** Update notes only on a property photo. */
export function setPropertyPhotoNotes(
  state: AppState,
  photoId: string,
  notes: string
): AppState {
  const nextNotes = notes.trim() || undefined;
  return {
    ...state,
    propertyPhotos: state.propertyPhotos.map((photo) =>
      photo.id === photoId ? { ...photo, notes: nextNotes } : photo
    ),
  };
}

/** Update caption and notes on a room photo. */
export function setRoomPhotoCaptionAndNotes(
  state: AppState,
  photoId: string,
  caption: string,
  notes: string
): AppState {
  const nextCaption = caption.trim() || undefined;
  const nextNotes = notes.trim() || undefined;
  return {
    ...state,
    roomPhotos: state.roomPhotos.map((photo) =>
      photo.id === photoId
        ? { ...photo, caption: nextCaption, notes: nextNotes }
        : photo
    ),
  };
}

/** Update notes only on a room photo. */
export function setRoomPhotoNotes(
  state: AppState,
  photoId: string,
  notes: string
): AppState {
  const nextNotes = notes.trim() || undefined;
  return {
    ...state,
    roomPhotos: state.roomPhotos.map((photo) =>
      photo.id === photoId ? { ...photo, notes: nextNotes } : photo
    ),
  };
}

export function setItemPhotoFavorite(
  state: AppState,
  photoId: string,
  favorite: boolean
): AppState {
  return {
    ...state,
    photos: state.photos.map((photo) =>
      photo.id === photoId
        ? { ...photo, favorite: favorite || undefined }
        : photo
    ),
  };
}

export function setPropertyPhotoFavorite(
  state: AppState,
  photoId: string,
  favorite: boolean
): AppState {
  return {
    ...state,
    propertyPhotos: state.propertyPhotos.map((photo) =>
      photo.id === photoId
        ? { ...photo, favorite: favorite || undefined }
        : photo
    ),
  };
}

export function setRoomPhotoFavorite(
  state: AppState,
  photoId: string,
  favorite: boolean
): AppState {
  return {
    ...state,
    roomPhotos: state.roomPhotos.map((photo) =>
      photo.id === photoId
        ? { ...photo, favorite: favorite || undefined }
        : photo
    ),
  };
}
