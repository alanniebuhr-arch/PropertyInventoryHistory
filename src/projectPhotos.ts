import type { AppState, Project, ProjectPhoto } from './types';
import { deletePhotoFile, persistPhotoFromUri } from './photoStorage';
import { uid, nowISO } from './utils';

export function photosForProject(state: AppState, projectId: string): ProjectPhoto[] {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return [];
  return project.photoIds
    .map((photoId) => state.projectPhotos.find((p) => p.id === photoId))
    .filter((p): p is ProjectPhoto => p != null);
}

export function firstPhotoUriForProject(state: AppState, project: Project): string | undefined {
  return photosForProject(state, project.id)[0]?.localUri;
}

export async function addProjectPhotos(
  state: AppState,
  projectId: string,
  sourceUris: string[]
): Promise<AppState> {
  if (sourceUris.length === 0) return state;
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state;

  const newPhotos: ProjectPhoto[] = await Promise.all(
    sourceUris.map(async (sourceUri) => {
      const photoId = uid('photo');
      const localUri = await persistPhotoFromUri(sourceUri, photoId);
      return {
        id: photoId,
        projectId,
        localUri,
        createdAtISO: nowISO(),
      };
    })
  );

  const newPhotoIds = newPhotos.map((p) => p.id);
  return {
    ...state,
    projectPhotos: [...state.projectPhotos, ...newPhotos],
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, photoIds: [...p.photoIds, ...newPhotoIds] } : p
    ),
  };
}

export async function removeProjectPhoto(
  state: AppState,
  projectId: string,
  photoId: string
): Promise<AppState> {
  const photo = state.projectPhotos.find((p) => p.id === photoId);
  if (photo) await deletePhotoFile(photo.localUri);

  return {
    ...state,
    projectPhotos: state.projectPhotos.filter((p) => p.id !== photoId),
    projects: state.projects.map((p) =>
      p.id === projectId ? { ...p, photoIds: p.photoIds.filter((id) => id !== photoId) } : p
    ),
  };
}
