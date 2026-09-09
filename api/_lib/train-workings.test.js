import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupTrainWorkings } from './train-workings.js';
const leg = (tdn, origin, destination, start, end, blockId = 'block') => ({ tripId: tdn, tdn, origin, destination, blockId, scheduledDepartsAt: `2026-09-07T${start}:00Z`, scheduledArrivesAt: `2026-09-07T${end}:00Z` });
const a = leg('6340', 'Williamstown', 'Flinders Street', '10:00', '10:30');
const b = leg('X081', 'Flinders Street', 'Sandringham', '10:30', '11:00');
const c = leg('X092', 'Sandringham', 'Flinders Street', '11:10', '11:40');
const d = leg('6351', 'Flinders Street', 'Williamstown', '11:42', '12:12');
test('both directions retain official TDNs and stable whole-working neighbours', () => {
  const before = leg('before', 'Newport', 'Williamstown', '09:40', '09:50');
  const after = leg('after', 'Williamstown', 'Newport', '12:20', '12:30');
  const groups = groupTrainWorkings([before, a, b, c, d, after]);
  assert.deepEqual(groups.map(w => w.segments.map(s => s.tdn)), [['before'], ['6340', 'X081'], ['X092', '6351'], ['after']]);
  for (const active of ['6340', 'X081']) {
    const index = groups.findIndex(w => w.segments.some(s => s.tripId === active));
    assert.equal(index, 1);
    assert.equal(groups[index - 1].segments[0].tdn, 'before');
    assert.equal(groups[index + 1].segments[0].tdn, 'X092');
  }
});
test('unconfirmed or discontinuous pairs stay separate', () => {
  for (const next of [{...b, blockId:'other'}, {...b, scheduledDepartsAt:'2026-09-07T10:41:00Z'}, {...b, scheduledDepartsAt:'2026-09-07T10:29:00Z'}, {...b, destination:'Williamstown'}, {...b, origin:'Southern Cross'}]) {
    assert.equal(groupTrainWorkings([a, next]).length, 2);
  }
  assert.equal(groupTrainWorkings([{...a, blockId:undefined}, {...b, blockId:undefined}]).length, 2);
  assert.equal(groupTrainWorkings([a, {...b, tripId:'intervening', destination:'Newport'}, b]).length, 3);
});
test('station suffixes and live delays do not change the pairing', () => {
  assert.equal(groupTrainWorkings([{...a, destination:'Flinders Street Station', arrivesAt:'2026-09-07T10:50:00Z'}, b])[0].crossCity, true);
});

for (const west of ['Williamstown', 'Werribee', 'Laverton', 'Newport']) {
  for (const reverse of [false, true]) {
    test(`one card for ${reverse ? 'Sandringham to ' + west : west + ' to Sandringham'}`, () => {
      const first = {...a, origin: reverse ? 'Sandringham' : west};
      const second = {...b, destination: reverse ? west + ' Station' : 'Sandringham'};
      const groups = groupTrainWorkings([first, second]);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].crossCity, true);
      assert.deepEqual(groups[0].segments, [first, second]);
      for (const active of [first.tripId, second.tripId]) {
        assert.equal(groups.findIndex(w => w.segments.some(s => s.tripId === active)), 0);
      }
    });
  }
}

// The same physical train can reverse onto a new GTFS block.
import { neighbouringTrainWorkings } from './train-workings.js';
test('terminal connections cross block boundaries and keep both through legs', () => {
  const current = {crossCity:true, segments:[{...a, origin:'Laverton'}, {...b, destinationStopId:'SHM1', direction:'0'}]};
  const next = {crossCity:true, segments:[{...c, blockId:'new', originStopId:'SHM1', direction:'1'}, {...d, blockId:'new'}]};
  for (const id of [a.tripId, b.tripId]) {
    const result = neighbouringTrainWorkings([current, next], id);
    assert.equal(result.length, 2);
    assert.equal(result[1].connectionSource, 'scheduled-turnaround');
    assert.equal(result[1].segments.length, 2);
  }
  const result = neighbouringTrainWorkings([current, next], c.tripId);
  assert.equal(result[0].connectionSource, 'scheduled-turnaround');
});
test('missing neighbours and ambiguous terminal matches are not invented', () => {
  const current = {segments:[{...b, destinationStopId:'SHM1', direction:'0'}]};
  const next = {segments:[{...c, blockId:'new', originStopId:'SHM1', direction:'1'}]};
  assert.deepEqual(neighbouringTrainWorkings([current], b.tripId), [current]);
  assert.deepEqual(neighbouringTrainWorkings([current,next,{segments:[{...next.segments[0],tripId:'duplicate'}]}], b.tripId), [current]);
});
