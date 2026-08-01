import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { AppState, ItemTypeId } from './src/types';
import { EMPTY_APP_STATE } from './src/types';
import {
  loadAppState,
  saveAppState,
  roomById,
  projectById,
  propertyIdForInteraction,
  itemById,
  vendorById,
  vendorInteractionById,
} from './src/storage';
import { loadPropertyUpcomingHorizon } from './src/upcomingHorizonPrefs';
import {
  DEFAULT_TEXT_SCALE_STEP,
  getAppTextScaleStep,
  loadAppTextScaleStep,
  setAppTextScaleStep,
  TEXT_SCALE_STEPS,
} from './src/appTextScalePrefs';
import { TextScaleProvider } from './src/textScale';
import {
  authenticateForRoom,
  isRoomUnlocked,
  markRoomUnlocked,
  setupRoomAuthSessionReset,
} from './src/roomAuth';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailScreen } from './src/screens/PropertyDetailScreen';
import { RoomDetailScreen } from './src/screens/RoomDetailScreen';
import { ProjectDetailScreen } from './src/screens/ProjectDetailScreen';
import { VendorDetailScreen } from './src/screens/VendorDetailScreen';
import { AddEditVendorInteractionScreen } from './src/screens/AddEditVendorInteractionScreen';
import { AddEditPropertyTodoScreen } from './src/screens/AddEditPropertyTodoScreen';
import { AddEditProjectPunchItemScreen } from './src/screens/AddEditProjectPunchItemScreen';
import { PropertyInteractionsScreen } from './src/screens/PropertyInteractionsScreen';
import type { InteractionSearchMatchField } from './src/searchSnippet';
import { PropertyServicesScreen } from './src/screens/PropertyServicesScreen';
import { PropertyAssetsScreen } from './src/screens/PropertyAssetsScreen';
import { PropertyActivitySearchScreen } from './src/screens/PropertyActivitySearchScreen';
import { ItemDetailScreen } from './src/screens/ItemDetailScreen';
import { AddEditEventScreen } from './src/screens/AddEditEventScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import type { ApplianceEditingSection } from './src/components/ApplianceDisplayView';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { sharedStyles } from './src/theme';

type Route =
  | { name: 'home' }
  | { name: 'property'; propertyId: string }
  | { name: 'allInteractions'; focusSearch?: boolean }
  | { name: 'propertyInteractions'; propertyId: string; vendorId?: string; focusSearch?: boolean }
  | { name: 'projectInteractions'; projectId: string; vendorId?: string; focusSearch?: boolean }
  | { name: 'allServices'; focusSearch?: boolean }
  | { name: 'propertyServices'; propertyId: string; roomId?: string; itemId?: string; focusSearch?: boolean }
  | { name: 'roomServices'; roomId: string; itemId?: string; focusSearch?: boolean }
  | { name: 'allAssets'; focusSearch?: boolean }
  | { name: 'propertyAssets'; propertyId: string; roomId?: string; itemTypeId?: ItemTypeId; focusSearch?: boolean }
  | { name: 'roomAssets'; roomId: string; itemTypeId?: ItemTypeId; focusSearch?: boolean }
  | { name: 'propertyActivitySearch'; propertyId?: string }
  | { name: 'room'; roomId: string }
  | { name: 'project'; projectId: string }
  | { name: 'vendor'; vendorId: string; startEditing?: boolean }
  | {
      name: 'vendorInteraction';
      vendorId?: string;
      propertyId?: string;
      projectId?: string;
      interactionId?: string;
      searchQuery?: string;
      searchMatchField?: InteractionSearchMatchField;
    }
  | {
      name: 'propertyTodo';
      propertyId: string;
      todoId: string;
      startEditing?: boolean;
      kind?: 'todo' | 'idea';
    }
  | {
      name: 'projectPunchItem';
      projectId: string;
      punchItemId: string;
      startEditing?: boolean;
    }
  | { name: 'item'; itemId: string; startEditingSection?: ApplianceEditingSection }
  | {
      name: 'event';
      itemId?: string;
      propertyId?: string;
      roomId?: string;
      eventId?: string;
      completeFromEventId?: string;
    }
  | { name: 'transfer'; mode: 'export' | 'import' };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>(EMPTY_APP_STATE);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [bootKey, setBootKey] = useState(0);
  const [textScaleStep, setTextScaleStepState] = useState(getAppTextScaleStep);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const [s, textStep] = await Promise.all([
          loadAppState(),
          loadPropertyUpcomingHorizon().then(() => loadAppTextScaleStep()),
        ]);
        if (!cancelled) {
          setState(s);
          setTextScaleStepState(textStep);
        }
      } catch {
        if (!cancelled) setState({ ...EMPTY_APP_STATE });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [bootKey]);

  useEffect(() => setupRoomAuthSessionReset(), []);

  const persist = useCallback(async (next: AppState) => {
    const saved = await saveAppState(next);
    setState(saved);
  }, []);

  const setTextScaleStep = useCallback((step: number) => {
    setTextScaleStepState(step);
    void setAppTextScaleStep(step);
  }, []);

  const textScale = TEXT_SCALE_STEPS[textScaleStep] ?? TEXT_SCALE_STEPS[DEFAULT_TEXT_SCALE_STEP];

  const resetApp = useCallback(() => {
    setStack([{ name: 'home' }]);
    setLoading(true);
    setState({ ...EMPTY_APP_STATE });
    setBootKey((k) => k + 1);
  }, []);

  const route = stack[stack.length - 1]!;

  function push(r: Route) {
    setStack((s) => [...s, r]);
  }

  function pop() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }

  function replaceTopRoute(next: Route) {
    setStack((s) => (s.length > 0 ? [...s.slice(0, -1), next] : [next]));
  }

  function goToProperty(propertyId: string) {
    setStack((s) => {
      const idx = s.findIndex(
        (r) => r.name === 'property' && r.propertyId === propertyId
      );
      if (idx >= 0) return s.slice(0, idx + 1);
      const home = s.find((r) => r.name === 'home') ?? { name: 'home' as const };
      return [home, { name: 'property', propertyId }];
    });
  }

  async function openRoom(roomId: string, navigate: (id: string) => void) {
    const room = roomById(state, roomId);
    if (!room) return;
    if (!room.requiresAuth || isRoomUnlocked(roomId)) {
      navigate(roomId);
      return;
    }
    const ok = await authenticateForRoom(room.name);
    if (!ok) return;
    markRoomUnlocked(roomId);
    navigate(roomId);
  }

  let screen: React.ReactNode;

  if (loading) {
    screen = (
      <View style={[sharedStyles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  } else {
    switch (route.name) {
      case 'home':
        screen = (
          <HomeScreen
            state={state}
            onOpenProperty={(propertyId) => push({ name: 'property', propertyId })}
            onOpenInteractions={() => push({ name: 'allInteractions' })}
            onSearchInteractions={() =>
              push({ name: 'allInteractions', focusSearch: true })
            }
            onOpenServices={() => push({ name: 'allServices' })}
            onSearchServiceHistory={() =>
              push({ name: 'allServices', focusSearch: true })
            }
            onOpenAssets={() => push({ name: 'allAssets' })}
            onSearchAssets={() => push({ name: 'allAssets', focusSearch: true })}
            onSearchActivity={() => push({ name: 'propertyActivitySearch' })}
            onOpenExport={() => push({ name: 'transfer', mode: 'export' })}
            onOpenImport={() => push({ name: 'transfer', mode: 'import' })}
            onOpenEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onOpenTodo={(propertyId, todoId) =>
              push({ name: 'propertyTodo', propertyId, todoId })
            }
            onOpenInteraction={(vendorId, interactionId, propertyId) =>
              push({
                name: 'vendorInteraction',
                vendorId,
                propertyId,
                interactionId,
              })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'allInteractions':
        screen = (
          <PropertyInteractionsScreen
            key="allInteractions"
            state={state}
            focusSearch={route.focusSearch}
            onBack={pop}
            onOpenInteraction={(vendorId, interactionId, options) => {
              const interaction = vendorInteractionById(state, interactionId);
              const resolvedPropertyId = interaction
                ? propertyIdForInteraction(state, interaction)
                : undefined;
              push({
                name: 'vendorInteraction',
                vendorId,
                propertyId: resolvedPropertyId,
                interactionId,
                searchQuery: options?.searchQuery,
                searchMatchField: options?.searchMatchField,
              });
            }}
            onOpenVendor={(vendorId) => push({ name: 'vendor', vendorId })}
            onAddInteraction={(propertyId, vendorId) =>
              push({
                name: 'vendorInteraction',
                propertyId,
                vendorId,
              })
            }
            onSearchActivity={() => push({ name: 'propertyActivitySearch' })}
          />
        );
        break;
      case 'allServices':
        screen = (
          <PropertyServicesScreen
            key="allServices"
            state={state}
            focusSearch={route.focusSearch}
            onBack={pop}
            onOpenEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onOpenItem={(itemId) => push({ name: 'item', itemId })}
            onSearchActivity={() => push({ name: 'propertyActivitySearch' })}
          />
        );
        break;
      case 'allAssets':
        screen = (
          <PropertyAssetsScreen
            key="allAssets"
            state={state}
            focusSearch={route.focusSearch}
            onBack={pop}
            onOpenItem={(itemId) => push({ name: 'item', itemId })}
            onSearchActivity={() => push({ name: 'propertyActivitySearch' })}
          />
        );
        break;
      case 'property':
        screen = (
          <PropertyDetailScreen
            state={state}
            propertyId={route.propertyId}
            onBack={pop}
            onOpenRoom={(roomId) => void openRoom(roomId, (id) => push({ name: 'room', roomId: id }))}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenInteractions={() =>
              push({ name: 'propertyInteractions', propertyId: route.propertyId })
            }
            onSearchInteractions={() =>
              push({
                name: 'propertyInteractions',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onOpenServices={() =>
              push({ name: 'propertyServices', propertyId: route.propertyId })
            }
            onSearchServiceHistory={() =>
              push({
                name: 'propertyServices',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchActivity={() =>
              push({ name: 'propertyActivitySearch', propertyId: route.propertyId })
            }
            onOpenAssets={() =>
              push({ name: 'propertyAssets', propertyId: route.propertyId })
            }
            onSearchAssets={() =>
              push({
                name: 'propertyAssets',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onOpenTodo={(todoId, options) =>
              push({
                name: 'propertyTodo',
                propertyId: route.propertyId,
                todoId,
                startEditing: options?.startEditing,
                kind: options?.kind,
              })
            }
            onOpenInteraction={(vendorId, interactionId) =>
              push({
                name: 'vendorInteraction',
                vendorId: vendorId || undefined,
                propertyId: route.propertyId,
                interactionId,
              })
            }
            onAddInteraction={() =>
              push({ name: 'vendorInteraction', propertyId: route.propertyId })
            }
            onAddServiceEvent={() =>
              push({ name: 'event', propertyId: route.propertyId })
            }
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onEditEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onLogUpcomingService={(itemId, completeFromEventId) =>
              push({ name: 'event', itemId, completeFromEventId })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'propertyInteractions':
        screen = (
          <PropertyInteractionsScreen
            key={`property:${route.propertyId}:${route.vendorId ?? ''}`}
            state={state}
            propertyId={route.propertyId}
            initialVendorId={route.vendorId}
            focusSearch={route.focusSearch}
            onBack={pop}
            onGoToProperty={() => goToProperty(route.propertyId)}
            onOpenInteraction={(vendorId, interactionId, options) =>
              push({
                name: 'vendorInteraction',
                vendorId: vendorId || undefined,
                propertyId: route.propertyId,
                interactionId,
                searchQuery: options?.searchQuery,
                searchMatchField: options?.searchMatchField,
              })
            }
            onOpenVendor={(vendorId) => push({ name: 'vendor', vendorId })}
            onAddInteraction={(propertyId, vendorId) =>
              push({
                name: 'vendorInteraction',
                propertyId,
                vendorId: vendorId || route.vendorId,
              })
            }
            onAddServiceEvent={() =>
              push({ name: 'event', propertyId: route.propertyId })
            }
            onSearchAssets={() =>
              push({
                name: 'propertyAssets',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchServiceHistory={() =>
              push({
                name: 'propertyServices',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchActivity={() =>
              push({ name: 'propertyActivitySearch', propertyId: route.propertyId })
            }
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'propertyActivitySearch':
        screen = (
          <PropertyActivitySearchScreen
            state={state}
            propertyId={route.propertyId}
            onBack={pop}
            onGoToProperty={
              route.propertyId
                ? () => goToProperty(route.propertyId!)
                : undefined
            }
            onOpenInteraction={(vendorId, interactionId, options) =>
              push({
                name: 'vendorInteraction',
                vendorId: vendorId || undefined,
                propertyId: options?.propertyId ?? route.propertyId,
                interactionId,
                searchQuery: options?.searchQuery,
                searchMatchField: options?.searchMatchField,
              })
            }
            onOpenEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onOpenItem={(itemId) => push({ name: 'item', itemId })}
            onOpenVendor={(vendorId) => push({ name: 'vendor', vendorId })}
          />
        );
        break;
      case 'propertyServices':
        screen = (
          <PropertyServicesScreen
            key={`propertyServices:${route.propertyId}:${route.roomId ?? ''}:${route.itemId ?? ''}`}
            state={state}
            propertyId={route.propertyId}
            initialRoomId={route.roomId}
            initialItemId={route.itemId}
            focusSearch={route.focusSearch}
            onBack={pop}
            onGoToProperty={() => goToProperty(route.propertyId)}
            onOpenEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onAddInteraction={() =>
              push({ name: 'vendorInteraction', propertyId: route.propertyId })
            }
            onAddServiceEvent={() =>
              push({ name: 'event', propertyId: route.propertyId })
            }
            onSearchAssets={() =>
              push({
                name: 'propertyAssets',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchInteractions={() =>
              push({
                name: 'propertyInteractions',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchActivity={() =>
              push({ name: 'propertyActivitySearch', propertyId: route.propertyId })
            }
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'propertyAssets':
        screen = (
          <PropertyAssetsScreen
            key={`propertyAssets:${route.propertyId}:${route.roomId ?? ''}:${route.itemTypeId ?? ''}`}
            state={state}
            propertyId={route.propertyId}
            initialRoomId={route.roomId}
            initialItemTypeId={route.itemTypeId}
            focusSearch={route.focusSearch}
            onBack={pop}
            onGoToProperty={() => goToProperty(route.propertyId)}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onAddInteraction={() =>
              push({ name: 'vendorInteraction', propertyId: route.propertyId })
            }
            onAddServiceEvent={() =>
              push({ name: 'event', propertyId: route.propertyId })
            }
            onSearchInteractions={() =>
              push({
                name: 'propertyInteractions',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchServiceHistory={() =>
              push({
                name: 'propertyServices',
                propertyId: route.propertyId,
                focusSearch: true,
              })
            }
            onSearchActivity={() =>
              push({ name: 'propertyActivitySearch', propertyId: route.propertyId })
            }
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'projectInteractions':
        screen = (
          <PropertyInteractionsScreen
            key={`project:${route.projectId}:${route.vendorId ?? ''}`}
            state={state}
            projectId={route.projectId}
            initialVendorId={route.vendorId}
            focusSearch={route.focusSearch}
            onBack={pop}
            onGoToProperty={() => {
              const project = projectById(state, route.projectId);
              if (project) goToProperty(project.propertyId);
            }}
            onOpenInteraction={(vendorId, interactionId, options) => {
              const interaction = vendorInteractionById(state, interactionId);
              const resolvedPropertyId = interaction
                ? propertyIdForInteraction(state, interaction)
                : undefined;
              push({
                name: 'vendorInteraction',
                vendorId: vendorId || undefined,
                // So Project/Vendor rows exist for search-hit highlight.
                propertyId: options?.searchQuery ? resolvedPropertyId : undefined,
                interactionId,
                searchQuery: options?.searchQuery,
                searchMatchField: options?.searchMatchField,
              });
            }}
            onOpenVendor={(vendorId) => push({ name: 'vendor', vendorId })}
            onAddInteraction={(propertyId, vendorId) =>
              push({
                name: 'vendorInteraction',
                propertyId,
                vendorId: vendorId || route.vendorId,
                projectId: route.projectId,
              })
            }
            onAddServiceEvent={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({ name: 'event', propertyId: project.propertyId });
            }}
            onSearchAssets={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({
                name: 'propertyAssets',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onSearchServiceHistory={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({
                name: 'propertyServices',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSearchActivity={() => {
              const propertyId = projectById(state, route.projectId)?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'room':
        screen = (
          <RoomDetailScreen
            key={route.roomId}
            state={state}
            roomId={route.roomId}
            onBack={pop}
            onNavigateRoom={(nextRoomId) =>
              void openRoom(nextRoomId, (id) => replaceTopRoute({ name: 'room', roomId: id }))
            }
            onGoToProperty={() => {
              const room = roomById(state, route.roomId);
              if (room) goToProperty(room.propertyId);
            }}
            onOpenServices={() =>
              push({ name: 'roomServices', roomId: route.roomId })
            }
            onSearchServiceHistory={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyServices',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onOpenAssets={() =>
              push({ name: 'roomAssets', roomId: route.roomId })
            }
            onSearchAssets={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyAssets',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchInteractions={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyInteractions',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onAddInteraction={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({ name: 'vendorInteraction', propertyId: room.propertyId });
            }}
            onAddServiceEvent={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'event',
                propertyId: room.propertyId,
                roomId: route.roomId,
              });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSearchActivity={() => {
              const propertyId = roomById(state, route.roomId)?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onEditEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onLogUpcomingService={(itemId, completeFromEventId) =>
              push({ name: 'event', itemId, completeFromEventId })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'roomServices':
        screen = (
          <PropertyServicesScreen
            key={`roomServices:${route.roomId}:${route.itemId ?? ''}`}
            state={state}
            roomId={route.roomId}
            initialItemId={route.itemId}
            focusSearch={route.focusSearch}
            onBack={pop}
            onGoToProperty={() => {
              const room = roomById(state, route.roomId);
              if (room) goToProperty(room.propertyId);
            }}
            onOpenEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onAddInteraction={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({ name: 'vendorInteraction', propertyId: room.propertyId });
            }}
            onAddServiceEvent={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'event',
                propertyId: room.propertyId,
                roomId: route.roomId,
              });
            }}
            onSearchAssets={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyAssets',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchInteractions={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyInteractions',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchActivity={() => {
              const propertyId = roomById(state, route.roomId)?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'roomAssets':
        screen = (
          <PropertyAssetsScreen
            key={`roomAssets:${route.roomId}:${route.itemTypeId ?? ''}`}
            state={state}
            roomId={route.roomId}
            initialItemTypeId={route.itemTypeId}
            focusSearch={route.focusSearch}
            onBack={pop}
            onGoToProperty={() => {
              const room = roomById(state, route.roomId);
              if (room) goToProperty(room.propertyId);
            }}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onAddInteraction={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({ name: 'vendorInteraction', propertyId: room.propertyId });
            }}
            onAddServiceEvent={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'event',
                propertyId: room.propertyId,
                roomId: route.roomId,
              });
            }}
            onSearchInteractions={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyInteractions',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchServiceHistory={() => {
              const room = roomById(state, route.roomId);
              if (!room) return;
              push({
                name: 'propertyServices',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchActivity={() => {
              const propertyId = roomById(state, route.roomId)?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'project':
        screen = (
          <ProjectDetailScreen
            key={route.projectId}
            state={state}
            projectId={route.projectId}
            onBack={pop}
            onNavigateProject={(nextProjectId) =>
              replaceTopRoute({ name: 'project', projectId: nextProjectId })
            }
            onGoToProperty={() => {
              const project = projectById(state, route.projectId);
              if (project) goToProperty(project.propertyId);
            }}
            onOpenInteractions={() =>
              push({ name: 'projectInteractions', projectId: route.projectId })
            }
            onSearchInteractions={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({
                name: 'propertyInteractions',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onOpenInteraction={(vendorId, interactionId) =>
              push({
                name: 'vendorInteraction',
                vendorId: vendorId || undefined,
                interactionId,
              })
            }
            onOpenVendor={(vendorId, options) =>
              push({ name: 'vendor', vendorId, startEditing: options?.startEditing })
            }
            onAddVendorInteraction={(vendorId) =>
              push({ name: 'vendorInteraction', vendorId })
            }
            onAddInteraction={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({
                name: 'vendorInteraction',
                propertyId: project.propertyId,
                projectId: route.projectId,
              });
            }}
            onAddServiceEvent={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({ name: 'event', propertyId: project.propertyId });
            }}
            onSearchAssets={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({
                name: 'propertyAssets',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onSearchServiceHistory={() => {
              const project = projectById(state, route.projectId);
              if (!project) return;
              push({
                name: 'propertyServices',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSearchActivity={() => {
              const propertyId = projectById(state, route.projectId)?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onOpenPunchItem={(punchItemId, options) =>
              push({
                name: 'projectPunchItem',
                projectId: route.projectId,
                punchItemId,
                startEditing: options?.startEditing,
              })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'vendor':
        screen = (
          <VendorDetailScreen
            key={route.vendorId}
            state={state}
            vendorId={route.vendorId}
            startEditing={route.startEditing}
            onBack={pop}
            onGoToProperty={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (project) goToProperty(project.propertyId);
            }}
            onOpenInteractions={() => {
              const vendor = vendorById(state, route.vendorId);
              if (!vendor) return;
              push({
                name: 'projectInteractions',
                projectId: vendor.projectId,
                vendorId: vendor.id,
              });
            }}
            onSearchInteractions={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (!project) return;
              push({
                name: 'propertyInteractions',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onAddInteraction={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (!vendor || !project) return;
              push({
                name: 'vendorInteraction',
                vendorId: route.vendorId,
                propertyId: project.propertyId,
                projectId: vendor.projectId,
              });
            }}
            onAddServiceEvent={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (!project) return;
              push({ name: 'event', propertyId: project.propertyId });
            }}
            onSearchAssets={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (!project) return;
              push({
                name: 'propertyAssets',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onSearchServiceHistory={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (!project) return;
              push({
                name: 'propertyServices',
                propertyId: project.propertyId,
                focusSearch: true,
              });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSearchActivity={() => {
              const propertyId = projectById(state, vendorById(state, route.vendorId)?.projectId ?? '')?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onEditInteraction={(interactionId) =>
              push({ name: 'vendorInteraction', vendorId: route.vendorId, interactionId })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'vendorInteraction':
        screen = (
          <AddEditVendorInteractionScreen
            key={`${route.propertyId ?? ''}:${route.projectId ?? ''}:${route.vendorId ?? ''}:${route.interactionId ?? ''}`}
            state={state}
            vendorId={route.vendorId}
            propertyId={route.propertyId}
            projectId={route.projectId}
            interactionId={route.interactionId}
            searchQuery={route.searchQuery}
            searchMatchField={route.searchMatchField}
            onBack={pop}
            onGoToProperty={() => {
              if (route.propertyId) {
                goToProperty(route.propertyId);
                return;
              }
              const vendor = route.vendorId ? vendorById(state, route.vendorId) : undefined;
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (project) goToProperty(project.propertyId);
            }}
            onCreated={(interactionId, meta) =>
              replaceTopRoute({
                name: 'vendorInteraction',
                vendorId: meta.vendorId,
                propertyId: meta.propertyId,
                interactionId,
              })
            }
            onSave={(next) => persist(next)}
            onAddInteraction={() => {
              const vendor = route.vendorId ? vendorById(state, route.vendorId) : undefined;
              const project = vendor
                ? projectById(state, vendor.projectId)
                : route.projectId
                  ? projectById(state, route.projectId)
                  : undefined;
              const propertyId =
                route.propertyId ??
                project?.propertyId;
              if (!propertyId) return;
              push({
                name: 'vendorInteraction',
                propertyId,
                projectId: route.projectId ?? project?.id,
                vendorId: route.vendorId,
              });
            }}
            onAddServiceEvent={() => {
              const vendor = route.vendorId ? vendorById(state, route.vendorId) : undefined;
              const project = vendor
                ? projectById(state, vendor.projectId)
                : route.projectId
                  ? projectById(state, route.projectId)
                  : undefined;
              const propertyId = route.propertyId ?? project?.propertyId;
              if (!propertyId) return;
              push({ name: 'event', propertyId });
            }}
            onSearchAssets={() => {
              const vendor = route.vendorId ? vendorById(state, route.vendorId) : undefined;
              const project = vendor
                ? projectById(state, vendor.projectId)
                : route.projectId
                  ? projectById(state, route.projectId)
                  : undefined;
              const propertyId = route.propertyId ?? project?.propertyId;
              if (!propertyId) return;
              push({
                name: 'propertyAssets',
                propertyId,
                focusSearch: true,
              });
            }}
            onSearchInteractions={() => {
              const vendor = route.vendorId ? vendorById(state, route.vendorId) : undefined;
              const project = vendor
                ? projectById(state, vendor.projectId)
                : route.projectId
                  ? projectById(state, route.projectId)
                  : undefined;
              const propertyId = route.propertyId ?? project?.propertyId;
              if (!propertyId) return;
              push({
                name: 'propertyInteractions',
                propertyId,
                focusSearch: true,
              });
            }}
            onSearchServiceHistory={() => {
              const vendor = route.vendorId ? vendorById(state, route.vendorId) : undefined;
              const project = vendor
                ? projectById(state, vendor.projectId)
                : route.projectId
                  ? projectById(state, route.projectId)
                  : undefined;
              const propertyId = route.propertyId ?? project?.propertyId;
              if (!propertyId) return;
              push({
                name: 'propertyServices',
                propertyId,
                focusSearch: true,
              });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSearchActivity={() => {
              const propertyId = route.propertyId ?? projectById(state, route.projectId ?? '')?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
          />
        );
        break;
      case 'propertyTodo':
        screen = (
          <AddEditPropertyTodoScreen
            key={route.todoId}
            state={state}
            propertyId={route.propertyId}
            todoId={route.todoId}
            startEditing={route.startEditing}
            kind={route.kind}
            onBack={pop}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'projectPunchItem':
        screen = (
          <AddEditProjectPunchItemScreen
            key={route.punchItemId}
            state={state}
            projectId={route.projectId}
            punchItemId={route.punchItemId}
            startEditing={route.startEditing}
            onBack={pop}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'item':
        screen = (
          <ItemDetailScreen
            key={route.itemId}
            state={state}
            itemId={route.itemId}
            startEditingSection={route.startEditingSection}
            onBack={pop}
            onNavigateItem={(nextItemId) => replaceTopRoute({ name: 'item', itemId: nextItemId })}
            onGoToProperty={() => {
              const item = state.items.find((entry) => entry.id === route.itemId);
              const room = item ? roomById(state, item.roomId) : undefined;
              if (room) goToProperty(room.propertyId);
            }}
            onAddInteraction={() => {
              const item = state.items.find((entry) => entry.id === route.itemId);
              const room = item ? roomById(state, item.roomId) : undefined;
              if (!room) return;
              push({ name: 'vendorInteraction', propertyId: room.propertyId });
            }}
            onAddServiceEvent={() => {
              push({ name: 'event', itemId: route.itemId });
            }}
            onSearchAssets={() => {
              const item = state.items.find((entry) => entry.id === route.itemId);
              const room = item ? roomById(state, item.roomId) : undefined;
              if (!room) return;
              push({
                name: 'propertyAssets',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchInteractions={() => {
              const item = state.items.find((entry) => entry.id === route.itemId);
              const room = item ? roomById(state, item.roomId) : undefined;
              if (!room) return;
              push({
                name: 'propertyInteractions',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onSearchServiceHistory={() => {
              const item = state.items.find((entry) => entry.id === route.itemId);
              const room = item ? roomById(state, item.roomId) : undefined;
              if (!room) return;
              push({
                name: 'propertyServices',
                propertyId: room.propertyId,
                focusSearch: true,
              });
            }}
            onOpenProject={(projectId) => push({ name: 'project', projectId })}
            onOpenItem={(itemId, startEditingSection) =>
              push({ name: 'item', itemId, startEditingSection })
            }
            onSearchActivity={() => {
              const propertyId = roomById(state, itemById(state, route.itemId)?.roomId ?? '')?.propertyId;
              if (!propertyId) return;
              push({ name: 'propertyActivitySearch', propertyId });
            }}
            onAddEvent={() => push({ name: 'event', itemId: route.itemId })}
            onEditEvent={(eventId) => push({ name: 'event', itemId: route.itemId, eventId })}
            onLogUpcomingService={(completeFromEventId) =>
              push({ name: 'event', itemId: route.itemId, completeFromEventId })
            }
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'event':
        screen = (
          <AddEditEventScreen
            key={`${route.itemId ?? ''}:${route.propertyId ?? ''}:${route.roomId ?? ''}:${route.eventId ?? ''}:${route.completeFromEventId ?? ''}`}
            state={state}
            itemId={route.itemId}
            propertyId={route.propertyId}
            roomId={route.roomId}
            eventId={route.eventId}
            completeFromEventId={route.completeFromEventId}
            onBack={pop}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      case 'transfer':
        screen = (
          <TransferScreen
            state={state}
            mode={route.mode}
            onBack={pop}
            onImport={(next) => void persist(next)}
            onSave={(next) => void persist(next)}
          />
        );
        break;
      default:
        screen = null;
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <TextScaleProvider scale={textScale} step={textScaleStep} setStep={setTextScaleStep}>
          <AppErrorBoundary onReset={resetApp}>{screen}</AppErrorBoundary>
        </TextScaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
