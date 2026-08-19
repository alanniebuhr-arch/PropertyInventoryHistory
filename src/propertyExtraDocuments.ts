import type { AppState, Property } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedPropertyDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function propertyExtraDocumentInfos(
  state: AppState,
  property: Property
): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of property.documentIds ?? []) {
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

export function propertyExtraDocumentRows(
  state: AppState,
  property: Property | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!property) return [];
  return propertyExtraDocumentInfos(state, property).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addPropertyExtraDocuments(
  state: AppState,
  propertyId: string,
  picked: PickedPropertyDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) return state;

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
    properties: nextState.properties.map((entry) =>
      entry.id === propertyId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removePropertyExtraDocument(
  state: AppState,
  propertyId: string,
  documentId: string
): Promise<AppState> {
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) return state;
  if (!(property.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    properties: nextState.properties.map((entry) =>
      entry.id === propertyId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}
