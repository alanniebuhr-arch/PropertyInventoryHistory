import type { AppState, InventoryItem } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedItemDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function itemExtraDocumentInfos(
  state: AppState,
  item: InventoryItem
): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of item.documentIds ?? []) {
    const doc = documentById(state, documentId);
    if (!doc) continue;
    infos.push({
      id: doc.id,
      fileName: doc.fileName,
      localUri: doc.localUri,
      mimeType: doc.mimeType,
    });
  }
  return infos;
}

export function itemExtraDocumentRows(
  state: AppState,
  item: InventoryItem | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!item) return [];
  return itemExtraDocumentInfos(state, item).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addItemExtraDocuments(
  state: AppState,
  itemId: string,
  picked: PickedItemDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return state;

  let nextState = state;
  const newDocumentIds: string[] = [];

  for (const entry of picked) {
    const { state: withDoc, document } = await addDocumentToState(
      nextState,
      entry.uri,
      entry.fileName,
      entry.mimeType ?? 'application/octet-stream'
    );
    nextState = withDoc;
    newDocumentIds.push(document.id);
  }

  return {
    ...nextState,
    items: nextState.items.map((entry) =>
      entry.id === itemId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removeItemExtraDocument(
  state: AppState,
  itemId: string,
  documentId: string
): Promise<AppState> {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return state;
  if (!(item.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    items: nextState.items.map((entry) =>
      entry.id === itemId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}
