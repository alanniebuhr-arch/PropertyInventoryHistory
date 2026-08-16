import type { AppState, PropertyTodo } from './types';
import { documentById, type SlotDocumentInfo } from './documents';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import type { DocumentListRow } from './components/DocumentListSection';

export type PickedPropertyTodoDocument = {
  uri: string;
  fileName: string;
  mimeType?: string;
};

export function propertyTodoExtraDocumentInfos(
  state: AppState,
  todo: PropertyTodo
): SlotDocumentInfo[] {
  const infos: SlotDocumentInfo[] = [];
  for (const documentId of todo.documentIds ?? []) {
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

export function propertyTodoExtraDocumentRows(
  state: AppState,
  todo: PropertyTodo | undefined,
  onDeleteDocument: (documentId: string) => void
): DocumentListRow[] {
  if (!todo) return [];
  return propertyTodoExtraDocumentInfos(state, todo).map((info) => ({
    id: info.id,
    label: info.fileName,
    fileName: info.fileName,
    localUri: info.localUri,
    mimeType: info.mimeType,
    onDelete: () => onDeleteDocument(info.id),
  }));
}

export async function addPropertyTodoExtraDocuments(
  state: AppState,
  todoId: string,
  picked: PickedPropertyTodoDocument[]
): Promise<AppState> {
  if (picked.length === 0) return state;
  const todo = state.propertyTodos.find((entry) => entry.id === todoId);
  if (!todo) return state;

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
    propertyTodos: nextState.propertyTodos.map((entry) =>
      entry.id === todoId
        ? {
            ...entry,
            documentIds: [...(entry.documentIds ?? []), ...newDocumentIds],
          }
        : entry
    ),
  };
}

export async function removePropertyTodoExtraDocument(
  state: AppState,
  todoId: string,
  documentId: string
): Promise<AppState> {
  const todo = state.propertyTodos.find((entry) => entry.id === todoId);
  if (!todo) return state;
  if (!(todo.documentIds ?? []).includes(documentId)) return state;

  const nextState = await removeDocumentFromState(state, documentId);
  return {
    ...nextState,
    propertyTodos: nextState.propertyTodos.map((entry) =>
      entry.id === todoId
        ? {
            ...entry,
            documentIds: (entry.documentIds ?? []).filter((id) => id !== documentId),
          }
        : entry
    ),
  };
}
