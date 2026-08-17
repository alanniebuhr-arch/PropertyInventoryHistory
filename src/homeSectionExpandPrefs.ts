/** Session: Properties expanded on first load; other Home sections start collapsed. */
let propertiesExpanded = true;
let projectsExpanded = false;
let pinsExpanded = false;
let remindersExpanded = false;

/** Sync read of Home Properties section expand (session memory; default expanded). */
export function getHomePropertiesExpanded(): boolean {
  return propertiesExpanded;
}

export async function setHomePropertiesExpanded(expanded: boolean): Promise<void> {
  propertiesExpanded = expanded;
}

/** Sync read of Home incomplete Projects section expand (session memory; default collapsed). */
export function getHomeProjectsExpanded(): boolean {
  return projectsExpanded;
}

export async function setHomeProjectsExpanded(expanded: boolean): Promise<void> {
  projectsExpanded = expanded;
}

/** Sync read of Home Pinned section expand (session memory; default collapsed). */
export function getHomePinsExpanded(): boolean {
  return pinsExpanded;
}

export async function setHomePinsExpanded(expanded: boolean): Promise<void> {
  pinsExpanded = expanded;
}

/** Sync read of Home Reminders section expand (session memory; default collapsed). */
export function getHomeRemindersExpanded(): boolean {
  return remindersExpanded;
}

export async function setHomeRemindersExpanded(expanded: boolean): Promise<void> {
  remindersExpanded = expanded;
}
