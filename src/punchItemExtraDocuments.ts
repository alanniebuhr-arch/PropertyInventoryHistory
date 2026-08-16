import type { AppState, ProjectPunchItem } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedPunchItemDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function punchItemExtraDocumentInfos(
  state: AppState,
  punchItem: ProjectPunchItem
): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of punchItem.documentIds ?? []) {
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

export function punchItemExtraDocumentRows(
  state: AppState,
  punchItem: ProjectPunchItem | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!punchItem) return [];
  return punchItemExtraDocumentInfos(state, punchItem).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addPunchItemExtraDocuments(
  state: AppState,
  punchItemId: string,
  picked: PickedPunchItemDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const punchItem = state.projectPunchItems.find((entry) => entry.id === punchItemId);
  if (!punchItem) return state;

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
    projectPunchItems: nextState.projectPunchItems.map((entry) =>
      entry.id === punchItemId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removePunchItemExtraDocument(
  state: AppState,
  punchItemId: string,
  documentId: string
): Promise<AppState> {
  const punchItem = state.projectPunchItems.find((entry) => entry.id === punchItemId);
  if (!punchItem) return state;
  if (!(punchItem.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    projectPunchItems: nextState.projectPunchItems.map((entry) =>
      entry.id === punchItemId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}
