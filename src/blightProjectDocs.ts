import type { AppState, Project } from './types';
import { addDocumentToState, removeDocumentFromState } from './slotDocumentOps';
import { nowISO } from './utils';

export type BlightBoardDocSlot = 'noticeOfViolation' | 'municipalCitation';

const SLOT_KEY: Record<BlightBoardDocSlot, keyof Pick<
  Project,
  'noticeOfViolationDocumentId' | 'municipalCitationDocumentId'
>> = {
  noticeOfViolation: 'noticeOfViolationDocumentId',
  municipalCitation: 'municipalCitationDocumentId',
};

export const BLIGHT_BOARD_DOC_LABELS: Record<BlightBoardDocSlot, string> = {
  noticeOfViolation: 'Notice of Violation',
  municipalCitation: 'Municipal Citation',
};

export async function setBlightBoardDocument(
  state: AppState,
  projectId: string,
  slot: BlightBoardDocSlot,
  picked: { uri: string; fileName: string; mimeType?: string }
): Promise<AppState> {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state;
  const key = SLOT_KEY[slot];
  const previousId = project[key];
  let next = state;
  if (previousId) {
    next = await removeDocumentFromState(next, previousId);
  }
  const { state: withDoc, document } = await addDocumentToState(
    next,
    picked.uri,
    picked.fileName,
    picked.mimeType ?? 'application/octet-stream'
  );
  return {
    ...withDoc,
    projects: withDoc.projects.map((p) =>
      p.id === projectId
        ? { ...p, [key]: document.id, updatedAtISO: nowISO() }
        : p
    ),
  };
}

export async function clearBlightBoardDocument(
  state: AppState,
  projectId: string,
  slot: BlightBoardDocSlot
): Promise<AppState> {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return state;
  const key = SLOT_KEY[slot];
  const previousId = project[key];
  let next = state;
  if (previousId) {
    next = await removeDocumentFromState(next, previousId);
  }
  return {
    ...next,
    projects: next.projects.map((p) =>
      p.id === projectId ? { ...p, [key]: undefined, updatedAtISO: nowISO() } : p
    ),
  };
}
