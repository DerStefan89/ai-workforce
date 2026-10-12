# F45 WS F-2a — Plan (Fähigkeiten-Oberfläche, Bindung an die Anzeige, Lauf-Detail, Beleg 13)

Branch `f45/f2a-faehigkeiten-oberflaeche` (Basis `849fda5` = main mit F-1, #323). Grundlage: Bauauftrag F-2a
(Challenger, 12.10.2026), `features/F45/plan-f1.md` (v2.2), `docs/projekt/fixpaket-f45.md` (Zeile F, Beleg 13),
F-1054, F-1055 (1), F-1012 (Rest Oberfläche), `docs/design/abgleich-f46.md` §4.9/§4.14. Nicht im Umfang: Sammlung,
Auswählen, Prüflauf, Scout (F-2b), extern_lesend-MCPs (F-2b), Plugins (F-3), `.claude/settings.json`/Hooks.

## Plan v1

### Invarianten (aus F-1, unverändert)
Argv bitgleich ohne Aktivierung · Init-Gate · Deny-Liste · E-187/E-182 · `Bash(git:*)`, `Write/Edit(**/.claude/**)` ·
Schreibregel F-1040 · geschrieben wird nur `~/.ai-workforce/faehigkeiten.lokal.json` über die POST-Routen ·
kein neuer Rechenaufwand im 2-s-Poll (Status nur auf Abruf/Reiterwechsel) · `starteWorkflowSchritt(` bleibt 6-mal.

### 1 Status-Route GET `/api/faehigkeiten` (additiv)
- Je Eintrag `beschreibung`: Katalog = aufgelöste `beschreibung`; Projekt = Frontmatter `description` (strenger Leser; bei
  gesperrter Frontmatter nachsichtig die erste `description:`-Zeile, sonst null). Projekt-Einträge zusätzlich `pfad`
  (`.claude/…`).
- `lauf_aktiv: { aktiv: boolean, grund? }` aus `globalerLaufZustand` (dieselbe Quelle wie `pruefeGlobaleLaufSperre`) —
  die Oberfläche sperrt die Schalter vorab; die 409 der POST-Routen bleibt die Grenze.
- `lokale_datei.fremd_geaendert` (F-1055 (1), Punkt 4) — null oder `{ bekannt_seit, quelle, geaendert_am }`.

### 2 Oberfläche Seite Workforce (`#/capabilities`)
- Neuer Unterreiter der Capability Library **„Dieses Projekt“** (zwischen Katalog und Rollen & Besetzung), geladen beim
  Öffnen des Reiters, bei Projektwechsel und über „Neu laden“ — nicht im Poll. Neue Module: `faehigkeiten-projekt-anzeige.js`
  (rein, testbar: Gruppierung, Zeilen, Bänder, Knöpfe) und `views/faehigkeiten-projekt.js` (Laden, Ereignisse, POST).
  API: `holeFaehigkeiten`, `sendeFaehigkeitAktivierung`, `sendeFaehigkeitFreigabe` in `api.js` (mitPraefix → je Projekt).
- Gruppen: MCPs · Skills (Katalog) · Projekt-Skills · Projekt-Agents; je Gruppe der Standard als Satz („MCPs und
  installierte Skills: an, bis du sie ausschaltest“ · „Projekt-Agents und -Skills: aus, bis du sie einschaltest“),
  einmal oben „Wirkt ab dem nächsten Lauf“.
- Zeile: Name, Kurzbeschreibung (gekürzt, ganzer Text im title), Spalten „Installiert“ · „Aktiv“ · „Im letzten Lauf“
  (`letzter_lauf`: aktiv/nicht aktiv/nicht im Lauf/ohne Erfassung + Aufrufe/Fehler, Punkt 6), Schalter (role=switch,
  aria-checked) nur für installierte Katalog-Einträge und vorhandene Projekt-Einträge; Grund unter dem Namen, wenn nicht aktiv.
  Nicht installierte Katalog-Einträge (OFFEN) als eingeklappte Liste „Nicht installiert (n)“ ohne Schalter.
- Schalter: POST …/aktivierung `{ eintrag, aktiv }`; während eines Laufs `disabled` mit Grund aus `lauf_aktiv`; Antwort
  409/400/500 → Meldung mit dem Grund der Route, danach neu laden.
- Projekt-Eintrag mit `freigabe: 'abweichend'` oder `'keine'`: Status „Inhalt weicht von der Freigabe ab“ bzw. „Keine
  Freigabe“, Knopf „Freigeben nach Inhalt“ → Bestätigungsblock mit Pfad und Hash (12 Zeichen sichtbar, voller Hash im
  title/code), „Diesen Inhalt freigeben“ sendet genau den angezeigten Hash (POST …/freigabe); 409 → „Inhalt hat sich
  geändert, neu laden“ (+ Grund der Route).
- Band oben bei `lokale_datei.zustand === 'ungueltig'`: Pfad und Grund, Satz „Kein Lauf mit Fähigkeiten startet, bis die
  Datei repariert oder gelöscht ist“; Schalter gesperrt (Route antwortet ohnehin 409).
- Warnband F-1055 (1): „faehigkeiten.lokal.json wurde außerhalb des Leitstands geändert (geändert am …; bekannter Stand
  seit … aus <Quelle>) — prüfe die Datei, bevor du einen Lauf startest.“
- Zustände: lädt · Fehler (Grund, „Neu laden“) · leer („Dieses Projekt hat keine Fähigkeiten“, wenn weder Katalog-MCPs/
  -Skills installiert noch Projekt-Einträge vorhanden) · Default. Texte i18n (de, en/ru/tr nach Muster der Seite).

### 3 F-1054 (1) Bindung der Projekt-Fähigkeiten an die Anzeige
- `ermittleAusfuehrungsEmpfehlung` bekommt über `zusatz.faehigkeiten` (`{ einstellungen, referenz }`) den Stand der
  Projekt-Fähigkeiten im **Projektordner** (`ermittleProjektFaehigkeiten`, Werkzeugsatz `schreibend` wie die Status-Route)
  und liefert additiv `empfehlung.projektFaehigkeiten`: je eingeschaltetem Eintrag `{ id: 'agent:qa', name, typ, aktiv,
  kennung?: 'agent:qa@<sha256>', grund? }`. Ohne `zusatz.faehigkeiten` fehlt das Feld (bitgleich).
- Cache-Schlüssel der Anzeige um `an` und `inhalt_freigaben` (wie `aus`, Delta B5). Bekannte Grenze wie bisher: nicht
  committete Änderung an `.claude/agents|skills` erscheint erst nach Commit/Start (der Start rechnet frisch).
- **Ein Feld im Body (Muster empfehlungIds):** die Oberfläche schickt die angezeigten Kennungen beider Arten in
  `empfehlungIds` (`empfehlungIdsFuerFreigabe`: wirdGenutzt-Kennungen + Kennungen der aktiven `projektFaehigkeiten`).
  Katalog-ids passen auf `ID_MUSTER` (ohne `:`), Projekt-Kennungen beginnen mit `agent:`/`skill:` — die Trennung ist
  eindeutig; Body, Freigabe-Route, POST /api/laeufe und `starteWorkflowSchritt` bleiben unverändert.
  - Offen: eigenes Feld `projektFaehigkeitIds` statt Mitnahme in `empfehlungIds` — mehr Leitungen (zwei Freigabe-Wege
    im Client, Startauftrag-Felder, Signatur), gleiche Wirkung.
- `bereiteEmpfehlungFuerStartVor` trennt die angezeigten ids; Katalog-Vergleich unverändert; zusätzlich Vergleich der
  Projekt-Kennungen mit den beim Start (Projektordner) berechneten — Abweichung → `{ ok: false, grund: 'Anzeige veraltet:
  Projekt-Fähigkeiten …' }` → 409 (Vorprüfung der Freigabe, starteWorkflowSchritt `art: 'konflikt'`, POST /api/laeufe).
  Rückgabe zusätzlich `projektKennungen` → `faehigkeitenKontext.angezeigteProjektKennungen`.
- `loeseAusfuehrungsEingabenAuf`: nach `ermittleProjektFaehigkeiten` im **Arbeitsordner** Vergleich der aktiven
  Kennungen mit `angezeigteProjektKennungen` (gesetzt nur vom Server; `undefined` = Aufrufer ohne Anzeige, z. B.
  Gate/Nachweisskript) → Abweichung `{ ok: false, konflikt: true, grund: 'Anzeige veraltet …' }`; starteWorkflowSchritt
  bildet `konflikt` auf `art: 'konflikt'` (409) ab, POST /api/laeufe auf 409.
- Test B8 (Delta, F-1054 (7)): `aus` nach der Anzeige geändert → Start bricht ab.

### 4 F-1055 (1) Wächter der lokalen Datei
- `erzeugeLokalWaechter(pfad)` in `routen-faehigkeiten.mjs`: `{ bekannt: { hash, zeitpunkt, quelle } }`, Hash über
  `hashLokaleDatei`. Startwert beim Erzeugen (Quelle `serverstart`). `nachRoute()` nach jedem erfolgreichen POST
  (Quelle `route`). `nachLaufende()` in `meldeLaufende` (einziger Laufende-Punkt): nur wenn der Hash **unverändert** ist,
  wird der Stand bestätigt (Zeitpunkt, Quelle `lauf_ende`); weicht er ab, bleibt der alte Stand (Band bleibt).
  `pruefe()` → null oder `{ bekannt_seit, quelle, geaendert_am (mtime) }`. Rein bis auf `statSync`/Hash, synchron, nur
  auf GET/POST/Laufende (nie im Poll).
  - Abweichung vom Wortlaut „Hash beim letzten Lauf-Ende“: ein Laufende übernimmt keinen fremd geänderten Stand —
    sonst „wüsche“ der nächste Lauf eine Änderung durch einen nach Laufende weiterlebenden Prozess rein (genau Fall
    F-1055 (1)). Übernommen wird ein fremder Stand nur durch die nächste Änderung über die Routen (Stefan sieht das Band).
- Ein Wächter je Prozess (alle Projektinstanzen teilen die Datei): im CLI-Bindeblock erzeugt und wie
  `faehigkeitenLokalPfad` an `erzeugeRequestHandler`/`baueProjektHandlerMap` gereicht; ohne Option eigener Wächter je
  Handler (Tests).
- Grenze (Register): nach einem Neustart des Leitstands gilt der Stand beim Start als bekannt — eine Änderung bei
  gestopptem Leitstand bleibt unsichtbar.

### 5 F-1054 (2) Gründe in „Passt, nicht im Lauf“, Feld `deaktiviert`
- `baueEmpfehlung` laufKontext additiv `projektStatus?: Map<katalog-id, { aktiv, eingeschaltet, freigabe, grund }>` (vom
  Server aus `ermittleProjektFaehigkeiten` + `katalogFreigaben` rückwärts gebildet). Für interne `agent`/`skill`-Einträge:
  - aktiv → nicht in „Passt, nicht im Lauf“ (er läuft mit, steht in `projektFaehigkeiten`);
  - Inhalt abweichend → „Inhalt weicht ab — auf der Seite Workforce freigeben“;
  - nicht eingeschaltet → „aus — je Projekt einschalten (Seite Workforce)“;
  - nicht im Projektordner → „nicht im Projektordner“; sonst der Sperrgrund.
  Ohne `projektStatus` ein allgemeiner Grund „Projekt-Agent/-Skill: je Projekt einschalten (Seite Workforce)“.
  `SKILL_AGENT_ERST_AB_WS5`/`PROJEKT_SKILL_GESPERRT` entfallen (Test/Gates angepasst; externe Agents behalten
  „nicht installierbar“ über `AGENT_INSTALLATION_ERST_SPAETER`).
- Freigabeblock (`renderEmpfehlung`): neue Liste „Im Projekt ausgeschaltet“ aus `deaktiviert` und Liste „Projekt-
  Fähigkeiten im Lauf“ aus `projektFaehigkeiten` (aktiv angekreuzt; eingeschaltet, aber nicht aktiv mit Grund und
  Hinweis „Start wird abgelehnt“). Zählung in `workflow-entscheiden.js` unverändert (nur Katalog).

### 6 Lauf-Detail und Abnahme
- `baueLaufakteProjektion` additiv `faehigkeitenImLauf` (Laufakten-Feld, sonst null).
- Lauf-Detail, Bereich „Fähigkeiten“: Abschnitt „Fähigkeiten im Lauf“ (Tabelle Name · Art · Quelle · Status (aktiv/aus +
  Grund) · Hash (12) · Aufrufe/Fehler), eigene Zeile „Fremde Aufrufe“ (verweigerte Agents/Skills, Anzahl, mit Fehler);
  ohne Feld „Nicht erfasst — dieser Lauf hatte keinen Fähigkeiten-Kontext (z. B. Fortsetzungslauf ohne Anzeige)“.
  Reine Renderfunktion in `views/lauf-detail.js`, Test in `lauf-detail.test.mjs`.
- Abnahme: Kurzliste (`baueFaehigkeitenKurzliste`) additiv `im_lauf: { aktiv, aus, benutzt, fremde } | null` aus
  `faehigkeiten_im_lauf` der Ausführungs-Laufakte (Schema `kontrollzustand-harness-abgleich-payload` optional
  erweitert); Kurzzeile „Fähigkeiten im Lauf: n aktiv · n benutzt · n aus · n fremde Aufrufe“ in
  `renderFaehigkeitenKurzliste`.

### 7 F-1054 (3) Fortsetzungsstarts — begründet als Rest
Ein Korrekturlauf/Folgeschritt hat keine Anzeige; „Anzeige = Start“ (E-F36-4) verbietet Fähigkeiten ohne Anzeige. Lösung
gehört zum Rückweg (B2b: die Korrektur-Entscheidung zeigt die Empfehlung erneut und trägt die Kennungen). Bis dahin
sichtbar: Lauf-Detail „nicht erfasst“, Status-Route `ohne_erfassung`. Neues Finding mit diesem Rest.

### 8 Beleg 13 (echter Lauf)
Wegwerf-Testprojekt mit Skelett-Harness (wie F-1) als eigene Leitstand-Instanz (temp. kontrollzustand, temp. lokale Datei,
Port ≠ 4173): über die Routen der Oberfläche `agent:qa` einschalten, playwright-mcp und frontend-design aktiv lassen →
Lauf mit den angezeigten Kennungen (Startweg der Oberfläche) → Lauf-Detail (Render) zeigt aktiv + benutzt; danach qa
ausschalten → nächster Lauf: qa nicht verfügbar. Nachweis `features/F45/nachweise/f2a/` (Zählungen, Render-Bilder,
ohne Rohströme), Beleg-13-Zeile in der Akte. Startweg und Router-Klassifikation (für die anwendbar_wenn von playwright/
frontend-design) wie in den F36-Gates (Artefakt `router-<auftrag>` in temp. kontrollzustand).

### 9 Doku und Register
E-F45-9, E-F45-10, Sammlung (12.10.2026) in `docs/projekt/zielfassung.md` §13.6 (Versionszeile),
`docs/projekt/fixpaket-f45.md` (§2 Beleg 15; §3 F geteilt in F-1/F-2a/F-2b/F-3, B3 neu ≈ 1,4–1,55 AT, R2 ≈ 1 AT, Reihenfolge
F-1 → F-2a → F-2b → F-3 → B2a → B2b → B5a/B5b → B3 → R → R2; §5 E-F45-6 bis E-F45-10), `features/F45/feature.md`.
Register: K20–K23 als F-1056 bis F-1059 (K-Nummer im Titel), F-1054 (1)(2)(4)(6 Anzeige)(7) erledigt, Rest → neues
Finding; F-1012 Oberfläche erledigt (Rest Plugins/Agents installierbar → F-2b/F-3); F-1055 (1) teilweise (Anzeige).

### Tests
- `scripts/leitstand/routen-faehigkeiten.test.mjs`: Wächter (Start, Route, Laufende gleich/abweichend, fremd geändert),
  Status mit `beschreibung`/`pfad`/`lauf_aktiv`/`fremd_geaendert`.
- Server-Test Bindung: Projekt-Kennung angezeigt = Start → ok; abweichend (fehlt, anderer Hash, zusätzlich) → 409
  „Anzeige veraltet“ (Vorprüfung + Start); B8.
- `src/ressourcen/ressourcen.test.ts` / `src/faehigkeiten/faehigkeiten.test.ts`: Gründe mit/ohne projektStatus.
- `public/leitstand/…test.mjs`: Anzeige Workforce (Gruppen, Schalter, gesperrt im Lauf, abweichend → Freigabeknopf mit
  Hash, ungültige Datei, Warnband, leer), `empfehlungIdsFuerFreigabe` mit Projekt-Kennungen, Freigabeblock deaktiviert/
  projektFaehigkeiten, Lauf-Detail-Rendering, Kurzzeile.
- Render-Nachweis (`npm run render-nachweis`, `anfragenAntworten`): Workforce leer, mit Einträgen, ungültige Datei, Lauf
  aktiv/Schalter gesperrt, Inhalt weicht ab (Bestätigungsblock), Warnband; Lauf-Detail mit Fähigkeiten im Lauf.

## Advisor-Pass (frischer Kontext, architecture-advisor, 12.10.2026)
Urteil: **Freigegeben mit Hinweisen.** Grundentscheidungen tragen (ein Feld mit Trennung über das Präfix, Bindung an
die Anzeige, Wächter nur im Speicher, keine neue Schreibstelle). Vor dem Bau: A1 Projekt- und Arbeitsordner laufen
auseinander → 409, den „neu laden“ nie behebt; A2 `nachLaufende` wirkungslos und nicht an jedem Laufende (POST
/api/laeufe ohne nachLauf, Prüfung wiederholen) → weglassen; A3 Wächter über die Routen umgehbar (Anfrage ohne Origin),
Band auch im Freigabeblock, `nachRoute` mit dem Hash der geschriebenen Bytes; A4 `undefined` = fail-open → ablehnen;
A5 `konflikt` geht in `loeseSchrittEingabenAuf` verloren, POST /api/laeufe antwortet bei Katalog-Abweichung 400;
A7 Referenzliste/Katalog-Hashes nur bei Cache-Fehlschlag, Schlüssel mit Flag, derselbe `zusatz` beim Start, Einstellungen
aus derselben gelesenen Datei. Darf mitlaufen: A6 Begründung der Trennung (Präfix `SCHLUESSEL_MUSTER`, nicht
`ID_MUSTER`), A8 Werkzeugsatz des Schritts für die Anzeige, A9 Gründe ok (nur `ressourcen.test.ts` anpassen), A10 Schnitt
in Server/Oberfläche, A11 kein nachsichtiger description-Leser.

## Plan v2 (gilt; Abweichungen von v1)
1. **A1 → Variante „eigener Grund“** (nicht „Anzeige im Arbeitsordner rechnen“): Der Arbeitsordner entsteht oft erst mit
   der Freigabe (B1a-1, 202 + Vorbereitung) — vorher gibt es dort nichts anzuzeigen. Die Anzeige bleibt beim
   Projektordner. Der zweite Vergleich im Arbeitsordner meldet bei Abweichung „Arbeitsordner (wf/<Ablauf>) weicht vom
   Projektordner ab: <Kennungen> — Stand des Projekts sichern und den Ablauf neu anlegen oder die Fähigkeit ausschalten“
   (kein „neu laden“). Grenze im Register. (Entscheidung im Bau getroffen, umkehrbar; Stefan sieht sie im Bericht.)
2. **A2:** kein `nachLaufende`. Bekannt wird ein Stand nur beim Serverstart und nach einem Schreiben über die Routen.
   Abweichung vom Wortlaut „Hash beim letzten Lauf-Ende“ begründet: ein Laufende ändert den bekannten Stand nicht (eine
   Änderung im Lauf färbt den Lauf rot, Controller), ein Übernehmen am Laufende würde eine Fremdänderung reinwaschen.
3. **A3:** `nachRoute(hash)` übernimmt den sha256 der geschriebenen Bytes (`schreibeFaehigkeitenLokal` gibt ihn zurück).
   Das Band erscheint zusätzlich im Freigabeblock (`empfehlung.lokaleDateiFremd`, aus dem ohnehin im Poll gelesenen
   Hash, ohne weiteres Lesen; dort ohne Änderungszeit). Grenze: eine Anfrage an die POST-Routen ohne Browser-Header gilt
   als Route-Schreiben (Register, F-1055).
4. **A4:** `faehigkeitenKontext` ohne `angezeigteProjektKennungen` → Start abgelehnt. Gate F-1 und
   `nachweise/f1/realer-lauf.mjs` setzen das Feld.
5. **A5:** `loeseSchrittEingabenAuf` reicht `konflikt` durch → starteWorkflowSchritt `art: 'konflikt'` (409). POST
   /api/laeufe bleibt bei 400 für beide Abweichungen (Katalog wie F36 WS-3, Gate `check-f36-ws3-empfehlung` (c)); der Weg
   der Oberfläche (Freigabe/Workflow) antwortet 409.
6. **A6:** Trennung über `SCHLUESSEL_MUSTER`-Präfix `agent:`/`skill:` (Katalog-Kennungen `<id>@<sha>` tragen kein `:`).
7. **A7:** `zusatz.faehigkeiten = { einstellungen, werkzeugNamen }` geht in den Cache-Schlüssel (Werte), Referenzliste
   und Katalog-Hashes werden erst bei einem Fehlschlag gelesen; Vorprüfung und Start übergeben denselben `zusatz`;
   Einstellungen aus derselben gelesenen Datei.
8. **A8:** Anzeige im Freigabeblock mit dem Werkzeugsatz des Schritts; Status-Route weiter `schreibend` (kein Schritt).
9. **A10:** ein Auftrag, Bau in zwei Stufen (Server, dann Oberfläche/Beleg); die Teilung in zwei PRs bleibt Stefans
   Entscheidung (Bericht).
10. **A11:** `beschreibung` nur aus der strengen Frontmatter; bei Sperre null (der Sperrgrund steht da).

## Nachtrag v2.1 — Bau, Prüfpass und Korrekturrunde (12.10.2026)
- Render-Nachweis (vor dem Prüfpass): Spaltenkopf „Installiert“ brach im Wort, description in YAML-Blockform zeigte „>“,
  „1 Aufrufe“, enge Spalten im Lauf-Detail — behoben (`blockBeschreibung`, Plural, CSS).
- Beleg 13: erster Anlauf ohne `cwd: projekt` in der Testinstanz → Init-Gate brach ab (unbekannte Agents
  design-guardian/scout aus dem Prozessordner) — Skript korrigiert, L1/L2 grün.
- Prüfpass: code-reviewer „freigegeben mit Hinweisen“ (1–8), qa „freigegeben mit Hinweisen“ (1–12). Korrekturrunde:
  CR 1 Vorprüfung im bereiten Arbeitsordner (`projektKennungenImOrdnerAbweichung`, 409 vor dem Festhalten) und Grund an
  die tatsächliche Folge angepasst; CR 2 eingeschaltet-aber-nicht-aktiv bricht `bereiteEmpfehlungFuerStartVor` ab; CR 4
  Doku-Reihenfolge; CR 5 ein Hash der Bytes (`ladeFaehigkeitenLokal`); CR 7/QA 4/QA 10 Projektwechsel während eines POST,
  Zeitlimit der POSTs; CR 8/QA 3 HTTP-Tests (Vorprüfung 409 ohne Festhalten, Start 202 mit Agent, POST /api/laeufe 400,
  konflikt durch loeseSchrittEingabenAuf); QA 1 `stand` (angezeigter Hash der Datei) im POST, veraltet → 409; QA 2 Chip
  und Band „eingeschaltet, nicht aktiv“, `freigabe: 'fehlt'`; QA 5 Freigabe-Block schließt nach jeder Antwort; QA 6
  ungültige Datei → kein Katalog-Eintrag aktiv; QA 9 Text „nicht erfasst“; QA 11 Register.
- Nicht übernommen (Register): CR 3 (Sperre bis „Stand übernehmen“) → F-1061, Entscheidung Stefan; CR 6, QA 7/9 (Rest)/12 →
  F-1060.
- design-guardian (frischer Kontext, nach dem Render-Nachweis): „nicht freigegeben“ — 1 Lauf-Detail bei 390 px nicht
  gestapelt (Namen Buchstabe für Buchstabe, Status abgeschnitten), 2 zweite Live-Region (`role="status"` an der Meldung),
  3 Band-Abstände (`.v10-seite .note`-Rand); 4–8 klein. In derselben Korrekturrunde: 1 Stapelung unter 600 px, 2
  `role` entfernt (Fokus per `tabindex="-1"` bleibt), 3 Rand im Raster 0, 5 Präfix „Nicht freigegeben“ und Band
  „ungültig“ nur mit dem Grund des Servers, 6 Abstand unter der Tabelle und Mindestbreite der Namensspalte, 8 Render
  Lauf-Detail hell/Zoom 200 % und Ladefehler. 4 und 7 → F-1060 (10)/(11).

## Nachtrag v2.2 — Entscheidung F-1061 (3) und Abschlussläufe (12.10.2026)
- Entscheidung Stefan (Empfehlung Challenger): nach einer Änderung von außen gilt der Stand erst nach „Datei geprüft – Stand
  übernehmen“ (POST …/faehigkeiten/bestaetigung). Umsetzung: Wächter `bestaetige`, `bestaetigeLokaleDatei` (nur der
  angezeigte, aktuelle, gültige Stand), Schreib-Routen 409 solange unbestätigt (Prüfung des angezeigten Stands zuerst),
  Start mit Katalog-Fähigkeiten abgelehnt (`faehigkeitenKontext.fremd`, Freigabe-Vorprüfung vor dem Festhalten), rotes
  Band mit Knopf, Schalter gesperrt (`sperreFuer` 'fremd'), Freigabeblock-Hinweis. Tests rot/grün (Server, Start über HTTP,
  Anzeige, View). Der Zwei-Projekte-Test teilt wie der echte Server einen Wächter.
- Restrunde (Freigabe Stefan): Stapelung nur für `.faehigkeiten-im-lauf-tabelle` auf 900 px, Kommentare „fremd“, tr-Satz; zwei Bilder neu gegen dieselbe Instanz (`instanz-erneut.mjs`); design-guardian-Bestätigung „freigegeben mit Hinweisen“ → F-1060 (6), (12)–(14).
