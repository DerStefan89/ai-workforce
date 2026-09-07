# Plan v1 — Feature F12 WS-2: Auftrag anlegen, Auftrag→Lauf-Zuordnung, Startformular

Slug: f12-ws2
Stand: 2026-09-07
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F12/feature.md` (AK4/AK5/AK6, Workstream-Liste WS-2),
`state/plan-v1-f12-ws1.md` (Formatvorlage, Abschnitt-0-Muster). WS-1 ist auf
`main` gemergt (`10a60ef`, PR #89).

Kein Bau in diesem Schritt. Kein Advisor-Pass in diesem Schritt.

## 0. Verifikation (F-013-Muster — real gegen den Code gelesen, nicht aus feature.md übernommen)

- **`src/auftrag/index.ts:48-77`** (`registriereAuftrag`) — heute nur von
  `src/auftrag/auftrag.test.ts` aufgerufen (grep über das gesamte Repo nach
  `registriereAuftrag` bestätigt: `feature.md`-Dateien, `journal.md`,
  `state/tasks/…`, `state/plan-v1-f11-auftrag-ws1.md`, und die zwei
  `src/auftrag/`-Dateien selbst — **kein** Skript, kein Server). Die
  Funktion selbst braucht **keine Erweiterung**, um aus
  `scripts/leitstand-server.mjs` aufrufbar zu sein — sie ist ein normaler
  Export mit synchroner Signatur (`auftragId, profilReferenz, titel,
  auftragstext, optionen`) und der Server hat bereits eine fertig
  abgeleitete `profilReferenz` (`leiteProfilReferenzAb`, Zeile 488) sowie
  das etablierte Muster eines direkten `src/…/index.ts`-Imports
  (`fuehreAufgabeDurch`, Zeile 71). **Was tatsächlich fehlt**, ist ein
  neuer Endpunkt, der sie aufruft — kein Produktionslückenschluss in
  `src/auftrag/`.
- **Realer Ablageort eines Auftrags — abweichend von der naheliegenden
  Lesart „Verzeichnis `auftrag-<auftragId>`":** `registriereAuftrag` ruft
  `registriereKernArtefakt(auftragArtefaktId(auftragId), …)` auf
  (`auftragArtefaktId` = `` `auftrag-${auftragId}` ``, Zeile 33-35).
  `registriereKernArtefakt` selbst schreibt aber unter
  `` laufId(artefaktId) `` (`src/lineage-registry/index.ts:47-49`:
  `` `lineage-${artefaktId}` ``). Ein Auftrag liegt also real unter dem
  Verzeichnis **`lineage-auftrag-<auftragId>`**, nicht `auftrag-<auftragId>`
  — bestätigt wörtlich durch `src/auftrag/auftrag.test.ts:24`
  (`raeumeAuf` löscht `` join(BASIS, \`lineage-auftrag-${auftragId}\`) ``).
  Das ist exakt dieselbe `lineage-`-Präfix-Konvention, die `feature.md`
  bereits für die 18-von-28-Beobachtung nennt (F-137) — hier zum ersten
  Mal für AK4 relevant: ein Leseendpunkt, der alle Aufträge auflistet, kann
  sich **nicht** auf einen `auftrag-`-Verzeichnispräfix verlassen, sondern
  muss nach `lineage-auftrag-` filtern (Muster identisch zu
  `sammleLaeufe`s `readdirSync(basisVerzeichnis, …)`,
  `scripts/leitstand-server.mjs:266-274`).
- **Keine Lineage-Registry-Funktion listet alle Artefakt-IDs einer Art.**
  `src/lineage-registry/index.ts` exportiert `registriereKernArtefakt`,
  `registriereWerkzeugReferenz`, `listeVersionen(artefaktId, …)`,
  `ladeArtefaktVersion(artefaktId, versionSequenz?, …)`, `pruefeStale`,
  `haltFestStaleEntscheidung`, `validiereLineageEintrag` — jede davon
  braucht eine bereits bekannte `artefaktId`. Ein „Aufträge auflisten"-
  Endpunkt (AK4) muss deshalb selbst `readdirSync(basisVerzeichnis)`
  filtern (wie oben) und je Treffer `ladeArtefaktVersion` aufrufen — kein
  Wiederverwendungskandidat vorhanden, keine Neuerfindung nötig, nur eine
  direkte Konsequenz aus dem realen API-Zuschnitt.
- **`scripts/leitstand-server.mjs:299,307,322-391`**
  (`ERLAUBTE_STARTAUFTRAG_FELDER`, `PFLICHT_STARTAUFTRAG_FELDER`,
  `pruefeStartauftrag`) — `auftragstext` steht heute in **beiden** Sets
  (Zeile 299, 307) und wird in der `eingaben`-Rückgabe durchgereicht
  (Zeile 387). Für AK5 muss `auftragstext` aus beiden entfernt und
  `auftragId` an seiner Stelle ergänzt werden — **plus** ein neuer
  Verbotsfall für `auftragstext` selbst (Muster
  `VERBOTENE_STARTVORLAGE_FELDER`, Zeile 302/331: dort wird ein Feld, das
  jetzt serverseitig bestimmt wird, mit einer eigenen, sprechenden
  Ablehnungsmeldung verboten statt still über die generische
  „unbekanntes Feld"-Meldung von Zeile 335 zu laufen). Die Feld-Schleife
  (Zeile 327-337) läuft über **jeden** Body-Schlüssel, **bevor** die
  Pflichtfeld-Schleife (Zeile 339-343) beginnt — das beantwortet die
  gestellte Frage nach der Prüfreihenfolge real: sendet ein Startauftrag
  `auftragstext` (ob mit oder ohne gleichzeitiges `auftragId`), greift der
  Verbotsfall in der Feld-Schleife **immer zuerst**, bevor überhaupt
  geprüft wird, ob `auftragId` fehlt oder vorhanden ist — keine
  Doppeldeutigkeit möglich, ohne dass eine neue Prüfreihenfolge entworfen
  werden müsste. Ein Body mit `auftragId`, aber ohne `auftragstext`, kommt
  unverändert durch die Feld-Schleife und wird dann in der
  Pflichtfeld-Schleife auf `auftragId` statt `auftragstext` geprüft.
- **`src/execution-controller/index.ts:129-154`** (`fuehreAufgabeDurch`,
  reales `vorgaengerLaufId`-Muster, WS-2b) — zitiert wörtlich:
  ```
  136   if (eingaben.vorgaengerLaufId !== undefined) {
  137     const vorgaengerLaufakteVersion = ladeArtefaktVersion(vorgaengerLaufakteArtefaktId(eingaben.vorgaengerLaufId), undefined, {
  138       basisVerzeichnis: optionen.basisVerzeichnis,
  139       schreiber: optionen.schreiber,
  140     })
  141     if (vorgaengerLaufakteVersion === null) {
  142       throw new Error(`Vorgängerlauf '${eingaben.vorgaengerLaufId}' hat keine Laufakte — …`)
  143     }
  144     anfragen = [
  145       {
  146         pfad: `artefakt:laufakte-${eingaben.vorgaengerLaufId}`,
  147         frage: 'Kontext des vorherigen, klärungsbedürftigen/fehlgeschlagenen Laufs',
  148         begruendung: 'Lineage-Verweis auf den Vorgängerlauf (AK7)',
  149         inhalt: kanonischesJson(vorgaengerLaufakteVersion.daten),
  150         notwendig: true,
  151       },
  152       ...eingaben.anfragen,
  153     ]
  154   }
  ```
  Das ist der exakte Vorbild-Block für die neue `artefakt:auftrag-<auftragId>`-
  Referenz (E-M2-4) — **aber** mit einem real entscheidenden Unterschied
  zum AK5-Wortlaut (siehe nächster Punkt): der `throw` bei fehlendem
  Vorgängerlauf passiert **innerhalb** von `fuehreAufgabeDurchFn`, die in
  `scripts/leitstand-server.mjs:629` **fire-and-forget nach** der bereits
  gesendeten `202`-Antwort (Zeile 615) aufgerufen wird. Ein unbekannter
  `vorgaengerLaufId` erzeugt heute **keinen synchronen 400**, sondern
  einen asynchronen Wurf, der über `.catch()` (Zeile 640-647) in der
  flüchtigen Startfehlerliste landet — der Client hat zu diesem Zeitpunkt
  bereits `202` erhalten.
- **Realer Konflikt mit dem AK5-Wortlaut** ("Existiert der Auftrag nicht,
  wird der Start mit 400 abgelehnt, **bevor irgendetwas geschrieben
  wird**"): eine 1:1-Kopie des `vorgaengerLaufId`-Musters (Wurf innerhalb
  von `fuehreAufgabeDurch`, aufgerufen nach dem `202`) erfüllt dieses
  Akzeptanzkriterium **nicht** — zum Zeitpunkt des Wurfs ist die
  `202`-Antwort bereits raus und `laufAktiv`/`angenommeneLaufIds` bereits
  gesetzt (auch wenn kein Checkpoint geschrieben wurde, ist die Zusage an
  den Client bereits erfolgt). Die Prüfung "existiert `auftragId`" muss
  deshalb **synchron in `erzeugeRequestHandler`** passieren, vor der
  `202`-Antwort (vor Zeile 610-615) — nicht als Kopie der
  `vorgaengerLaufId`-Stelle in `fuehreAufgabeDurch`. Das ist eine bewusste
  Abweichung vom "exakten Vorbild" aus der Auftragsvorgabe, real begründet
  (Abschnitt 4, D2 unten), keine stillschweigende Life-Entscheidung.
  `ladeArtefaktVersion` ist rein synchron (kein `async`/`Promise` in der
  gesamten `lineage-registry`-Datei) — ein synchroner Aufruf im
  Request-Handler ist ohne Umbau möglich, im selben Stil wie die
  bestehenden synchronen Prüfungen dort (`loeseWerkzeugsatzAuf`,
  `loeseEvidenzPfadAuf`).
- **`src/lineage-registry/index.ts:182-199`** (`ladeArtefaktVersion`) —
  Signatur `(artefaktId: string, versionSequenz?: number, optionen:
  Optionen = {})`, Rückgabe `ArtefaktVersion | null` (`null` bei
  unbekannter/leerer Kette, Zeile 193-196 — kein Wurf). Für AK5 zweimal
  gebraucht: (a) synchron im Request-Handler mit
  `ladeArtefaktVersion(\`auftrag-${auftragId}\`, undefined, {
  basisVerzeichnis, schreiber: STILLER_SCHREIBER })` für den 400-Check und
  um `daten.auftragstext` zu lesen; (b) unverändert im bestehenden
  `vorgaengerLaufId`-Stil innerhalb von `fuehreAufgabeDurch`, falls dort
  zusätzlich die Lineage-Referenz gebaut wird (Abschnitt 2.2 unten,
  D2/D3). `ladeArtefaktVersion` ist heute **nicht** in
  `scripts/leitstand-server.mjs` importiert (Zeile 70 importiert nur
  `pruefeStale` aus `../src/lineage-registry/index.ts`) — der Import muss
  ergänzt werden.
- **`scripts/check-f10-leitstand.mjs:85-93`** (`gueltigerStartauftrag`) —
  zentraler Test-Helfer, sendet `auftragstext: 'Testauftragstext'`, **kein**
  `auftragId`. Wird an **17 Stellen** aufgerufen (Zeilen 119, 127, 132,
  148, 172, 201, 223, 254, 268, 286, 292, 311, 321, 331, 357, 359, 368,
  393 — vollständig gegrept). Macht AK5s Feldwechsel zu einem realen,
  mechanisch bestätigten Bruch **des gesamten bestehenden AK3/AK5/AK6/
  AK7-Testbestands in dieser Datei**, nicht nur eines einzelnen Falls —
  jeder Aufruf schickt nach dem Umbau ein verbotenes `auftragstext`-Feld
  und bekommt 400 statt des heute erwarteten Verhaltens. Zusätzlich prüft
  Zeile 148-154 **explizit das Gegenteil** von AK5: „Startauftrag ohne
  `auftragstext` → 400 mit ‚Pflichtfeld auftragstext fehlt'" — dieser
  Testfall muss nicht nur angepasst, sondern in seiner Aussage umgedreht
  werden (jetzt: `auftragstext` im Body → 400; Fehlen von `auftragId` →
  400). Siehe Risikoabschnitt 5.
- **`scripts/check-f11-auftrag.mjs:176-184`**
  (`gueltigerKoerperOhneStartvorlagenFelder`) — ruft `pruefeStartauftrag`
  direkt (kein HTTP-Testserver) mit `auftragstext: 'x'`, **kein**
  `auftragId`, mehrfach mit Spread-Overrides für AK5-Rot-/Grünfälle
  (Zeile 187-207 ff., vollständig gegrept). Derselbe reale Bruch wie oben,
  unabhängig vom `check-f10-leitstand.mjs`-Fund — **zwei** Testdateien
  mit demselben veralteten Grundkörper, beide müssen im Gleichschritt
  angepasst werden.
- **`public/leitstand/app.js:144-156`** (`baueWiederaufnahmeVorlage`) —
  die bestehende Wiederaufnahme-Vorlage („Notweg"-JSON-Textfeld nach AK6)
  setzt `auftragstext: ''` als auszufüllendes Platzhalterfeld. Nach dem
  AK5-Umbau wäre das ein garantiert abgelehnter Body (verbotenes Feld) —
  die Vorlage muss auf `auftragId: ''` umgestellt werden, sonst produziert
  der bestehende, unverändert bleibende Notweg für jede Wiederaufnahme
  einen 400.
- **`startvorlagen/…`-Datenform** (`src/startvorlage/index.ts:40-88`,
  vollständig gelesen) — `werkzeugsaetze` ist ein Objekt
  `{ [name]: { art: 'lesend'|'schreibend', modus: 'DEKLARIERT',
  erlaubte_werkzeuge: string[] } }`. **Kein** vorhandener Endpunkt liefert
  diese Struktur an den Client (`scripts/leitstand-server.mjs` importiert
  `loeseWerkzeugsatzAuf`, aber nur für die serverseitige Auflösung beim
  Start, Zeile 569 — nirgends für eine Leseroute). AK6 braucht einen neuen
  GET-Endpunkt dafür.

## 1. Ziel (prüfbar, WS-2)

Ein Auftrag lässt sich über einen neuen Endpunkt anlegen und auflisten
(AK4, ruft `registriereAuftrag` unverändert auf). Ein Startauftrag
referenziert einen Auftrag über das neue Pflichtfeld `auftragId` statt
`auftragstext` im Body zu führen; der Auftragstext wird serverseitig aus
dem Auftragsartefakt geladen, ein `auftragstext` im Body wird mit 400
abgelehnt, eine unbekannte `auftragId` wird **synchron, vor jeder
Zustandsänderung**, mit 400 abgelehnt (AK5). Der Leitstand bietet ein
geführtes Startformular (Auftrag anlegen/wählen, Werkzeugsatz wählen,
Evidenzpfade benennen, starten), das JSON-Textfeld bleibt als
gekennzeichneter Notweg bestehen (AK6). Keine Detailansicht (AK7-AK8,
WS-3), kein realer Nachweis (AK9, WS-4).

## 2. SCOPE

### 2.1 AK4 — Auftrag anlegen

**Neuer Endpunkt** `POST /api/auftraege`, Body `{ titel: string,
auftragstext: string }`. Reine Formprüfung (beide Felder nicht-leere
Strings, Muster `pruefeStartauftrag`s Grundtyp-Checks) — **keine**
Zweitvalidierung des Auftragsinhalts (D5, `feature.md` AK4-Wortlaut). Der
Server generiert `auftragId` selbst über `randomUUID()` (`node:crypto`,
bereits im Repo-Stil verwendet, `src/execution-controller/index.ts:69,81`)
und ruft `registriereAuftrag(auftragId, profilReferenz, titel,
auftragstext, { basisVerzeichnis })` auf — `profilReferenz` ist die
bereits im Server-Setup abgeleitete Instanz (Zeile 488), unverändert
wiederverwendet, kein zweiter Ableitungspfad. Erfolg: `202` (oder `201`,
Offene Frage 1) mit `{ auftragId }`. `registriereAuftrag` ist synchron —
kein Fire-and-Forget-Muster wie bei `/api/laeufe` nötig, ein Auftrag
schreibt genau einen Checkpoint und kehrt zurück.

**Neuer Leseendpunkt** `GET /api/auftraege` — scannt `basisVerzeichnis`
nach Verzeichnissen mit Präfix `lineage-auftrag-` (Abschnitt 0), leitet je
Treffer `auftragId` durch Entfernen des Präfixes ab, lädt die jeweils
neueste Version über `ladeArtefaktVersion(\`auftrag-${auftragId}\`,
undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })` und
liefert `{ auftragId, titel, erstellt_am }` je Auftrag (Auftragstext
bewusst **nicht** in der Liste — nur in der Einzelansicht/beim Start
gebraucht, Offene Frage 2). Sortierung wie `sammleLaeufe`
(`readdirSync(..).sort()` vor dem Mapping) für eine stabile Reihenfolge.

### 2.2 AK5 — Auftrag→Lauf-Zuordnung

**Diff `scripts/leitstand-server.mjs`, Feld-Sets (Zeile 299/302/307):**

```diff
- const ERLAUBTE_STARTAUFTRAG_FELDER = new Set(['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragstext', 'werkzeugsatz', 'vorgaengerLaufId'])
+ const ERLAUBTE_STARTAUFTRAG_FELDER = new Set(['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz', 'vorgaengerLaufId'])

+ /** F12 WS-2, AK5: auftragstext kommt jetzt ausschließlich aus dem Auftragsartefakt (ladeArtefaktVersion) — ein Vorkommen im Body wird wie ein Startvorlage-Feld mit 400 abgelehnt, nicht still ignoriert (Muster F11 WS-2 AK5). */
+ export const VERBOTENE_AUFTRAG_FELDER = new Set(['auftragstext'])

- const PFLICHT_STARTAUFTRAG_FELDER = ['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragstext', 'werkzeugsatz']
+ const PFLICHT_STARTAUFTRAG_FELDER = ['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz']
```

**Diff `pruefeStartauftrag` (Zeile 327-337, Feld-Schleife):**

```diff
    for (const feld of Object.keys(body)) {
      if (VERBOTENE_OPTIONEN_FELDER.has(feld)) {
        return { ok: false, grund: `Feld '${feld}' gehört zu AusfuehrungsOptionen und wird nicht aus dem Body gelesen (AK3)` }
      }
      if (VERBOTENE_STARTVORLAGE_FELDER.has(feld)) {
        return { ok: false, grund: `Feld '${feld}' gehört zur Startvorlage und wird nicht mehr aus dem Body gelesen (F11 WS-2 AK5)` }
      }
+     if (VERBOTENE_AUFTRAG_FELDER.has(feld)) {
+       return { ok: false, grund: `Feld '${feld}' wird serverseitig aus dem Auftragsartefakt geladen und nicht mehr aus dem Body gelesen (F12 WS-2 AK5)` }
+     }
      if (!ERLAUBTE_STARTAUFTRAG_FELDER.has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}'` }
      }
    }
```

**Diff `pruefeStartauftrag`-Rückgabe (Zeile 378-390):** `auftragstext:
body.auftragstext` wird durch `auftragId: body.auftragId` ersetzt, plus
ein Grundtyp-Check (nicht-leerer String, Muster `laufId`-Check Zeile
345-347) vor der Rückgabe.

**Neuer synchroner Check in `erzeugeRequestHandler`** (POST-Zweig, direkt
nach dem `pruefeStartauftrag`-Ergebnis, **vor** der D13-Prüfung — Abschnitt
0, kein Fire-and-Forget-Wurf wie bei `vorgaengerLaufId`):

```js
const auftragVersion = ladeArtefaktVersion(`auftrag-${startauftrag.auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
if (auftragVersion === null) {
  sendeJson(res, 400, { grund: `Auftrag '${startauftrag.auftragId}' nicht gefunden` })
  return
}
```

Ersetzt in der `eingaben`-Konstruktion (Zeile 598-608):
`auftragstext: eingabenRoh.auftragstext` → `auftragstext:
auftragVersion.daten.auftragstext`. Zusätzlich `auftragId:
startauftrag.auftragId` in das an `fuehreAufgabeDurchFn` gereichte Objekt
aufgenommen (siehe unten, Execution-Controller-Erweiterung).

**Diff `src/execution-controller/types.ts` (Zeile 56-68,
`AusfuehrungsEingaben`):** neues Pflichtfeld `auftragId: string` (nicht
optional wie `vorgaengerLaufId` — jeder reale Start hat jetzt einen
Auftrag). `auftragstext: string` bleibt **unverändert** Pflichtfeld
(Wortlaut `feature.md` AK5: „bleibt unverändert Pflichtfeld — nur seine
Quelle wechselt") — die Quelländerung passiert ausschließlich im Aufrufer
(`leitstand-server.mjs`, oben), nicht am Typ selbst.

**Diff `src/execution-controller/index.ts` (`fuehreAufgabeDurch`,
Abschnitt 0-Zitat, Zeile 129-154):** analog zum `vorgaengerLaufId`-Block,
aber **unbedingt** (kein `if (…) !== undefined`, da `auftragId` jetzt
Pflichtfeld ist):

```js
const auftragVersion = ladeArtefaktVersion(`auftrag-${eingaben.auftragId}`, undefined, {
  basisVerzeichnis: optionen.basisVerzeichnis,
  schreiber: optionen.schreiber,
})
if (auftragVersion === null) {
  throw new Error(`Auftrag '${eingaben.auftragId}' hat keine Auftragsakte — Vorbedingungsverletzung (AK5)`)
}
anfragen = [
  {
    pfad: `artefakt:auftrag-${eingaben.auftragId}`,
    frage: 'Auftragsbezug dieses Laufs',
    begruendung: 'Lineage-Verweis auf den Auftrag (E-M2-4, AK5)',
    inhalt: kanonischesJson(auftragVersion.daten),
    notwendig: true,
  },
  ...anfragen,
]
```

(nach dem bestehenden `vorgaengerLaufId`-Block eingefügt, sodass die
Anfragenliste bei gleichzeitiger Wiederaufnahme in der Reihenfolge
`[auftragRef, vorgaengerRef, …eingaben.anfragen]` steht — Offene Frage 3,
Reihenfolge ist nicht durch `feature.md` festgelegt). Dieser zweite,
unabhängige `ladeArtefaktVersion`-Aufruf lädt denselben Auftrag **erneut**
(der erste lief bereits synchron in `leitstand-server.mjs`, oben) — eine
bewusste Duplikation, kein Versehen (Design-Entscheidung D3 unten).

### 2.3 AK6 — Startformular

**Neuer Leseendpunkt** `GET /api/startvorlage/werkzeugsaetze` (Name
Offene Frage 4) — liefert `vorlage.werkzeugsaetze` reduziert auf **genau**
`{ name, modus, erlaubte_werkzeuge }` je Eintrag (Allowlist, kein
Denylist — `feature.md` AK6 nennt exakt „Name, Modus und erlaubte
Werkzeuge", `art` bewusst **nicht** mit ausgeliefert, da nicht in der
Aufzählung genannt). Baut auf der bereits im Server-Setup geladenen
`vorlage`-Variable auf (Zeile 487) — kein zweites `ladeStartvorlage`.
**Niemals** `werkzeugStartziel`, `berechtigungskontext`,
`profilReferenz`, `werkzeugVersionDeklariert` ausliefern (`feature.md`
AK6-Wortlaut, claude/126 Folgeentscheidung 2 laut Auftragsvorgabe).

**`public/leitstand/index.html`-Umbau:** neuer Abschnitt „Auftrag & Start"
vor dem bestehenden `#wiederaufnahme`-Abschnitt:
- Unterformular „Auftrag anlegen" (Felder `titel`, `auftragstext`,
  Button → `POST /api/auftraege`, danach Dropdown-Reload).
- Dropdown „Auftrag wählen" (befüllt aus `GET /api/auftraege`, Anzeige
  `titel` + `erstellt_am`, Wert `auftragId`).
- Dropdown „Werkzeugsatz wählen" (befüllt aus dem neuen Endpunkt).
- Dynamische Liste „Evidenzdateien" (repo-relative Pfade, +/- Zeilen).
- Feld `laufId` (weiterhin vom Nutzer vergeben — `feature.md` AK6 nennt
  keine Server-Generierung, Offene Frage 5).
- Start-Button → `POST /api/laeufe` mit `{ laufId, rolle, anfragen:
  [{pfad}, …], budget, aufrufEingaben, werkzeugsatz, auftragId }`.
- Fehleranzeige analog zum bestehenden `#wiederaufnahme-fehler`-Muster
  (Klartext, nicht verschluckt — AK6-Wortlaut).

**`#wiederaufnahme`-Abschnitt bleibt bestehen**, wird als „Notweg (rohes
JSON)" umbenannt/gekennzeichnet (`feature.md`: „darf als ausdrücklich
gekennzeichneter Notweg bestehen bleiben"). `baueWiederaufnahmeVorlage`
(`app.js:144-156`) wird auf `auftragId: ''` statt `auftragstext: ''`
umgestellt (Abschnitt 0 — sonst produziert der Notweg nach dem AK5-Umbau
grundsätzlich einen 400).

**`public/leitstand/app.js`-Umbau:** neue Funktionen `ladeAuftraege()`,
`ladeWerkzeugsaetze()`, `initAuftragFormular()`,
`initStartformular()` — analog zum bestehenden Poll-/Event-Delegation-
Stil (`laden`/`ladeStartfehler`, `initWiederaufnahmeBedienung`). Aufträge
müssen nach einem erfolgreichen `POST /api/auftraege` neu geladen werden,
damit der neue Auftrag im Dropdown erscheint (kein Store, kein
Client-Zustand über die aktuelle DOM-Darstellung hinaus — Muster
`laden()`).

## 3. NICHT (WS-2 Non-Scope, mit Grund)

- **AK7-AK8** (Detailansicht, Rohstrom-Lesepfad) — WS-3, baut auf dem
  neuen `GET /api/laeufe/<laufId>` (WS-1) und auf AK5s
  `artefakt:auftrag-<auftragId>`-Referenz auf, hier nicht angerührt.
- **AK9** (realer Nachweis) — WS-4.
- **AK10** (Gate `check-f12-leitstand-ansicht.mjs`) — laut `feature.md`
  Workstream-Liste WS-3 zugeordnet; Offene Frage 6 stellt trotzdem zur
  Diskussion, ob die AK5-400-Fälle (Body mit `auftragstext`, unbekannte
  `auftragId`) bereits hier in `check-f10-leitstand.mjs`/
  `check-f11-auftrag.mjs` mechanisch geprüft werden sollten, analog zur
  WS-1-Entscheidung (Offene Frage 4 dort), statt bis WS-3 zu warten.
- **Schema-Änderungen** — `schemas/kontrollzustand-auftrag-payload.schema.json`
  bleibt unverändert (`registriereAuftrag`/`AuftragV0Daten` werden nicht
  erweitert, D5).
- **`src/auftrag/index.ts` selbst** — kein Eingriff, nur ein neuer
  Aufrufer (Abschnitt 0).
- **Rückwirkende Zuordnung bestehender Läufe zu einem Auftrag** — jeder
  vor WS-2 gestartete Lauf bleibt ohne `artefakt:auftrag-*`-Referenz (F1s
  Kette ist append-only).

## 4. Design-Entscheidungen

- **D1 (`auftragId` wird serverseitig per `randomUUID()` erzeugt, nie vom
  Client gewählt):** anders als `laufId` (vom Client gewählt, gegen
  `LAUFID_UNZULAESSIGE_ZEICHEN` geprüft) — ein Auftrag hat keine
  fachliche Bedeutung in seinem Namen, `feature.md` AK4 verlangt keine
  Client-Wahl. Vermeidet eine zweite Zeichenregel-Prüfung für ein zweites
  ID-Feld.
- **D2 (Der `auftragId`-Existenz-Check läuft synchron in
  `erzeugeRequestHandler`, nicht als Kopie der `vorgaengerLaufId`-Stelle
  in `fuehreAufgabeDurch`):** Abschnitt 0 — eine 1:1-Kopie des
  `vorgaengerLaufId`-Musters würde AK5s expliziten 400-vor-jedem-
  Schreibzugriff-Wortlaut real verfehlen, weil `fuehreAufgabeDurchFn` erst
  **nach** der `202`-Antwort aufgerufen wird. Bewusste Abweichung vom
  „exakten Vorbild" aus der Auftragsvorgabe, mit Beleg, zur Freigabe
  vorgelegt (Offene Frage 3 ist die Reihenfolge-Frage, nicht diese
  Grundsatzentscheidung — diese hier gilt als Empfehlung, nicht offen).
- **D3 (Der Auftrag wird zweimal geladen — einmal synchron in
  `leitstand-server.mjs` für den 400-Check/`auftragstext`, einmal in
  `fuehreAufgabeDurch` für die Lineage-Referenz):** Alternative wäre, das
  bereits geladene `auftragVersion.daten` durch `eingaben` an
  `fuehreAufgabeDurch` durchzureichen und den zweiten Ladevorgang zu
  sparen — verworfen, weil das ein neues, nicht in `AusfuehrungsEingaben`
  vorgesehenes Transportfeld bräuchte und `fuehreAufgabeDurch` bisher
  konsequent selbst lädt, was es zur Lineage-Konstruktion braucht (D5,
  kein Vertrauen auf einen vom Aufrufer mitgelieferten Fremdwert). Kosten:
  ein zusätzlicher `readdirSync`/Datei-Lesevorgang pro Start — bei einem
  Ein-Nutzer-lokalen Werkzeug (F10 AK4) keine reale Performance-Sorge,
  aber zur Freigabe vorgelegt (Offene Frage 7).
- **D4 (`GET /api/auftraege` liefert keine `auftragstext`-Vorschau, nur
  `titel`/`erstellt_am`):** hält die Listenantwort schlank (Parallele zu
  AK2/WS-1s Kopfdaten-vs-Detail-Trennung) — `auftragstext` ist erst beim
  Start relevant (Dropdown-Auswahl über `titel`). Braucht Freigabe
  (Offene Frage 2).
- **D5 (`art` wird in der reduzierten Werkzeugsatz-Antwort NICHT
  mitgeliefert, obwohl es in der Startvorlage vorhanden ist):** strikte
  Allowlist-Auslegung von `feature.md`s Aufzählung „Name, Modus, erlaubte
  Werkzeuge" — bewusst enger als technisch nötig, weil ein Leseendpunkt,
  der Client-Daten aus einer sicherheitsrelevanten Konfigurationsdatei
  ausliefert, eher zu wenig als zu viel zeigen sollte. Braucht Freigabe
  (Offene Frage 8 — `art` unterscheidet lesend/schreibend und wäre für
  die Formular-UX evtl. hilfreich).

## 5. Risiken/offene Fragen für Stefan/Advisor (vor Bau)

1. **Statuscode für `POST /api/auftraege`** — `202` (Muster
   `/api/laeufe`, asynchrone Fortsetzung) oder `201` (Muster: die
   Registrierung ist synchron abgeschlossen, bevor geantwortet wird,
   klassischer REST-„Created")? Empfehlung: `201`, da
   `registriereAuftrag` synchron zurückkehrt — kein Blocker, aber nicht
   von `feature.md` festgelegt.
2. **Antwortform von `GET /api/auftraege`** (D4) — `titel`/`erstellt_am`
   reicht für die Dropdown-Anzeige, aber `feature.md` legt die Form nicht
   fest. Freigabe vor Testbau erwünscht.
3. **Reihenfolge der Eingaben-Referenzen bei gleichzeitiger
   `auftragId`+`vorgaengerLaufId`** (Abschnitt 2.2) —
   `[auftragRef, vorgaengerRef, …]` ist eine naheliegende, aber nicht in
   `feature.md` festgelegte Wahl. Realer Fall: eine Wiederaufnahme nach
   `KLAERUNG_ERFORDERLICH` hat immer denselben Auftrag wie der
   Vorgängerlauf (der Vorgängerlauf selbst trägt bereits die
   Auftrags-Referenz) — die zweite `auftragRef` wäre dann redundant zur
   bereits in der Vorgänger-Laufakte enthaltenen Referenz. Nicht
   entschieden, ob das ein Problem ist oder bewusste Redundanz (jeder
   Lauf zitiert seinen Auftrag direkt, unabhängig von der Kette).
4. **Real bestätigter Testbruch (Abschnitt 0):** `auftragId` als
   Pflichtfeld statt `auftragstext` bricht **mechanisch bestätigt**
   `scripts/check-f10-leitstand.mjs` (17 Aufrufstellen von
   `gueltigerStartauftrag`, plus der explizite AK2-Gegentest Zeile
   144-154) **und** `scripts/check-f11-auftrag.mjs`
   (`gueltigerKoerperOhneStartvorlagenFelder`, Zeile 176-184 und
   Folgezeilen). Kein hypothetisches Risiko — beide Dateien müssen als
   Teil desselben Baudurchgangs wie der `pruefeStartauftrag`-Umbau
   angepasst werden, nicht nachträglich. Empfehlung: beide Grundkörper
   auf `auftragId: '<eine über registriereAuftrag/eine Testfixture
   angelegte echte Auftrags-ID>'` umstellen und den AK2-Gegentest
   (Zeile 144-154 in `check-f10-leitstand.mjs`) auf die neue Aussage
   drehen (`auftragstext` im Body → 400; fehlendes `auftragId` → 400).
5. **`check-f11-auftrag.mjs`s AK5-Rotfalltests** (`profilReferenz`-,
   Startvorlage-Feld-Rotfälle, Zeile ~192 ff.) nutzen denselben
   `gueltigerKoerperOhneStartvorlagenFelder`-Grundkörper für **andere**
   AK5-Aspekte (F11 WS-2, nicht F12 WS-2) — die Anpassung darf diese
   bestehenden Testaussagen nicht versehentlich mit verändern, nur den
   Grundkörper selbst.
6. **AK10-Gate-Vorgriff** (Abschnitt 3) — analog zu WS-1s Offener Frage 4:
   sollen die neuen AK5-400-Fälle schon in WS-2 in
   `check-f10-leitstand.mjs`/`check-f11-auftrag.mjs` ergänzt werden (dort
   liegt die Infrastruktur bereits), oder bis zum WS-3-Gate
   `check-f12-leitstand-ansicht.mjs` warten? Empfehlung: sofort in den
   bestehenden Dateien ergänzen (Präzedenzfall WS-1) — ein Vorgriff wäre
   hier ohnehin nötig, weil Frage 4 sonst unbewiesen bliebe.
7. **Doppeltes Laden des Auftragsartefakts** (D3) — akzeptabel oder soll
   ein Transportfeld eingeführt werden, um den zweiten
   `ladeArtefaktVersion`-Aufruf zu sparen?
8. **`art` in der Werkzeugsatz-Antwort** (D5) — strikt weglassen oder
   mitliefern, weil harmlos und UX-hilfreich?
9. **Server-Generierung von `laufId` im Startformular** — `feature.md`
   AK6 nennt `laufId` nicht in der Feldliste („Auftrag anlegen, Auftrag
   wählen, Werkzeugsatz wählen, Evidenzdateien benennen, starten"); heute
   ist `laufId` aber Pflichtfeld und wird vom Nutzer im JSON-Notweg
   manuell vergeben. Soll das Startformular `laufId` weiterhin als
   Texteingabe verlangen, oder serverseitig generieren (Muster D1)? Nicht
   entschieden — betrifft sowohl das Formular-Layout als auch, ob
   `pruefeStartauftrag`s `laufId`-Pflicht dafür angetastet wird (aktuell
   **nicht** geplant, siehe Abschnitt 3).
10. **`rolle`/`budget`/`aufrufEingaben.modell`** — `feature.md` AK6 nennt
    keine dieser drei Felder in der Formular-Feldliste, obwohl sie
    weiterhin Pflichtfelder von `pruefeStartauftrag` bleiben (Abschnitt
    2.2 ändert daran nichts). Bleiben sie im Startformular als (evtl.
    vorausgefüllte/versteckte) Felder bestehen, oder bekommen sie feste
    Serverwerte? Nicht entschieden, kein Vorschlag in `feature.md`
    auffindbar.

## 6. Ablageort (Vorschlag für den Bau, hier nicht angelegt)

- `scripts/leitstand-server.mjs` — `POST /api/auftraege`,
  `GET /api/auftraege`, `GET /api/startvorlage/werkzeugsaetze`,
  `pruefeStartauftrag`-Feld-Umbau, synchroner `auftragId`-Check,
  `ladeArtefaktVersion`-Import ergänzt.
- `src/execution-controller/types.ts` — `auftragId: string` in
  `AusfuehrungsEingaben`.
- `src/execution-controller/index.ts` — `fuehreAufgabeDurch`-Erweiterung
  um die `artefakt:auftrag-<auftragId>`-Referenz.
- `public/leitstand/index.html` — neuer Auftrag-&-Start-Abschnitt,
  `#wiederaufnahme` als Notweg gekennzeichnet.
- `public/leitstand/app.js` — `ladeAuftraege`, `ladeWerkzeugsaetze`,
  `initAuftragFormular`, `initStartformular`,
  `baueWiederaufnahmeVorlage`-Feldwechsel.
- `scripts/check-f10-leitstand.mjs`, `scripts/check-f11-auftrag.mjs` —
  Grundkörper-Umbau (Risiko 4/5), neue AK4/AK5-Testfälle (vorbehaltlich
  Offene Frage 6).
- `state/gates.md`, `docs/STATUS.md`, `features/F12/journal.md` —
  Einträge erst nach realem Bau-/Prüflauf.

## 7. Budget & Pässe

- Dieser Schritt liefert **nur** diesen Plan — kein Bau, kein
  Advisor-Pass, kein Handoff-Vertrag.
- Empfohlener nächster Schritt: Klärung der zehn offenen Fragen
  (Abschnitt 5) durch Stefan, danach Advisor-Pass mit Fokus auf D2 (der
  Wortlaut-Konflikt zum `vorgaengerLaufId`-Vorbild) und auf den realen
  Testbruch in zwei Dateien (Risiken 4/5).
- Zuschnitt-Heuristik (`CLAUDE.md`): WS-2 ist laut `feature.md` „der
  einzige Workstream mit Kerneingriff" (F8s Anfragenkonstruktion) — der
  eigentliche Bauumfang (zwei neue Endpunkte, ein Feld-Umbau in
  `pruefeStartauftrag`, eine `AusfuehrungsEingaben`-Erweiterung, ein
  Formular-Umbau, zwei Testdatei-Anpassungen) bleibt ein zusammenhängender
  Baudurchgang plus höchstens eine Korrekturrunde, wenn die
  Testdatei-Anpassung (Risiko 4/5) von Anfang an eingeplant wird statt
  nachträglich entdeckt.

## 8. Akzeptanzkriterien — Zuordnung zu Testfällen (Entwurf, vor Advisor-Pass nicht final)

| AK | Testfall (Kurzform) | Ort |
|---|---|---|
| AK4 | `POST /api/auftraege` legt einen Auftrag an (über `registriereAuftrag`, kein Duplikat-Schreibpfad); `GET /api/auftraege` listet ihn danach | neue Testfälle, `check-f10-leitstand.mjs` oder eigene Datei (Offene Frage 6) |
| AK5 | (a) Body mit `auftragstext` → 400; (b) unbekannte `auftragId` → 400, **vor** `202` (Reihenfolge mechanisch geprüft: kein `laufId`-Reservierungseffekt danach); (c) `fuehreAufgabeDurch` mit gültiger `auftragId` erzeugt eine `artefakt:auftrag-<auftragId>`-Eingabe-Referenz | `check-f10-leitstand.mjs`, `check-f11-auftrag.mjs` (Grundkörper-Umbau, Risiko 4/5), ggf. `execution-controller.test.ts` für (c) |
| AK6 | `GET /api/startvorlage/werkzeugsaetze` liefert nie `werkzeugStartziel`/`berechtigungskontext`/`profilReferenz`/`werkzeugVersionDeklariert` | neuer Testfall, Muster `check-f11-auftrag.mjs` AK4-Fixture-Iteration |

## 9. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung Abschnitt 5, Release |

## 10. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der zehn offenen Fragen (Abschnitt 5) durch Stefan.
2. Advisor-Pass auf diese Datei (Fokus: D2/Wortlaut-Konflikt, realer
   Testbruch in zwei Dateien, Reihenfolge-Frage 3).
3. Findings → `state/advisor-findings-f12-ws2.md`.
4. Falls nötig: plan-v2 als eigene Datei.
5. Handoff-Vertrag für WS-2 — erst danach, nicht Teil dieses Auftrags.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Freigabe dieses Plans durch Stefan, insbesondere der zehn offenen Fragen
(Abschnitt 5) und der D2-Abweichung vom `vorgaengerLaufId`-Vorbild,
danach Advisor-Pass — noch kein Bau.
