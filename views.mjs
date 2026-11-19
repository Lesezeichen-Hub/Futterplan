import { day, dateOf, distance, week, month, nextDue, latest, aggregate, counts, outcomes } from './model.mjs';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export const option = (value, label, selected = '') => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
export const foodLabel = food => [food.amount, food.unit, food.name].filter(Boolean).join(' ');
export const button = (action, label, attrs = '') => `<button type="button" data-action="${action}" ${attrs}>${label}</button>`;
export const idAttr = id => `data-id="${esc(id)}"`;
export const blank = text => `<p class="empty">${text}</p>`;
const fmt = (date, options) => dateOf(date).toLocaleDateString('de-DE', options);
const long = date => fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const brief = date => fmt(date, { day: 'numeric', month: 'numeric' });
const pct = rate => rate === null ? '–' : new Intl.NumberFormat('de-DE', { style: 'percent' }).format(rate);
const keys = Object.keys(outcomes);
const symbols = { eaten: '✓', partial: '◐', refused: '×' };

function heading(title, navigation = '') {
  return `<div class="view-head"><h2 id="view-title">${esc(title)}</h2>${navigation}</div>`;
}
function nav(isWeek) {
  return `<div class="date-nav">${button('prev', '‹', `aria-label="${isWeek ? 'Vorherige Woche' : 'Vorheriger Monat'}"`)}${button('now', 'Heute')}${button('next', '›', `aria-label="${isWeek ? 'Nächste Woche' : 'Nächster Monat'}"`)}</div>`;
}
const calendarLegend = `<div class="legend calendar-legend">${keys.map(key => `<span><span class="mark ${key}" aria-hidden="true">${symbols[key]}</span> ${outcomes[key]}</span>`).join('')}<span><span class="mark due" aria-hidden="true">◇</span> Fällig</span></div>`;

function marks(entries, due) {
  const tally = counts(entries);
  return `<span class="marks" aria-hidden="true">${keys.filter(key => tally[key]).map(key => `<span class="mark ${key}" title="${outcomes[key]}">${symbols[key]}${tally[key]}</span>`).join('')}${due ? `<span class="mark due" title="Fällig">◇${due}</span>` : ''}</span>`;
}
function label(date, entries, due, name) {
  const tally = counts(entries);
  return esc([name, long(date), ...keys.filter(key => tally[key]).map(key => `${outcomes[key]}: ${tally[key]}`), due ? `Fällig: ${due}` : ''].filter(Boolean).join(', '));
}

function details(date, animals, meals, dues, showAdd = true) {
  const entries = meals.filter(meal => meal.date === date);
  const planned = animals.filter(animal => dues[animal.id] === date);
  const active = animals.filter(animal => !animal.archived);
  return `<section class="day-detail"><div class="view-head"><h3>${showAdd ? long(date) : 'Heutiges Protokoll'}</h3>${showAdd && date <= day() && active.length ? button('add', '+ Fütterung', `data-date="${date}" ${idAttr(active.length === 1 ? active[0].id : '')}`) : ''}</div>
    ${planned.length ? `<p class="due">◇ Fällig: ${esc(planned.map(animal => animal.name).join(', '))}</p>` : ''}
    ${entries.length ? entries.map(meal => `<article class="item"><div><h3>${esc(animals.find(animal => animal.id === meal.animalId)?.name)} · ${esc(foodLabel(meal.food))}</h3><p class="${meal.result}">${symbols[meal.result]} ${outcomes[meal.result]}</p>${meal.food.supplement || meal.food.note ? `<p class="muted">${esc([meal.food.supplement, meal.food.note].filter(Boolean).join(' · '))}</p>` : ''}</div>${button('edit', 'Bearbeiten', idAttr(meal.id))}</article>`).join('') : blank('Keine Fütterungen protokolliert.')}</section>`;
}

function today(animals, meals, dues, foods) {
  const current = day();
  const dueNow = animal => Number(Boolean(dues[animal.id] && dues[animal.id] <= current));
  const sorted = [...animals].sort((left, right) => dueNow(right) - dueNow(left) || left.name.localeCompare(right.name, 'de'));
  return heading(long(current)) + (sorted.length ? sorted.map(animal => {
    const food = foods.find(item => item.id === animal.foodId && !item.archived);
    const due = dues[animal.id];
    const last = latest(meals.filter(meal => meal.animalId === animal.id));
    return `<article class="item"><div><h3>${esc(animal.name)}</h3><p class="muted">${esc([animal.group, animal.species, animal.location].filter(Boolean).join(' · '))}</p><small>${last ? `Zuletzt angenommen: ${brief(last)}` : 'Noch keine Annahme'}</small>${due ? ` <small class="due">· ${due < current ? 'Überfällig seit' : due === current ? 'Heute fällig:' : 'Nächster Termin:'} ${brief(due)}</small>` : ''}</div><div class="actions">${food ? button('quick', `Gefressen · ${esc(foodLabel(food))}`, `class="primary" ${idAttr(animal.id)}`) : ''}${button('add', food ? 'Weitere Optionen' : 'Fütterung erfassen', `${idAttr(animal.id)} data-date="${current}"`)}</div></article>`;
  }).join('') : blank('Keine aktiven Tiere für diese Auswahl.')) + details(current, animals, meals, dues, false);
}

function calendar(date, animals, meals, dues, isWeek) {
  if (isWeek) {
    const days = week(date);
    return heading(`${brief(days[0])} – ${fmt(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}`, nav(true)) + calendarLegend + (animals.length ?
      `<div class="scroll"><table class="week"><thead><tr><th scope="col">Tier</th>${days.map(value => `<th scope="col" class="${value === day() ? 'current' : ''}">${fmt(value, { weekday: 'short' })} ${brief(value)}</th>`).join('')}</tr></thead><tbody>${animals.map(animal => `<tr><th scope="row">${esc(animal.name)}</th>${days.map(value => {
        const entries = meals.filter(meal => meal.date === value && meal.animalId === animal.id);
        const due = Number(dues[animal.id] === value);
        return `<td>${button('calendar', entries.length || due ? marks(entries, due) : value <= day() && !animal.archived ? '+' : '·', `data-date="${value}" ${idAttr(animal.id)} class="${value === date ? 'selected' : ''} ${entries.length ? 'has-meals' : ''}" aria-label="${label(value, entries, due, animal.name)}"`)}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table></div>` : blank('Keine Tiere für diese Auswahl.')) + details(date, animals, meals, dues);
  }
  return heading(fmt(date, { month: 'long', year: 'numeric' }), nav(false)) + calendarLegend + `<div class="calendar">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(value => `<div class="weekday muted">${value}</div>`).join('')}${month(date).map(value => {
    const entries = meals.filter(meal => meal.date === value);
    const due = Object.values(dues).filter(dueDay => dueDay === value).length;
    return button('calendar', `<span>${Number(value.slice(-2))}</span>${marks(entries, due)}`, `data-date="${value}" aria-pressed="${value === date}" aria-label="${label(value, entries, due)}" class="${value.slice(0, 7) === date.slice(0, 7) ? '' : 'outside'} ${value === day() ? 'current' : ''} ${entries.length ? 'has-meals' : ''}"`);
  }).join('')}</div>` + details(date, animals, meals, dues);
}

function table(title, headers, rows) {
  return `<section class="stats-section"><h3>${title}</h3>${rows.length ? `<div class="scroll"><table><thead><tr>${headers.map(name => `<th scope="col">${name}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${esc(row[0])}</th>${row.slice(1).map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : blank('Keine Einträge im gewählten Zeitraum.')}</section>`;
}

function stats(animals, meals, filters) {
  const { start, end, period, range, animalId } = filters;
  const result = aggregate(meals, start, end, period);
  const max = result.timeline.reduce((size, bucket) => Math.max(size, bucket.total), 1);
  const metrics = [['Versuche', result.total], ...keys.map(key => [outcomes[key], result[key]]), ['Annahmequote', pct(result.rate)]];
  if (animalId) {
    const last = latest(meals);
    metrics.push(['Zuletzt angenommen (gesamt)', last ? `${fmt(last, { dateStyle: 'medium' })} · vor ${distance(last, day())} T.` : '–']);
  }
  return heading('Statistik') + `<div class="stats-filter"><label>Zeitraum <select id="range">${option('30', '30 Tage', range)}${option('90', '90 Tage', range)}${option('custom', 'Freie Auswahl', range)}</select></label>${range === 'custom' ? `<label>Von <input id="start" type="date" value="${start}" max="${end}"></label><label>Bis <input id="end" type="date" value="${end}" min="${start}" max="${day()}"></label>` : ''}<label>Verlauf <select id="period">${option('week', 'Wöchentlich', period)}${option('month', 'Monatlich', period)}</select></label></div>
    <dl class="metrics">${metrics.map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>
    ${result.total ? `<div class="legend">${keys.map(key => `<span class="${key}">${symbols[key]} ${outcomes[key]}</span>`).join('')}</div>` : ''}
    ${table('Verlauf', ['Zeitraum', 'Verteilung', ...Object.values(outcomes)], result.timeline.map(bucket => [period === 'week' ? `Ab ${fmt(bucket.key, { dateStyle: 'short' })}` : fmt(bucket.key, { month: 'long', year: 'numeric' }), `<div class="track" aria-hidden="true">${keys.map(key => `<span class="${key}" style="width:${100 * bucket[key] / max}%"></span>`).join('')}</div>`, ...keys.map(key => bucket[key])]))}
    ${table('Angebotenes Futter', ['Futter', 'Versuche', 'Annahmequote'], result.foods.map(row => [row.key, row.total, pct(row.rate)]))}
    ${table('Tiervergleich', ['Tier', 'Versuche', 'Annahmequote'], animals.map(animal => {
      const row = result.animals.find(entry => entry.key === animal.id);
      return [animal.name, row?.total ?? 0, pct(row?.rate ?? null)];
    }))}`;
}

export function renderView(state, filters) {
  const animals = state.animals.filter(animal => (filters.view !== 'today' || !animal.archived) && (!filters.group || animal.group === filters.group) && (!filters.animalId || animal.id === filters.animalId));
  const ids = new Set(animals.map(animal => animal.id));
  const meals = state.meals.filter(meal => ids.has(meal.animalId));
  if (filters.view === 'stats') return stats(animals, meals, filters);
  const dues = Object.fromEntries(animals.map(animal => [animal.id, nextDue(animal, meals)]));
  if (filters.view === 'today') return today(animals, meals, dues, state.foods);
  return calendar(filters.date, animals, meals, dues, filters.view === 'week');
}