import type { AppState, ProjectVendor } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedVendorDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function vendorDocumentInfos(
  state: AppState,
  vendor: ProjectVendor
): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of vendor.documentIds ?? []) {
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

export function vendorDocumentRows(
  state: AppState,
  vendor: ProjectVendor | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!vendor) return [];
  return vendorDocumentInfos(state, vendor).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addVendorDocuments(
  state: AppState,
  vendorId: string,
  picked: PickedVendorDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const vendor = state.projectVendors.find((entry) => entry.id === vendorId);
  if (!vendor) return state;

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
    projectVendors: nextState.projectVendors.map((entry) =>
      entry.id === vendorId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removeVendorDocument(
  state: AppState,
  vendorId: string,
  documentId: string
): Promise<AppState> {
  const vendor = state.projectVendors.find((entry) => entry.id === vendorId);
  if (!vendor) return state;
  if (!(vendor.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    projectVendors: nextState.projectVendors.map((entry) =>
      entry.id === vendorId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}
