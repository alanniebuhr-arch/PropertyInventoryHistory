import type { AppState } from './types';
import { itemDisplayLabel } from './itemCatalog';
import {
  isOverdue,
  upcomingDueAtISO,
  upcomingNotOverdueCountForRoom,
  upcomingServiceEventsForProperty,
} from './eventRecurrence';
import { overdueCountForRoom } from './itemMaintenance';
import { favoriteHeroPhotosForProperty } from './propertyFavoritePhotos';
import { firstPhotoUriForProject } from './projectPhotos';
import { firstPhotoUriForRoom } from './roomPhotos';
import {
  itemById,
  photosForEvent,
  projectsForProperty,
  propertyById,
  roomsForProperty,
  vendorsForProject,
} from './storage';
import { formatDate, nowISO } from './utils';

export type PropertyExportPhoto = { uri: string; label: string };

export type PropertyExportListItem = {
  title: string;
  lines: string[];
  thumbnailUri?: string;
};

export type PropertyExportSnapshot = {
  title: string;
  subtitle: string;
  metaLines: string[];
  photos: PropertyExportPhoto[];
  services: PropertyExportListItem[];
  rooms: PropertyExportListItem[];
  projects: PropertyExportListItem[];
  exportedAtLabel: string;
};

export function buildPropertyExportSnapshot(
  state: AppState,
  propertyId: string
): PropertyExportSnapshot | null {
  const property = propertyById(state, propertyId);
  if (!property) return null;

  const metaLines = [property.address?.trim()]
    .filter((line): line is string => Boolean(line))
    .map((line) => line);

  const photos: PropertyExportPhoto[] = favoriteHeroPhotosForProperty(state, propertyId).map(
    (photo) => ({
      uri: photo.uri,
      label: photo.label,
    })
  );

  const services: PropertyExportListItem[] = upcomingServiceEventsForProperty(
    state,
    propertyId
  ).map((event) => {
    const item = itemById(state, event.itemId);
    const dueAt = upcomingDueAtISO(event);
    const eventPhoto = photosForEvent(state, event.id)[0];
    const lines = [
      event.title.trim() || undefined,
      dueAt
        ? `${isOverdue(dueAt) ? 'Overdue' : 'Due'} ${formatDate(dueAt)}`
        : undefined,
    ].filter((line): line is string => Boolean(line));

    return {
      title: item ? itemDisplayLabel(item) : event.title,
      lines,
      thumbnailUri: eventPhoto?.localUri?.trim() || undefined,
    };
  });

  const rooms: PropertyExportListItem[] = roomsForProperty(state, propertyId).map((room) => {
    const itemCount = state.items.filter((item) => item.roomId === room.id).length;
    const overdueCount = overdueCountForRoom(state, room.id);
    const upcomingCount = upcomingNotOverdueCountForRoom(state, room.id, 'all');
    const lines = [
      `${itemCount} asset${itemCount === 1 ? '' : 's'}`,
      overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      upcomingCount > 0 ? `${upcomingCount} upcoming` : undefined,
      room.requiresAuth ? 'Requires authentication' : undefined,
    ].filter((line): line is string => Boolean(line));

    return {
      title: room.name,
      lines,
      thumbnailUri: firstPhotoUriForRoom(state, room)?.trim() || undefined,
    };
  });

  const projects: PropertyExportListItem[] = projectsForProperty(state, propertyId).map(
    (project) => {
      const vendors = vendorsForProject(state, project.id);
      const waitingForQuoteCount = vendors.filter(
        (vendor) => vendor.status === 'waiting_for_quote'
      ).length;
      const lines = [
        `${vendors.length} vendor${vendors.length === 1 ? '' : 's'}`,
        waitingForQuoteCount > 0
          ? `${waitingForQuoteCount} waiting for quote`
          : undefined,
      ].filter((line): line is string => Boolean(line));

      return {
        title: project.name,
        lines,
        thumbnailUri: firstPhotoUriForProject(state, project)?.trim() || undefined,
      };
    }
  );

  return {
    title: property.name,
    subtitle: 'Property Asset Manager',
    metaLines,
    photos,
    services,
    rooms,
    projects,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
