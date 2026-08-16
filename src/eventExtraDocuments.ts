import type { AppState, ItemEvent } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedEventDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function eventExtraDocumentInfos(
  state: AppState,
  event: ItemEvent
): SlotDocumentInfo[] {
  return eventExtraDocumentInfosFromIds(state, event.documentIds ?? []);
}

export function eventExtraDocumentInfosFromIds(
  state: AppState,
  documentIds: string[]
): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of documentIds) {
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

export function eventExtraDocumentRows(
  state: AppState,
  event: ItemEvent | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!event) return [];
  return eventExtraDocumentRowsFromIds(state, event.documentIds ?? [], onDeleteDocument);
}

export function eventExtraDocumentRowsFromIds(
  state: AppState,
  documentIds: string[],
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  return eventExtraDocumentInfosFromIds(state, documentIds).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addStandaloneDocuments(
  state: AppState,
  picked: PickedEventDocument[]
): Promise<{ state: AppState; documentIds: string[] }> {
  if (picked.length === 0) return { state, documentIds: [] };

  let nextState = state;
  const documentIds: string[] = [];

  for (const entry of picked) {
    const { state: withDoc, document } = await addDocumentToState(
      nextState,
      entry.uri,
      entry.fileName,
      entry.mimeType ?? 'application/octet-stream'
    );
    nextState = withDoc;
    documentIds.push(document.id);
  }

  return { state: nextState, documentIds };
}

export async function addEventExtraDocuments(
  state: AppState,
  eventId: string,
  picked: PickedEventDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const event = state.events.find((entry) => entry.id === eventId);
  if (!event) return state;

  const { state: nextState, documentIds: newDocumentIds } = await addStandaloneDocuments(
    state,
    picked
  );

  return {
    ...nextState,
    events: nextState.events.map((entry) =>
      entry.id === eventId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removeEventExtraDocument(
  state: AppState,
  eventId: string,
  documentId: string
): Promise<AppState> {
  const event = state.events.find((entry) => entry.id === eventId);
  if (!event) return state;
  if (!(event.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    events: nextState.events.map((entry) =>
      entry.id === eventId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}

export async function removeStandaloneDocuments(
  state: AppState,
  documentIds: string[]
): Promise<AppState> {
  let nextState = state;
  for (const documentId of documentIds) {
    nextState = await removeDocumentFromState(nextState, documentId);
  }
  return nextState;
}
