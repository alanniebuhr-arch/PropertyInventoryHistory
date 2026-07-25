import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextInput, useTextScaleControls } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppState, ProjectVendor, VendorContactMethod } from '../types';
import { ScreenBackHeader } from '../components/ScreenBackHeader';
import { ITEM_LIST_THUMB_SIZE, PropertyInteractionListRow } from '../components/ListRows';
import { InteractionsExportSheet } from '../components/InteractionsExportSheet';
import { sharedStyles, colors } from '../theme';
import { formatDate } from '../utils';
import {
  interactionsForProject,
  interactionsForProperty,
  photosForVendorInteraction,
  projectById,
  propertyById,
  vendorById,
} from '../storage';
import { firstPhotoUriForVendor } from '../vendorPhotos';
import {
  VENDOR_CONTACT_METHOD_OPTIONS,
  vendorContactMethodLabel,
} from '../vendorContactMethod';
import {
  buildInteractionsExportSnapshot,
  type InteractionsExportSnapshot,
} from '../interactionsExportContent';
import { shareViewAsPng } from '../shareViewImage';

export function PropertyInteractionsScreen(props: {
  state: AppState;
  propertyId?: string;
  projectId?: string;
  /** When opening from a vendor, pre-select that vendor in the filter. */
  initialVendorId?: string;
  onBack: () => void;
  onGoToProperty: () => void;
  onOpenInteraction: (vendorId: string, interactionId: string) => void;
  onOpenVendor: (vendorId: string) => void;
}) {
  const {
    state,
    propertyId,
    projectId,
    initialVendorId,
    onBack,
    onGoToProperty,
    onOpenInteraction,
    onOpenVendor,
  } = props;
  const insets = useSafeAreaInsets();
  const textScaleControls = useTextScaleControls();
  const exportRef = useRef<View>(null);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    () => initialVendorId ?? null
  );
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false);
  const [selectedContactMethod, setSelectedContactMethod] = useState<VendorContactMethod | null>(
    null
  );
  const [contactMethodMenuOpen, setContactMethodMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSnapshot, setExportSnapshot] = useState<InteractionsExportSnapshot | null>(null);

  const property = propertyId ? propertyById(state, propertyId) : undefined;
  const project = projectId ? projectById(state, projectId) : undefined;
  const propertyForScope =
    property ?? (project ? propertyById(state, project.propertyId) : undefined);

  const interactions = useMemo(() => {
    if (projectId) return interactionsForProject(state, projectId);
    if (propertyId) return interactionsForProperty(state, propertyId);
    return [];
  }, [state, propertyId, projectId]);

  const vendorsInList = useMemo(() => {
    const byId = new Map<string, ProjectVendor>();
    for (const interaction of interactions) {
      const vendor = vendorById(state, interaction.vendorId);
      if (vendor) byId.set(vendor.id, vendor);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [interactions, state]);

  const vendorScopedInteractions = useMemo(
    () =>
      selectedVendorId
        ? interactions.filter((interaction) => interaction.vendorId === selectedVendorId)
        : interactions,
    [interactions, selectedVendorId]
  );

  const contactMethodsInList = useMemo(() => {
    const present = new Set(vendorScopedInteractions.map((i) => i.contactMethod));
    return VENDOR_CONTACT_METHOD_OPTIONS.filter((opt) => present.has(opt.id));
  }, [vendorScopedInteractions]);

  useEffect(() => {
    if (
      selectedContactMethod &&
      !contactMethodsInList.some((method) => method.id === selectedContactMethod)
    ) {
      setSelectedContactMethod(null);
    }
  }, [contactMethodsInList, selectedContactMethod]);

  const showVendorPicker = vendorsInList.length > 1;
  const showContactMethodPicker = contactMethodsInList.length > 1;
  const showSearch = interactions.length >= 3;

  const effectiveVendorId =
    selectedVendorId && vendorsInList.some((v) => v.id === selectedVendorId)
      ? selectedVendorId
      : vendorsInList.length === 1
        ? vendorsInList[0]!.id
        : null;

  const singleVendor =
    effectiveVendorId != null
      ? vendorsInList.find((v) => v.id === effectiveVendorId) ??
        vendorById(state, effectiveVendorId)
      : undefined;
  const singleVendorMode =
    Boolean(singleVendor) && (vendorsInList.length === 1 || selectedVendorId != null);

  const filteredInteractions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return interactions.filter((interaction) => {
      if (selectedVendorId && interaction.vendorId !== selectedVendorId) return false;
      if (selectedContactMethod && interaction.contactMethod !== selectedContactMethod) {
        return false;
      }
      if (!query) return true;
      const vendor = vendorById(state, interaction.vendorId);
      if (!vendor) return false;
      const vendorProject = propertyId ? projectById(state, vendor.projectId) : undefined;
      const methodLabel = vendorContactMethodLabel(interaction.contactMethod);
      const dateLabel = formatDate(interaction.occurredAtISO);
      const haystack = [
        interaction.contactName,
        vendor.name,
        interaction.notes,
        methodLabel,
        dateLabel,
        vendorProject?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [
    interactions,
    propertyId,
    searchQuery,
    selectedContactMethod,
    selectedVendorId,
    state,
  ]);

  const subtitle = project?.name ?? property?.name;
  const scopeMissing = projectId ? !project : !property;

  const selectedVendorLabel =
    selectedVendorId == null
      ? 'All vendors'
      : (vendorsInList.find((v) => v.id === selectedVendorId)?.name ?? 'All vendors');

  const selectedContactMethodLabel =
    selectedContactMethod == null
      ? 'All methods'
      : vendorContactMethodLabel(selectedContactMethod);

  const runInteractionsExport = useCallback(() => {
    if (!subtitle) {
      Alert.alert('Share failed', 'Could not build interactions summary.');
      return;
    }
    const filterLines = [
      selectedVendorId != null ? `Vendor: ${selectedVendorLabel}` : undefined,
      selectedContactMethod != null ? `Method: ${selectedContactMethodLabel}` : undefined,
      searchQuery.trim() ? `Search: ${searchQuery.trim()}` : undefined,
    ].filter((line): line is string => Boolean(line));

    const snapshot = buildInteractionsExportSnapshot({
      state,
      interactions: filteredInteractions,
      scopeTitle: subtitle,
      scopeMetaLines:
        project && propertyForScope && project.name !== propertyForScope.name
          ? [propertyForScope.name]
          : [],
      filterLines,
    });
    setExportSnapshot(snapshot);
    setExporting(true);
  }, [
    filteredInteractions,
    project,
    propertyForScope,
    searchQuery,
    selectedContactMethod,
    selectedContactMethodLabel,
    selectedVendorId,
    selectedVendorLabel,
    state,
    subtitle,
  ]);

  useEffect(() => {
    if (!exportSnapshot || !exporting) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        await shareViewAsPng(exportRef, `Share ${exportSnapshot.title}`);
        if (!cancelled) {
          setExportSnapshot(null);
          setExporting(false);
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exportSnapshot, exporting]);

  if (scopeMissing || !subtitle) {
    return (
      <View style={[sharedStyles.screen, { paddingTop: insets.top, padding: 16 }]}>
        <Text style={sharedStyles.emptyText}>
          {projectId ? 'Project not found.' : 'Property not found.'}
        </Text>
        <Pressable onPress={onBack} style={sharedStyles.secondaryBtn}>
          <Text style={sharedStyles.secondaryBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[sharedStyles.screen, { paddingTop: insets.top }]}>
      <ScreenBackHeader onPress={onBack}>
        <View
          style={{
            marginLeft: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Pressable
            onPress={onGoToProperty}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Go to property"
            accessibilityHint="Opens the property page for these interactions."
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 42,
                height: 36,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                opacity: exporting ? 0.6 : 1,
              },
              pressed && !exporting && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="home" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={runInteractionsExport}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Share interactions"
            accessibilityHint="Creates an image of the current interactions list and opens the share sheet."
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 42,
                height: 36,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                opacity: exporting ? 0.6 : 1,
              },
              pressed && !exporting && { opacity: 0.8 },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="ios-share" size={22} color={colors.primary} />
            )}
          </Pressable>
          <Pressable
            onPress={() => setMenuOpen(true)}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Interactions options"
            accessibilityHint="Opens actions like text size."
            hitSlop={6}
            style={({ pressed }) => ({
              padding: 4,
              opacity: exporting ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="settings" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </ScreenBackHeader>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[sharedStyles.content, { paddingTop: 0, paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={sharedStyles.title}>Interactions</Text>
        <Text style={sharedStyles.subtitle}>{subtitle}</Text>

        {showVendorPicker ? (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Vendor</Text>
            <Pressable
              onPress={() => {
                setContactMethodMenuOpen(false);
                setVendorMenuOpen((open) => !open);
              }}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter by vendor"
              accessibilityHint="Opens a list of vendors"
              accessibilityState={{ expanded: vendorMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedVendorLabel}
              </Text>
              <MaterialIcons
                name={vendorMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {vendorMenuOpen ? (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedVendorId(null);
                    setVendorMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedVendorId == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All vendors</Text>
                  {selectedVendorId == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {vendorsInList.map((vendor, index) => {
                  const selected = selectedVendorId === vendor.id;
                  return (
                    <Pressable
                      key={vendor.id}
                      onPress={() => {
                        setSelectedVendorId(vendor.id);
                        setVendorMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < vendorsInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {vendor.name}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showContactMethodPicker ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>How contacted</Text>
            <Pressable
              onPress={() => {
                setVendorMenuOpen(false);
                setContactMethodMenuOpen((open) => !open);
              }}
              style={({ pressed }) => [
                sharedStyles.input,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter by how contacted"
              accessibilityHint="Opens a list of contact methods"
              accessibilityState={{ expanded: contactMethodMenuOpen }}
            >
              <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {selectedContactMethodLabel}
              </Text>
              <MaterialIcons
                name={contactMethodMenuOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
            {contactMethodMenuOpen ? (
              <View
                style={{
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => {
                    setSelectedContactMethod(null);
                    setContactMethodMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: pressed ? colors.bg : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedContactMethod == null }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>All methods</Text>
                  {selectedContactMethod == null ? (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
                {contactMethodsInList.map((method, index) => {
                  const selected = selectedContactMethod === method.id;
                  return (
                    <Pressable
                      key={method.id}
                      onPress={() => {
                        setSelectedContactMethod(method.id);
                        setContactMethodMenuOpen(false);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          borderBottomWidth: index < contactMethodsInList.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: pressed ? colors.bg : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={{ fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                        {method.label}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check" size={20} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showSearch ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={sharedStyles.fieldLabel}>Search</Text>
            <TextInput
              style={sharedStyles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Contact, company, notes…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        ) : null}

        {interactions.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No interactions yet.</Text>
        ) : filteredInteractions.length === 0 ? (
          <Text style={[sharedStyles.emptyText, { marginTop: 24 }]}>No matching interactions.</Text>
        ) : (
          <View style={{ marginTop: 12, gap: 10 }}>
            {singleVendorMode && singleVendor ? (
              <Pressable
                onPress={() => onOpenVendor(singleVendor.id)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 4,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open vendor ${singleVendor.name}`}
              >
                {firstPhotoUriForVendor(state, singleVendor) ? (
                  <Image
                    source={{ uri: firstPhotoUriForVendor(state, singleVendor) }}
                    style={{
                      width: ITEM_LIST_THUMB_SIZE,
                      height: ITEM_LIST_THUMB_SIZE,
                      borderRadius: 2,
                      backgroundColor: colors.photoPlaceholder,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: ITEM_LIST_THUMB_SIZE,
                      height: ITEM_LIST_THUMB_SIZE,
                      borderRadius: 2,
                      backgroundColor: colors.photoPlaceholder,
                    }}
                  />
                )}
                <Text style={[sharedStyles.cardTitle, { flex: 1 }]} numberOfLines={2}>
                  {singleVendor.name}
                </Text>
              </Pressable>
            ) : null}

            {filteredInteractions.map((interaction) => {
              const vendor = vendorById(state, interaction.vendorId);
              if (!vendor) return null;
              const photo = photosForVendorInteraction(state, interaction.id)[0];
              const vendorProject = propertyId ? projectById(state, vendor.projectId) : undefined;
              return (
                <PropertyInteractionListRow
                  key={interaction.id}
                  projectName={vendorProject?.name}
                  contactName={interaction.contactName}
                  companyName={vendor.name}
                  companyPhotoUri={firstPhotoUriForVendor(state, vendor)}
                  hideCompanyPhoto={singleVendorMode}
                  dateLabel={formatDate(interaction.occurredAtISO)}
                  methodLabel={vendorContactMethodLabel(interaction.contactMethod)}
                  notes={interaction.notes}
                  photoUri={photo?.localUri}
                  onPress={() => onOpenInteraction(interaction.vendorId, interaction.id)}
                  onPressVendor={() => onOpenVendor(interaction.vendorId)}
                />
              );
            })}
          </View>
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
                Interactions
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
              onPress={() => setMenuOpen(false)}
              style={({ pressed }) => [
                sharedStyles.secondaryBtn,
                { marginTop: 8 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={exportSnapshot != null} transparent animationType="none" onRequestClose={() => {}}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
          pointerEvents="none"
        >
          <View ref={exportRef} collapsable={false}>
            {exportSnapshot ? <InteractionsExportSheet snapshot={exportSnapshot} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
