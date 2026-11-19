import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('bietet Spinnen per Schnellauswahl an und überträgt eigene Arten ohne Tierprofil', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByText('Keine aktiven Tiere für diese Auswahl.')).toBeVisible();
  const dialog = page.getByRole('dialog');
  const openProfile = async () => {
    await page.getByRole('button', { name: 'Tiere', exact: true }).click();
    await dialog.getByRole('button', { name: '+ Tier' }).click();
  };
  await openProfile();
  const picker = dialog.getByLabel('Art auswählen');
  const species = dialog.getByLabel('Art', { exact: true });
  const group = dialog.getByLabel('Tiergruppe');
  await expect(picker.locator('option')).not.toHaveCount(1);
  const garden = 'Gartenkreuzspinne (Araneus diadematus)';
  await picker.selectOption(garden);
  await expect(species).toHaveValue(garden);
  await expect(group).toHaveValue('Spinne');
  await picker.selectOption('Große Hauswinkelspinne (Eratigena atrica)');
  await expect(species).toHaveValue('Große Hauswinkelspinne (Eratigena atrica)');
  await group.fill('Reptil');
  await expect(picker).toBeDisabled();
  await species.fill('Eigene Testart');
  await dialog.getByRole('button', { name: 'Art zur Auswahl hinzufügen' }).click();
  await expect(dialog.getByRole('status')).toContainText('Art ist in der Auswahl verfügbar.');
  await page.reload();
  await expect(page.getByText('Keine aktiven Tiere für diese Auswahl.')).toBeVisible();
  await openProfile();
  await group.fill('Reptil');
  await picker.selectOption('Eigene Testart');
  await expect(species).toHaveValue('Eigene Testart');
  await group.fill('Spinne');
  await expect(picker.locator('option[value="Eigene Testart"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await page.getByRole('button', { name: 'Daten', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Komplettexport (JSON)' }).click();
  const payload = await readFile(await (await downloaded).path());
  const backup = JSON.parse(payload);
  expect(backup.animals).toHaveLength(0);
  expect(backup.species).toMatchObject([{ group: 'Reptil', name: 'Eigene Testart' }]);

  const target = await browser.newPage();
  try {
    await target.goto(page.url());
    await expect(target.getByText('Keine aktiven Tiere für diese Auswahl.')).toBeVisible();
    const targetDialog = target.getByRole('dialog');
    await target.getByRole('button', { name: 'Daten', exact: true }).click();
    await targetDialog.getByLabel('JSON-Datei').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: payload });
    await expect(target.getByRole('status')).toContainText('1 Datensätze ergänzt');
    await target.getByRole('button', { name: 'Tiere', exact: true }).click();
    await targetDialog.getByRole('button', { name: '+ Tier' }).click();
    await targetDialog.getByLabel('Tiergruppe').fill('Reptil');
    await targetDialog.getByLabel('Art auswählen').selectOption('Eigene Testart');
    await expect(targetDialog.getByLabel('Art', { exact: true })).toHaveValue('Eigene Testart');
  } finally { await target.close(); }
});

test('bucht, korrigiert, wertet aus und tauscht einen vollständigen Bestand aus', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Keine aktiven Tiere für diese Auswahl.')).toBeVisible();
  const dialog = page.getByRole('dialog');
  await page.getByRole('button', { name: 'Futtervorlagen' }).click();
  await dialog.getByRole('button', { name: '+ Vorlage' }).click();
  await dialog.getByLabel('Futter', { exact: true }).fill('Heimchen');
  await dialog.getByLabel('Menge').fill('2');
  await dialog.getByLabel('Einheit / Größe').fill('Stück');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByRole('heading', { name: '2 Stück Heimchen' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen' }).click();
  await page.getByRole('button', { name: 'Tiere', exact: true }).click();
  await dialog.getByRole('button', { name: '+ Tier' }).click();
  await dialog.getByLabel('Name', { exact: true }).fill('Nori');
  await dialog.getByLabel('Tiergruppe').fill('Spinne');
  await dialog.getByLabel('Standardvorlage').selectOption({ label: '2 Stück Heimchen' });
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByRole('heading', { name: 'Nori' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen' }).click();

  const quick = page.getByRole('button', { name: 'Gefressen · 2 Stück Heimchen' });
  await quick.focus();
  await quick.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Fütterung gespeichert.');
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByRole('status')).toHaveText('Fütterung entfernt.');
  await quick.click();
  await expect(page.getByRole('heading', { name: 'Nori · 2 Stück Heimchen' })).toBeVisible();
  await page.getByLabel('Design').selectOption('spider');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'spider');
  await expect(page.getByRole('heading', { name: 'Nori · 2 Stück Heimchen' })).toBeVisible();
  await page.getByLabel('Tiergruppe').selectOption('Spinne');
  await page.getByRole('button', { name: 'Woche', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Monat', exact: true }).click();
  await expect(page.getByLabel('Tiergruppe')).toHaveValue('Spinne');
  await page.locator('.calendar button[aria-pressed=true]').click();
  await page.getByRole('button', { name: '+ Fütterung' }).click();
  await dialog.getByLabel('Ergebnis').selectOption('refused');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).not.toBeVisible();
  const monthCell = page.locator('.calendar button[aria-pressed=true]');
  const date = await monthCell.getAttribute('data-date');
  for (const cell of [monthCell, page.locator(`.week button[data-date="${date}"][data-id]`)]) {
    await expect(cell).toHaveClass(/has-meals/);
    await expect(cell.locator('.mark.eaten')).toHaveText('✓1');
    await expect(cell.locator('.mark.refused')).toHaveText('×1');
    await expect(cell).toHaveAccessibleName(/Gefressen: 1, Verweigert: 1/);
    await expect(page.locator('.day-detail article')).toHaveCount(2);
    if (cell === monthCell) await page.getByRole('button', { name: 'Woche', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Statistik', exact: true }).click();
  await expect(page.locator('.metrics')).toContainText('50');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Daten', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Komplettexport (JSON)' }).click();
  const payload = await readFile(await (await downloaded).path());
  expect(JSON.parse(payload).meals).toHaveLength(2);
  const other = await context.browser().newContext();
  try {
    const target = await other.newPage();
    await target.goto(page.url());
    await expect(target.getByText('Keine aktiven Tiere für diese Auswahl.')).toBeVisible();
    const backup = target.getByRole('dialog');
    const open = () => target.getByRole('button', { name: 'Daten', exact: true }).click();
    const upload = buffer => backup.getByLabel('JSON-Datei').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer });
    await open();
    await upload(Buffer.from('{}'));
    await expect(backup.getByRole('alert')).toContainText('Import abgebrochen');
    await upload(payload);
    await expect(target.getByRole('status')).toContainText('4 Datensätze ergänzt');
    await open();
    await upload(payload);
    await expect(target.getByRole('status')).toContainText('0 Datensätze ergänzt');
    await open();
    await backup.getByLabel('Importmodus').selectOption('replace');
    target.once('dialog', message => message.accept());
    await upload(payload);
    await expect(target.getByRole('status')).toContainText('vollständig wiederhergestellt');
  } finally { await other.close(); }
  expect(errors).toEqual([]);
});