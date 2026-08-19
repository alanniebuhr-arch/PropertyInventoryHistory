import type { AppState, ProjectComplainant, ProjectPhoto } from './types';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { uid, nowISO } from './utils';

export type ComplainantFormValues = {
  name: string;
  phone?: string;
  email?: string;
  submittedAtISO?: string;
};

export function complainantsForProject(
  state: AppState,
  projectId: string
): ProjectComplainant[] {
  return (state.projectComplainants ?? [])
    .filter((person) => person.projectId === projectId)
    .sort((a, b) => (a.createdAtISO ?? '').localeCompare(b.createdAtISO ?? ''));
}

export function addComplainant(
  state: AppState,
  projectId: string,
  values: ComplainantFormValues
): AppState {
  const person: ProjectComplainant = {
    id: uid('complainant'),
    projectId,
    name: values.name.trim(),
    phone: values.phone?.trim() || undefined,
    email: values.email?.trim() || undefined,
    submittedAtISO: values.submittedAtISO,
    photoIds: [],
    documentIds: [],
    createdAtISO: nowISO(),
  };
  return {
    ...state,
    projectComplainants: [...(state.projectComplainants ?? []), person],
  };
}

export function updateComplainant(
  state: AppState,
  complainantId: string,
  values: ComplainantFormValues
): AppState {
  return {
    ...state,
    projectComplainants: (state.projectComplainants ?? []).map((person) =>
      person.id === complainantId
        ? {
            ...person,
            name: values.name.trim(),
            phone: values.phone?.trim() || undefined,
            email: values.email?.trim() || undefined,
            submittedAtISO: values.submittedAtISO,
            updatedAtISO: nowISO(),
          }
        : person
    ),
  };
}

export async function removeComplainantCascade(
  state: AppState,
  complainantId: string
): Promise<AppState> {
  const person = (state.projectComplainants ?? []).find((row) => row.id === complainantId);
  if (!person) return state;
  let next = state;
  for (const docId of person.documentIds ?? []) {
    next = await removeDocumentFromState(next, docId);
  }
  const photos = next.projectPhotos.filter((p) => p.complainantId === complainantId);
  for (const photo of photos) {
    await deletePhotoFile(photo.localUri);
  }
  return {
    ...next,
    projectComplainants: (next.projectComplainants ?? []).filter((row) => row.id !== complainantId),
    projectPhotos: next.projectPhotos.filter((p) => p.complainantId !== complainantId),
  };
}

export async function setComplainantFormAttachment(
  state: AppState,
  complainantId: string,
  picked:
    | { kind: 'document'; uri: string; fileName: string; mimeType?: string }
    | { kind: 'image'; uri: string }
): Promise<AppState> {
  const person = (state.projectComplainants ?? []).find((row) => row.id === complainantId);
  if (!person) return state;
  let next = await clearComplainantFormAttachment(state, complainantId);
  const current = (next.projectComplainants ?? []).find((row) => row.id === complainantId);
  if (!current) return next;

  if (picked.kind === 'document') {
    const { state: withDoc, document } = await addDocumentToState(
      next,
      picked.uri,
      picked.fileName,
      picked.mimeType ?? 'application/octet-stream'
    );
    return {
      ...withDoc,
      projectComplainants: (withDoc.projectComplainants ?? []).map((row) =>
        row.id === complainantId
          ? { ...row, documentIds: [document.id], updatedAtISO: nowISO() }
          : row
      ),
    };
  }

  const photoId = uid('photo');
  const localUri = await persistPhotoFromUri(picked.uri, photoId);
  const photo: ProjectPhoto = {
    id: photoId,
    projectId: current.projectId,
    complainantId,
    localUri,
    createdAtISO: nowISO(),
  };
  return {
    ...next,
    projectPhotos: [...next.projectPhotos, photo],
    projectComplainants: (next.projectComplainants ?? []).map((row) =>
      row.id === complainantId
        ? { ...row, photoIds: [photoId], updatedAtISO: nowISO() }
        : row
    ),
  };
}

export async function clearComplainantFormAttachment(
  state: AppState,
  complainantId: string
): Promise<AppState> {
  const person = (state.projectComplainants ?? []).find((row) => row.id === complainantId);
  if (!person) return state;
  let next = state;
  for (const docId of person.documentIds ?? []) {
    next = await removeDocumentFromState(next, docId);
  }
  const photos = next.projectPhotos.filter((p) => p.complainantId === complainantId);
  for (const photo of photos) {
    await deletePhotoFile(photo.localUri);
  }
  return {
    ...next,
    projectPhotos: next.projectPhotos.filter((p) => p.complainantId !== complainantId),
    projectComplainants: (next.projectComplainants ?? []).map((row) =>
      row.id === complainantId
        ? { ...row, documentIds: [], photoIds: [], updatedAtISO: nowISO() }
        : row
    ),
  };
}
