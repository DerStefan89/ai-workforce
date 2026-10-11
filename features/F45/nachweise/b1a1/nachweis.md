# F45 B1a-1 — Nachweis „eigener Arbeitsordner je Ablauf“

Stand 11.10.2026, Branch `feat/f45-b1a1-arbeitsordner` (Basis `387f1a3`), eigener Leitstand auf Port 4199
(`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`), danach beendet. Rohprotokoll:
`realer-ablauf.json` (Skripte `realer-ablauf.mjs`, `korrekturlauf.mjs`), erster gescheiterter Versuch:
`realer-ablauf-versuch1-maxpath.json`. Render-Nachweis: `render/` (`render/erzeuge-nachweis.mjs`).

Die Freigaben der ZWINGEND-Schritte hat Claude Code im Auftrag des Bauauftrags B1a-1 („realer Nachweis“) über die
echte Route erteilt; die Begründungen sagen das. Der Testablauf wird nicht gemergt; seine Abnahme bleibt offen bei
Stefan.

## Ablauf b1a1-nachweis-325d2a8f (Standard-Kette)

| Schritt | Ergebnis |
|---|---|
| Anzeige vor dem Start | `arbeitsordner.status = fehlt`, Pfad `C:\Users\stefa\Projekte\ai-workforce-laeufe\2b0ee56dff`, Branch `wf/b1a1-nachweis-325d2a8f` |
| Freigabe 1 | `202 { vorbereitung: true }` — nichts am Workflow geschrieben (Version 1 bleibt) |
| Vorbereitung | BEREIT nach 54,7 s Wanduhr: **worktree add 14,7 s**, **npm ci 38,5 s** (`--ignore-scripts`, 8 Pakete), **E-183-Vorprüfung 0,3 s** (grün gegen die Settings des Worktrees); Basis `387f1a3e` |
| Freigabe 2 | 202, Lauf `af862c09` startet; `startfreigabe_geprueft` (E-183 im Worktree, E-188 unverändert `process.cwd()`) |
| Ausführung (claude-code) | ERFOLGREICH nach 5,5 min; Änderung nur im Worktree (`docs/kommentar-standard.md`); endete vorzeitig mit „warte auf Benachrichtigung“ (eigener `npm run check` im Hintergrund) → kein `zu_loeschen`-Block (**F-1026**) |
| Prüfschritt im Worktree | `npm run check` GRÜN (Exit 0) |
| Review (Codex) im Worktree | Shell meldet `C:\Users\stefa\Projekte\ai-workforce-laeufe\2b0ee56dff`; Urteil BLOCKIERT: „Löschliste nicht belegt“ — korrekt |
| Korrekturschleife | Schritt 1 zurück auf OFFEN (ZWINGEND); Freigabe → Lauf `add92616` startet **ohne** neue Vorbereitung, Vorbedingung im Worktree mit offenen Änderungen (nur Branch, E-F45-5) bestanden |
| Korrekturlauf | ERFOLGREICH; **Löschliste ausgeführt**: `geloescht: [public/leitstand/views/runs-dialog.test.mjs]`, `abgelehnt: []`; Änderungsübersicht: `docs/kommentar-standard.md` GEAENDERT (+1), `runs-dialog.test.mjs` GELOESCHT (−524) |
| Prüfschritt / Review | GRÜN / BEREIT („Löschliste nachgewiesen“); Workflow ABGESCHLOSSEN, Abnahme offen (Stefan) |
| Gesamtdauer | 14,7 min (erste Runde) + 9,4 min (Korrektur) |

## Projektordner vorher/nachher

`git status --porcelain --untracked-files=all` ohne `kontrollzustand/` und ohne die Nachweisdateien dieses Ordners,
dazu Branch und HEAD:

- Vorher: 38 Zeilen (die nicht committeten Bauänderungen von B1a-1), Branch `feat/f45-b1a1-arbeitsordner`, HEAD
  `387f1a3`.
- Nach der ersten Runde: **dieselben 38 Zeilen**, Branch und HEAD gleich; abweichend nur die `--stat`-Zeilenzahlen der
  vier i18n-Dateien — meine eigene Ergänzung (Schlüssel „Kurzname“) während des Laufs, nicht der Ablauf.
- Nach dem Korrekturlauf (ohne Eingriff von mir im Zeitraum): **identisch** (`unveraendert: true`).
- Grenze des Vergleichs: porcelain und `git diff --stat`, keine Inhalts-Hashes — eine zeilenneutrale Änderung an einer der
  ohnehin geänderten Dateien sähe er nicht.
- Im Projektordner existieren `public/leitstand/views/runs-dialog.test.mjs` und der unveränderte
  `docs/kommentar-standard.md` weiter.

## Aufräumen

(Vor der Korrekturrunde des Prüfpasses; seither verweigert der Server das Aufräumen eines ABGESCHLOSSENEN Ablaufs, solange
die Abnahme offen ist — hier lag die Abnahme noch bei Stefan.)

- Ohne Verwerfen: **409** „Der Arbeitsordner hat noch nicht gesicherte Änderungen … (git: … contains modified or
  untracked files)“ — Ordner bleibt.
- Mit Verwerfen: **200** in 3,1 s, `branchGeloescht: true` (nichts committet → gemergt), Worktree weg, Branch weg.
- Erster, gescheiterter Versuch (FEHLGESCHLAGEN): Aufräumen 200, Hinweis „Branch existiert nicht mehr“ (den
  Branch hatte ich nach dem Fehlschlag von Hand gelöscht — mit `git branch -D`; er stand auf `387f1a3` ohne eigene
  Commits).
- `git worktree list` danach: nur die bestehenden Worktrees; `ai-workforce-laeufe` leer (F-1028 b).

## Erster Versuch (b1a1-nachweis-72fdac22): Windows-Pfadgrenze

`git worktree add` scheiterte nach 241 s an „Filename too long“ (eingecheckte Kontrollzustand-Dateien bis 195
Zeichen + Worktree-Pfad mit voller Ablauf-ID). Der Fehlertext zeigte nur Fortschrittszeilen. Behoben: Ordnername =
Hash-Kurzname, Vorprüfung der Pfadlänge, `--quiet`, Fehlerzeilen im Grund (**F-1025**). Die Vorbereitung hat den
Workflow dabei nicht verändert (Halt nur im Arbeitsordner-Artefakt, Plan v2 d).

## Render-Nachweis (`render/`, nach der Korrekturrunde neu erzeugt)

| Folge | Inhalt |
|---|---|
| `freigabe-real-de-1440` | echte Freigabe-Seite, Karte „Wo gearbeitet wird“: Branch, Arbeitsordner (Kurzname), „aktueller Commit beim Start · 387f1a3“, „N offene Änderungen — blockieren nicht“ |
| `freigabe-vorbereitung/bereit/fehlgeschlagen-de-1440`, `freigabe-bestand-de-1440` | Zustände über feste Antwort (Rest des Detail echt); fehlgeschlagen mit „Nächster Schritt“ |
| `freigabe-fehlgeschlagen-ru-390-hell`, `freigabe-bereit-de-390`, `freigabe-bereit-de-1440-zoom200` | schmal, hell, ru, 200 %; langer Grund/Pfad bricht um |
| `abnahme-aufgeraeumt-de-1440` | echte Abnahme-Seite des Nachweis-Ablaufs: Karte offen, „Aufgeräumt — Branch gelöscht“, „Löschliste: 1 gelöscht, 0 abgelehnt“ |
| `abnahme-bereit-offen-de-1440` | Abnahme offen, Ordner bereit: Sichern-Hinweis, kein Aufräumen-Knopf |
| `detail-aufraeumen-de-1440`, `detail-aufraeumen-de-390` | gestoppter Ablauf: Lage und Knopf, Dialog (Pflichtbegründung, „verwerfen“, danger-Knopf), Bestätigen ohne Begründung → Hinweis |
| `auftrag-anlegen-de-1440` | „Projektordner“ und „Eigener Arbeitsordner“ (Musterpfad vollständig), geänderte Warnung |
| `code-liste-de-1440`, `code-liste-de-390-hell` | Seite Code, Liste der Arbeitsordner (aufgeräumt) |
