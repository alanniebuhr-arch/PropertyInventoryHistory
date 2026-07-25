import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { AppState } from './src/types';
import { EMPTY_APP_STATE } from './src/types';
import { loadAppState, saveAppState, roomById, projectById, vendorById } from './src/storage';
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
import { PropertyInteractionsScreen } from './src/screens/PropertyInteractionsScreen';
import { ItemDetailScreen } from './src/screens/ItemDetailScreen';
import { AddEditEventScreen } from './src/screens/AddEditEventScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import type { ApplianceEditingSection } from './src/components/ApplianceDisplayView';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { sharedStyles } from './src/theme';

type Route =
  | { name: 'home' }
  | { name: 'property'; propertyId: string }
  | { name: 'propertyInteractions'; propertyId: string; vendorId?: string }
  | { name: 'projectInteractions'; projectId: string; vendorId?: string }
  | { name: 'room'; roomId: string }
  | { name: 'project'; projectId: string }
  | { name: 'vendor'; vendorId: string; startEditing?: boolean }
  | { name: 'vendorInteraction'; vendorId: string; interactionId?: string }
  | {
      name: 'propertyTodo';
      propertyId: string;
      todoId: string;
      startEditing?: boolean;
      kind?: 'todo' | 'idea';
    }
  | { name: 'item'; itemId: string; startEditingSection?: ApplianceEditingSection }
  | { name: 'event'; itemId: string; eventId?: string; completeFromEventId?: string }
  | { name: 'transfer' };

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
            onOpenTransfer={() => push({ name: 'transfer' })}
            onSave={(next) => void persist(next)}
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
            onOpenTodo={(todoId, options) =>
              push({
                name: 'propertyTodo',
                propertyId: route.propertyId,
                todoId,
                startEditing: options?.startEditing,
                kind: options?.kind,
              })
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
            onBack={pop}
            onGoToProperty={() => goToProperty(route.propertyId)}
            onOpenInteraction={(vendorId, interactionId) =>
              push({ name: 'vendorInteraction', vendorId, interactionId })
            }
            onOpenVendor={(vendorId) => push({ name: 'vendor', vendorId })}
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
            onBack={pop}
            onGoToProperty={() => {
              const project = projectById(state, route.projectId);
              if (project) goToProperty(project.propertyId);
            }}
            onOpenInteraction={(vendorId, interactionId) =>
              push({ name: 'vendorInteraction', vendorId, interactionId })
            }
            onOpenVendor={(vendorId) => push({ name: 'vendor', vendorId })}
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
            onOpenVendor={(vendorId, options) =>
              push({ name: 'vendor', vendorId, startEditing: options?.startEditing })
            }
            onAddVendorInteraction={(vendorId) =>
              push({ name: 'vendorInteraction', vendorId })
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
            onAddInteraction={() =>
              push({ name: 'vendorInteraction', vendorId: route.vendorId })
            }
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
            key={`${route.vendorId}:${route.interactionId ?? ''}`}
            state={state}
            vendorId={route.vendorId}
            interactionId={route.interactionId}
            onBack={pop}
            onGoToProperty={() => {
              const vendor = vendorById(state, route.vendorId);
              const project = vendor ? projectById(state, vendor.projectId) : undefined;
              if (project) goToProperty(project.propertyId);
            }}
            onCreated={(interactionId) =>
              replaceTopRoute({
                name: 'vendorInteraction',
                vendorId: route.vendorId,
                interactionId,
              })
            }
            onSave={(next) => persist(next)}
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
            key={`${route.itemId}:${route.eventId ?? ''}:${route.completeFromEventId ?? ''}`}
            state={state}
            itemId={route.itemId}
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
            onBack={pop}
            onImport={(next) => void persist(next)}
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
