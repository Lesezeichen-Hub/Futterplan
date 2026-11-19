# Futterplan

Statisches Modul für den Lesezeichen-Hub zur Fütterungsplanung und Dokumentation von Reptilien, Spinnen und anderen Tieren. Es benötigt im Hub weder einen eigenen Dienst noch einen Build.

## Im Hub einbinden

Im Lesezeichen-Hub **Hinzufügen → Lokales Modul** wählen und den Projektordner mit `index.html` registrieren. Das erzeugte Start-Lesezeichen öffnet den Futterplan. Für eine ZIP-Installation die Moduldateien in einen gemeinsamen Archiv-Oberordner (`Futterplan/`) legen und das ZIP über eine HTTP(S)-Quelle im Hub importieren. `node_modules`, Tests und die Vorschau sind dafür nicht nötig.

## Nutzung

1. Über **Futtervorlagen** wiederverwendbare Futtersorten samt Menge, Einheit, Supplement und Notiz anlegen.
2. Unter **Tiere** ein Profil anlegen und optional eine Standardvorlage und einen frei gewählten Fütterungsrhythmus hinterlegen.
3. Unter **Heute** die Standardvorlage per Klick als gefressen buchen. Für Verweigerung, Teilannahme oder abweichendes Futter die Fütterung manuell erfassen. Woche und Monat erlauben Nachträge und Korrekturen.

Ein verweigerter Versuch verschiebt die Fälligkeit nicht. In der Statistik zählen vollständige und teilweise Annahmen als angenommen; geplante Termine fließen nicht in die Quote ein. Die App gibt keine Fütterungsempfehlungen.

## Sicherung und Austausch

**Daten → Komplettexport (JSON)** enthält sämtliche Tiere, Vorlagen und Fütterungen inklusive Archiv und Planungsdaten. Historische Futterdetails bleiben auch bei Änderungen an einer Vorlage erhalten. Das Theme ist eine lokale Darstellungspräferenz.

- **Zusammenführen** ergänzt unbekannte Datensätze anhand ihrer IDs. Wiederholte Importe erzeugen keine Duplikate. Bei abweichenden Datensätzen mit gleicher ID bleibt die lokale Fassung bestehen; der Import zeigt die Zahl der Konflikte. Löschungen werden nicht übertragen. Das ist manueller Austausch, keine automatische bidirektionale Synchronisation.
- **Alles ersetzen** übernimmt den exportierten Stand exakt, auch wenn dadurch lokale Datensätze wegfallen. Vorher am Ziel einen eigenen Export erstellen.

Die Daten liegen in IndexedDB pro Browserprofil und Web-Origin (Protokoll, Host und Port), nicht im Hub-Backup. Die Modul-ID spielt für den Speicher keine Rolle. Beim Wechsel der Hub-Adresse oder des Browserprofils die Daten als JSON übertragen.

## Entwicklung

Unter Windows mit Node.js und Edge:

```powershell
npm.cmd ci
npm.cmd start
npm.cmd test
npm.cmd run test:browser
```

Vorschau: http://127.0.0.1:18784/

## Funktionsrecherche

[Arachnifiles](https://www.arachnifiles.com/) dient als Vergleich für Futter und Ergebnis im Protokoll; [Husbandry.Pro](https://husbandry.pro/) für die getrennte Fütterungsplanung mit Kalender; [Reptile Buddy](https://reptile-buddy.com/features/) für Tierprofile und individuelle Historien.