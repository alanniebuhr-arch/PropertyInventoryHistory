import React, { useMemo } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { Text } from '../textScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme';

export type ViewerPdf = {
  uri: string;
  label: string;
  fileName: string;
};

function directoryOfFileUri(uri: string): string | undefined {
  const slash = uri.lastIndexOf('/');
  if (slash <= 0) return FileSystem.documentDirectory ?? undefined;
  return uri.slice(0, slash + 1);
}

export function PdfViewerModal(props: {
  pdf: ViewerPdf | null;
  onClose: () => void;
}) {
  const { pdf, onClose } = props;
  const insets = useSafeAreaInsets();
  const readAccessUrl = useMemo(
    () => (pdf ? directoryOfFileUri(pdf.uri) : undefined),
    [pdf]
  );

  return (
    <Modal
      visible={pdf != null}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
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
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>Close</Text>
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}
              numberOfLines={1}
            >
              {pdf?.label}
            </Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 2 }}
              numberOfLines={1}
            >
              {pdf?.fileName}
            </Text>
          </View>
          <View style={{ width: 48 }} />
        </View>

        {pdf ? (
          <WebView
            key={pdf.uri}
            source={{ uri: pdf.uri }}
            style={{ flex: 1, backgroundColor: '#525659' }}
            originWhitelist={['*', 'file://']}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowingReadAccessToURL={readAccessUrl}
            scalesPageToFit={Platform.OS === 'android'}
            startInLoadingState
          />
        ) : null}
      </View>
    </Modal>
  );
}
