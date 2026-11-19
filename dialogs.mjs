import { day, merge, outcomes, snapshot, validate } from './model.mjs';
import { blank, button, esc, foodLabel, idAttr, option } from './views.mjs';

const input = (label, name, value = '', attrs = '') => `<label>${label}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
const note = value => `<label>Notiz<textarea name="note" rows="2" maxlength="1000">${esc(value)}</textarea></label>`;
const foodFields = (food = {}) => `${input('Futter', 'name', food.name, 'required maxlength="100"')}<div class="form-row">${input('Menge', 'amount', food.amount, 'type="number" min="0.000001" step="any"')}${input('Einheit / Größe', 'unit', food.unit, 'maxlength="50"')}</div>${input('Supplement', 'supplement', food.supplement, 'maxlength="100"')}${note(food.note)}`;
const form = (fields, extra = '') => `<form class="fields">${fields}<div class="actions"><button class="primary" type="submit">Speichern</button>${extra}</div></form>`;
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
    const fields = animal ? `${input('Name', 'name', item?.name, 'required maxlength="100"')}${input('Tiergruppe', 'group', item?.group, 'required list="groups" maxlength="80"')}<datalist id="groups">${[...new Set(['Spinne', 'Reptil', 'Amphibie', 'Andere', ...state().animals.map(entry => entry.group)])].map(value => option(value, value)).join('')}</datalist>${input('Art', 'species', item?.species, 'maxlength="100"')}${input('Terrarium / Standort', 'location', item?.location, 'maxlength="100"')}<label>Standardvorlage <select name="foodId">${option('', 'Keine', item?.foodId)}${state().foods.filter(food => !food.archived || food.id === item?.foodId).map(food => option(food.id, `${foodLabel(food)}${food.archived ? ' (Archiv)' : ''}`, item?.foodId)).join('')}</select></label><div class="form-row">${input('Erster Futtertermin', 'first', item?.first, 'type="date"')}${input('Intervall (Tage)', 'interval', item?.interval || '', 'type="number" min="1" max="3650"')}</div>${note(item?.note)}` : foodFields(item);
    open(animal ? (item ? 'Tier bearbeiten' : 'Tier hinzufügen') : (item ? 'Vorlage bearbeiten' : 'Vorlage hinzufügen'), form(fields));
    body.onclick = null;
    body.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const get = read(event.currentTarget);
      if (animal && Boolean(get('first')) !== Boolean(get('interval'))) return error('Ersten Termin und Intervall gemeinsam eintragen oder beide leer lassen.');
      const values = animal ? { name: get('name'), group: get('group'), species: get('species'), location: get('location'), foodId: get('foodId'), first: get('first'), interval: Number(get('interval')), note: get('note') } : readFood(get);
      const record = { id: item?.id ?? uuid(), archived: item?.archived ?? false, ...values };
      save(current => ({ ...current, [kind]: upsert(current[kind], record) }), event.submitter, () => manage(kind));
    };
  }

  function meal(date, id, existing) {
    const animals = state().animals.filter(animal => !animal.archived || animal.id === existing?.animalId);
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
  return { manage, meal, backup, error };
}