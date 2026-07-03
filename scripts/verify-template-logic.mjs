/** Quick sanity check for property template dwelling names and structure. */

const room = { houseName: 'Utilities' };

function roomNameForDwelling(room, dwelling) {
  return dwelling === 'apartment' && room.apartmentName ? room.apartmentName : room.houseName;
}

if (roomNameForDwelling(room, 'house') !== 'Utilities') {
  throw new Error('House should use Utilities');
}
if (roomNameForDwelling(room, 'apartment') !== 'Utilities') {
  throw new Error('Apartment should use Utilities');
}

const template = [
  {
    houseName: 'Utilities',
    sortOrder: 0,
    items: [{ itemTypeId: 'water_main' }],
  },
  { houseName: 'Kitchen', sortOrder: 1, items: [{ itemTypeId: 'appliance', applianceNickname: 'Fridge' }] },
];

const houseRooms = template.map((r) => roomNameForDwelling(r, 'house'));
const aptRooms = template.map((r) => roomNameForDwelling(r, 'apartment'));

if (!houseRooms.includes('Utilities') || houseRooms.includes('Basement')) {
  throw new Error('House room names wrong');
}
if (!aptRooms.includes('Utilities') || aptRooms.includes('Basement')) {
  throw new Error('Apartment room names wrong');
}

const itemCount = template.reduce((n, r) => n + r.items.length, 0);
if (itemCount !== 2) {
  throw new Error('Template item count wrong');
}

console.log('verify-template-logic: ok');
