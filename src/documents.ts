import type { AppState, StoredDocument } from './types';

export function documentById(state: AppState, documentId?: string): StoredDocument | undefined {
  if (!documentId) return undefined;
  return state.documents.find((doc) => doc.id === documentId);
}

export type SlotDocumentInfo = {
  id: string;
  fileName: string;
  localUri: string;
};

export function slotDocumentInfo(
  state: AppState,
  documentId?: string
): SlotDocumentInfo | undefined {
  const doc = documentById(state, documentId);
  if (!doc) return undefined;
  return { id: doc.id, fileName: doc.fileName, localUri: doc.localUri };
}
