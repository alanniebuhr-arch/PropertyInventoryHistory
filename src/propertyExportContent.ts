import type { AppState } from './types';
import { itemDisplayLabel } from './itemCatalog';
import {
  filterInteractionsByHorizon,
  filterTodosByHorizon,
  filterUpcomingByHorizon,
  isOverdue,
  upcomingDueAtISO,
  upcomingInteractionsForProperty,
  upcomingNotOverdueCountForRoom,
  upcomingServiceEventsForProperty,
  upcomingTodosForProperty,
} from './eventRecurrence';
import { getPropertyUpcomingHorizon } from './upcomingHorizonPrefs';
import { overdueCountForRoom } from './itemMaintenance';
import { slideshowPhotosForProperty } from './propertyFavoritePhotos';
import { firstPhotoUriForProject } from './projectPhotos';
import { firstPhotoUriForRoom } from './roomPhotos';
import { firstPhotoUriForVendor } from './vendorPhotos';
import { vendorContactMethodLabel } from './vendorContactMethod';
import {
  itemById,
  photosForEvent,
  photosForPropertyTodo,
  photosForVendorInteraction,
  projectsForProperty,
  propertyById,
  roomsForProperty,
  todosForProperty,
  ideasForProperty,
  vendorById,
  vendorsForProject,
} from './storage';
import { formatCurrency, formatDate, formatDisplayDate, nowISO } from './utils';
import { projectStatusLabel } from './projectStatus';

export type PropertyExportPhoto = { uri: string; label: string; notes?: string };

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
  todos: PropertyExportListItem[];
  ideas: PropertyExportListItem[];
  exportedAtLabel: string;
};

export type PropertyExportSectionKey =
  | 'photos'
  | 'services'
  | 'rooms'
  | 'projects'
  | 'todos'
  | 'ideas';

export type PropertyExportInclude = Record<PropertyExportSectionKey, boolean>;

export type PropertyExportOptions = {
  include?: Partial<PropertyExportInclude>;
};

export const PROPERTY_SHARE_PRESET_ALL: PropertyExportInclude = {
  photos: true,
  services: true,
  rooms: true,
  projects: true,
  todos: true,
  ideas: true,
};

export const PROPERTY_SHARE_SECTION_OPTIONS: {
  key: PropertyExportSectionKey;
  label: string;
}[] = [
  { key: 'photos', label: 'Favorite photos' },
  { key: 'services', label: 'Reminders' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'projects', label: 'Projects' },
  { key: 'todos', label: 'To do' },
  { key: 'ideas', label: 'Ideas' },
];

function resolveInclude(options?: PropertyExportOptions): PropertyExportInclude {
  return {
    ...PROPERTY_SHARE_PRESET_ALL,
    ...options?.include,
  };
}

export function buildPropertyExportSnapshot(
  state: AppState,
  propertyId: string,
  options?: PropertyExportOptions
): PropertyExportSnapshot | null {
  const property = propertyById(state, propertyId);
  if (!property) return null;

  const include = resolveInclude(options);

  const metaLines = [property.address?.trim()]
    .filter((line): line is string => Boolean(line))
    .map((line) => line);

  const photos: PropertyExportPhoto[] = include.photos
    ? slideshowPhotosForProperty(state, propertyId).map((photo) => ({
        uri: photo.uri,
        label: photo.label,
        notes: photo.notes?.trim() || undefined,
      }))
    : [];

  const upcomingHorizon = getPropertyUpcomingHorizon();
  const upcomingEvents = filterUpcomingByHorizon(
    upcomingServiceEventsForProperty(state, propertyId),
    upcomingHorizon
  );
  const upcomingTodos = filterTodosByHorizon(
    upcomingTodosForProperty(state, propertyId),
    upcomingHorizon
  );
  const upcomingInteractions = filterInteractionsByHorizon(
    upcomingInteractionsForProperty(state, propertyId),
    upcomingHorizon
  );

  const services: PropertyExportListItem[] = include.services
    ? [
        ...upcomingEvents.map((event) => {
          const item = itemById(state, event.itemId);
          const dueAt = upcomingDueAtISO(event);
          const eventPhoto = photosForEvent(state, event.id)[0];
          const lines = [
            event.title.trim() || undefined,
            dueAt
              ? `${isOverdue(dueAt) ? 'Overdue' : 'Due'} ${formatDisplayDate(dueAt)}`
              : undefined,
          ].filter((line): line is string => Boolean(line));

          return {
            title: item ? itemDisplayLabel(item) : event.title,
            lines,
            thumbnailUri: eventPhoto?.localUri?.trim() || undefined,
            sortKey: dueAt ?? '',
          };
        }),
        ...upcomingTodos.map((todo) => {
          const dueAt = todo.dueAtISO;
          const todoPhoto = photosForPropertyTodo(state, todo.id)[0];
          const lines = [
            dueAt
              ? `${isOverdue(dueAt) ? 'Overdue' : 'Due'} ${formatDisplayDate(dueAt)}`
              : undefined,
            todo.notes?.trim() || undefined,
          ].filter((line): line is string => Boolean(line));

          return {
            title: todo.title,
            lines,
            thumbnailUri: todoPhoto?.localUri?.trim() || undefined,
            sortKey: dueAt ?? '',
          };
        }),
        ...upcomingInteractions.map((interaction) => {
          const vendor = interaction.vendorId
            ? vendorById(state, interaction.vendorId)
            : undefined;
          const interactionPhoto = photosForVendorInteraction(state, interaction.id)[0];
          const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
          const dueAt = interaction.occurredAtISO;
          const lines = [
            dueAt
              ? `${isOverdue(dueAt) ? 'Overdue' : 'Due'} ${formatDisplayDate(dueAt)}`
              : undefined,
            [methodLabel, interaction.notes?.trim()].filter(Boolean).join(' · ') ||
              undefined,
          ].filter((line): line is string => Boolean(line));

          return {
            title:
              vendor?.name?.trim() ||
              interaction.contactName?.trim() ||
              'Interaction',
            lines,
            thumbnailUri:
              interactionPhoto?.localUri?.trim() ||
              (vendor ? firstPhotoUriForVendor(state, vendor)?.trim() : undefined) ||
              undefined,
            sortKey: dueAt,
          };
        }),
      ]
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ sortKey: _sortKey, ...item }) => item)
    : [];

  const rooms: PropertyExportListItem[] = include.rooms
    ? roomsForProperty(state, propertyId).map((room) => {
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
      })
    : [];

  const projects: PropertyExportListItem[] = include.projects
    ? projectsForProperty(state, propertyId).map((project) => {
        const vendors = vendorsForProject(state, project.id);
        const waitingForQuoteCount = vendors.filter(
          (vendor) => vendor.status === 'waiting_for_quote'
        ).length;
        const lines = [
          projectStatusLabel(project.status ?? 'research'),
          project.totalCost != null ? formatCurrency(project.totalCost) : undefined,
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
      })
    : [];

  const todos: PropertyExportListItem[] = include.todos
    ? todosForProperty(state, propertyId).map((todo) => {
        const todoPhoto = photosForPropertyTodo(state, todo.id)[0];
        const lines = [
          todo.done ? 'Done' : undefined,
          todo.dueAtISO
            ? `${isOverdue(todo.dueAtISO) ? 'Overdue' : 'Due'} ${formatDisplayDate(todo.dueAtISO)}`
            : undefined,
          todo.notes?.trim() || undefined,
        ].filter((line): line is string => Boolean(line));

        return {
          title: todo.title,
          lines,
          thumbnailUri: todoPhoto?.localUri?.trim() || undefined,
        };
      })
    : [];

  const ideas: PropertyExportListItem[] = include.ideas
    ? ideasForProperty(state, propertyId).map((idea) => {
        const ideaPhoto = photosForPropertyTodo(state, idea.id)[0];
        const lines = [
          idea.dueAtISO ? formatDisplayDate(idea.dueAtISO) : undefined,
          idea.notes?.trim() || undefined,
        ].filter((line): line is string => Boolean(line));

        return {
          title: idea.title,
          lines,
          thumbnailUri: ideaPhoto?.localUri?.trim() || undefined,
        };
      })
    : [];

  return {
    title: property.name,
    subtitle: 'Property Asset Manager',
    metaLines,
    photos,
    services,
    rooms,
    projects,
    todos,
    ideas,
    exportedAtLabel: `Exported ${formatDate(nowISO())}`,
  };
}
