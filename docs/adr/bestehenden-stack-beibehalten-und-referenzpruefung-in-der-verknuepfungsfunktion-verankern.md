# ADR-0005 — Bestehenden Stack beibehalten und Referenzprüfung in der Verknüpfungsfunktion verankern

**Datum:** 2026-09-23
**Status:** Vorschlag

## Kontext

Die Erweiterung betrifft ausschließlich neue Sparring-Auftragsrückverweise.
Laut Planungsauftrag bleiben Dateien und Git der führende Zustand; bestehende
projektbezogene Lade- und Zugriffsfunktionen sowie der API-Fehlermechanismus
sind zu verwenden. Der konkrete Repository-Stand wurde für diesen Entwurf
nicht geprüft.

## Optionen

1. **Gewählt** — Bestehenden Stack ohne zusätzliche Infrastruktur
   fortführen; Existenzprüfungen in `verknuepfeSparringAuftrag` verankern
   (siehe Entscheidung unten).
2. Existenzprüfungen ausschließlich im HTTP-Endpunkt: schützt diesen
   Einstieg, lässt direkte Aufrufe der Verknüpfungsfunktion jedoch
   ungesichert.
3. Zusätzliche Datenbank mit Fremdschlüsseln: würde Infrastruktur und
   Datenhaltung verändern und überschreitet den beauftragten Umfang.
4. Nachträgliche Prüfung und Bereinigung gespeicherter Rückverweise:
   verhindert ungültige Neuschreibungen nicht und ist ausdrücklich
   ausgeschlossen.

## Entscheidung

Den bestehenden Stack ohne zusätzliche Infrastruktur fortführen. Die
bestehende Formprüfung der `auftragId` erhalten. In
`verknuepfeSparringAuftrag` zuerst die Existenz des Sparring-Laufs,
anschließend die Existenz des Auftrags im jeweiligen Projektkontext prüfen.
Erst nach erfolgreicher Formprüfung und beiden erfolgreichen
Existenzprüfungen den bestehenden Speicherpfad ausführen. Ein fehlender
Datensatz führt zu einem unterscheidbaren Fehler mit verständlichem Bezug auf
Sparring-Lauf beziehungsweise Auftrag. `POST /api/sparring/<laufId>/auftrag`
verwendet diese abgesicherte Funktion und übersetzt deren Fehler über den
bestehenden API-Fehlermechanismus. Konkrete Fehlercodes und
HTTP-Statuscodes werden nach Prüfung der vorhandenen Konventionen
festgelegt.

## Begründung

Existenzprüfungen im gemeinsamen Prüfpunkt `verknuepfeSparringAuftrag`
schützen sowohl den HTTP-Endpunkt als auch jeden direkten Aufrufer, ohne
neue Infrastruktur oder ein neues Datenmodell einzuführen — der schmalste
Eingriff, der alle Akzeptanzkriterien des Planungsauftrags erfüllt.

## Konsequenzen

- Die Verknüpfungsfunktion wird zum gemeinsamen Prüfpunkt für neue
  Rückverweise; zusätzliche Module und Änderungen am gespeicherten
  Datenformat sind nicht vorgesehen.
- Bei unbekannter `laufId` erfolgen keine Speicherung und keine Anlage
  eines Ersatzdatensatzes. Bei unbekannter `auftragId` bleibt ein
  vorhandener Rückverweis unverändert.
- Technische Lesefehler werden über die bestehenden Fehlerpfade
  weitergegeben und nicht pauschal als unbekannte ID ausgegeben; auch dann
  erfolgt keine Speicherung.
- Automatisierte Tests prüfen einen unbekannten Lauf bei existierendem
  Auftrag, einen unbekannten Auftrag bei existierendem Lauf mit bereits
  gesetztem Rückverweis und eine gültige Verknüpfung. Fehlerantworten und
  unveränderter persistierter Zustand sind nachzuweisen.
- Tests der Verknüpfungsfunktion sichern den zentralen Prüfpunkt ab;
  Endpunkttests sichern verständliche Fehler und deren HTTP-Abbildung ab.
  Die vorhandene Formprüfung bleibt durch passende Regressionstests
  geschützt.
- Die Prüfungen garantieren die Existenz zum Prüfzeitpunkt. Ob vorhandene
  Schreib- und Löschpfade stärkere Konsistenz gewährleisten, ist im
  Repository zu prüfen; neue Sperr- oder Transaktionsmechanismen sind
  durch diesen Auftrag nicht begründet.
- Existenzprüfungen allein schließen Änderungen zwischen Prüfung und
  Speicherung nicht aus. Ohne belegten zusätzlichen Bedarf rechtfertigt der
  Auftrag keine neuen Sperr-, Transaktions- oder Lebenszyklusmechanismen.
