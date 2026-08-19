import type { AppState, HomeDocument } from './types';
import { documentById } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';
import { uid, nowISO } from './utils';

export type PickedHomeDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function homeDocumentRows(
  state: AppState,
  onDelete: (homeDocumentId: string) => void
): DocumentListRow[] {
  const rows: DocumentListRow[] = [];
  for (const entry of state.homeDocuments ?? []) {
    const doc = documentById(state, entry.documentId);
    if (!doc) continue;
    const label = entry.title?.trim() || doc.fileName;
    rows.push({
      id: entry.id,
      label,
      fileName: doc.fileName,
      localUri: doc.localUri,
      mimeType: doc.mimeType,
      onDelete: () => onDelete(entry.id),
    });
  }
  return rows;
}

export async function addHomeDocuments(
  state: AppState,
  picked: PickedHomeDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  let nextState = state;
  const added: HomeDocument[] = [];
  for (const entry of picked) {
    const { state: withDoc, document } = await addDocumentToState(
      nextState,
      entry.uri,
      entry.fileName,
      entry.mimeType ?? 'application/octet-stream'
    );
    nextState = withDoc;
    added.push({
      id: uid('homedoc'),
      documentId: document.id,
      title: entry.fileName,
      createdAtISO: nowISO(),
    });
  }
  return {
    ...nextState,
    homeDocuments: [...(nextState.homeDocuments ?? []), ...added],
  };
}

export async function removeHomeDocument(
  state: AppState,
  homeDocumentId: string
): Promise<AppState> {
  const entry = (state.homeDocuments ?? []).find((row) => row.id === homeDocumentId);
  if (!entry) return state;
  const nextState = await removeDocumentFromState(state, entry.documentId);
  return {
    ...nextState,
    homeDocuments: (nextState.homeDocuments ?? []).filter((row) => row.id !== homeDocumentId),
  };
}
