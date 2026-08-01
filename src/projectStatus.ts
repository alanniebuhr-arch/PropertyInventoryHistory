import { colors } from './theme';
import type { ProjectStatus } from './types';

export const PROJECT_STATUS_OPTIONS: { id: ProjectStatus; label: string }[] = [
  { id: 'research', label: 'Research' },
  { id: 'interviewing_vendors', label: 'Interviewing Vendors' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'complete', label: 'Complete' },
];

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_OPTIONS.find((opt) => opt.id === status)?.label ?? status;
}

export function projectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'in_progress':
    case 'interviewing_vendors':
      return colors.dueSoon;
    case 'complete':
      return colors.lastService;
    case 'research':
    default:
      return colors.primary;
  }
}
