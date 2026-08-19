import type { AppState, AppUseCase, Project, ProjectKind } from './types';

export const APP_USE_CASES: AppUseCase[] = ['landlord', 'blight'];

export const DEFAULT_USE_CASES: AppUseCase[] = ['landlord'];

export function isAppUseCase(value: string): value is AppUseCase {
  return value === 'landlord' || value === 'blight';
}

export function isProjectKind(value: string): value is ProjectKind {
  return value === 'job' || value === 'blight_case';
}

export function parseUseCases(raw: unknown): AppUseCase[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const parsed = raw.filter((entry): entry is AppUseCase => typeof entry === 'string' && isAppUseCase(entry));
  const unique: AppUseCase[] = [];
  for (const useCase of parsed) {
    if (!unique.includes(useCase)) unique.push(useCase);
  }
  return unique;
}

/** Old backups and empty lists default to landlord-only. */
export function normalizeUseCases(raw: unknown): AppUseCase[] {
  const parsed = parseUseCases(raw);
  if (!parsed || parsed.length === 0) return [...DEFAULT_USE_CASES];
  return parsed;
}

export function mergeUseCases(local: unknown, incoming: unknown): AppUseCase[] {
  const merged = [...(parseUseCases(local) ?? []), ...(parseUseCases(incoming) ?? [])];
  return normalizeUseCases(merged.length > 0 ? merged : undefined);
}

export function hasUseCase(state: AppState, useCase: AppUseCase): boolean {
  return normalizeUseCases(state.useCases).includes(useCase);
}

export function showLandlordUi(state: AppState): boolean {
  return hasUseCase(state, 'landlord');
}

export function showBlightUi(state: AppState): boolean {
  return hasUseCase(state, 'blight');
}

export function projectKind(project: Project): ProjectKind {
  return isProjectKind(project.kind ?? '') ? project.kind! : 'job';
}

export function isBlightCase(project: Project): boolean {
  return projectKind(project) === 'blight_case';
}

/** Blight project chrome when this project is a blight case. */
export function showBlightProjectUi(_state: AppState, project: Project): boolean {
  return isBlightCase(project);
}

export function setUseCaseEnabled(
  state: AppState,
  useCase: AppUseCase,
  enabled: boolean
): AppState {
  const current = normalizeUseCases(state.useCases);
  let next = enabled
    ? current.includes(useCase)
      ? current
      : [...current, useCase]
    : current.filter((entry) => entry !== useCase);
  if (next.length === 0) next = current;
  return { ...state, useCases: next };
}
