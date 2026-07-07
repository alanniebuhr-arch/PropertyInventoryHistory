import type { AppState, StoredDocument } from './types';
import { deleteDocumentFile, persistDocumentFromUri } from './documentStorage';
import { uid, nowISO } from './utils';

export type PickedDocument = {
  uri: string;
  fileName: string;
};

export async function addDocumentToState(
  state: AppState,
  sourceUri: string,
  fileName: string
): Promise<{ state: AppState; document: StoredDocument }> {
  const documentId = uid('doc');
  const localUri = await persistDocumentFromUri(sourceUri, documentId);
  const document: StoredDocument = {
    id: documentId,
    localUri,
    fileName,
    mimeType: 'application/pdf',
    createdAtISO: nowISO(),
  };
  return {
    state: {
      ...state,
      documents: [...state.documents, document],
    },
    document,
  };
}

export async function removeDocumentFromState(
  state: AppState,
  documentId: string
): Promise<AppState> {
  const doc = state.documents.find((entry) => entry.id === documentId);
  if (doc) await deleteDocumentFile(doc.localUri);
  return {
    ...state,
    documents: state.documents.filter((entry) => entry.id !== documentId),
  };
}
