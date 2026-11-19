import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, empty, merge, month, nextDue, rememberSpecies, shift, shiftMonth, snapshot, validate, week } from '../model.mjs';

const food = { name: 'Heimchen', amount: '2', unit: 'Stück', supplement: '', note: '' };
const animal = { id: 'tier', name: 'Nori', group: 'Spinne', species: '', location: '', note: '', foodId: '', first: '2024-02-28', interval: 7, archived: false };
const feeding = (result, id = result) => ({ id, animalId: animal.id, date: '2024-02-29', result, food: snapshot(food) });

test('Eigene Arten überstehen alte Backups und den Austausch ohne Duplikate', () => {
  const { species, ...legacy } = empty();
  assert.deepEqual(validate(legacy).species, species);
  const custom = rememberSpecies(empty(), 'Reptil', 'Test-Art');
  assert.equal(rememberSpecies(custom, ' reptil ', 'TEST-ART'), custom);
  const imported = merge(legacy, custom);
  assert.equal(imported.added, 1);
  assert.deepEqual(imported.data.species, custom.species);
  assert.equal(merge(imported.data, custom).added, 0);
  assert.throws(() => validate({ ...custom, species: [{ ...custom.species[0], group: '' }] }));
});

test('Zusammenführen ist wiederholbar und verändert lokale Konflikte nicht', () => {
  const local = { ...empty(), animals: [animal], meals: [feeding('eaten')] };
  const incoming = { ...empty(), animals: [{ ...animal, name: 'Anderer Name' }], meals: [feeding('partial', 'eaten'), feeding('refused')] };
  const merged = merge(local, incoming);
  assert.equal(merged.added, 1);
  assert.equal(merged.conflicts, 2);
  assert.equal(merged.data.animals[0].name, animal.name);
  assert.equal(merged.data.meals[0].result, 'eaten');
  assert.equal(merge(merged.data, incoming).added, 0);
  assert.equal(merge(merged.data, merged.data).conflicts, 0);
});

test('Kalendertage bleiben bei Schaltjahr, Monatswechsel und Zeitumstellung stabil', () => {
  assert.equal(shiftMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(shift('2024-03-30', 2), '2024-04-01');
  assert.equal(week('2024-01-01').at(-1), '2024-01-07');
  assert.equal(month('2024-02-18')[0], '2024-01-29');
  assert.equal(month('2024-02-18').at(-1), '2024-03-03');
});

test('Fälligkeit verschiebt sich nur nach einer Annahme', () => {
  assert.equal(nextDue(animal, [feeding('refused')]), animal.first);
  assert.equal(nextDue(animal, [feeding('partial'), feeding('refused')]), '2024-03-07');
  assert.equal(nextDue({ ...animal, archived: true }, []), '');
});

test('Statistik zählt Versuche statt Tage und berücksichtigt Bereichsgrenzen', () => {
  const meals = ['eaten', 'partial', 'refused'].map(result => feeding(result));
  const stats = aggregate(meals, '2024-02-29', '2024-02-29', 'week');
  assert.equal(stats.total, 3);
  assert.equal(stats.rate, 2 / 3);
  assert.equal(stats.timeline[0].key, '2024-02-26');
  assert.equal(stats.foods[0].total, 3);
  assert.equal(aggregate(meals, '2024-03-01', '2024-03-01').rate, null);
  assert.equal(aggregate(meals.slice(1), '2024-02-29', '2024-02-29').rate, 0.5);
});

test('Snapshots und Backupprüfung schützen historische Daten', () => {
  const meal = feeding('eaten');
  const backup = { ...empty(), animals: [animal], meals: [meal] };
  assert.equal(validate(backup), backup);
  assert.notEqual(meal.food, food);
  assert.throws(() => validate({ ...backup, animals: [] }));
  assert.throws(() => validate({ ...backup, meals: [meal, meal] }));
  assert.throws(() => validate({ ...backup, meals: [{ ...meal, date: '2024-02-30' }] }));
});