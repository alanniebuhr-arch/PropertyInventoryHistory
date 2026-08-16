/** Session default: Properties, incomplete Projects, and Pinned lists expanded on Home. */
let propertiesExpanded = true;
let projectsExpanded = true;
let pinsExpanded = true;

/** Sync read of Home Properties section expand (session memory; default expanded). */
export function getHomePropertiesExpanded(): boolean {
  return propertiesExpanded;
}

export async function setHomePropertiesExpanded(expanded: boolean): Promise<void> {
  propertiesExpanded = expanded;
}

/** Sync read of Home incomplete Projects section expand (session memory; default expanded). */
export function getHomeProjectsExpanded(): boolean {
  return projectsExpanded;
}

export async function setHomeProjectsExpanded(expanded: boolean): Promise<void> {
  projectsExpanded = expanded;
}

/** Sync read of Home Pinned section expand (session memory; default expanded). */
export function getHomePinsExpanded(): boolean {
  return pinsExpanded;
}

export async function setHomePinsExpanded(expanded: boolean): Promise<void> {
  pinsExpanded = expanded;
}
