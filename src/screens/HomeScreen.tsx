import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { AppState, Property } from '../types';
import { PropertyListRow } from '../components/ListRows';
import {
  ToolbarNewSearchControls,
  type PropertyGearNavItem,
} from '../components/PropertyGearNavItems';
import { UpcomingReminderCard } from '../components/UpcomingServiceCard';
import { sharedStyles, colors } from '../theme';
import { uid, nowISO } from '../utils';
import {
  itemById,
  photosForEvent,
  photosForPropertyTodo,
  photosForVendorInteraction,
  projectsForProperty,
  todosForProperty,
  vendorById,
} from '../storage';
import { propertyCoverPhotoUri } from '../propertyPhotos';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import { overdueCountForProperty } from '../itemMaintenance';
import { itemDisplayLabel } from '../itemCatalog';
import { vendorContactMethodLabel } from '../vendorContactMethod';
import {
  upcomingHorizonLabel,
  upcomingReminderCountForProperty,
  upcomingReminderEntriesForProperty,
  UPCOMING_HORIZON_OPTIONS,
  type UpcomingHorizon,
} from '../eventRecurrence';
import {
  getPropertyUpcomingHorizon,
  loadPropertyUpcomingHorizon,
  setPropertyUpcomingHorizon,
} from '../upcomingHorizonPrefs';
import { applyPropertyTemplate, type DwellingType } from '../propertyTemplate';
import { useKeyboardDoneAccessory } from '../components/KeyboardDoneAccessory';
import { useKeyboardSheetScroll } from '../components/useKeyboardSheetScroll';

function DwellingPicker(props: {
  value: DwellingType;
  onChange: (value: DwellingType) => void;
}) {
  const { value, onChange } = props;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
      {(
        [
          { id: 'house' as const, label: 'House' },
          { id: 'apartment' as const, label: 'Apartment' },
        ] as const
      ).map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              sharedStyles.secondaryBtn,
              {
                flex: 1,
                marginTop: 0,
                paddingVertical: 10,
                backgroundColor: selected ? colors.primary : colors.card,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                sharedStyles.secondaryBtnText,
                { color: selected ? '#f7f5f1' : colors.text, textAlign: 'center' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function dueSoonPeriodLabel(horizon: UpcomingHorizon): string {
  switch (horizon) {
    case '1m':
      return 'within 1 month';
    case '3m':
      return 'within 3 months';
    case '6m':
      return 'within 6 months';
    case '1y':
      return 'within 1 year';
    case 'all':
      return '(all time)';
  }
}

export function HomeScreen(props: {
  state: AppState;
  onOpenProperty: (propertyId: string) => void;
  onOpenInteractions: () => void;
  onSearchInteractions: () => void;
  onOpenServices: () => void;
  onSearchServiceHistory: () => void;
  onOpenAssets: () => void;
  onSearchAssets: () => void;
  onSearchActivity: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenEvent: (itemId: string, eventId: string) => void;
  onOpenTodo: (propertyId: string, todoId: string) => void;
  onOpenInteraction: (
    vendorId: string | undefined,
    interactionId: string,
    propertyId: string
  ) => void;
  onSave: (state: AppState) => void;
}) {
  const {
    state,
    onOpenProperty,
    onSearchInteractions,
    onSearchServiceHistory,
    onSearchAssets,
    onSearchActivity,
    onOpenExport,
    onOpenImport,
    onOpenEvent,
    onOpenTodo,
    onOpenInteraction,
    onSave,
  } = props;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [dwellingType, setDwellingType] = useState<DwellingType>('house');
  const [useDefaultLayout, setUseDefaultLayout] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [upcomingHorizon, setUpcomingHorizon] = useState<UpcomingHorizon>(
    getPropertyUpcomingHorizon
  );
  const [expandedReminderPropertyId, setExpandedReminderPropertyId] = useState<string | null>(
    null
  );
  const textScaleControls = useTextScaleControls();
  const nameInputRef = useRef<RNTextInput>(null);
  const addressInputRef = useRef<RNTextInput>(null);
  const {
    scrollRef: propertySheetScrollRef,
    onScroll: onPropertySheetScroll,
    measureAndScroll: measurePropertySheetField,
    contentBottomInset: propertySheetBottomInset,
  } = useKeyboardSheetScroll();
  const keyboardDone = useKeyboardDoneAccessory({
    id: 'homeNewPropertyDone',
    variant: 'overlay',
  });

  useEffect(() => {
    let cancelled = false;
    void loadPropertyUpcomingHorizon().then((horizon) => {
      if (!cancelled) setUpcomingHorizon(horizon);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function openAdd() {
    setName('');
    setAddress('');
    setDwellingType('house');
    setUseDefaultLayout(true);
    setModalOpen(true);
  }

  function runMenuAction(action: () => void) {
    setMenuOpen(false);
    setTimeout(action, 50);
  }

  function saveProperty() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a property or unit name.');
      return;
    }
    const property: Property = {
      id: uid('prop'),
      name: trimmed,
      address: address.trim() || undefined,
      createdAtISO: nowISO(),
    };
    let nextState: AppState = { ...state, properties: [...state.properties, property] };
    if (useDefaultLayout) {
      nextState = applyPropertyTemplate(nextState, property.id, dwellingType);
    }
    onSave(nextState);
    setModalOpen(false);
  }

  function selectUpcomingHorizon(horizon: UpcomingHorizon) {
    setUpcomingHorizon(horizon);
    void setPropertyUpcomingHorizon(horizon);
  }

  function openUpcomingHorizonPicker() {
    Alert.alert(
      'Show upcoming through',
      undefined,
      [
        ...UPCOMING_HORIZON_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => selectUpcomingHorizon(opt.id),
        })),
        { text: 'Done', style: 'cancel' as const },
      ]
    );
  }

  const sorted = [...state.properties].sort((a, b) => a.name.localeCompare(b.name));
  const periodLabel = dueSoonPeriodLabel(upcomingHorizon);
  const hasInteractions = state.vendorInteractions.length > 0;
  const hasServices = state.events.length > 0;
  const hasAssets = state.items.length > 0;

  const homeNewItems: PropertyGearNavItem[] = [
    {
      key: 'property',
      prefix: 'New',
      keyword: 'Property',
      onPress: () => runMenuAction(openAdd),
    },
  ];
  const homeSearchItems: PropertyGearNavItem[] = [
    ...(hasAssets
      ? [
          {
            key: 'searchAssets',
            prefix: 'Search' as const,
            keyword: 'Assets',
            icon: 'inventory' as const,
            helpText: 'Things',
            onPress: () => runMenuAction(onSearchAssets),
          },
        ]
      : []),
    ...(hasInteractions
      ? [
          {
            key: 'searchInteractions',
            prefix: 'Search' as const,
            keyword: 'Interactions',
            icon: 'forum' as const,
            helpText: 'Conversations',
            onPress: () => runMenuAction(onSearchInteractions),
          },
        ]
      : []),
    ...(hasServices
      ? [
          {
            key: 'searchServices',
            prefix: 'Search' as const,
            keyword: 'Service Events',
            icon: 'handyman' as const,
            helpText: 'on Assets',
            onPress: () => runMenuAction(onSearchServiceHistory),
          },
        ]
      : []),
    ...(hasAssets || hasInteractions || hasServices
      ? [
          {
            key: 'searchActivity',
            prefix: 'Search' as const,
            keyword: 'All',
            icon: 'history' as const,
            onPress: () => runMenuAction(onSearchActivity),
          },
        ]
      : []),
  ];

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <View style={sharedStyles.screenHeader}>
        <View style={[sharedStyles.headerRow, { marginBottom: 0, alignItems: 'flex-start' }]}>
          <Text style={[sharedStyles.title, { flex: 1, fontSize: 22 }]}>
            Property Asset Manager
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ToolbarNewSearchControls
              title="Property Asset Manager"
              newItems={homeNewItems}
              searchItems={homeSearchItems}
            />
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Home options"
              accessibilityHint="Opens actions like export or import data."
              hitSlop={6}
              style={({ pressed }) => ({
                padding: 4,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons name="settings" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 2,
          }}
        >
          <Text style={[sharedStyles.subtitle, { marginBottom: 0, flex: 1 }]}>
            Manage assets and projects on your properties.
          </Text>
          <Pressable
            onPress={openUpcomingHorizonPicker}
            accessibilityRole="button"
            accessibilityLabel={`Upcoming range: ${upcomingHorizonLabel(upcomingHorizon)}`}
            accessibilityHint="Opens a list of time ranges for upcoming reminder counts."
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: 2,
              flexShrink: 0,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
              {upcomingHorizonLabel(upcomingHorizon)}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={[sharedStyles.content, { paddingTop: 0 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <Text style={[sharedStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
            Properties
          </Text>
          <Pressable
            onPress={openAdd}
            accessibilityRole="button"
            accessibilityLabel="New Property"
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="add" size={24} color={colors.primary} />
          </Pressable>
        </View>
        {sorted.length === 0 ? (
          <Text style={sharedStyles.emptyText}>
            No properties yet. Add a rental unit or property to get started.
          </Text>
        ) : (
          sorted.map((p, index) => {
            const projects = projectsForProperty(state, p.id);
            const todos = todosForProperty(state, p.id);
            const remindersExpanded = expandedReminderPropertyId === p.id;
            const reminderEntries = remindersExpanded
              ? upcomingReminderEntriesForProperty(state, p.id, upcomingHorizon)
              : [];
            return (
              <PropertyListRow
                key={p.id}
                name={p.name}
                address={p.address}
                thumbnailUri={propertyCoverPhotoUri(state, p)}
                projectCount={projects.length}
                todoCount={todos.length}
                overdueCount={overdueCountForProperty(state, p.id)}
                reminderCount={upcomingReminderCountForProperty(
                  state,
                  p.id,
                  upcomingHorizon
                )}
                dueSoonPeriodLabel={periodLabel}
                striped={index % 2 === 1}
                remindersExpanded={remindersExpanded}
                onToggleReminders={() =>
                  setExpandedReminderPropertyId((current) =>
                    current === p.id ? null : p.id
                  )
                }
                onPress={() => onOpenProperty(p.id)}
              >
                {reminderEntries.map((entry) => {
                  if (entry.kind === 'event') {
                    const e = entry.event;
                    const item = itemById(state, e.itemId);
                    const eventPhotos = photosForEvent(state, e.id);
                    return (
                      <UpcomingReminderCard
                        key={`event:${e.id}`}
                        title={
                          item
                            ? `${itemDisplayLabel(item)}${e.title?.trim() ? ` · ${e.title.trim()}` : ''}`
                            : e.title?.trim() || 'Service'
                        }
                        dueAtISO={entry.dueAt}
                        notes={e.notes}
                        thumbnailUri={eventPhotos[0]?.localUri}
                        onPress={() => onOpenEvent(e.itemId, e.id)}
                        noun="service"
                      />
                    );
                  }
                  if (entry.kind === 'interaction') {
                    const interaction = entry.interaction;
                    const vendor = interaction.vendorId
                      ? vendorById(state, interaction.vendorId)
                      : undefined;
                    const interactionPhotos = photosForVendorInteraction(
                      state,
                      interaction.id
                    );
                    const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
                    const notesParts = [methodLabel, interaction.notes?.trim()].filter(Boolean);
                    return (
                      <UpcomingReminderCard
                        key={`interaction:${interaction.id}`}
                        title={
                          vendor?.name?.trim() ||
                          interaction.contactName?.trim() ||
                          'Interaction'
                        }
                        dueAtISO={interaction.occurredAtISO}
                        notes={notesParts.join(' · ') || undefined}
                        thumbnailUri={
                          interactionPhotos[0]?.localUri ??
                          (vendor ? firstPhotoUriForVendor(state, vendor) : undefined)
                        }
                        onPress={() =>
                          onOpenInteraction(interaction.vendorId, interaction.id, p.id)
                        }
                        noun="interaction"
                        important={interaction.important === true}
                      />
                    );
                  }
                  const todo = entry.todo;
                  const todoPhotos = photosForPropertyTodo(state, todo.id);
                  return (
                    <UpcomingReminderCard
                      key={`todo:${todo.id}`}
                      title={todo.title}
                      dueAtISO={todo.dueAtISO}
                      notes={todo.notes}
                      thumbnailUri={todoPhotos[0]?.localUri}
                      onPress={() => onOpenTodo(p.id, todo.id)}
                      noun="to-do"
                    />
                  );
                })}
              </PropertyListRow>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable style={[sharedStyles.card, { marginBottom: 0 }]} onPress={() => {}}>
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: colors.card,
                  fontSize: 15,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                Property Asset Manager
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (!textScaleControls.canMakeLarger) return;
                textScaleControls.makeLarger();
              }}
              disabled={!textScaleControls.canMakeLarger}
              accessibilityRole="button"
              accessibilityLabel="Text larger"
              accessibilityState={{ disabled: !textScaleControls.canMakeLarger }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: !textScaleControls.canMakeLarger ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Text larger
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!textScaleControls.canMakeSmaller) return;
                textScaleControls.makeSmaller();
              }}
              disabled={!textScaleControls.canMakeSmaller}
              accessibilityRole="button"
              accessibilityLabel="Text smaller"
              accessibilityState={{ disabled: !textScaleControls.canMakeSmaller }}
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: !textScaleControls.canMakeSmaller ? 0.35 : pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Text smaller
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(onOpenImport)}
              accessibilityRole="button"
              accessibilityLabel="Import data"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Import data
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runMenuAction(onOpenExport)}
              accessibilityRole="button"
              accessibilityLabel="Export data"
              style={({ pressed }) => ({
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: colors.hairline,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
                Export data
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={({ pressed }) => [
                sharedStyles.secondaryBtn,
                { marginTop: 8 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
              onPress={() => setModalOpen(false)}
            >
              <Pressable
                style={{
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderBottomWidth: 0,
                  borderColor: colors.border,
                  maxHeight: windowHeight * 0.92,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: insets.bottom + 20,
                }}
                onPress={() => {}}
              >
                <ScrollView
                  ref={propertySheetScrollRef}
                  onScroll={onPropertySheetScroll}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  bounces={false}
                  contentContainerStyle={{ paddingBottom: propertySheetBottomInset }}
                >
                  <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>New property</Text>
                  <Text style={sharedStyles.fieldLabel}>Name</Text>
                  <TextInput
                    ref={nameInputRef}
                    value={name}
                    onChangeText={setName}
                    placeholder="Unit 1, Main Street duplex…"
                    style={sharedStyles.input}
                    {...keyboardDone.getTextInputProps({
                      onFocus: () => measurePropertySheetField(nameInputRef.current),
                    })}
                  />
                  <Text style={sharedStyles.fieldLabel}>Address (optional)</Text>
                  <TextInput
                    ref={addressInputRef}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="123 Main St"
                    style={sharedStyles.input}
                    {...keyboardDone.getTextInputProps({
                      onFocus: () => measurePropertySheetField(addressInputRef.current),
                    })}
                  />
                  <Text style={sharedStyles.fieldLabel}>Dwelling type</Text>
                  <DwellingPicker value={dwellingType} onChange={setDwellingType} />
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      marginBottom: 4,
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[sharedStyles.fieldLabel, { marginTop: 0 }]}>
                        Use default layout
                      </Text>
                      <Text style={sharedStyles.cardMeta}>
                        Adds standard rooms and inventory assets (from 24 Cedar Road layout).
                      </Text>
                    </View>
                    <Switch value={useDefaultLayout} onValueChange={setUseDefaultLayout} />
                  </View>
                  <Pressable
                    onPress={saveProperty}
                    style={({ pressed }) => [
                      sharedStyles.primaryBtn,
                      pressed && sharedStyles.primaryBtnPressed,
                    ]}
                  >
                    <Text style={sharedStyles.primaryBtnText}>Save</Text>
                  </Pressable>
                </ScrollView>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
          {keyboardDone.accessory}
        </View>
      </Modal>
    </View>
  );
}
