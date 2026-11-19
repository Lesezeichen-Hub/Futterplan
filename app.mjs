import { day, shift, shiftMonth, empty, validate, snapshot } from './model.mjs';
import { connect, load, change } from './storage.mjs';
import { renderView, option } from './views.mjs';
import { dialogs } from './dialogs.mjs';

const find = selector => document.querySelector(selector);
const content = find('#content');
const modal = find('#modal');
const groupSelect = find('#group');
const animalSelect = find('#animal');
let state = empty();
let database;
let busy = false;
let undo = '';
const filters = { view: 'today', date: day(), group: '', animalId: '', range: '30', start: shift(day(), -29), end: day(), period: 'week' };
const uuid = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');

function notice(text, error = false) {
  find('#notice').hidden = false;
  find('#notice').classList.toggle('error', error);
  find('#message').textContent = text;
  find('#undo').hidden = !undo;
}

function render() {
  const focused = document.activeElement;
  const focusData = content.contains(focused) ? { ...focused.dataset } : null;
  const groups = [...new Set(state.animals.map(animal => animal.group))].sort();
  if (!groups.includes(filters.group)) filters.group = '';
  const animals = state.animals.filter(animal => !filters.group || animal.group === filters.group);
  if (!animals.some(animal => animal.id === filters.animalId)) filters.animalId = '';
  groupSelect.innerHTML = option('', 'Alle', filters.group) + groups.map(group => option(group, group, filters.group)).join('');
  animalSelect.innerHTML = option('', 'Alle', filters.animalId) + animals.map(animal => option(animal.id, `${animal.name}${animal.archived ? ' (Archiv)' : ''}`, filters.animalId)).join('');
  find('#views').querySelectorAll('button').forEach(button => {
    if (button.dataset.view === filters.view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  content.innerHTML = renderView(state, filters);
  if (focusData?.action && !modal.open) [...content.querySelectorAll('button')].find(button => Object.entries(focusData).every(([key, value]) => button.dataset[key] === value))?.focus();
}

async function save(update, button, after) {
  if (busy) return;
  if (!database) return notice('Der lokale Speicher ist nicht verfügbar.', true);
  busy = true;
  if (button) button.disabled = true;
  try {
    state = await change(database, current => validate(update(current)));
    after();
    render();
  } catch (error) {
    const text = `Nicht gespeichert. ${error?.message || 'Bitte erneut versuchen.'}`;
    if (modal.open) ui.error(text);
    else notice(text, true);
  } finally {
    busy = false;
    if (button) button.disabled = false;
  }
}

function recorded(id) {
  undo = id;
  notice('Fütterung gespeichert.');
}

function remove(id, button) {
  save(current => ({ ...current, meals: current.meals.filter(meal => meal.id !== id) }), button, () => {
    if (undo === id) undo = '';
    if (modal.open) modal.close();
    notice('Fütterung entfernt.');
  });
}

const ui = dialogs({ modal, state: () => state, exportState: () => load(database), save, uuid, recorded, remove, imported: text => { undo = ''; notice(text); } });
find('#close').onclick = () => { if (!busy) modal.close(); };
modal.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
find('#animals').onclick = () => ui.manage('animals');
find('#foods').onclick = () => ui.manage('foods');
find('#settings').onclick = () => ui.backup();
find('#undo').onclick = event => { if (undo) remove(undo, event.currentTarget); };
groupSelect.onchange = () => { filters.group = groupSelect.value; render(); };
animalSelect.onchange = () => { filters.animalId = animalSelect.value; render(); };
const theme = find('#theme');
theme.value = document.documentElement.dataset.theme ?? 'standard';
theme.onchange = () => {
  document.documentElement.dataset.theme = theme.value;
  try { localStorage.setItem('futterplan.theme', theme.value); }
  catch { notice('Das Design konnte nicht dauerhaft gespeichert werden.', true); }
};

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || busy) return;
  const { action, date, id, view } = button.dataset;
  if (view) { filters.view = view; render(); }
  if (['prev', 'next', 'now'].includes(action)) {
    const step = action === 'prev' ? -1 : 1;
    filters.date = action === 'now' ? day() : filters.view === 'week' ? shift(filters.date, step * 7) : shiftMonth(filters.date, step);
    render();
  }
  if (action === 'calendar') {
    filters.date = date;
    render();
    if (date <= day() && state.animals.some(animal => animal.id === id && !animal.archived) && !state.meals.some(meal => meal.animalId === id && meal.date === date)) ui.meal(date, id);
  }
  if (action === 'add') ui.meal(date, id);
  if (action === 'edit') {
    const meal = state.meals.find(entry => entry.id === id);
    if (meal) ui.meal(meal.date, meal.animalId, meal);
  }
  if (action === 'quick') {
    const mealId = uuid();
    save(current => {
      const animal = current.animals.find(item => item.id === id && !item.archived);
      const template = current.foods.find(item => item.id === animal?.foodId && !item.archived);
      if (!template) throw new Error('Standardvorlage nicht mehr verfügbar.');
      return { ...current, meals: [...current.meals, { id: mealId, animalId: id, date: day(), result: 'eaten', food: snapshot(template) }] };
    }, button, () => recorded(mealId));
  }
});

content.onchange = event => {
  const { id, value } = event.target;
  if (id === 'range') {
    filters.range = value;
    if (value !== 'custom') { filters.end = day(); filters.start = shift(filters.end, 1 - Number(value)); }
  } else if (id === 'period') filters.period = value;
  else if (id === 'start' && value && value <= filters.end) filters.start = value;
  else if (id === 'end' && value && value >= filters.start && value <= day()) filters.end = value;
  else if (!['start', 'end'].includes(id)) return;
  render();
  document.getElementById(id)?.focus();
};

try {
  const connection = await connect();
  state = validate(await load(connection));
  database = connection;
  render();
} catch (error) {
  notice(`Futterplan konnte nicht geladen werden. ${error.message}`, true);
  content.innerHTML = '<h2 id="view-title">Speicher nicht verfügbar</h2>';
}