/** Session-only: reopen Search photos after Back from a photo owner (punch item). */
let pendingReopenProjectId: string | null = null;

export function markProjectSearchPhotosReopen(projectId: string): void {
  pendingReopenProjectId = projectId;
}

/** Returns true once if Search photos should reopen for this project, then clears. */
export function consumeProjectSearchPhotosReopen(projectId: string): boolean {
  if (pendingReopenProjectId !== projectId) return false;
  pendingReopenProjectId = null;
  return true;
}
