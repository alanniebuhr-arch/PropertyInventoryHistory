import type { AppState, PinnedKind, PinnedRef } from './types';
import { nowISO } from './utils';

const PIN_KINDS = new Set<PinnedKind>([
  'property',
  'project',
  'room',
  'item',
  'event',
  'vendor',
  'todo',
  'punch',
  'interaction',
]);

export function isPinnedKind(value: string): value is PinnedKind {
  return PIN_KINDS.has(value as PinnedKind);
}

export function normalizePins(raw: unknown): PinnedRef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const pins: PinnedRef[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const kind = (entry as PinnedRef).kind;
    const id = (entry as PinnedRef).id;
    const pinnedAtISO = (entry as PinnedRef).pinnedAtISO;
    if (!isPinnedKind(kind) || typeof id !== 'string' || id.length === 0) continue;
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pins.push({
      kind,
      id,
      pinnedAtISO: typeof pinnedAtISO === 'string' && pinnedAtISO ? pinnedAtISO : nowISO(),
    });
  }
  return pins;
}

export function pinKey(kind: PinnedKind, id: string): string {
  return `${kind}:${id}`;
}

export function isPinned(state: AppState, kind: PinnedKind, id: string): boolean {
  return (state.pins ?? []).some((pin) => pin.kind === kind && pin.id === id);
}

export function pinTargetExists(state: AppState, pin: PinnedRef): boolean {
  switch (pin.kind) {
    case 'property':
      return state.properties.some((p) => p.id === pin.id);
    case 'project':
      return state.projects.some((p) => p.id === pin.id);
    case 'room':
      return state.rooms.some((r) => r.id === pin.id);
    case 'item':
      return state.items.some((i) => i.id === pin.id);
    case 'event':
      return state.events.some((e) => e.id === pin.id);
    case 'vendor':
      return state.projectVendors.some((v) => v.id === pin.id);
    case 'todo':
      return state.propertyTodos.some((t) => t.id === pin.id);
    case 'punch':
      return state.projectPunchItems.some((p) => p.id === pin.id);
    case 'interaction':
      return state.vendorInteractions.some((i) => i.id === pin.id);
  }
}

export function livingPins(state: AppState): PinnedRef[] {
  return (state.pins ?? []).filter((pin) => pinTargetExists(state, pin));
}

export function withLivingPins(state: AppState): AppState {
  return { ...state, pins: livingPins(state) };
}

export function propertyIdForPin(state: AppState, pin: PinnedRef): string | undefined {
  switch (pin.kind) {
    case 'property':
      return pin.id;
    case 'project':
      return state.projects.find((p) => p.id === pin.id)?.propertyId;
    case 'room':
      return state.rooms.find((r) => r.id === pin.id)?.propertyId;
    case 'item': {
      const item = state.items.find((i) => i.id === pin.id);
      if (!item) return undefined;
      return state.rooms.find((r) => r.id === item.roomId)?.propertyId;
    }
    case 'event': {
      const event = state.events.find((e) => e.id === pin.id);
      if (!event) return undefined;
      const item = state.items.find((i) => i.id === event.itemId);
      if (!item) return undefined;
      return state.rooms.find((r) => r.id === item.roomId)?.propertyId;
    }
    case 'vendor': {
      const vendor = state.projectVendors.find((v) => v.id === pin.id);
      if (!vendor) return undefined;
      return state.projects.find((p) => p.id === vendor.projectId)?.propertyId;
    }
    case 'todo':
      return state.propertyTodos.find((t) => t.id === pin.id)?.propertyId;
    case 'punch': {
      const punch = state.projectPunchItems.find((p) => p.id === pin.id);
      if (!punch) return undefined;
      return state.projects.find((p) => p.id === punch.projectId)?.propertyId;
    }
    case 'interaction': {
      const interaction = state.vendorInteractions.find((i) => i.id === pin.id);
      if (!interaction) return undefined;
      if (interaction.propertyId) return interaction.propertyId;
      if (interaction.projectId) {
        const fromProject = state.projects.find((p) => p.id === interaction.projectId)?.propertyId;
        if (fromProject) return fromProject;
      }
      if (!interaction.vendorId) return undefined;
      const vendor = state.projectVendors.find((v) => v.id === interaction.vendorId);
      if (!vendor) return undefined;
      return state.projects.find((p) => p.id === vendor.projectId)?.propertyId;
    }
  }
}

export function pinsForProperty(state: AppState, propertyId: string): PinnedRef[] {
  return livingPins(state).filter((pin) => propertyIdForPin(state, pin) === propertyId);
}

export function togglePin(state: AppState, kind: PinnedKind, id: string): AppState {
  const pins = state.pins ?? [];
  if (pins.some((pin) => pin.kind === kind && pin.id === id)) {
    return {
      ...state,
      pins: pins.filter((pin) => !(pin.kind === kind && pin.id === id)),
    };
  }
  return {
    ...state,
    pins: [...pins, { kind, id, pinnedAtISO: nowISO() }],
  };
}

export function mergePins(local: PinnedRef[], incoming: PinnedRef[]): PinnedRef[] {
  const seen = new Set(local.map((pin) => pinKey(pin.kind, pin.id)));
  const next = [...local];
  for (const pin of incoming) {
    const key = pinKey(pin.kind, pin.id);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(pin);
  }
  return next;
}

export function pinKindLabel(kind: PinnedKind, extra?: { todoKind?: 'todo' | 'idea' }): string {
  switch (kind) {
    case 'property':
      return 'Property';
    case 'project':
      return 'Plan';
    case 'room':
      return 'Room';
    case 'item':
      return 'Asset';
    case 'event':
      return 'Service';
    case 'vendor':
      return 'Vendor';
    case 'todo':
      return extra?.todoKind === 'idea' ? 'Idea' : 'To-do';
    case 'punch':
      return 'Punch item';
    case 'interaction':
      return 'Interaction';
  }
}
