import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { AppState, ApplianceDetails, ItemPhoto } from '../types';
import { EditableApplianceSection } from './EditableApplianceSection';
import { AddPhotoPlaceholder } from './PhotoSlot';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';
import { sharedStyles, colors } from '../theme';
import { formatDate } from '../utils';
import { pickImagesFromLibrary } from '../pickImages';
import {
  APPLIANCE_EXTRA_PHOTOS_SHORT_LABEL,
  APPLIANCE_PHOTO_SLOTS,
  applianceHasIdentityInfo,
  applianceHasPurchaseInfo,
  applianceHasRepairInfo,
  type AppliancePhotoSlotKey,
} from '../applianceSlots';
import {
  addApplianceExtraPhotos,
  applianceExtraPhotos,
  applianceSlotPhotoUri,
  removeApplianceExtraPhoto,
  setApplianceExtraPhotoCaption,
  setApplianceSlotPhoto,
} from '../appliancePhotos';
import {
  ApplianceIdentityFields,
  AppliancePurchaseFields,
  ApplianceRepairFields,
} from '../screens/itemDetails/ApplianceForm';

export type ApplianceEditingSection = 'appliance' | 'purchase' | 'repair';

function extraPhotoLabel(photo: ItemPhoto): string | undefined {
  const caption = photo.caption?.trim();
  return caption || undefined;
}

function formatPurchaseDate(stored?: string): string | undefined {
  if (!stored) return undefined;
  const dateOnly = stored.match(/^(\d{4}-\d{2}-\d{2})$/)?.[1];
  return formatDate(dateOnly ? `${dateOnly}T12:00:00.000Z` : stored);
}

/** Fits longest appliance card labels (e.g. "Where purchased") on one line. */
const DISPLAY_LABEL_COLUMN_WIDTH = 136;

function DisplayRow(props: { label: string; value?: string }) {
  const value = props.value?.trim() || 'Not set';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 6,
      }}
    >
      <Text
        style={[
          sharedStyles.fieldLabel,
          {
            marginTop: 0,
            marginBottom: 0,
            width: DISPLAY_LABEL_COLUMN_WIDTH,
            flexShrink: 0,
          },
        ]}
        numberOfLines={1}
      >
        {props.label}
      </Text>
      <Text
        style={[
          sharedStyles.cardMeta,
          { color: colors.text, fontSize: 15, flex: 1, textAlign: 'left', marginTop: 0 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function ApplianceDisplayView(props: {
  state: AppState;
  details: ApplianceDetails;
  itemId: string;
  onSave: (state: AppState) => void;
  onDetailsChange: (details: ApplianceDetails) => void;
  initialEditingSection?: ApplianceEditingSection;
}) {
  const { state, details, itemId, onSave, onDetailsChange, initialEditingSection } = props;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [editingSection, setEditingSection] = useState<ApplianceEditingSection | null>(
    initialEditingSection ?? null
  );
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState('');
  const [labelingPhoto, setLabelingPhoto] = useState<ItemPhoto | null>(null);
  const [labelDraft, setLabelDraft] = useState('');

  const filledPhotos = APPLIANCE_PHOTO_SLOTS.map((slot) => ({
    ...slot,
    uri: applianceSlotPhotoUri(state, details, slot.key),
  }));
  const extraPhotos = applianceExtraPhotos(state, itemId, details);

  const imageMaxH = height - insets.top - insets.bottom - 120;

  function openViewer(uri: string, label: string) {
    setViewerUri(uri);
    setViewerLabel(label);
  }

  async function pickPhoto(slotKey: AppliancePhotoSlotKey) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const next = await setApplianceSlotPhoto(state, itemId, slotKey, result.assets[0].uri);
      onSave(next);
    }
  }

  async function takePhoto(slotKey: AppliancePhotoSlotKey) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take pictures.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      const next = await setApplianceSlotPhoto(state, itemId, slotKey, result.assets[0].uri);
      onSave(next);
    }
  }

  function promptAddPhoto(slotKey: AppliancePhotoSlotKey) {
    Alert.alert('Add photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photo', onPress: () => void pickPhoto(slotKey) },
      { text: 'Take photo', onPress: () => void takePhoto(slotKey) },
    ]);
  }

  async function pickMorePhotos() {
    const uris = await pickImagesFromLibrary();
    if (uris.length > 0) {
      const next = await addApplianceExtraPhotos(state, itemId, uris);
      onSave(next);
    }
  }

  async function takeMorePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take pictures.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      const next = await addApplianceExtraPhotos(state, itemId, [result.assets[0].uri]);
      onSave(next);
    }
  }

  function promptAddMore() {
    Alert.alert('Add photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photos', onPress: () => void pickMorePhotos() },
      { text: 'Take photo', onPress: () => void takeMorePhoto() },
    ]);
  }

  function removeExtraPhoto(photoId: string) {
    void removeApplianceExtraPhoto(state, itemId, photoId).then(onSave);
  }

  function openLabelEditor(photo: ItemPhoto) {
    setLabelingPhoto(photo);
    setLabelDraft(photo.caption ?? '');
  }

  function closeLabelEditor() {
    setLabelingPhoto(null);
    setLabelDraft('');
  }

  function savePhotoLabel() {
    if (!labelingPhoto) return;
    onSave(setApplianceExtraPhotoCaption(state, labelingPhoto.id, labelDraft));
    closeLabelEditor();
  }

  function promptExtraPhotoAction(photo: ItemPhoto) {
    Alert.alert('Photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Label the photo', onPress: () => openLabelEditor(photo) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeExtraPhoto(photo.id),
      },
    ]);
  }

  function updateDetails(next: ApplianceDetails) {
    onDetailsChange(next);
  }

  function openSection(section: ApplianceEditingSection) {
    setEditingSection(section);
  }

  function closeSection() {
    setEditingSection(null);
  }

  return (
    <View>
      <Text style={sharedStyles.sectionTitle}>Photos</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, gap: 10 }}
        style={{ marginBottom: 12 }}
      >
        {filledPhotos.map((slot) => (
          <View key={slot.key} style={{ width: 80, alignItems: 'center' }}>
            {slot.uri ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openViewer(slot.uri!, slot.label)}
                accessibilityRole="button"
                accessibilityLabel={`View ${slot.label}`}
              >
                <Image
                  source={{ uri: slot.uri }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    backgroundColor: colors.border,
                  }}
                />
              </TouchableOpacity>
            ) : (
              <Pressable
                onPress={() => promptAddPhoto(slot.key)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${slot.label}`}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  backgroundColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AddPhotoPlaceholder size={24} />
              </Pressable>
            )}
            <Text
              style={[sharedStyles.cardMeta, { fontSize: 11, marginTop: 4, textAlign: 'center' }]}
              numberOfLines={2}
            >
              {slot.shortLabel}
            </Text>
          </View>
        ))}

        {extraPhotos.map((photo) => {
          const label = extraPhotoLabel(photo);
          return (
            <View key={photo.id} style={{ width: 80, alignItems: 'center' }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => openViewer(photo.localUri, label ?? 'Photo')}
                onLongPress={() => promptExtraPhotoAction(photo)}
                accessibilityRole="button"
                accessibilityLabel={label ? `View ${label} photo` : 'View photo'}
              >
                <Image
                  source={{ uri: photo.localUri }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    backgroundColor: colors.border,
                  }}
                />
              </TouchableOpacity>
              {label ? (
                <Text
                  style={[sharedStyles.cardMeta, { fontSize: 11, marginTop: 4, textAlign: 'center' }]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              ) : null}
            </View>
          );
        })}

        <View style={{ width: 80, alignItems: 'center' }}>
          <Pressable
            onPress={promptAddMore}
            accessibilityRole="button"
            accessibilityLabel={`Add ${APPLIANCE_EXTRA_PHOTOS_SHORT_LABEL.toLowerCase()} photo`}
            style={{
              width: 72,
              height: 72,
              borderRadius: 8,
              backgroundColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AddPhotoPlaceholder size={24} />
          </Pressable>
          <Text
            style={[sharedStyles.cardMeta, { fontSize: 11, marginTop: 4, textAlign: 'center' }]}
            numberOfLines={2}
          >
            {APPLIANCE_EXTRA_PHOTOS_SHORT_LABEL}
          </Text>
        </View>
      </ScrollView>

      <EditableApplianceSection
        title="Appliance"
        isEditing={editingSection === 'appliance'}
        onPress={() => openSection('appliance')}
        onDone={closeSection}
      >
        {editingSection === 'appliance' ? (
          <ApplianceIdentityFields details={details} onChange={updateDetails} />
        ) : applianceHasIdentityInfo(details) ? (
          <>
            {details.nickname?.trim() ? (
              <DisplayRow label="Name" value={details.nickname} />
            ) : null}
            <DisplayRow label="Manufacturer" value={details.manufacturer} />
            <DisplayRow label="Model #" value={details.modelNumber} />
            <DisplayRow label="Serial #" value={details.serialNumber} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableApplianceSection>

      <EditableApplianceSection
        title="Purchase"
        isEditing={editingSection === 'purchase'}
        onPress={() => openSection('purchase')}
        onDone={closeSection}
      >
        {editingSection === 'purchase' ? (
          <AppliancePurchaseFields details={details} onChange={updateDetails} />
        ) : applianceHasPurchaseInfo(details) ? (
          <>
            <DisplayRow label="Where purchased" value={details.purchaseLocation} />
            <DisplayRow
              label="Date purchased"
              value={formatPurchaseDate(details.purchaseDateAtISO)}
            />
            <DisplayRow label="Amount paid" value={details.purchasePrice} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableApplianceSection>

      <EditableApplianceSection
        title="Repair contact"
        isEditing={editingSection === 'repair'}
        onPress={() => openSection('repair')}
        onDone={closeSection}
      >
        {editingSection === 'repair' ? (
          <ApplianceRepairFields details={details} onChange={updateDetails} />
        ) : applianceHasRepairInfo(details) ? (
          <>
            <DisplayRow label="Company" value={details.repairCompany} />
            <DisplayRow label="Phone" value={details.repairPhone} />
            <DisplayRow label="Website" value={details.repairWebsite} />
          </>
        ) : (
          <Text style={sharedStyles.cardMeta}>Not set</Text>
        )}
      </EditableApplianceSection>

      <Modal
        visible={viewerUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
        presentationStyle="overFullScreen"
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#000',
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Pressable onPress={() => setViewerUri(null)} hitSlop={12}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Close</Text>
              </Pressable>
              <Text style={{ color: '#ccc', fontSize: 15 }} numberOfLines={1}>
                {viewerLabel}
              </Text>
              <View style={{ width: 48 }} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {viewerUri ? (
                <ZoomablePhotoImage uri={viewerUri} width={width} height={imageMaxH} />
              ) : null}
            </View>
            <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', paddingBottom: 16 }}>
              Pinch to zoom
            </Text>
          </View>
        </GestureHandlerRootView>
      </Modal>

      <Modal
        visible={labelingPhoto != null}
        transparent
        animationType="fade"
        onRequestClose={closeLabelEditor}
      >
        <Pressable
          onPress={closeLabelEditor}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
            }}
          >
            <Text style={[sharedStyles.sectionTitle, { marginTop: 0 }]}>Label photo</Text>
            <Text style={[sharedStyles.cardMeta, { marginBottom: 12 }]}>
              Add a short label to describe this photo.
            </Text>
            <TextInput
              value={labelDraft}
              onChangeText={setLabelDraft}
              style={sharedStyles.input}
              placeholder="e.g. Water hookup, damage"
              autoFocus
              maxLength={40}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={closeLabelEditor}
                style={[sharedStyles.secondaryBtn, { flex: 1, marginTop: 0 }]}
              >
                <Text style={sharedStyles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={savePhotoLabel}
                style={[sharedStyles.primaryBtn, { flex: 1, marginTop: 0 }]}
              >
                <Text style={sharedStyles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
