import type { AppState, Room } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedRoomDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function roomExtraDocumentInfos(state: AppState, room: Room): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of room.documentIds ?? []) {
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

export function roomExtraDocumentRows(
  state: AppState,
  room: Room | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!room) return [];
  return roomExtraDocumentInfos(state, room).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addRoomExtraDocuments(
  state: AppState,
  roomId: string,
  picked: PickedRoomDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const room = state.rooms.find((entry) => entry.id === roomId);
  if (!room) return state;

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
    rooms: nextState.rooms.map((entry) =>
      entry.id === roomId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removeRoomExtraDocument(
  state: AppState,
  roomId: string,
  documentId: string
): Promise<AppState> {
  const room = state.rooms.find((entry) => entry.id === roomId);
  if (!room) return state;
  if (!(room.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    rooms: nextState.rooms.map((entry) =>
      entry.id === roomId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}
