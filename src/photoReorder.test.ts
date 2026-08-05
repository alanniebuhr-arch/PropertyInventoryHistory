/**
 * Self-running unit checks for reserved-slot freeze / wrap extras.
 * Run: npx --yes tsx src/photoReorder.test.ts
 */
import assert from 'node:assert/strict';
import {
  itemImmovablePhotoIds,
  reorderExtrasInPhotoIds,
  roomImmovablePhotoIds,
  withReorderedItemPhotoIds,
  withReorderedRoomPhotoIds,
} from './photoReorder';
import {
  EMPTY_APP_STATE,
  type AppState,
  type ApplianceDetails,
  type InventoryItem,
  type Room,
} from './types';

function expectEqual(actual: string[], expected: string[], label: string) {
  assert.deepEqual(actual, expected, label);
}

// --- reorderExtrasInPhotoIds ---

{
  const photoIds = ['slotA', 'e1', 'slotB', 'e2'];
  const extras = ['e1', 'e2'];
  const immovable = ['slotA', 'slotB'];

  expectEqual(
    reorderExtrasInPhotoIds(photoIds, extras, 'e1', 'left', immovable),
    ['slotA', 'e2', 'slotB', 'e1'],
    'wrap left on first extra leaves slots fixed'
  );
  expectEqual(
    reorderExtrasInPhotoIds(photoIds, extras, 'e2', 'right', immovable),
    ['slotA', 'e2', 'slotB', 'e1'],
    'wrap right on last extra leaves slots fixed'
  );
  expectEqual(
    reorderExtrasInPhotoIds(photoIds, extras, 'e1', 'right', immovable),
    ['slotA', 'e2', 'slotB', 'e1'],
    'swap extras right leaves slots fixed'
  );
}

{
  const photoIds = ['slotA', 'e1', 'slotB', 'e2'];
  // Bad caller: treats entire photoIds as movable
  const badExtras = [...photoIds];
  const immovable = ['slotA', 'slotB'];

  expectEqual(
    reorderExtrasInPhotoIds(photoIds, badExtras, 'slotA', 'left', immovable),
    photoIds,
    'moving a reserved id is a no-op when immovable'
  );
  expectEqual(
    reorderExtrasInPhotoIds(photoIds, badExtras, 'e1', 'left', immovable),
    ['slotA', 'e2', 'slotB', 'e1'],
    'bad full-list extras still cannot move slots'
  );
}

{
  const details: ApplianceDetails = {
    kind: 'appliance',
    facePhotoId: 's1',
    manufacturerTagPhotoId: 's2',
    manufacturer: 'Acme',
  };
  assert.deepEqual(
    itemImmovablePhotoIds(details),
    new Set(['s1', 's2']),
    'itemImmovablePhotoIds collects *PhotoId fields'
  );
}

// --- withReorderedItemPhotoIds ---

{
  const details: ApplianceDetails = {
    kind: 'appliance',
    facePhotoId: 'slotA',
    manufacturerTagPhotoId: 'slotB',
  };
  const item: InventoryItem = {
    id: 'item1',
    roomId: 'room1',
    itemTypeId: 'appliance',
    createdAtISO: '2020-01-01T00:00:00.000Z',
    photoIds: ['slotA', 'e1', 'slotB', 'e2'],
    documentIds: [],
    details,
  };
  const state: AppState = {
    ...EMPTY_APP_STATE,
    items: [item],
  };

  const moved = withReorderedItemPhotoIds(state, 'item1', 'e1', 'left', [
    'slotA',
    'e1',
    'slotB',
    'e2',
  ]);
  expectEqual(
    moved.items[0]!.photoIds,
    ['slotA', 'e2', 'slotB', 'e1'],
    'item reorder with wrong full extras leaves slot ids in place'
  );
  const movedDetails = moved.items[0]!.details as ApplianceDetails;
  assert.equal(movedDetails.facePhotoId, 'slotA', 'item slot field facePhotoId unchanged');
  assert.equal(
    movedDetails.manufacturerTagPhotoId,
    'slotB',
    'item slot field manufacturerTagPhotoId unchanged'
  );

  const tryMoveSlot = withReorderedItemPhotoIds(state, 'item1', 'slotA', 'right', [
    'slotA',
    'e1',
    'slotB',
    'e2',
  ]);
  assert.equal(tryMoveSlot, state, 'moving reserved item photo returns same state');
}

// --- withReorderedRoomPhotoIds ---

{
  const room: Room = {
    id: 'room1',
    propertyId: 'prop1',
    name: 'Office',
    sortOrder: 0,
    photoIds: ['slotA', 'e1', 'e2'],
    slotAttachments: {
      houseInsurance: { kind: 'photo', id: 'slotA' },
    },
  };
  const state: AppState = {
    ...EMPTY_APP_STATE,
    rooms: [room],
  };

  assert.deepEqual(roomImmovablePhotoIds(room), new Set(['slotA']));

  const moved = withReorderedRoomPhotoIds(state, 'room1', 'e1', 'left', [
    'slotA',
    'e1',
    'e2',
  ]);
  expectEqual(
    moved.rooms[0]!.photoIds,
    ['slotA', 'e2', 'e1'],
    'room reorder with wrong full extras leaves slot ids in place'
  );
  assert.deepEqual(
    moved.rooms[0]!.slotAttachments,
    room.slotAttachments,
    'room slotAttachments unchanged'
  );
}

console.log('photoReorder.test.ts: all checks passed');
