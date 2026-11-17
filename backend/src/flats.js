// Generates flat numbers from a simple building description.
// wings "A,B", floors 3, flatsPerFloor 2  ->  A-101 A-102 A-201 A-202 A-301 A-302 B-101 ...
function generateFlats({ wings, floors, flatsPerFloor }) {
  const wingList = String(wings || '')
    .split(',')
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);
  const list = [];
  for (const wing of wingList.length ? wingList : ['']) {
    for (let floor = 1; floor <= Number(floors); floor++) {
      for (let n = 1; n <= Number(flatsPerFloor); n++) {
        const number = `${floor}${String(n).padStart(2, '0')}`;
        list.push(wing ? `${wing}-${number}` : number);
      }
    }
  }
  return list;
}

module.exports = { generateFlats };
