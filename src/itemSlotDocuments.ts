import type { AppState, InventoryItem, ItemDetails } from './types';
import { slotDocumentInfo } from './documents';
import { documentIdKeyForPhotoSlot } from './slotDocumentKeys';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';

type DetailsRecord = Record<string, string | undefined>;

type ClearItemSlotPhoto = {
  bivarianceHack(
    state: AppState,
    itemId: string,
    photoSlotKey: string
  ): Promise<AppState>;
}['bivarianceHack'];

export function itemSlotDocumentId(details: DetailsRecord, photoSlotKey: string): string | undefined {
  const docKey = documentIdKeyForPhotoSlot(photoSlotKey);
  return details[docKey];
}

export function itemSlotDocumentInfo(
  state: AppState,
  details: DetailsRecord,
  photoSlotKey: string
) {
  if (details[photoSlotKey]) return undefined;
  return slotDocumentInfo(state, itemSlotDocumentId(details, photoSlotKey));
}

export async function setItemSlotDocument<D extends ItemDetails>(
  state: AppState,
  itemId: string,
  photoSlotKey: string,
  sourceUri: string,
  fileName: string,
  asDetails: (details: ItemDetails) => D,
  clearSlotPhoto: ClearItemSlotPhoto,
  mimeType?: string
): Promise<AppState> {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return state;

  const details = asDetails(item.details) as DetailsRecord;
  const docKey = documentIdKeyForPhotoSlot(photoSlotKey);

  let nextState = state;
  if (details[photoSlotKey]) {
    nextState = await clearSlotPhoto(nextState, itemId, photoSlotKey);
  }
  const currentDetails = asDetails(
    nextState.items.find((entry) => entry.id === itemId)!.details
  ) as DetailsRecord;
  const oldDocumentId = currentDetails[docKey];
  if (oldDocumentId) {
    nextState = await removeDocumentFromState(nextState, oldDocumentId);
    nextState = {
      ...nextState,
      items: nextState.items.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              details: { ...asDetails(entry.details), [docKey]: undefined } as D,
            }
          : entry
      ),
    };
  }

  const { state: withDoc, document } = await addDocumentToState(
    nextState,
    sourceUri,
    fileName,
    mimeType
  );

  return {
    ...withDoc,
    items: withDoc.items.map((entry) =>
      entry.id === itemId
        ? {
            ...entry,
            details: {
              ...asDetails(entry.details),
              [photoSlotKey]: undefined,
              [docKey]: document.id,
            } as D,
          }
        : entry
    ),
  };
}

export async function clearItemSlotDocument<D extends ItemDetails>(
  state: AppState,
  itemId: string,
  photoSlotKey: string,
  asDetails: (details: ItemDetails) => D
): Promise<AppState> {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return state;

  const details = asDetails(item.details) as DetailsRecord;
  const docKey = documentIdKeyForPhotoSlot(photoSlotKey);
  const documentId = details[docKey];
  if (!documentId) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    items: nextState.items.map((entry) =>
      entry.id === itemId
        ? {
            ...entry,
            details: { ...asDetails(entry.details), [docKey]: undefined } as D,
          }
        : entry
    ),
  };
}

export async function clearItemSlotDocumentOnPhotoSet<D extends ItemDetails>(
  state: AppState,
  itemId: string,
  photoSlotKey: string,
  asDetails: (details: ItemDetails) => D
): Promise<AppState> {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return state;

  const details = asDetails(item.details) as DetailsRecord;
  const docKey = documentIdKeyForPhotoSlot(photoSlotKey);
  const documentId = details[docKey];
  if (!documentId) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    items: nextState.items.map((entry) =>
      entry.id === itemId
        ? {
            ...entry,
            details: { ...asDetails(entry.details), [docKey]: undefined } as D,
          }
        : entry
    ),
  };
}

export function patchItemDetails<D extends ItemDetails>(
  state: AppState,
  itemId: string,
  details: D
): AppState {
  return {
    ...state,
    items: state.items.map((entry) => (entry.id === itemId ? { ...entry, details } : entry)),
  };
}

export function getItemDetails<D extends ItemDetails>(
  state: AppState,
  itemId: string,
  asDetails: (details: ItemDetails) => D
): D | undefined {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return undefined;
  return asDetails(item.details);
}

export function updateItemInState(
  state: AppState,
  itemId: string,
  updater: (item: InventoryItem) => InventoryItem
): AppState {
  return {
    ...state,
    items: state.items.map((entry) => (entry.id === itemId ? updater(entry) : entry)),
  };
}
