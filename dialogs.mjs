import { day, merge, outcomes, rememberSpecies, snapshot, validate } from './model.mjs';
import { speciesChoices } from './species.mjs';
import qrcode from './vendor/qrcode-generator.mjs';
import { blank, button, esc, foodLabel, idAttr, option } from './views.mjs';

const input = (label, name, value = '', attrs = '') => `<label>${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
const note = value => `<label>Notiz<textarea name="note" rows="2" maxlength="1000">${esc(value)}</textarea></label>`;
const foodFields = (food = {}) => `${input('Futter', 'name', food.name, 'required maxlength="100"')}<div class="form-row">${input('Menge', 'amount', food.amount, 'type="number" min="0.000001" step="any"')}${input('Einheit / Größe', 'unit', food.unit, 'maxlength="50"')}</div>${input('Supplement', 'supplement', food.supplement, 'maxlength="100"')}${note(food.note)}`;
const form = (fields, extra = '') => `<form class="fields">${fields}<div class="actions"><button class="primary" type="submit">Speichern</button>${extra}</div></form>`;
const speciesFields = value => `<label>Art auswählen <select id="species-choice"></select></label>${input('Art', 'species', value, 'list="species-options" maxlength="100"')}<datalist id="species-options"></datalist><div class="actions">${button('remember-species', 'Art zur Auswahl hinzufügen')}</div><small id="species-status" role="status" hidden></small>`;
const read = target => {
  const data = new FormData(target);
  return name => String(data.get(name) ?? '').trim();
};
const readFood = get => Object.fromEntries(['name', 'amount', 'unit', 'supplement', 'note'].map(key => [key, get(key)]));
const upsert = (items, record) => items.some(item => item.id === record.id) ? items.map(item => item.id === record.id ? record : item) : [...items, record];

export function dialogs({ modal, state, exportState, save, uuid, recorded, remove, imported }) {
  const body = modal.querySelector('#dialog-body');
  const feedback = modal.querySelector('#dialog-error');
  function error(text) { feedback.textContent = text; feedback.hidden = false; }
  function open(title, html) {
    modal.querySelector('#dialog-title').textContent = title;
    body.innerHTML = html;
    feedback.hidden = true;
    if (!modal.open) modal.showModal();
    body.querySelector('input, button, select')?.focus();
  }

  function manage(kind) {
    const animal = kind === 'animals';
    const items = state()[kind];
    open(animal ? 'Tiere' : 'Futtervorlagen', button('new', animal ? '+ Tier' : '+ Vorlage', 'class="primary"') + (items.length ? items.map(item => `<article class="item"><div><h3>${esc(animal ? item.name : foodLabel(item))}</h3><small>${esc([animal ? item.group : item.supplement, item.archived ? 'Archiviert' : ''].filter(Boolean).join(' · '))}</small></div><div class="actions">${button('profile', 'Bearbeiten', idAttr(item.id))}${button('archive', item.archived ? 'Reaktivieren' : 'Archivieren', idAttr(item.id))}</div></article>`).join('') : blank(animal ? 'Noch keine Tiere.' : 'Noch keine Futtervorlagen.')));
    body.onclick = event => {
      const control = event.target.closest('button');
      if (!control) return;
      const { action, id } = control.dataset;
      if (action === 'new' || action === 'profile') profile(kind, items.find(item => item.id === id));
      if (action === 'archive') save(current => ({ ...current, [kind]: current[kind].map(item => item.id === id ? { ...item, archived: !item.archived } : item) }), control, () => manage(kind));
    };
  }

  function profile(kind, item) {
    const animal = kind === 'animals';
    const groups = [...new Set(['Spinne', 'Reptil', 'Amphibie', 'Andere', ...state().animals.map(entry => entry.group), ...(state().species ?? []).map(entry => entry.group)])];
    const enclosures = state().enclosures.filter(enclosure => !enclosure.archived || enclosure.id === item?.enclosureId);
    const fields = animal ? `${input('Name', 'name', item?.name, 'required maxlength="100"')}${input('Interne Tier-ID', 'internalId', item?.internalId, 'maxlength="100"')}<div class="form-row"><label>Geschlecht <select name="sex">${['unbekannt', 'männlich', 'weiblich', 'vermutet'].map(value => option(value, value, item?.sex ?? 'unbekannt')).join('')}</select></label><label>Entwicklungsstadium <select name="stage">${['unbekannt', 'Sling', 'Juvenil', 'Subadult', 'Adult'].map(value => option(value, value, item?.stage ?? 'unbekannt')).join('')}</select></label></div><label>Herkunft <select name="origin">${['unbekannt', 'Nachzucht', 'Wildfang'].map(value => option(value, value, item?.origin ?? 'unbekannt')).join('')}</select></label>${input('Tiergruppe', 'group', item?.group, 'required list="groups" maxlength="80"')}<datalist id="groups">${groups.map(value => option(value, value)).join('')}</datalist>${speciesFields(item?.species)}${input('Terrarium / Standort', 'location', item?.location, 'maxlength="100"')}<label>Terrarium zuordnen <select name="enclosureId">${option('', 'Keines', item?.enclosureId)}${enclosures.map(enclosure => option(enclosure.id, `${enclosure.name}${enclosure.location ? ` · ${enclosure.location}` : ''}`, item?.enclosureId)).join('')}</select></label><label>Standardvorlage <select name="foodId">${option('', 'Keine', item?.foodId)}${state().foods.filter(food => !food.archived || food.id === item?.foodId).map(food => option(food.id, `${foodLabel(food)}${food.archived ? ' (Archiv)' : ''}`, item?.foodId)).join('')}</select></label><div class="form-row">${input('Erster Futtertermin', 'first', item?.first, 'type="date"')}${input('Intervall (Tage)', 'interval', item?.interval || '', 'type="number" min="1" max="3650"')}</div>${note(item?.note)}` : foodFields(item);
    open(animal ? (item ? 'Tier bearbeiten' : 'Tier hinzufügen') : (item ? 'Vorlage bearbeiten' : 'Vorlage hinzufügen'), form(fields));
    body.onclick = null;
    const editor = body.querySelector('form');
    if (animal) bindSpecies(editor);
    editor.onsubmit = event => {
      event.preventDefault();
      const get = read(event.currentTarget);
      if (animal && Boolean(get('first')) !== Boolean(get('interval'))) return error('Ersten Termin und Intervall gemeinsam eintragen oder beide leer lassen.');
      const values = animal ? { name: get('name'), internalId: get('internalId'), sex: get('sex'), stage: get('stage'), origin: get('origin'), group: get('group'), species: get('species'), location: get('location'), enclosureId: get('enclosureId'), foodId: get('foodId'), first: get('first'), interval: Number(get('interval')), note: get('note') } : readFood(get);
      const record = { id: item?.id ?? uuid(), archived: item?.archived ?? false, ...values };
      save(current => {
        const updated = { ...current, [kind]: upsert(current[kind], record) };
        if (animal && record.enclosureId && record.enclosureId !== (item?.enclosureId ?? '')) {
          updated.enclosureHistory = [...current.enclosureHistory, { id: uuid(), animalId: record.id, from: item?.enclosureId ?? '', to: record.enclosureId, date: day(), note: '' }];
        }
        return updated;
      }, event.submitter, () => manage(kind));
    };
  }

  function bindSpecies(editor) {
    const group = editor.elements.namedItem('group');
    const species = editor.elements.namedItem('species');
    const choices = editor.querySelector('#species-choice');
    const status = editor.querySelector('#species-status');
    const catalogueOnly = { animals: [], species: [] };
    function refresh() {
      const currentGroup = group.value.trim();
      const sections = speciesChoices(currentGroup ? state() : catalogueOnly, currentGroup);
      const options = names => names.map(name => option(name, name)).join('');
      choices.innerHTML = option('', sections.length ? 'Bitte auswählen' : 'Keine Vorschläge für diese Tiergruppe') + sections.map(([title, names]) => `<optgroup label="${esc(title)}">${options(names)}</optgroup>`).join('');
      choices.disabled = !sections.length;
      editor.querySelector('#species-options').innerHTML = sections.map(([, names]) => options(names)).join('');
      if ([...choices.options].some(entry => entry.value === species.value)) choices.value = species.value;
    }
    group.addEventListener('input', () => { status.hidden = true; refresh(); });
    species.addEventListener('change', () => {
      status.hidden = true;
      if (!group.value.trim() && [...choices.options].some(entry => entry.value && entry.value === species.value)) group.value = 'Spinne';
      refresh();
    });
    choices.addEventListener('change', () => {
      if (choices.value) {
        species.value = choices.value;
        species.dispatchEvent(new Event('change'));
      }
    });
    editor.querySelector('[data-action="remember-species"]').onclick = event => {
      const groupName = group.value.trim();
      const name = species.value.trim();
      if (!groupName || !name) return error('Zum Hinzufügen einer Art bitte Tiergruppe und Art eingeben.');
      save(current => rememberSpecies(current, groupName, name), event.currentTarget, () => {
        feedback.hidden = true;
        refresh();
        status.textContent = 'Art ist in der Auswahl verfügbar.';
        status.hidden = false;
      });
    };
    refresh();
  }

  function meal(date, id, existing) {
    const animals = state().animals.filter(animal => (!animal.archived && (!animal.moltStatus || animal.moltStatus === 'normal')) || animal.id === existing?.animalId);
    if (!animals.length) return manage('animals');
    const initial = animals.find(animal => animal.id === id) ?? animals[0];
    const foods = state().foods.filter(food => !food.archived);
    const standard = animalId => foods.find(food => food.id === animals.find(animal => animal.id === animalId)?.foodId);
    const selected = existing ? undefined : standard(initial.id);
    open(existing ? 'Fütterung bearbeiten' : 'Fütterung erfassen', form(`<label>Tier <select name="animalId">${animals.map(animal => option(animal.id, animal.name, initial.id)).join('')}</select></label><div class="form-row">${input('Datum', 'date', date, `type="date" max="${day()}" required`)}<label>Ergebnis <select name="result">${Object.entries(outcomes).map(([key, title]) => option(key, title, existing?.result ?? 'eaten')).join('')}</select></label></div><label>Vorlage <select name="template">${option('', 'Manuelle Eingabe', selected?.id)}${foods.map(food => option(food.id, foodLabel(food), selected?.id)).join('')}</select></label>${foodFields(existing?.food ?? selected)}`, existing ? button('delete', 'Löschen', 'class="danger"') : ''));
    const editor = body.querySelector('form');
    const apply = food => {
      if (food) Object.entries(snapshot(food)).forEach(([key, value]) => { editor.elements.namedItem(key).value = value; });
    };
    editor.elements.template.onchange = event => apply(foods.find(food => food.id === event.target.value));
    if (!existing) editor.elements.animalId.onchange = event => {
      const food = standard(event.target.value);
      if (food) { editor.elements.template.value = food.id; apply(food); }
      else if (editor.elements.template.value) {
        editor.elements.template.value = '';
        for (const key of ['name', 'amount', 'unit', 'supplement', 'note']) editor.elements.namedItem(key).value = '';
      }
    };
    body.onclick = event => {
      const control = event.target.closest('[data-action="delete"]');
      if (control && existing && confirm('Diese Fütterung löschen?')) remove(existing.id, control);
    };
    editor.onsubmit = event => {
      event.preventDefault();
      const get = read(editor);
      const record = { id: existing?.id ?? uuid(), date: get('date'), animalId: get('animalId'), result: get('result'), food: readFood(get) };
      save(current => ({ ...current, meals: upsert(current.meals, record) }), event.submitter, () => { modal.close(); recorded(existing ? '' : record.id); });
    };
  }

  function backup() {
    open('Datensicherung', `${button('export', 'Komplettexport (JSON)')}<div class="item"><label>Importmodus <select id="mode"><option value="merge">Zusammenführen</option><option value="replace">Alles ersetzen</option></select></label><label>JSON-Datei <input id="import" type="file" accept=".json,application/json"></label></div><p class="muted">Beim Zusammenführen bleiben lokale Abweichungen erhalten. Löschungen werden nicht übertragen. „Alles ersetzen“ übernimmt die Sicherung vollständig.</p>`);
    body.onclick = async event => {
      const control = event.target.closest('[data-action="export"]');
      if (!control) return;
      control.disabled = true;
      try {
        const data = await exportState();
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `futterplan-${day()}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch { error('Die gespeicherten Daten konnten nicht exportiert werden.'); }
      finally { control.disabled = false; }
    };
    body.querySelector('#import').onchange = async event => {
      const control = event.target;
      const file = control.files[0];
      const replace = body.querySelector('#mode').value === 'replace';
      control.value = '';
      if (!file) return;
      try {
        const incoming = validate(JSON.parse(await file.text()));
        if (!modal.open || !body.contains(control)) return;
        if (replace && !confirm('Alle vorhandenen Futterplan-Daten durch diese Sicherung ersetzen?')) return;
        let report;
        save(current => {
          if (replace) return incoming;
          report = merge(current, incoming);
          return report.data;
        }, control, () => {
          modal.close();
          imported(replace ? 'Sicherung vollständig wiederhergestellt.' : `${report.added} Datensätze ergänzt. ${report.conflicts} Konflikte: lokale Daten beibehalten.`);
        });
      } catch (failure) { error(`Import abgebrochen. ${failure.message}`); }
    };
  }

  function manageEnclosures() {
    const items = state().enclosures;
    open('Terrarien', button('new-enclosure', '+ Terrarium', 'class="primary"') + (items.length ? items.map(item => `<article class="item"><div><h3>${esc(item.name)}</h3><small>${esc([item.location, item.type, item.archived ? 'Archiviert' : ''].filter(Boolean).join(' · '))}</small></div><div class="actions">${button('edit-enclosure', 'Bearbeiten', idAttr(item.id))}${button('archive-enclosure', item.archived ? 'Reaktivieren' : 'Archivieren', idAttr(item.id))}</div></article>`).join('') : blank('Noch keine Terrarien angelegt.')));
    body.onclick = event => {
      const control = event.target.closest('button');
      if (!control) return;
      const item = items.find(entry => entry.id === control.dataset.id);
      if (control.dataset.action === 'new-enclosure' || control.dataset.action === 'edit-enclosure') enclosure(item);
      if (control.dataset.action === 'archive-enclosure') save(current => ({ ...current, enclosures: current.enclosures.map(entry => entry.id === item.id ? { ...entry, archived: !entry.archived } : entry) }), control, manageEnclosures);
    };
  }

  function enclosure(item) {
    open(item ? 'Terrarium bearbeiten' : 'Terrarium hinzufügen', form(`${input('Bezeichnung', 'name', item?.name, 'required maxlength="100"')}${input('Standort / Raum / Regal / Fach', 'location', item?.location, 'maxlength="150"')}${input('Terrarientyp', 'type', item?.type, 'maxlength="100"')}${input('Substrat und Tiefe', 'substrate', item?.substrate, 'maxlength="150"')}${input('Sicherheitshinweis (optional)', 'safety', item?.safety, 'maxlength="200"')}${note(item?.note)}`));
    body.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const get = read(event.currentTarget);
      const record = { id: item?.id ?? uuid(), archived: item?.archived ?? false, name: get('name'), location: get('location'), type: get('type'), substrate: get('substrate'), safety: get('safety'), note: get('note') };
      save(current => ({ ...current, enclosures: upsert(current.enclosures, record) }), event.submitter, manageEnclosures);
    };
  }

  function molt(animalId = '') {
    const animals = state().animals.filter(animal => !animal.archived);
    const phases = [['premolt_suspected', 'Vorhäutung vermutet'], ['premolt_confirmed', 'Vorhäutung bestätigt'], ['molting', 'Häutung läuft'], ['hardening', 'Frisch gehäutet / Aushärtung']];
    if (!animals.length) return manage('animals');
    open('Häutungsstatus dokumentieren', form(`<label>Tier <select name="animalId">${animals.map(animal => option(animal.id, animal.name, animalId || animals[0].id)).join('')}</select></label><div class="form-row">${input('Datum', 'date', day(), 'type="date" required')}<label>Status <select name="status">${phases.map(([key, title]) => option(key, title, 'hardening')).join('')}</select></label></div>${note('')}`));
    body.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const get = read(event.currentTarget);
      const entry = { id: uuid(), animalId: get('animalId'), date: get('date'), status: get('status'), hardened: false, note: get('note') };
      save(current => ({ ...current, molts: [...current.molts, entry], animals: current.animals.map(animal => animal.id === entry.animalId ? { ...animal, moltStatus: entry.status, moltReady: false, moltId: entry.status === 'hardening' ? entry.id : '' } : animal) }), event.submitter, () => { modal.close(); });
    };
  }

  function confirmHardening(animalId, control) {
    save(current => {
      const animal = current.animals.find(entry => entry.id === animalId);
      const latestHardening = current.molts.filter(entry => entry.animalId === animalId && entry.status === 'hardening' && !entry.hardened).sort((left, right) => right.date.localeCompare(left.date))[0];
      const moltId = animal?.moltId || latestHardening?.id;
      return { ...current, animals: current.animals.map(entry => entry.id === animalId ? { ...entry, moltStatus: 'normal', moltReady: true, moltId: '' } : entry), molts: current.molts.map(entry => entry.id === moltId ? { ...entry, hardened: true, hardenedAt: day() } : entry) };
    }, control, () => {});
  }

  function task() {
    const animals = state().animals.filter(animal => !animal.archived);
    open('Pflegeaufgabe', form(`<label>Aufgabe <select name="title">${['Wasser prüfen / erneuern', 'Substratfeuchtigkeit prüfen', 'Klima messen', 'Futtertier entfernen', 'Terrarium reinigen', 'Gesundheitskontrolle', 'Individuelle Aufgabe'].map(value => option(value, value)).join('')}</select></label><label>Tier (optional) <select name="animalId">${option('', 'Kein bestimmtes Tier')}${animals.map(animal => option(animal.id, animal.name)).join('')}</select></label>${input('Fällig am', 'due', day(), 'type="date" required')}<label>Wiederholung <select name="repeat">${[['none', 'Einmalig'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich'], ['monthly', 'Monatlich'], ['interval', 'Alle X Tage']].map(([key, title]) => option(key, title)).join('')}</select></label><label id="repeat-every" hidden>Alle X Tage<input name="every" type="number" min="1" max="3650" value="1"></label>${input('Notiz', 'note', '', 'maxlength="1000"')}`));
    const editor = body.querySelector('form');
    editor.elements.repeat.onchange = event => { body.querySelector('#repeat-every').hidden = event.target.value !== 'interval'; };
    editor.onsubmit = event => {
      event.preventDefault();
      const get = read(editor);
      const entry = { id: uuid(), title: get('title'), animalId: get('animalId'), due: get('due'), note: get('note'), done: false, completedAt: '', repeat: get('repeat'), every: Number(get('every')), completions: [] };
      save(current => ({ ...current, tasks: [...current.tasks, entry] }), event.submitter, () => { modal.close(); });
    };
  }

  function qrLabel(enclosureId) {
    const enclosure = state().enclosures.find(item => item.id === enclosureId);
    if (!enclosure) return error('Terrarium nicht mehr vorhanden.');
    const residents = state().animals.filter(animal => animal.enclosureId === enclosure.id && !animal.archived);
    const target = new URL(window.location.href);
    target.search = '';
    target.hash = '';
    target.searchParams.set('terrarium', enclosure.id);
    const code = qrcode(0, 'M');
    code.addData(target.toString());
    code.make();
    open('QR-Etikett', `<article class="print-label"><div class="label-copy"><p class="eyebrow">FUTTERPLAN · TERRARIUM</p><h2>${esc(enclosure.name)}</h2><p>Terrarium-ID: ${esc(enclosure.id)}</p><p>${esc(enclosure.location)}</p>${residents.map(animal => `<p class="label-animal"><strong>${esc(animal.name)}</strong>${animal.species ? ` · ${esc(animal.species)}` : ''}</p>`).join('')}${enclosure.safety ? `<p class="label-safety">${esc(enclosure.safety)}</p>` : ''}<a href="${esc(target.toString())}">${esc(target.toString())}</a></div><div class="qr-code" aria-label="QR-Code für ${esc(enclosure.name)}">${code.createSvgTag({ cellSize: 5, margin: 4, scalable: true })}</div></article><div class="actions print-actions"><button type="button" data-action="print-qr">Etikett drucken</button></div>`);
  }

  function journal(kind) {
    const animals = state().animals.filter(animal => !animal.archived);
    if (!animals.length) return manage('animals');
    const animalField = `<label>Tier <select name="animalId">${animals.map(animal => option(animal.id, animal.name)).join('')}</select></label>`;
    const forms = {
      observation: `${animalField}${input('Datum', 'date', day(), 'type="date" required')}<label>Kategorie <select name="category">${['Normal aktiv', 'Ungewöhnlich inaktiv', 'Futterverweigerung', 'Auffällige Körperhaltung', 'Auffälligkeiten der Bewegung', 'Verletzung', 'Auffälligkeit nach Häutung', 'Auffälliges Abdomen', 'Dehydrierung vermutet', 'Parasitenverdacht', 'Schimmel im Terrarium', 'Sonstige Beobachtung'].map(value => option(value, value)).join('')}</select></label>${note('')}`,
      reading: `${animalField}${input('Datum', 'date', day(), 'type="date" required')}<div class="form-row">${input('Temperatur (°C)', 'temperature', '', 'type="number" step="any"')}${input('Luftfeuchte (%)', 'humidity', '', 'type="number" min="0" max="100" step="any"')}</div>${note('')}`,
      measurement: `${animalField}${input('Datum', 'date', day(), 'type="date" required')}<div class="form-row">${input('Körperlänge (mm)', 'length', '', 'type="number" min="0" step="any"')}${input('Beinspannweite (mm)', 'span', '', 'type="number" min="0" step="any"')}</div>${input('Gewicht (g)', 'weight', '', 'type="number" min="0" step="any"')}${note('')}`,
    };
    const titles = { observation: 'Beobachtung erfassen', reading: 'Klimawert erfassen', measurement: 'Wachstumsmessung erfassen' };
    open(titles[kind], form(forms[kind]));
    body.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const get = read(event.currentTarget);
      const common = { id: uuid(), animalId: get('animalId'), date: get('date'), note: get('note') };
      const entry = kind === 'observation' ? { ...common, category: get('category') } : kind === 'reading' ? { ...common, temperature: get('temperature'), humidity: get('humidity') } : { ...common, length: get('length'), span: get('span'), weight: get('weight') };
      const key = { observation: 'observations', reading: 'readings', measurement: 'measurements' }[kind];
      save(current => ({ ...current, [key]: [...current[key], entry] }), event.submitter, () => { modal.close(); });
    };
  }
  return { manage, meal, backup, error, manageEnclosures, molt, confirmHardening, task, journal, qrLabel };
}