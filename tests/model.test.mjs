import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, completeTask, empty, merge, month, nextDue, rememberSpecies, shift, shiftMonth, snapshot, undoTaskCompletion, validate, week } from '../model.mjs';

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
  assert.equal(nextDue({ ...animal, moltStatus: 'hardening' }, [feeding('eaten')]), '');
  assert.equal(nextDue({ ...animal, moltStatus: 'premolt_suspected' }, []), '');
});

test('Wiederkehrende Aufgaben planen den Folgetermin und protokollieren Abschlüsse rücknehmbar', () => {
  const task = { id: 'task', title: 'Wasser prüfen', animalId: '', due: '2026-11-19', note: '', done: false, completedAt: '', repeat: 'daily', every: 1, completions: [] };
  const completed = completeTask(task, new Date(2026, 10, 19, 12));
  assert.equal(completed.due, '2026-11-20');
  assert.equal(completed.done, false);
  assert.equal(completed.completions.length, 1);
  assert.equal(undoTaskCompletion(completed).due, task.due);
  assert.equal(completeTask({ ...task, repeat: 'interval', every: 5 }, new Date(2026, 10, 19, 12)).due, '2026-11-24');
  assert.equal(completeTask({ ...task, repeat: 'none' }, new Date(2026, 10, 19, 12)).done, true);
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

test('Alte Backups erhalten additive Haltungssammlungen und neue Datensätze werden validiert', () => {
  const { enclosureHistory, enclosures, molts, observations, tasks, readings, measurements, ...legacy } = empty();
  const upgraded = validate({ ...legacy, animals: [animal] });
  assert.deepEqual(upgraded.enclosures, []);
  assert.deepEqual(upgraded.molts, []);
  assert.deepEqual(upgraded.tasks, []);
  const expanded = {
    ...upgraded,
    enclosures: [{ id: 'terra', name: 'Regal 1', location: 'Raum A', type: 'Terrarium', substrate: 'Kokoshumus', note: '', archived: false }],
    enclosureHistory: [{ id: 'move', animalId: animal.id, from: '', to: 'terra', date: '2024-02-28', note: '' }],
    molts: [{ id: 'molt', animalId: animal.id, date: '2024-02-29', status: 'hardening', hardened: false, note: '' }],
    observations: [{ id: 'observation', animalId: animal.id, date: '2024-02-29', category: 'Normal aktiv', note: '' }],
    tasks: [{ id: 'task', title: 'Wasser prüfen', animalId: animal.id, due: '2024-03-01', note: '', done: false, completedAt: '', repeat: 'none', every: 1, completions: [] }],
    readings: [{ id: 'reading', animalId: animal.id, date: '2024-02-29', temperature: '22', humidity: '60', note: '' }],
    measurements: [{ id: 'measurement', animalId: animal.id, date: '2024-02-29', length: '12', span: '40', weight: '', note: '' }],
  };
  assert.equal(validate(expanded), expanded);
  assert.throws(() => validate({ ...expanded, readings: [{ ...expanded.readings[0], humidity: '101' }] }));
  assert.throws(() => validate({ ...expanded, molts: [{ ...expanded.molts[0], status: 'guaranteed-date' }] }));
  const oldTask = { id: 'old-task', title: 'Kontrolle', animalId: '', due: '2024-03-01', note: '', done: false, completedAt: '' };
  assert.equal(validate({ ...upgraded, tasks: [oldTask] }).tasks[0].repeat, 'none');
});