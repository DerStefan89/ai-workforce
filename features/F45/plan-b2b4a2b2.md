# F45 B2b-4a-2b-2 „Bereit zum Sichern – Anzeige“ — Plan v1

Stand: 20.10.2026, Branch `f45/b2b4a2b2-anzeige` = `origin/main` `fabb6a1` (#368, 4a-2b-1 gemergt). Grundlage `plan-b2b4a2b.md`
§3–§8 (Teil 4a-2b-2) mit den Grenzen aus dem Prüfpass von 4a-2b-1 und den Bauauflagen 3/6 aus `advisor-b2b4a2b.md`. Naht (auf main,
unverändert): `ablaufSicherBefehle`, `sichernQuelle`, `sichernSchluessel`, `istNodeModulesPfad`/`nodeModulesAnzahl` in
`public/leitstand/code-daten.js`. Schließt **F-979, F-1087, F-1157** (Rest (4)(5)(6)(8)).

## CONTEXT / Grenzen
- `leitstand-server.mjs` unberührt (Ratsche 13.366, `starteWorkflowSchritt(` 6×); keine Route, kein Schema, keine Hooks/settings.
  `routen-code.mjs`/`ablauf-sichern.mjs` unberührt (der node_modules-Satz für `nichtBestimmbar` steht nur in der Übersetzung).
- Nicht im Umfang: Jarvis (4b), F-1155, F-1156, F-1158, F-1159, F-1112.
- Abweichung vom Plan v2 (Auftrag 20.10.): Schrittliste **1 commit · 2 push (bzw. Grund) · 3 PR/Merge im Web, danach Aufräumen** statt
  1 Sichern · 2 PR · 3 Aufräumen. Bauauflage 3 gilt: Art `knopf` gestrichen.

## 1 — Stand je Ablauf (`public/leitstand/ablauf-code-stand.js`, neu; F-1157 (4))
- Fabrik `erzeugeAblaufCodeStand({ hole, projektId })` (testbar) + Standardinstanz (hole = `api.js` `holeAblaufCode`, projektId =
  `holeAktivesProjekt().id`, Projektwechsel verwirft alles). Je workflowId `{ zustand: leer|laedt|ok|lage|fehler, daten, http,
  grundSchluessel, fehler, geladenAm, schluessel }`; Abonnenten `(workflowId) => void`; Überholschutz (Zähler je id); Fehler geloggt,
  nie geworfen; kein `setzeKopfAusCodeStand`.
- `stelleAblaufCodeStandSicher(id, schluessel)`: Abruf nur, wenn für id noch keiner mit diesem Schlüssel lief (Fehlschlag zählt);
  `ladeAblaufCodeStand(id, { neu: true })` nur aus „Aktualisieren“.
- `api.js` `holeAblaufCode(id)` → `{ http, koerper }` über `/code?workflow=${encodeURIComponent(id)}`, `CODE_ZEITLIMIT_MS`; 4xx/5xx
  lesbar, Netz wirft. 200 ⇒ `ok`; 409 mit Schlüssel ⇒ `lage`; 400/404/5xx/Netz ⇒ `fehler`.

## 2 — Anzeige (`views/ablauf-sichern-anzeige.js`, neu, rein)
- `aufraeumenArt({ workflowStatus, ao, abnahmeOffen })` aus **demselben** `aufraeumenMoeglich` wie `renderArbeitsordnerAktion`:
  wahr ⇒ `aktionen` (Verweis auf den Knopf unter den Aktionen), ABGESCHLOSSEN + offene Abnahme ⇒ `nachAbnahme` („nach deiner
  Abnahme“), sonst `neutral`. Workboard: `link` (`#/workflows/<id>`). Genau ein Element `[data-sichern-aufraeumen]` je Abschnitt (außer
  laedt/fehler und 409 `aufgeraeumt` = Endzustand); der einzige Knopf „Arbeitsordner aufräumen“ der Seite bleibt unter den Aktionen.
- `renderSichernAbschnitt({ workflowId, stand, aufraeumen, workflowStatus })`:
  - leer/laedt: „Stand des Arbeitsordners wird gelesen …“; fehler: Text + „Aktualisieren“, keine Blöcke.
  - 409 (F-1157 (5)): Lage ohne Fehlerfarbe; `aufgeraeumt` ⇒ „Erledigt: Der Arbeitsordner ist aufgeräumt.“; sonst
    `arbeitsordner.sichernGrund.<k>` (neun Schlüssel; `nichtBestimmbar` nennt node_modules ohne .gitignore als mögliche Ursache).
  - 200 bereit: Badge „Bereit zum Sichern“ (`.badge.ok`), Zeile Änderungen; `ol.sichern-schritte`: 1 commit-Block | `commitGrund` |
    „nichts zu committen“ (art push) · 2 „{n} Commits noch nicht auf main“ + push-Block | Hinweis keinOrigin/originUnbekannt · 3 „Pull
    Request und Merge im Web, danach aufräumen“ + Aufräumen-Element. Bei `{ grund }` (Branch/Ort) steht der Grund in 1, Schritt 2 „kein
    push, solange …“. Blöcke über `renderBefehlsblock(…, { echteWerte: true })`.
  - 200 nicht bereit: GESTOPPT + `offeneAenderungen > 0` ⇒ „Gestoppt mit {n} offenen Änderungen — Weg: Aufräumen, mit „Änderungen
    verwerfen“, wenn du sie nicht willst.“ (F-1157 (6)); GESTOPPT nur `voraus > 0` ⇒ eigener Text (bleiben auf dem Branch);
    `nichtsOffen` ⇒ „Nichts offen — weiter mit Aufräumen.“; sonst Grundtext. Aufräumen-Element genau einmal.
  - node_modules (Auftrag 5): `nodeModulesAnzahl > 0` ⇒ derselbe Text wie #/code (`code.dateien.nodeModules`, Klasse
    `code-node-modules`) in jeder 200-Lage; der kurze Hinweis `nodeModules` entfällt dort (keine Doppelung).
  - Fuß: „Stand von {zeit}“ + Knopf „Aktualisieren“ (`data-sichern-aktualisieren data-workflow-id`).
- `renderSichernSatz(quelle, workflowId)`: `projekt` ⇒ „Im Projektordner gearbeitet — Sichern über Code“ + Link `#/code`; `keinBedarf`
  ⇒ „Schreibt keine Dateien — nichts zu sichern.“; `unbekannt` ⇒ fester Hinweis + Link `#/workflows/<id>`.

## 3 — Karte und Einbau
- `renderArbeitsordnerKarte(ao, codeStand, kontext)`: neues `kontext.sichernHtml` (fertiges HTML, kein Modulkreis) ⇒ Abschnitt in der
  Karte (kein zweiter Block), Kartenknopf entfällt dann. Alte Zeile `arbeitsordner.sichern` und Schlüssel entfallen (×4).
- **`workflows.js` `zeichneEntscheiden`**: Modus `abnahme` und neu Modus null bei ABGESCHLOSSEN/GESTOPPT ⇒ Karte; Quelle `ablauf` ⇒
  `stelleAblaufCodeStandSicher(id, sichernSchluessel(aktuellesDetail))` + Abschnitt; `projekt` ⇒ Satz in der Karte; `aktuellesDetail.
  versionSequenz` neu. Abonnent zeichnet nur bei passendem `aktuellesDetail.workflowId`. Export `behandleEntscheidenKlick(ereignis,
  abh)` an `#workflow-entscheiden`: `[data-befehl-kopieren]` → `kopiereBefehlsblock`, `[data-sichern-aktualisieren]` →
  `ladeAblaufCodeStand(id, { neu: true })`. Bestehende `.wf-aktion`-Delegation bleibt.
- **Workboard `renderTerminalBlock(zustand)`**: Quelle aus `workflowDetail.arbeitsordner`; `ablauf` ⇒ Stand-Modul + Abschnitt
  (`aufraeumen: link`); `projekt` ⇒ heutiger Weg (Neuladen `codeStandNachAblauf` nur hier); `keinBedarf`/`unbekannt` ⇒ Satz.
  Delegation `[data-sichern-aktualisieren]`. Grenze (Bauauflage 6): nach „abgeschlossen“ fragt das Workboard das Detail nicht mehr ab —
  V1 wirkt dort nur über „Aktualisieren“.
- **Enter-Hinweis** `befehl.enterHinweis` de/en/tr/ru: „Nach dem Einfügen Enter drücken – erscheint „>>“, noch einmal Enter.“
- i18n de/en/tr/ru `arbeitsordner.sichernAbschnitt.*`, `arbeitsordner.sichernGrund.*`; Gründe/Hinweise sonst `code.sichern.*`. CSS nur
  Tokens, `.sichern-schritte`/`.sichern-abschnitt`.

## 4 — Gate `scripts/check-f45-b2b4a2b2-anzeige.mjs` (in `check:gates`), Attrappen zur Laufzeit
(a) Abruf: Fabrik mit Attrappe — 5× gleicher Schlüssel ⇒ 1 Abruf; Fehler + 5× ⇒ 1; neuer Schlüssel ⇒ 2; Quelltext: `zustand.js` importiert
weder Stand-Modul noch `holeAblaufCode`, `holeAblaufCode` nur im Stand-Modul, Views rufen `stelleAblaufCodeStandSicher(…,
sichernSchluessel(`, `ladeAblaufCodeStand(` nur mit `neu: true`, kein Aufruf in `abonniere(`-/Auffrischer-Rückrufen. (b) `?workflow=`:
`holeAblaufCode` kodiert; Views wählen Quelle über `sichernQuelle`; jeder Status außer kein_bedarf/bestand ⇒ Abruf. (c) genau ein
Aufräumen je Abschnitt in allen Arten und Lagen; Karte mit Abschnitt ohne Knopf; Seite (Karte + Aktionszeile) ≤ 1 Knopf. (d)
Kopieren-Handler mit Attrappe + Delegation an `#workflow-entscheiden`. (e) 409 ⇒ Lage ohne `fehler`-Klasse, `aufgeraeumt` Endzustand;
400/404 ⇒ Fehler. (f) i18n vierfach, ohne `wf/`, `workflow-`, `F-<Zahl>`, `B2b`; sichtbarer Text ohne workflowId. (g) node_modules-Hinweis
im Abschnitt nach derselben Regel. (h) `starteWorkflowSchritt(` = 6, Server unverändert. Rotfälle je Teil.
Unit-Tests: `ablauf-code-stand.test`, `ablauf-sichern-anzeige.test`, `arbeitsordner-anzeige.test` (Karte), `workflows-sichern.test`
(Handler), `befehlsblock.test` (Wortlaut).

## 5 — Render-Nachweis `features/F45/nachweise/b2b4a2b2/`
Instanz `b2b3b2b2a3/instanz.mjs` (neutrales HOME/TEMP), feste Antworten für `/api/workflows/<id>`, `…/abnahme`, `…/code?workflow=`.
Lagen laut Auftrag; de 1440/390 hell/dunkel, ru 390, 200 % und reduziert für „bereit (commit)“; Abnahme mit Kopieren (Zwischenablage);
Workboard abgeschlossen (Click-to-Work über feste Antworten, sonst Abweichung benannt); scrollWidth/clientWidth bei 390.

## 6 — Findings/Doku
F-979, F-1087, F-1157 erledigt (Reste benannt); `docs/projekt/fixpaket-f45.md`: 4a-2b-2 gebaut, B2b-4a abgeschlossen, offen 4b;
`features/F45/feature.md` nachziehen.

## Risiken
- Modus null zeigt jetzt bei ABGESCHLOSSEN/GESTOPPT die Karte oben auf der Ablaufseite (neu sichtbar).
- `setzeHtml` vergleicht HTML — Abschnitt muss bei gleichem Stand bitgleich sein (keine laufende Uhr).
- Workboard-Render-Fall hängt an der Nachbildung von Click-to-Work.

## Advisor `advisor-b2b4a2b2.md`: Freigegeben mit Hinweisen — Bauauflagen
- [x] 1 Workboard abonniert das Stand-Modul (`abonniereAblaufCodeStand`), zeichnet bei offener Seite und passender workflowId neu; Test/Gate.
- [x] 2 Ein Schlüsselsatz `arbeitsordner.sichernGrund.<k>` für 409 und 200 `bereit: false`; node_modules-Satz bei `nichtBestimmbar` in beiden.
- [x] 3 GESTOPPT 0/0 ⇒ „Nichts offen“; GESTOPPT ohne lesbare Zahlen ⇒ eigener neutraler Text; Gate (c).
- [x] 4 409 ohne `grund_schluessel` ⇒ `fehler`; Gate (e).
- [x] 5 Karte mit `kontext.ohneKnopf`; `stelleAblaufCodeStandSicher` nur auf der Detailroute; Schlüssel vor jeder Meldung vermerken.

## Bau und Prüfpass (20.10.2026)
- Gebaut nach v1 mit den Bauauflagen; Abweichung: Kopieren/Aktualisieren und Quellenwahl als eine Regel für Ablaufseite und Workboard
  (`ablauf-sichern-anzeige.js` `sichernFuerAblauf`, `behandleSichernKlick`; `workflows.js` `behandleEntscheidenKlick` delegiert) —
  Gate (a) prüft deshalb „Views rufen stelleAblaufCodeStandSicher nie direkt, nur als `stelle` an sichernFuerAblauf (Schlüssel dort)“.
- Vorfall: `biome check --write` formatierte 10 Dateien um (F-1161); von Stefan auf HEAD zurückgesetzt, Änderungen neu eingespielt.
- Prüfpass code-reviewer und qa je „Nicht freigegeben“ (Ursache: die Umformatierung; inhaltlich CR 2 / QA 2). Eine Korrekturrunde:
  CR 2 Projektwechsel verwirft alle Stände (auch laufende Abrufe), Test + Gegenprobe; CR 3 Quelltextprüfungen formatfest (normalisiert,
  Grünprobe „umformatiert“, Poll-/Auffrischer-Rückrufe); CR 4 (h) heißt „nicht gewachsen“; CR 5 `ohneKnopf` in workflows.js geprüft;
  CR 6 eine Klickregel; QA 3 Satz „nach Push/Merge steht weiter ‚noch nicht auf main‘ … nach dem Merge aufräumen“ (F-1155); QA 5 kein
  Aufräumen-Hinweis bei 409 `inVorbereitung`; QA 6 Schritt 3 ohne origin eigener Titel/Text; QA 8 200 ohne Feld `ablauf` ⇒ Fehler „Leitstand
  neu starten“; Tests Projektwechsel hin/zurück, `sichernFuerAblauf` (Workboard-Fälle), Schritt 3 ohne origin.

## Grenzen (bewusst, ohne Bau)
- QA 4: kehrt man auf dieselbe Karte zurück, wird bei gleichem Schlüssel nicht neu geladen — „Aktualisieren“ genügt.
- QA 7: der Verweis „Knopf „Arbeitsordner aufräumen“ unter den Aktionen“ hat kein Sprungziel.
- QA 9: der Commit-Vorschlag enthält die Ablauf-Kennung — gehört zu F-1156 (Nachtrag dort).
- Bauauflage 6: das Workboard frischt nach „abgeschlossen“ nicht auf; ein späteres Aufräumen zeigt es nur über „Aktualisieren“.
- CR 7: bei GESTOPPT mit unlesbarem git fehlt der node_modules-Satz (der Server liefert dort `nichtAbgeschlossen`).
