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
  const active = animals.filter(animal => !animal.archived && (!animal.moltStatus || animal.moltStatus === 'normal'));
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
    const paused = animal.moltStatus && animal.moltStatus !== 'normal';
    return `<article class="item"><div><h3>${esc(animal.name)}</h3><p class="muted">${esc([animal.group, animal.species, animal.location].filter(Boolean).join(' · '))}</p><small>${last ? `Zuletzt angenommen: ${brief(last)}` : 'Noch keine Annahme'}</small>${due ? ` <small class="due">· ${due < current ? 'Überfällig seit' : due === current ? 'Heute fällig:' : 'Nächster Termin:'} ${brief(due)}</small>` : ''}${paused ? `<p class="warning">Fütterung pausiert · ${esc(moltLabels[animal.moltStatus] ?? animal.moltStatus)}</p>` : ''}</div><div class="actions">${!paused && food ? button('quick', `Gefressen · ${esc(foodLabel(food))}`, `class="primary" ${idAttr(animal.id)}`) : ''}${!paused ? button('add', food ? 'Weitere Optionen' : 'Fütterung erfassen', `${idAttr(animal.id)} data-date="${current}"`) : ''}</div></article>`;
  }).join('') : blank('Keine aktiven Tiere für diese Auswahl.')) + details(current, animals, meals, dues, false);
}

function calendar(date, animals, meals, dues, isWeek) {
  if (isWeek) {
    const days = week(date);
    return heading(`${brief(days[0])} – ${fmt(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}`, nav(true)) + calendarLegend + (animals.length ?
      `<div class="scroll"><table class="week"><thead><tr><th scope="col">Tier</th>${days.map(value => `<th scope="col" class="${value === day() ? 'current' : ''}">${fmt(value, { weekday: 'short' })} ${brief(value)}</th>`).join('')}</tr></thead><tbody>${animals.map(animal => `<tr><th scope="row">${esc(animal.name)}</th>${days.map(value => {
        const entries = meals.filter(meal => meal.date === value && meal.animalId === animal.id);
        const due = Number(dues[animal.id] === value);
        const feedAllowed = !animal.archived && (!animal.moltStatus || animal.moltStatus === 'normal');
        return `<td>${button('calendar', entries.length || due ? marks(entries, due) : value <= day() && feedAllowed ? '+' : '·', `data-date="${value}" ${idAttr(animal.id)} class="${value === date ? 'selected' : ''} ${entries.length ? 'has-meals' : ''}" aria-label="${label(value, entries, due, animal.name)}"`)}</td>`;
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

const moltLabels = { normal: 'Normalzustand', premolt_suspected: 'Vorhäutung vermutet', premolt_confirmed: 'Vorhäutung bestätigt', molting: 'Häutung läuft', hardening: 'Aushärtung' };
const animalName = (animals, id) => animals.find(animal => animal.id === id)?.name ?? 'Unbekanntes Tier';

function moltsView(state) {
  const animals = state.animals.filter(animal => !animal.archived);
  const entries = [...state.molts].sort((left, right) => right.date.localeCompare(left.date));
  return heading('Häutungen', button('molt', '+ Status dokumentieren', 'class="primary"'))
    + animals.map(animal => `<article class="item"><div><h3>${esc(animal.name)}</h3><p class="muted">${esc([animal.species, animal.stage].filter(Boolean).join(' · '))}</p><small>${moltLabels[animal.moltStatus ?? 'normal']}</small>${animal.moltStatus === 'hardening' ? '<p class="warning">Fütterung pausiert. Prüfe die vollständige Aushärtung einschließlich Cheliceren/Fangzähnen. Verbliebene lebende Futtertiere entfernen.</p>' : animal.moltStatus?.startsWith('premolt') ? '<p class="warning">Fütterung pausiert. Prüfe auf verbliebene lebende Futtertiere.</p>' : ''}</div><div class="actions">${animal.moltStatus === 'hardening' ? button('confirm-hardening', 'Aushärtung bestätigt', idAttr(animal.id)) : ''}${button('molt', 'Status ändern', idAttr(animal.id))}</div></article>`).join('')
    + `<section class="stats-section"><h3>Protokoll</h3>${entries.length ? entries.map(entry => `<article class="item"><div><h3>${esc(animalName(animals, entry.animalId))} · ${esc(moltLabels[entry.status] ?? entry.status)}</h3><small>${esc(entry.date)}${entry.hardened ? ' · Aushärtung bestätigt' : ''}</small>${entry.note ? `<p>${esc(entry.note)}</p>` : ''}</div></article>`).join('') : blank('Noch keine Häutungsphasen dokumentiert.')}</section>`;
}

function enclosuresView(state, filters) {
  const animals = state.animals;
  const entries = state.enclosures.filter(item => !item.archived);
  const history = [...state.enclosureHistory].sort((left, right) => right.date.localeCompare(left.date));
  const enclosureName = id => state.enclosures.find(item => item.id === id)?.name ?? (id ? 'Archiviertes Terrarium' : 'Kein Terrarium');
  return heading('Terrarien', `${filters.terrariumId ? button('clear-terrarium', 'Alle Terrarien') : ''}${button('manage-enclosures', 'Terrarien verwalten')}`) + (entries.length ? entries.map(enclosure => {
    const residents = animals.filter(animal => animal.enclosureId === enclosure.id && !animal.archived);
    return `<article class="item ${filters.terrariumId === enclosure.id ? 'qr-target' : ''}" data-enclosure-id="${esc(enclosure.id)}"><div><h3>${esc(enclosure.name)}</h3><p class="muted">${esc([enclosure.location, enclosure.type, enclosure.substrate].filter(Boolean).join(' · '))}</p><small>${residents.length ? `Bewohner: ${residents.map(animal => esc(animal.name)).join(', ')}` : 'Aktuell unbelegt'}</small>${enclosure.safety ? `<p class="warning">${esc(enclosure.safety)}</p>` : ''}${enclosure.note ? `<p>${esc(enclosure.note)}</p>` : ''}</div><div class="actions">${button('qr-label', 'QR-Etikett', idAttr(enclosure.id))}</div></article>`;
  }).join('') : blank('Noch keine Terrarien angelegt.')) + `<section class="stats-section"><h3>Umsetzungshistorie</h3>${history.length ? history.map(item => `<article class="item"><div><h3>${esc(animalName(animals, item.animalId))}</h3><small>${esc(item.date)} · ${esc(enclosureName(item.from))} → ${esc(enclosureName(item.to))}</small>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div></article>`).join('') : blank('Noch keine Umsetzungen dokumentiert.')}</section>`;
}

function careView(state) {
  const todayDate = day();
  const groups = [['Überfällig', state.tasks.filter(item => !item.done && item.due < todayDate)], ['Heute', state.tasks.filter(item => !item.done && item.due === todayDate)], ['Demnächst', state.tasks.filter(item => !item.done && item.due > todayDate)], ['Erledigt', state.tasks.filter(item => item.done).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 20)]];
  const repeatText = item => ({ none: 'Einmalig', daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', interval: `Alle ${item.every} Tage` })[item.repeat ?? 'none'];
  const completions = state.tasks.filter(item => item.repeat !== 'none').flatMap(item => (item.completions ?? []).map((entry, index) => ({ ...entry, task: item, latest: index === item.completions.length - 1 }))).sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 30);
  return heading('Pflegeaufgaben', button('new-task', '+ Aufgabe', 'class="primary"')) + groups.map(([title, entries]) => `<section class="stats-section"><h3>${title}</h3>${entries.length ? entries.map(item => `<article class="item"><div><h3>${esc(item.title)}</h3><small>${esc([item.due, item.animalId ? animalName(state.animals, item.animalId) : 'Allgemein', repeatText(item), item.completedAt].filter(Boolean).join(' · '))}</small>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div>${button(item.done ? 'task-revert' : 'task-toggle', item.done ? 'Wieder öffnen' : 'Erledigt', idAttr(item.id))}</article>`).join('') : blank('Keine Einträge.')}</section>`).join('')
    + `<section class="stats-section"><h3>Abschlussprotokoll</h3>${completions.length ? completions.map(entry => `<article class="item"><div><h3>${esc(entry.task.title)} · ${esc(animalName(state.animals, entry.task.animalId))}</h3><small>${esc(entry.completedAt)}</small></div>${entry.latest ? button('task-revert', 'Letzten Abschluss zurücknehmen', idAttr(entry.task.id)) : ''}</article>`).join('') : blank('Noch keine wiederkehrenden Aufgaben abgeschlossen.')}</section>`;
}

function journalView(state) {
  const readings = [...state.readings].sort((a, b) => b.date.localeCompare(a.date));
  const measurements = [...state.measurements].sort((a, b) => b.date.localeCompare(a.date));
  const observations = [...state.observations].sort((a, b) => b.date.localeCompare(a.date));
  const buttons = `<div class="actions journal-actions">${button('new-observation', '+ Beobachtung')}${button('new-reading', '+ Klimawert')}${button('new-measurement', '+ Wachstumsmessung')}</div>`;
  const chart = (title, items, key, unit) => {
    const values = items.filter(item => item[key] !== '').slice(0, 20).reverse();
    const max = Math.max(...values.map(item => Number(item[key])), 1);
    return `<section class="stats-section"><h3>${title}</h3>${values.length ? `<div class="sparkline" role="img" aria-label="${title}">${values.map(item => `<span title="${esc(item.date)}: ${esc(item[key])} ${unit}" style="height:${Math.max(6, Number(item[key]) / max * 100)}%"></span>`).join('')}</div>` : blank('Noch keine Messwerte.')}</section>`;
  };
  return heading('Beobachtungen & Messwerte') + buttons + chart('Temperaturverlauf (°C)', readings, 'temperature', '°C') + chart('Luftfeuchteverlauf (%)', readings, 'humidity', '%') + chart('Beinspannweite (mm)', measurements, 'span', 'mm')
    + `<section class="stats-section"><h3>Beobachtungsjournal</h3>${observations.length ? observations.map(item => `<article class="item"><div><h3>${esc(animalName(state.animals, item.animalId))} · ${esc(item.category)}</h3><small>${esc(item.date)}</small>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div></article>`).join('') : blank('Noch keine Beobachtungen.')}</section>`
    + `<section class="stats-section"><h3>Klimaaufzeichnungen</h3>${readings.length ? readings.map(item => `<article class="item"><div><h3>${esc(animalName(state.animals, item.animalId))} · ${esc(item.date)}</h3><small>${item.temperature !== '' ? `${esc(item.temperature)} °C` : ''}${item.temperature !== '' && item.humidity !== '' ? ' · ' : ''}${item.humidity !== '' ? `${esc(item.humidity)} %` : ''}</small>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div></article>`).join('') : blank('Noch keine Klimawerte.')}</section>`
    + `<section class="stats-section"><h3>Wachstumsmessungen</h3>${measurements.length ? measurements.map(item => `<article class="item"><div><h3>${esc(animalName(state.animals, item.animalId))} · ${esc(item.date)}</h3><small>${item.length !== '' ? `Körperlänge ${esc(item.length)} mm` : ''}${item.length !== '' && item.span !== '' ? ' · ' : ''}${item.span !== '' ? `Beinspannweite ${esc(item.span)} mm` : ''}${item.weight !== '' ? ` · ${esc(item.weight)} g` : ''}</small>${item.note ? `<p>${esc(item.note)}</p>` : ''}</div></article>`).join('') : blank('Noch keine Messungen.')}</section>`;
}

export function renderView(state, filters) {
  if (filters.view === 'molts') return moltsView(state);
  if (filters.view === 'enclosures') return enclosuresView(state, filters);
  if (filters.view === 'care') return careView(state);
  if (filters.view === 'journal') return journalView(state);
  const animals = state.animals.filter(animal => (filters.view !== 'today' || !animal.archived) && (!filters.group || animal.group === filters.group) && (!filters.animalId || animal.id === filters.animalId));
  const ids = new Set(animals.map(animal => animal.id));
  const meals = state.meals.filter(meal => ids.has(meal.animalId));
  if (filters.view === 'stats') return stats(animals, meals, filters);
  const dues = Object.fromEntries(animals.map(animal => [animal.id, nextDue(animal, meals)]));
  if (filters.view === 'today') return today(animals, meals, dues, state.foods);
  return calendar(filters.date, animals, meals, dues, filters.view === 'week');
}