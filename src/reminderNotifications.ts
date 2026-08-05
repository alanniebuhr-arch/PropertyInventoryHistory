import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { AppState } from './types';
import {
  calendarYmdFromISO,
  isAfterToday,
  upcomingDueAtISO,
  upcomingServiceEventsForApp,
} from './eventRecurrence';
import { itemDisplayLabel } from './itemCatalog';
import {
  itemById,
  projectById,
  propertyById,
  propertyIdForInteraction,
  roomById,
  vendorById,
} from './storage';

const SCHEDULED_IDS_KEY = '@propertyInventory/reminderNotificationIds';
/** iOS pending local notification limit is ~64; keep a margin. */
const MAX_SCHEDULED = 60;
const NOTIFY_HOUR = 9;
const NOTIFY_MINUTE = 0;

export type ReminderNotificationKind = 'event' | 'todo' | 'interaction' | 'punch';

export type ReminderNotificationData = {
  kind: ReminderNotificationKind;
  id: string;
  itemId?: string;
  propertyId?: string;
  projectId?: string;
  vendorId?: string;
};

type Candidate = {
  dueAtISO: string;
  title: string;
  body: string;
  data: ReminderNotificationData;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function asDataRecord(data: ReminderNotificationData): Record<string, unknown> {
  return { ...data };
}

export function parseReminderNotificationData(
  raw: Record<string, unknown> | undefined | null
): ReminderNotificationData | null {
  if (!raw || typeof raw.kind !== 'string' || typeof raw.id !== 'string') return null;
  if (
    raw.kind !== 'event' &&
    raw.kind !== 'todo' &&
    raw.kind !== 'interaction' &&
    raw.kind !== 'punch'
  ) {
    return null;
  }
  return {
    kind: raw.kind,
    id: raw.id,
    itemId: typeof raw.itemId === 'string' ? raw.itemId : undefined,
    propertyId: typeof raw.propertyId === 'string' ? raw.propertyId : undefined,
    projectId: typeof raw.projectId === 'string' ? raw.projectId : undefined,
    vendorId: typeof raw.vendorId === 'string' ? raw.vendorId : undefined,
  };
}

/** Request notification permission when undetermined; returns whether we may schedule. */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (existing.ios?.status === Notifications.IosAuthorizationStatus.DENIED) {
    return false;
  }
  if (existing.status === 'denied') return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return requested.granted === true;
}

function triggerAtNineOnDueDate(dueAtISO: string, now: Date): Date | null {
  const ymd = calendarYmdFromISO(dueAtISO);
  if (!ymd) return null;
  const trigger = new Date(ymd.year, ymd.month - 1, ymd.day, NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);
  if (trigger.getTime() <= now.getTime()) return null;
  return trigger;
}

function collectCandidates(state: AppState): Candidate[] {
  const candidates: Candidate[] = [];

  for (const event of upcomingServiceEventsForApp(state)) {
    const dueAtISO = upcomingDueAtISO(event);
    if (!dueAtISO) continue;
    const item = itemById(state, event.itemId);
    const room = item ? roomById(state, item.roomId) : undefined;
    const property = room ? propertyById(state, room.propertyId) : undefined;
    const assetLabel = item ? itemDisplayLabel(item) : 'Asset';
    candidates.push({
      dueAtISO,
      title: property?.name?.trim()
        ? `${property.name.trim()} · Service`
        : 'Service reminder',
      body: event.title.trim() || assetLabel,
      data: {
        kind: 'event',
        id: event.id,
        itemId: event.itemId,
        propertyId: property?.id,
      },
    });
  }

  for (const todo of state.propertyTodos) {
    if (todo.kind === 'idea' || todo.done || !todo.dueAtISO) continue;
    const property = propertyById(state, todo.propertyId);
    candidates.push({
      dueAtISO: todo.dueAtISO,
      title: property?.name?.trim()
        ? `${property.name.trim()} · To-do`
        : 'To-do reminder',
      body: todo.title.trim() || 'To-do',
      data: {
        kind: 'todo',
        id: todo.id,
        propertyId: todo.propertyId,
      },
    });
  }

  for (const interaction of state.vendorInteractions) {
    if (!isAfterToday(interaction.occurredAtISO)) continue;
    const propertyId = propertyIdForInteraction(state, interaction);
    const property = propertyId ? propertyById(state, propertyId) : undefined;
    const vendor = interaction.vendorId
      ? vendorById(state, interaction.vendorId)
      : undefined;
    const body =
      vendor?.name?.trim() ||
      interaction.contactName?.trim() ||
      interaction.notes?.trim() ||
      'Interaction';
    candidates.push({
      dueAtISO: interaction.occurredAtISO,
      title: property?.name?.trim()
        ? `${property.name.trim()} · Interaction`
        : 'Interaction reminder',
      body,
      data: {
        kind: 'interaction',
        id: interaction.id,
        vendorId: interaction.vendorId,
        propertyId: propertyId ?? undefined,
      },
    });
  }

  for (const punch of state.projectPunchItems) {
    if (punch.done || !punch.dueAtISO) continue;
    const project = projectById(state, punch.projectId);
    const property = project ? propertyById(state, project.propertyId) : undefined;
    const scope = [property?.name?.trim(), project?.name?.trim()].filter(Boolean).join(' · ');
    candidates.push({
      dueAtISO: punch.dueAtISO,
      title: scope ? `${scope} · Punch list` : 'Punch list reminder',
      body: punch.title.trim() || 'Punch item',
      data: {
        kind: 'punch',
        id: punch.id,
        projectId: punch.projectId,
        propertyId: project?.propertyId,
      },
    });
  }

  return candidates;
}

async function loadScheduledIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

async function saveScheduledIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
}

/**
 * Cancel previously scheduled reminder notifications and reschedule from current state.
 * No-op on web or when permission is not granted.
 */
export async function syncReminderNotifications(state: AppState): Promise<void> {
  if (Platform.OS === 'web') return;

  const allowed = await ensureNotificationPermissions();
  if (!allowed) {
    const previous = await loadScheduledIds();
    await Promise.all(
      previous.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
    );
    await saveScheduledIds([]);
    return;
  }

  const previous = await loadScheduledIds();
  await Promise.all(
    previous.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );

  const now = new Date();
  const withTrigger = collectCandidates(state)
    .map((candidate) => {
      const date = triggerAtNineOnDueDate(candidate.dueAtISO, now);
      return date ? { ...candidate, date } : null;
    })
    .filter((entry): entry is Candidate & { date: Date } => entry != null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED);

  const nextIds: string[] = [];
  for (const entry of withTrigger) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: entry.title,
          body: entry.body,
          data: asDataRecord(entry.data),
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: entry.date,
        },
      });
      nextIds.push(id);
    } catch {
      // Skip individual schedule failures (invalid date, OS limits, etc.).
    }
  }

  await saveScheduledIds(nextIds);
}

/** Subscribe to notification taps; returns an unsubscribe function. */
export function addReminderNotificationResponseListener(
  onData: (data: ReminderNotificationData) => void
): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = parseReminderNotificationData(
      response.notification.request.content.data as Record<string, unknown>
    );
    if (data) onData(data);
  });
  return () => sub.remove();
}

/** If the app was opened from a notification tap, return that payload once. */
export async function getInitialReminderNotificationData(): Promise<ReminderNotificationData | null> {
  if (Platform.OS === 'web') return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return parseReminderNotificationData(
    response.notification.request.content.data as Record<string, unknown>
  );
}
