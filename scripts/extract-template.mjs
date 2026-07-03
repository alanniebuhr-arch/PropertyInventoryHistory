#!/usr/bin/env node
/**
 * Extract DEFAULT_PROPERTY_TEMPLATE from a Property Inventory History export JSON.
 *
 * Usage:
 *   node scripts/extract-template.mjs path/to/backup.json "24 Cedar Road"
 *
 * Paste the printed array into src/propertyTemplate.ts (DEFAULT_PROPERTY_TEMPLATE).
 */

import { readFileSync } from 'fs';

const [filePath, propertyQuery = ''] = process.argv.slice(2);
if (!filePath) {
  console.error('Usage: node scripts/extract-template.mjs <export.json> [property name filter]');
  process.exit(1);
}

const bundle = JSON.parse(readFileSync(filePath, 'utf8'));
const state = bundle.state ?? bundle;
const properties = state.properties ?? [];
const rooms = state.rooms ?? [];
const items = state.items ?? [];

const needle = propertyQuery.trim().toLowerCase();
const property = properties.find(
  (p) =>
    p.name?.toLowerCase().includes(needle) ||
    p.address?.toLowerCase().includes(needle)
);

if (!property) {
  console.error(
    `No property matching "${propertyQuery}". Available: ${properties.map((p) => p.name).join(', ')}`
  );
  process.exit(1);
}

const propertyRooms = rooms
  .filter((r) => r.propertyId === property.id)
  .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

const template = propertyRooms.map((room, index) => {
  const roomItems = items
    .filter((i) => i.roomId === room.id)
    .sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));

  const mappedItems = roomItems.map((item) => {
    const entry = { itemTypeId: item.itemTypeId };
    if (item.itemTypeId === 'other' && item.displayName?.trim()) {
      entry.displayName = item.displayName.trim();
    }
    if (item.itemTypeId === 'appliance' && item.details?.kind === 'appliance') {
      const nickname = item.details.nickname?.trim();
      if (nickname) entry.applianceNickname = nickname;
    }
    if (item.itemTypeId === 'electric_panel' && item.details?.kind === 'electric_panel') {
      const name = item.details.name?.trim();
      if (name) entry.panelName = name;
    }
    return entry;
  });

  const entry = {
    houseName: room.name === 'Basement' ? 'Utilities' : room.name,
    sortOrder: room.sortOrder ?? index,
    items: mappedItems,
  };
  return entry;
});

console.log(JSON.stringify(template, null, 2));
