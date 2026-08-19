/** Fields searched on Interactions list (priority order for match detection). */
export type InteractionSearchMatchField =
  | 'notes'
  | 'contactName'
  | 'vendor'
  | 'method'
  | 'date'
  | 'project'
  | 'property';

export type InteractionSearchMatch = {
  field: InteractionSearchMatchField;
  /** Notes match: collapsed snippet for the list row notes preview. */
  searchSnippet?: string;
  /** Non-notes match: short meta like "Matched in contact". */
  matchHint?: string;
};

const MATCH_HINTS: Record<Exclude<InteractionSearchMatchField, 'notes'>, string> = {
  contactName: 'Matched in contact',
  vendor: 'Matched in vendor',
  method: 'Matched in method',
  date: 'Matched in date',
  project: 'Matched in project',
  property: 'Matched in property',
};

/** Collapse whitespace and return a window around the first case-insensitive match. */
export function snippetAround(text: string, query: string, radius = 50): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  const q = query.trim();
  if (!collapsed) return '';
  if (!q) return collapsed;

  const lower = collapsed.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return collapsed;

  const start = Math.max(0, idx - radius);
  const end = Math.min(collapsed.length, idx + q.length + radius);
  let snip = collapsed.slice(start, end);
  if (start > 0) snip = `…${snip}`;
  if (end < collapsed.length) snip = `${snip}…`;
  return snip;
}

function fieldIncludes(value: string | undefined, queryLower: string): boolean {
  return Boolean(value && value.toLowerCase().includes(queryLower));
}

/** First matching field using the same haystack fields as Interactions search. */
export function findInteractionSearchMatch(args: {
  query: string;
  notes?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  vendorName?: string;
  methodLabel?: string;
  dateLabel?: string;
  projectName?: string;
  propertyName?: string;
}): InteractionSearchMatch | undefined {
  const q = args.query.trim().toLowerCase();
  if (!q) return undefined;

  if (fieldIncludes(args.notes, q)) {
    return {
      field: 'notes',
      searchSnippet: snippetAround(args.notes!, args.query),
    };
  }
  if (fieldIncludes(args.contactName, q)) {
    return { field: 'contactName', matchHint: MATCH_HINTS.contactName };
  }
  if (fieldIncludes(args.contactPhone, q) || fieldIncludes(args.contactEmail, q)) {
    return { field: 'contactName', matchHint: MATCH_HINTS.contactName };
  }
  if (fieldIncludes(args.vendorName, q)) {
    return { field: 'vendor', matchHint: MATCH_HINTS.vendor };
  }
  if (fieldIncludes(args.methodLabel, q)) {
    return { field: 'method', matchHint: MATCH_HINTS.method };
  }
  if (fieldIncludes(args.dateLabel, q)) {
    return { field: 'date', matchHint: MATCH_HINTS.date };
  }
  if (fieldIncludes(args.projectName, q)) {
    return { field: 'project', matchHint: MATCH_HINTS.project };
  }
  if (fieldIncludes(args.propertyName, q)) {
    return { field: 'property', matchHint: MATCH_HINTS.property };
  }
  return undefined;
}

/** Fields searched on Service Events in Activity search (priority order). */
export type ServiceSearchMatchField =
  | 'notes'
  | 'title'
  | 'asset'
  | 'room'
  | 'property'
  | 'company'
  | 'date';

export type ServiceSearchMatch = {
  field: ServiceSearchMatchField;
  searchSnippet?: string;
  matchHint?: string;
};

const SERVICE_MATCH_HINTS: Record<Exclude<ServiceSearchMatchField, 'notes'>, string> = {
  title: 'Matched in title',
  asset: 'Matched in asset',
  room: 'Matched in room',
  property: 'Matched in property',
  company: 'Matched in company',
  date: 'Matched in date',
};

/** First matching field using the same haystack fields as Services search. */
export function findServiceSearchMatch(args: {
  query: string;
  title?: string;
  assetLabel?: string;
  roomName?: string;
  propertyName?: string;
  notes?: string;
  company?: string;
  dateLabel?: string;
}): ServiceSearchMatch | undefined {
  const q = args.query.trim().toLowerCase();
  if (!q) return undefined;

  if (fieldIncludes(args.notes, q)) {
    return {
      field: 'notes',
      searchSnippet: snippetAround(args.notes!, args.query),
    };
  }
  if (fieldIncludes(args.title, q)) {
    return { field: 'title', matchHint: SERVICE_MATCH_HINTS.title };
  }
  if (fieldIncludes(args.assetLabel, q)) {
    return { field: 'asset', matchHint: SERVICE_MATCH_HINTS.asset };
  }
  if (fieldIncludes(args.roomName, q)) {
    return { field: 'room', matchHint: SERVICE_MATCH_HINTS.room };
  }
  if (fieldIncludes(args.propertyName, q)) {
    return { field: 'property', matchHint: SERVICE_MATCH_HINTS.property };
  }
  if (fieldIncludes(args.company, q)) {
    return { field: 'company', matchHint: SERVICE_MATCH_HINTS.company };
  }
  if (fieldIncludes(args.dateLabel, q)) {
    return { field: 'date', matchHint: SERVICE_MATCH_HINTS.date };
  }
  return undefined;
}

/** Fields searched on Assets in Search All (priority order). */
export type AssetSearchMatchField =
  | 'notes'
  | 'label'
  | 'type'
  | 'customName'
  | 'room'
  | 'property'
  | 'summary';

export type AssetSearchMatch = {
  field: AssetSearchMatchField;
  searchSnippet?: string;
  matchHint?: string;
};

const ASSET_MATCH_HINTS: Record<Exclude<AssetSearchMatchField, 'notes'>, string> = {
  label: 'Matched in name',
  type: 'Matched in type',
  customName: 'Matched in custom name',
  room: 'Matched in room',
  property: 'Matched in property',
  summary: 'Matched in details',
};

/** First matching field using the same haystack fields as Assets search. */
export function findAssetSearchMatch(args: {
  query: string;
  label?: string;
  typeLabel?: string;
  customName?: string;
  roomName?: string;
  propertyName?: string;
  notes?: string;
  summaryValues?: string;
}): AssetSearchMatch | undefined {
  const q = args.query.trim().toLowerCase();
  if (!q) return undefined;

  if (fieldIncludes(args.notes, q)) {
    return {
      field: 'notes',
      searchSnippet: snippetAround(args.notes!, args.query),
    };
  }
  if (fieldIncludes(args.label, q)) {
    return { field: 'label', matchHint: ASSET_MATCH_HINTS.label };
  }
  if (fieldIncludes(args.typeLabel, q)) {
    return { field: 'type', matchHint: ASSET_MATCH_HINTS.type };
  }
  if (fieldIncludes(args.customName, q)) {
    return { field: 'customName', matchHint: ASSET_MATCH_HINTS.customName };
  }
  if (fieldIncludes(args.roomName, q)) {
    return { field: 'room', matchHint: ASSET_MATCH_HINTS.room };
  }
  if (fieldIncludes(args.propertyName, q)) {
    return { field: 'property', matchHint: ASSET_MATCH_HINTS.property };
  }
  if (fieldIncludes(args.summaryValues, q)) {
    return { field: 'summary', matchHint: ASSET_MATCH_HINTS.summary };
  }
  return undefined;
}

/** Fields searched on to-dos / ideas / punch items in Search All (priority order). */
export type TodoSearchMatchField = 'notes' | 'title' | 'date' | 'property' | 'project';

export type TodoSearchMatch = {
  field: TodoSearchMatchField;
  searchSnippet?: string;
  matchHint?: string;
};

const TODO_MATCH_HINTS: Record<Exclude<TodoSearchMatchField, 'notes'>, string> = {
  title: 'Matched in title',
  date: 'Matched in date',
  property: 'Matched in property',
  project: 'Matched in project',
};

/** First matching field for a property to-do, idea, or punch-list item. */
export function findTodoSearchMatch(args: {
  query: string;
  title?: string;
  notes?: string;
  dateLabel?: string;
  propertyName?: string;
  projectName?: string;
}): TodoSearchMatch | undefined {
  const q = args.query.trim().toLowerCase();
  if (!q) return undefined;

  if (fieldIncludes(args.notes, q)) {
    return {
      field: 'notes',
      searchSnippet: snippetAround(args.notes!, args.query),
    };
  }
  if (fieldIncludes(args.title, q)) {
    return { field: 'title', matchHint: TODO_MATCH_HINTS.title };
  }
  if (fieldIncludes(args.dateLabel, q)) {
    return { field: 'date', matchHint: TODO_MATCH_HINTS.date };
  }
  if (fieldIncludes(args.propertyName, q)) {
    return { field: 'property', matchHint: TODO_MATCH_HINTS.property };
  }
  if (fieldIncludes(args.projectName, q)) {
    return { field: 'project', matchHint: TODO_MATCH_HINTS.project };
  }
  return undefined;
}

export type HighlightPart = { text: string; highlight: boolean };

/** Split text for first case-insensitive substring match (same as includes search). */
export function splitHighlightParts(text: string, query: string): HighlightPart[] {
  const q = query.trim();
  if (!text || !q) return [{ text, highlight: false }];

  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return [{ text, highlight: false }];

  const parts: HighlightPart[] = [];
  if (idx > 0) parts.push({ text: text.slice(0, idx), highlight: false });
  parts.push({ text: text.slice(idx, idx + q.length), highlight: true });
  if (idx + q.length < text.length) {
    parts.push({ text: text.slice(idx + q.length), highlight: false });
  }
  return parts;
}
