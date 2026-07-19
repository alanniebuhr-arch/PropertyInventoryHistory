import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { AppState } from './src/types';
import { EMPTY_APP_STATE } from './src/types';
import { loadAppState, saveAppState, roomById } from './src/storage';
import { loadPropertyUpcomingHorizon } from './src/upcomingHorizonPrefs';
import {
  authenticateForRoom,
  isRoomUnlocked,
  markRoomUnlocked,
  setupRoomAuthSessionReset,
} from './src/roomAuth';
import { HomeScreen } from './src/screens/HomeScreen';
import { PropertyDetailScreen } from './src/screens/PropertyDetailScreen';
import { RoomDetailScreen } from './src/screens/RoomDetailScreen';
import { ItemDetailScreen } from './src/screens/ItemDetailScreen';
import { AddEditEventScreen } from './src/screens/AddEditEventScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import type { ApplianceEditingSection } from './src/components/ApplianceDisplayView';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { sharedStyles } from './src/theme';

type Route =
  | { name: 'home' }
  | { name: 'property'; propertyId: string }
  | { name: 'room'; roomId: string }
  | { name: 'item'; itemId: string; startEditingSection?: ApplianceEditingSection }
  | { name: 'event'; itemId: string; eventId?: string; completeFromEventId?: string }
  | { name: 'transfer' };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>(EMPTY_APP_STATE);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const [bootKey, setBootKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const [s] = await Promise.all([loadAppState(), loadPropertyUpcomingHorizon()]);
        if (!cancelled) setState(s);
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
    setState(next);
    await saveAppState(next);
  }, []);

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
            onEditEvent={(itemId, eventId) => push({ name: 'event', itemId, eventId })}
            onLogUpcomingService={(itemId, completeFromEventId) =>
              push({ name: 'event', itemId, completeFromEventId })
            }
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
      case 'item':
        screen = (
          <ItemDetailScreen
            key={route.itemId}
            state={state}
            itemId={route.itemId}
            startEditingSection={route.startEditingSection}
            onBack={pop}
            onNavigateItem={(nextItemId) => replaceTopRoute({ name: 'item', itemId: nextItemId })}
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
        <AppErrorBoundary onReset={resetApp}>{screen}</AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
