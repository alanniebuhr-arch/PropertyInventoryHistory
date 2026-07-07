import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { readDocumentAsBase64 } from '../documentStorage';
import { colors } from '../theme';

export type ViewerPdf = {
  uri: string;
  label: string;
  fileName: string;
};

function pdfHtmlFromBase64(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #525659; }
    embed { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <embed src="data:application/pdf;base64,${base64}" type="application/pdf" />
</body>
</html>`;
}

export function PdfViewerModal(props: {
  pdf: ViewerPdf | null;
  onClose: () => void;
}) {
  const { pdf, onClose } = props;
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!pdf) {
      setHtml(null);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setHtml(null);
    setLoadError(false);
    void readDocumentAsBase64(pdf.uri).then((base64) => {
      if (cancelled) return;
      if (!base64) {
        setLoadError(true);
        return;
      }
      setHtml(pdfHtmlFromBase64(base64));
    });
    return () => {
      cancelled = true;
    };
  }, [pdf]);

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

        {loadError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center' }}>
              Could not load this PDF. Try Share from the long-press menu.
            </Text>
          </View>
        ) : html ? (
          <WebView
            key={pdf?.uri}
            source={{ html }}
            style={{ flex: 1 }}
            originWhitelist={['*']}
            startInLoadingState
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
}
