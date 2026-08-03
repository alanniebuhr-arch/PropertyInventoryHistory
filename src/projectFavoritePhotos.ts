import type { AppState, ProjectPhoto } from './types';
import { photosForProject } from './projectPhotos';
import {
  interactionsForProject,
  photosForPunchItem,
  photosForVendorInteraction,
  projectById,
  punchItemsForProject,
  vendorById,
  vendorsForProject,
} from './storage';
import { photosForVendor, vendorPhotoDisplayLabel } from './vendorPhotos';
import { formatDisplayDate } from './utils';
import type { FavoriteHeroPhoto } from './propertyFavoritePhotos';

export type ProjectCatalogPhoto = FavoriteHeroPhoto & {
  favorite?: boolean;
  contextLabel: string;
  source: 'project' | 'punchItem' | 'vendor' | 'interaction';
  punchItemId?: string;
  vendorId?: string;
  interactionId?: string;
};

function photoLabel(photo: Pick<ProjectPhoto, 'caption'>, fallback: string): string {
  const caption = photo.caption?.trim();
  if (caption === 'receipt') return 'Receipt';
  return fallback.trim() || caption || 'Photo';
}

/** All gallery photos for a project (Slideshow picker), in gallery order. */
export function allGalleryPhotosForProject(
  state: AppState,
  projectId: string
): ProjectCatalogPhoto[] {
  const project = projectById(state, projectId);
  if (!project) return [];

  return photosForProject(state, projectId)
    .filter((photo) => Boolean(photo.localUri))
    .map((photo) => ({
      id: photo.id,
      uri: photo.localUri,
      label: photoLabel(photo, photo.caption?.trim() || 'Photo'),
      notes: photo.notes?.trim() || undefined,
      favorite: photo.favorite === true,
      contextLabel: project.name,
      source: 'project' as const,
    }));
}

/**
 * All photos for Search photos: project gallery, punch list, vendors, and interactions.
 */
export function allHeroPhotosForProject(
  state: AppState,
  projectId: string
): ProjectCatalogPhoto[] {
  const project = projectById(state, projectId);
  if (!project) return [];

  const result: ProjectCatalogPhoto[] = [...allGalleryPhotosForProject(state, projectId)];
  const seen = new Set(result.map((photo) => photo.id));

  for (const item of punchItemsForProject(state, projectId)) {
    for (const photo of photosForPunchItem(state, item.id)) {
      if (!photo.localUri || seen.has(photo.id)) continue;
      seen.add(photo.id);
      result.push({
        id: photo.id,
        uri: photo.localUri,
        label: photoLabel(photo, photo.caption?.trim() || item.title),
        notes: photo.notes?.trim() || undefined,
        favorite: photo.favorite === true,
        contextLabel: item.title,
        source: 'punchItem',
        punchItemId: item.id,
      });
    }
  }

  for (const vendor of vendorsForProject(state, projectId)) {
    for (const photo of photosForVendor(state, vendor.id)) {
      if (!photo.localUri || seen.has(photo.id)) continue;
      seen.add(photo.id);
      result.push({
        id: photo.id,
        uri: photo.localUri,
        label: vendorPhotoDisplayLabel(photo),
        notes: photo.notes?.trim() || undefined,
        contextLabel: vendor.name,
        source: 'vendor',
        vendorId: vendor.id,
      });
    }
  }

  for (const interaction of interactionsForProject(state, projectId)) {
    const vendor = interaction.vendorId
      ? vendorById(state, interaction.vendorId)
      : undefined;
    const dateLabel = formatDisplayDate(interaction.occurredAtISO);
    const contextLabel = [vendor?.name, dateLabel].filter(Boolean).join(' · ') || dateLabel;
    for (const photo of photosForVendorInteraction(state, interaction.id)) {
      if (!photo.localUri || seen.has(photo.id)) continue;
      seen.add(photo.id);
      const caption = photo.caption?.trim();
      result.push({
        id: photo.id,
        uri: photo.localUri,
        label: caption === 'receipt' ? 'Receipt' : caption || 'Photo',
        notes: photo.notes?.trim() || undefined,
        contextLabel,
        source: 'interaction',
        interactionId: interaction.id,
        vendorId: interaction.vendorId,
      });
    }
  }

  return result;
}

function favoriteGalleryPhotosForProject(
  state: AppState,
  projectId: string
): FavoriteHeroPhoto[] {
  return allGalleryPhotosForProject(state, projectId)
    .filter((photo) => photo.favorite)
    .map(({ id, uri, label, notes }) => ({ id, uri, label, notes }));
}

function catalogById(
  state: AppState,
  projectId: string
): Map<string, ProjectCatalogPhoto> {
  return new Map(allGalleryPhotosForProject(state, projectId).map((photo) => [photo.id, photo]));
}

/** Resolved Slideshow list: explicit order when set, otherwise starred favorites. */
export function slideshowPhotosForProject(
  state: AppState,
  projectId: string
): FavoriteHeroPhoto[] {
  const project = projectById(state, projectId);
  if (!project) return [];

  if (project.slideshowPhotoIds === undefined) {
    return favoriteGalleryPhotosForProject(state, projectId);
  }

  const byId = catalogById(state, projectId);
  const result: FavoriteHeroPhoto[] = [];
  for (const id of project.slideshowPhotoIds) {
    const photo = byId.get(id);
    if (photo) {
      result.push({
        id: photo.id,
        uri: photo.uri,
        label: photo.label,
        notes: photo.notes,
      });
    }
  }
  return result;
}

function updateProjectSlideshowIds(
  state: AppState,
  projectId: string,
  slideshowPhotoIds: string[]
): AppState {
  return {
    ...state,
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, slideshowPhotoIds } : project
    ),
  };
}

/** Initialize slideshowPhotoIds from current favorites if the project has never customized order. */
export function ensureProjectSlideshowPhotoIds(state: AppState, projectId: string): AppState {
  const project = projectById(state, projectId);
  if (!project || project.slideshowPhotoIds !== undefined) return state;
  return updateProjectSlideshowIds(
    state,
    projectId,
    favoriteGalleryPhotosForProject(state, projectId).map((photo) => photo.id)
  );
}

export function setProjectSlideshowPhotoIds(
  state: AppState,
  projectId: string,
  slideshowPhotoIds: string[]
): AppState {
  return updateProjectSlideshowIds(state, projectId, slideshowPhotoIds);
}

/** Move photo to 1-based position; other slides shift. Clamps to 1..N. */
export function moveProjectSlideshowPhotoToOrder(
  state: AppState,
  projectId: string,
  photoId: string,
  oneBasedOrder: number
): AppState {
  let next = ensureProjectSlideshowPhotoIds(state, projectId);
  const project = projectById(next, projectId);
  if (!project?.slideshowPhotoIds) return next;

  const ids = project.slideshowPhotoIds.filter((id) => id !== photoId);
  if (!project.slideshowPhotoIds.includes(photoId)) return next;

  const max = ids.length + 1;
  const target = Math.max(1, Math.min(max, Math.round(oneBasedOrder))) - 1;
  ids.splice(target, 0, photoId);
  return updateProjectSlideshowIds(next, projectId, ids);
}

function setProjectFavoriteFlag(state: AppState, photoId: string, favorite: boolean): AppState {
  if (!state.projectPhotos.some((photo) => photo.id === photoId)) return state;
  return {
    ...state,
    projectPhotos: state.projectPhotos.map((photo) =>
      photo.id === photoId ? { ...photo, favorite: favorite || undefined } : photo
    ),
  };
}

/**
 * Include/exclude a photo in the project Slideshow list and keep the ★ in sync.
 */
export function setProjectSlideshowPhotoIncluded(
  state: AppState,
  projectId: string,
  photoId: string,
  included: boolean
): AppState {
  let next = ensureProjectSlideshowPhotoIds(state, projectId);
  const project = projectById(next, projectId);
  if (!project) return next;

  const catalog = catalogById(next, projectId);
  if (!catalog.has(photoId)) return next;

  const current = project.slideshowPhotoIds ?? [];
  const has = current.includes(photoId);
  let slideshowPhotoIds = current;
  if (included && !has) {
    slideshowPhotoIds = [...current, photoId];
  } else if (!included && has) {
    slideshowPhotoIds = current.filter((id) => id !== photoId);
  }

  next = updateProjectSlideshowIds(next, projectId, slideshowPhotoIds);
  next = setProjectFavoriteFlag(next, photoId, included);
  return next;
}

/** Keep project Slideshow membership in sync when a gallery ★ is toggled. */
export function syncProjectSlideshowAfterFavoriteChange(
  state: AppState,
  photoId: string,
  favorite: boolean
): AppState {
  const photo = state.projectPhotos.find((entry) => entry.id === photoId);
  if (!photo || photo.punchItemId) return state;
  return setProjectSlideshowPhotoIncluded(state, photo.projectId, photoId, favorite);
}
