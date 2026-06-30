import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ZoomablePhotoImage } from './ZoomablePhotoImage';
import { sharedStyles, colors } from '../theme';

export function AddPhotoPlaceholder(props: { size?: number }) {
  return <Ionicons name="camera-outline" size={props.size ?? 32} color={colors.textMuted} />;
}

export function PhotoSlot(props: {
  label: string;
  hint: string;
  photoUri?: string;
  onAdd: (uri: string) => void;
  onRemove: () => void;
  hideActionButtons?: boolean;
  compact?: boolean;
}) {
  const { label, hint, photoUri, onAdd, onRemove, hideActionButtons = false, compact = false } = props;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [viewerOpen, setViewerOpen] = useState(false);

  async function pickPhoto() {
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
      onAdd(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take pictures.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      onAdd(result.assets[0].uri);
    }
  }

  function confirmRemove() {
    Alert.alert('Remove photo?', 'You can add a new one anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ]);
  }

  function promptAddPhoto() {
    Alert.alert('Add photo', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose photo', onPress: () => void pickPhoto() },
      { text: 'Take photo', onPress: () => void takePhoto() },
    ]);
  }

  const imageMaxH = height - insets.top - insets.bottom - 120;
  const slotImageHeight = compact ? 110 : 180;
  const emptySlotHeight = compact ? 110 : 120;

  return (
    <View style={compact ? { flex: 1 } : undefined}>
      <Text style={sharedStyles.fieldLabel}>{label}</Text>
      {hideActionButtons ? null : (
        <Text style={[sharedStyles.cardMeta, { marginBottom: 8 }]}>{hint}</Text>
      )}
      {photoUri ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setViewerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`View ${label} photo`}
        >
          <Image
            source={{ uri: photoUri }}
            style={{
              width: '100%',
              height: slotImageHeight,
              borderRadius: 8,
              backgroundColor: colors.border,
              marginBottom: compact ? 4 : 8,
            }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : (
        <Pressable
          onPress={hideActionButtons ? promptAddPhoto : undefined}
          accessibilityRole={hideActionButtons ? 'button' : undefined}
          accessibilityLabel={hideActionButtons ? `Add photo: ${label}` : undefined}
          style={{
            height: emptySlotHeight,
            borderRadius: 8,
            backgroundColor: colors.border,
            marginBottom: compact ? 4 : 8,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: compact ? 8 : 16,
          }}
        >
          {hideActionButtons ? (
            <AddPhotoPlaceholder size={compact ? 28 : 36} />
          ) : (
            <Text style={[sharedStyles.cardMeta, { textAlign: 'center' }]}>No photo yet</Text>
          )}
        </Pressable>
      )}
      {hideActionButtons ? null : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={pickPhoto} style={[sharedStyles.secondaryBtn, { flex: 1, marginTop: 0 }]}>
            <Text style={sharedStyles.secondaryBtnText}>Choose photo</Text>
          </Pressable>
          <Pressable onPress={takePhoto} style={[sharedStyles.secondaryBtn, { flex: 1, marginTop: 0 }]}>
            <Text style={sharedStyles.secondaryBtnText}>Take photo</Text>
          </Pressable>
        </View>
      )}
      {photoUri && !hideActionButtons ? (
        <Pressable
          onPress={confirmRemove}
          style={[sharedStyles.dangerBtn, { marginTop: compact ? 4 : 8, paddingVertical: compact ? 8 : undefined }]}
        >
          <Text style={[sharedStyles.dangerBtnText, compact ? { fontSize: 13 } : undefined]}>Remove photo</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={viewerOpen && photoUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
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
              <Pressable onPress={() => setViewerOpen(false)} hitSlop={12}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Close</Text>
              </Pressable>
              <Text style={{ color: '#ccc', fontSize: 15 }} numberOfLines={1}>
                {label}
              </Text>
              <Pressable
                onPress={() => {
                  setViewerOpen(false);
                  confirmRemove();
                }}
                hitSlop={12}
              >
                <Text style={{ color: '#ff8a80', fontSize: 17, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {photoUri ? (
                <ZoomablePhotoImage uri={photoUri} width={width} height={imageMaxH} />
              ) : null}
            </View>
            <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', paddingBottom: 16 }}>
              Pinch to zoom
            </Text>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
