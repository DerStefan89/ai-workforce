# Journal — F33

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-22 — WS-2 umgesetzt (AK8, AK9), Status weiterhin IN_ARBEIT

Vorherige Workstreams (WS-0 Spike, WS-1 Projektkontext als Repo-Dateien)
liefen vor Anlage dieser Journal-Datei — siehe `feature.md` Workstreams-
Abschnitt und `features/F33/spike-setting-sources.md`/
`features/F33/nachweis-projektkontext.md` für deren Belege.

WS-2 baut ausschließlich die SICHTBARE Roadmap fürs Workboard — die "Wo
stehen wir?"-ANTWORT liefert bereits F40 (Lagebild als Context-Builder-
Einspeisung, `docs/STATUS.md`, F40 `ABGESCHLOSSEN`); kein Chat, kein
Prompt-Umbau in diesem Workstream.

- **AK8** — neues Modul `scripts/leitstand/routen-roadmap.mjs`
  (`baueRoadmapProjektion`, Muster `routen-verbrauch.mjs`): wirft nie —
  fehlende `roadmap.json` → `{ status: 'nicht_vorhanden' }`, ein
  Schemaverstoß (`validiereRoadmapDaten`, dieselbe Funktion wie F33 WS-1,
  kein zweiter Regelsatz) → `{ status: 'ungueltig', fehler }`, sonst `{
  status: 'ok', vision, meilensteine: [...] }` mit je Feature dessen
  Status aus `features/<id>/feature.md` (Zeile `Status: X`, identisches
  Regex wie `scripts/check-feature.mjs`) bzw. `'keine_akte'` bei fehlender
  Datei. `scripts/leitstand-server.mjs` registriert `GET /api/roadmap`
  ausschließlich gegen diese Funktion (D5) — auch unter dem Projekt-Präfix
  `/api/projekte/<id>/...`, über dasselbe `repoWurzel`/`roadmapPfad`, das
  F33 WS-1 bereits an `erzeugeRequestHandler` durchreicht (kein neuer
  Pfadauflösungscode nötig). Gate `scripts/check-f33-roadmap-projektion.mjs`
  (fünf Abschnitte: echte `roadmap.json` inkl. F40/ABGESCHLOSSEN,
  `nicht_vorhanden`, `ungueltig`, `keine_akte`, echter HTTP-Aufruf), in
  `npm run check` eingehängt.
- **AK9** — `public/leitstand/api.js` (`holeRoadmap`, Muster
  `holeWorkflows`) + Workboard-Karte "Roadmap"
  (`public/leitstand/views/workboard.js`, `bentoRoadmapKarte` +
  `ladeRoadmap()`): der Meilenstein mit `status: 'LAEUFT'` hervorgehoben
  (Muster `.bento-fokus-innenkarte`) mit seinen Feature-Status-Chips, alle
  übrigen Meilensteine je eine kollabierte Zeile. `nicht_vorhanden`/
  `ungueltig` zeigen einen neutralen Hinweistext (F-476, keine
  Entwicklerprosa). `ladeRoadmap()` läuft NUR beim ersten Öffnen der View
  (`initWorkboardView`) und bei "Neu laden" — `renderBento()` selbst liest
  `letzteRoadmap` nur (kein `holeRoadmap()`-Aufruf), der bestehende
  2-Sekunden-Poll (`zustand.js`) löst also keinen zusätzlichen Abruf aus
  (Muster `alleWorkitemsUngefiltert`, F29 WS-D1). `public/leitstand/
  style.css`: neue Grid-Area `roadmap` direkt unter `fortschritt` in
  derselben, schmaleren Spalte (`#workboard-bento`) — "neben" Projekt
  Fortschritt im Sinne derselben Spalte, kein zusätzlicher vierter
  Bento-Bereich.
- Bekannte, dokumentierte Grenze (kein Blocker): kein `LAEUFT`-Meilenstein
  vorhanden → keine hervorgehobene Karte, nur die kollabierte Liste; im
  Gate nicht synthetisch abgedeckt, nur über den realen Datenstand (M5
  `LAEUFT`).
- Nicht angefasst: `src/projektkontext/` (WS-1 unverändert
  wiederverwendet, `validiereRoadmapDaten` importiert statt kopiert),
  Querverweisprüfung Roadmap ↔ Feature-Akte (weiterhin Nicht-Ziel, jetzt in
  `feature.md` "Bekannte Grenzen" auch für WS-2 explizit benannt).
- `npm run check` → siehe Freigabe-Commit-Notiz (`state/freigabe-commit.md`
  bzw. dieser Bericht) für den Exit-Status dieses Durchgangs.

Status bleibt `IN_ARBEIT` bis Stefans Verifikation (Freigabe/Screenshot der
Karte).

**Reviewer-/QA-Pass (frischer Kontext, F-046), beide „Freigegeben mit
Hinweisen", kein Blocker:**

- **code-reviewer:** ein grenzwertig kritischer Punkt — `roadmapStatusKategorie`
  kann `'fehler'` liefern (Feature-Status `BLOCKIERT`/`ABGEBROCHEN`), aber
  `style.css` kannte nur `.status-punkt.ok/.aktiv/.neutral`, keine
  `.fehler`-Variante (der dortige Kommentar hatte sie sogar bewusst
  ausgespart) — ein solcher Statuspunkt wäre unsichtbar geblieben. Behoben:
  `.status-punkt.fehler` ergänzt (bestehendes `--color-danger-text`-Token,
  Muster `.badge.fehler`). Weitere Hinweise: fehlendes Logging in
  `ladeRoadmap()`s catch (behoben, s. u.), `vision` aus der API wird nicht
  angezeigt (dokumentiert, F-594), TOCTOU zwischen `existsSync`/
  `readFileSync` in `baueRoadmapProjektion` (vorbestehendes Muster aus
  `routen-verbrauch.mjs`, keine neue Abweichung, nicht behoben), mehrere
  LAEUFT-Meilensteine vom Schema nicht ausgeschlossen (F-592 ergänzt).
- **qa:** „Freigegeben mit Hinweisen", sechs Testfälle mit Lücken. Drei
  direkt behoben: (1) ein fehlgeschlagener Erstabruf von `GET /api/roadmap`
  blieb dauerhaft auf "Lädt…" stehen, ohne Logging und ohne Zeitlimit —
  `holeRoadmap()` bekam jetzt dasselbe `AbortSignal.timeout` wie
  `holeZustand`/`holeLaufDetail` (F-561-Muster), `ladeRoadmap()` loggt den
  Fehler und zeigt bei einem Fehlschlag VOR dem ersten Erfolg einen
  sichtbaren Hinweis ("Roadmap konnte nicht geladen werden.") statt
  stillschweigend nichts zu tun. (2) ein leeres `features`-Array im
  hervorgehobenen Meilenstein rendert jetzt "Keine Features zugeordnet."
  statt einer leeren, erklärungslosen Liste. (3) lange, leerzeichenlose
  Titel/IDs in der kollabierten Liste/den Feature-Zeilen bekamen
  `overflow-wrap: anywhere` (fehlte dort, obwohl der hervorgehobene Titel
  es bereits über `.bento-fokus-titel` hatte). Ein Überholschutz für
  parallele `ladeRoadmap()`-Aufrufe (Muster `anfrageZaehler`) wurde
  ebenfalls ergänzt (`roadmapAnfrageZaehler`). Zwei Funde bewusst NICHT in
  diesem Schritt behoben, weil sie über den WS-2-Auftragswortlaut
  hinausgehen: fehlendes Neuladen bei Projektwechsel/Wiederbetreten
  (view-weite, vorbestehende Lücke, nicht neu durch WS-2 — F-593) und
  mehrere LAEUFT-Meilensteine (F-592, s. o.).
- `npm run check` nach allen Nachbesserungen erneut geprüft → Exit 0,
  `tests 620, pass 620, fail 0`.

Vier neue/erweiterte Findings: F-592 (erweitert um den LAEUFT-Spiegelfall),
F-593 (Projektwechsel, P2), F-594 (vision unsichtbar, P4) — alle in
`state/findings.md`.

## 2026-09-22 — Feature-Review-Pass (Gate-Ebene), Status IN_ARBEIT → FEATURE_GATE

Auftrag: Feature-Review-Pass für das gesamte Feature F33 (WS-0 Spike, WS-1
Projektkontext als Repo-Dateien, WS-2 Roadmap-Projektion, gemergt als
#214), nicht nur für WS-2 isoliert — der bereits weiter oben dokumentierte
Reviewer-/QA-Pass unmittelbar nach dem WS-2-Bau deckte nur WS-2 ab. Muster
CLAUDE.md / F40: `code-reviewer` und `qa` mit frischem Kontext, keine
Schreibrechte.

Beide Urteile: „Freigegeben mit Hinweisen", kein Blocker. Details und
sämtliche Befunde stehen in `features/F33/feature.md` Abschnitt "Feature
Review" und "Bekannte Grenzen". Sechs Findings neu in `state/findings.md`
eingetragen:

- **F-595** (`TECH_DEBT`, P3) — Feature-IDs aus `roadmap.json` nicht auf
  Muster beschränkt, `../` würde im `feature.md`-Pfad aufgelöst
  (code-reviewer-Befund, deckt sich mit Stefans eigenem Auftragshinweis).
- **F-596** (`TECH_DEBT`, P3) — Workboard-Karte "Roadmap" optisch
  unfertig, Design-Nacharbeit bewusst auf die Design-Phase vor F30
  verschoben (Stefans eigener Befund, E-M5-2).
- **F-597** (`TECH_DEBT`, P4) — `baueRoadmapProjektion` beschriftet jeden
  Lesefehler pauschal als JSON-Parsefehler (code-reviewer-Befund,
  Diagnosequalität, kein Fehlverhalten).
- **F-598** (`BUG`, P3) — eine leere, aber existierende Projektkontext-
  Datei wird wie gültiger Inhalt behandelt statt wie eine fehlende
  (qa-Befund, mittleres Risiko, unterläuft die AK7-Absicht).
- **F-599** (`TECH_DEBT`, P4) — Feature-IDs innerhalb eines Meilensteins
  nicht auf Eindeutigkeit geprüft (qa-Befund, sehr geringes Risiko).
- **F-600** (`TECH_DEBT`, P4) — rohe interne Statuswerte (`keine_akte`/
  `UNBEKANNT`) erscheinen unübersetzt als Badge-Text, aktuell praktisch
  relevant, da 7 von 10 M5-Features noch keine Akte haben (qa-Befund).

Zusätzlich direkt korrigiert, kein eigenes Finding: AK5-Text in
`feature.md` sprach noch von drei Context-Builder-Anfragen, tatsächlich
sind es seit F40 WS-2 vier (`lagebild.md` additiv ergänzt) — Klarstellung
ergänzt statt AK5 umgeschrieben, damit der ursprüngliche WS-1-Umfang
nachvollziehbar bleibt.

Bereits bekannte Befunde aus dem WS-2-Pass (F-592, F-593, F-594) wurden
von beiden Agenten unabhängig erneut bestätigt, nicht doppelt registriert.

`features/F33/feature.md`: Status `IN_ARBEIT` → `FEATURE_GATE` (Muster
F40: Feature-Review-Pass ist Voraussetzung für `FEATURE_GATE`, `ABGESCHLOSSEN`
bleibt an Stefans Abnahme gebunden). `docs/STATUS.md` entsprechend
aktualisiert. `node scripts/erzeuge-lagebild.mjs` erneut gelaufen
(STATUS.md geändert). `npm run check`: siehe Bericht dieses Auftrags.

Nicht Teil dieses Auftrags: Stefans Abnahme selbst; Behebung der neuen
Findings F-595/F-597/F-598/F-599/F-600 (bleiben offen, P3/P4, kein
Blocker); F-596 bewusst auf die Design-Phase vor F30 verschoben.
