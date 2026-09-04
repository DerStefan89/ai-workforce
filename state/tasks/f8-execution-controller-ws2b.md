SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, ein von `main` abgeleiteter
Feature-Branch (vor Ausführung mit Stefan bestätigen). `main` muss vor
Branch-Erzeugung frisch synchronisiert sein (`git fetch` + Stand prüfen —
**nicht** über eine Remote-Devices-Bridge ausführen, falls diese Sitzung
eine ist: F-100/F-115, `index.lock` lässt sich von dort nicht löschen).

**Vorrangregel dieses Vertrags (F-104):** Findest du einen Widerspruch
zwischen diesem Vertrag, `state/plan-v1-f8-execution-controller.md`,
`features/F8/feature.md` und dem realen Code — **anhalten, beide Stellen
wörtlich zitieren, melden**. Nicht selbst auflösen, nicht im Test umgehen.
Bekannter, nicht blockierender Fall: `feature.md` AK7 nennt wörtlich nur
„nach KLAERUNG_ERFORDERLICH", der Scope-Abschnitt derselben Datei nennt
„nach KLAERUNG_ERFORDERLICH oder FEHLGESCHLAGEN" — dieser Vertrag deckt
beide ab (CONTEXT unten), das ist keine neue Eskalation.

## TASK: f8-execution-controller-ws2b

GOAL: `fuehreAufgabeDurch` unterstützt einen erneuten Anlauf nach einem
Vorgängerlauf, der `KLAERUNG_ERFORDERLICH` oder `ABGESCHLOSSEN` mit
`ergebnis: 'FEHLGESCHLAGEN'` steht: die neue, vom Aufrufer gewählte
`laufId` erhält über das Kontextpaket (F5) einen Lineage-Verweis auf die
Laufakte des Vorgängerlaufs. Es existiert kein Codepfad, der die
Vorgänger-`laufId` an `schreibeWirkungsmarke`, `schreibeCheckpoint` oder
`starteGateway` übergibt — der Vorgängerlauf bleibt in seinem Zustand
unverändert. AK7 aus `features/F8/feature.md` ist erfüllt. AK1–6/8/9
bleiben erfüllt. Mit diesem Vertrag ist F8 vollständig — Statuswechsel der
Feature-Akte auf `ABGESCHLOSSEN` ist Teil dieses Auftrags (F-093-Muster).

CONTEXT:

- [Fakt] Vollständiger Ablauf: `state/plan-v1-f8-execution-controller.md`
  Abschnitt 2.3 (WS-2b) — bindend für Feldnamen, Reihenfolge und
  Testfall-Form, soweit dieser Vertrag nicht abweicht (dann gilt dieser
  Vertrag, bei Widerspruch: Vorrangregel oben). `state/plan-v2-f8-
  execution-controller.md` hat keine Deltas zu Abschnitt 2.3 — dort
  unverändert.
- [Fakt] Entscheidung Stefan, 04.09.2026: Wiederaufnahme-`laufId`-
  Konvention ist `<vorgaengerLaufId>-retry-<n>`. Der Controller
  **generiert diese ID nicht** (plan-v1 Abschnitt 2.3, wörtlich: „vom
  Aufrufer … gewählt — der Controller generiert sie nicht automatisch").
  Die Konvention bindet ausschließlich Aufrufer/Tests dieses Vertrags,
  nicht den Produktcode selbst — es gibt keinen Namensprüfcode zu bauen.
- [Fakt, real gelesen] `AusfuehrungsErgebnis`s `ok:true`-Zweig hat schon
  aus WS-2a ein optionales `eskalation`-Feld (`src/execution-controller/
  types.ts:66-72`). WS-2b braucht **kein** analoges Ausgabefeld: anders
  als die WS-2a-Eskalations-`laufId` (intern per `randomUUID` erzeugt,
  sonst unauffindbar) kennt der Aufrufer bei WS-2b sowohl `laufId` als
  auch `vorgaengerLaufId` bereits selbst — er hat beide gewählt. Der
  Lineage-Verweis ist über `ladeArtefaktVersion('kontextpaket-' +
  laufId)` extern nachprüfbar, kein neues Rückgabefeld nötig.
- [Fakt, real gelesen] `Anfrage`-Typ (`src/context-builder/types.ts:14-
  23`): `{ pfad: string; bereichsKennung?: string; frage: string;
  begruendung: string; inhalt: string; notwendig?: boolean }`.
  `notwendig` ist optional, Default `false`; `true` = Phase-A-Behandlung
  (Evidenz vor Budget). `pfad` darf kein `#` enthalten
  (`context-builder/index.ts:98-103`) — der synthetische Schlüssel
  `artefakt:laufakte-<vorgaengerLaufId>` enthält keins.
- [Fakt, real gelesen] `baueKontextpaket`s Budget-Phase A
  (`context-builder/index.ts:150-165`): passt eine `notwendig:true`-
  Anfrage nicht ins volle Budget, liefert die Funktion **insgesamt**
  `{ ok:false, grund:'EVIDENZLUECKE', nichtAufnehmbar }` — kein
  Teilerfolg. Der bestehende Abbruchzweig in `fuehreAufgabeDurch`
  (`if (!kontextpaketErgebnis.ok) return { ok:false, stufe:
  'kontextpaket', ergebnis: kontextpaketErgebnis }`) deckt das bereits
  ab — kein neuer Codepfad nötig, nur der neue Eintrag muss vor diesem
  bestehenden Aufruf in die `anfragen`-Liste.
- [Fakt, real gelesen] `ladeArtefaktVersion(artefaktId, versionSequenz?,
  optionen?)` (`src/lineage-registry/index.ts:182-199`) liefert `null`
  bei Nichttreffer, **wirft nicht**. `laufakteArtefaktId(laufId) =
  'laufakte-' + laufId` (`src/claude-code-gateway/index.ts:139`). Der
  Controller muss den `null`-Fall selbst behandeln — siehe SCOPE Punkt 2.
- [Fakt] Repo-Idiom für eine Vorbedingungsverletzung, bereits in diesem
  Modul über plan-v2 Delta 1 etabliert: „throw = Vorbedingungsverletzung,
  kein Fachergebnis" (`lineage-registry/index.ts:243-245`,
  `human-transport/index.ts:90-92,114-117`). Ein `vorgaengerLaufId`, zu
  dem keine Laufakte existiert, ist ein Aufruferfehler (der Aufrufer
  behauptet einen realen Vorgängerlauf, den es nicht gibt) — kein neuer
  `AusfuehrungsErgebnis`-Zweig, sondern ein `throw`, konsistent mit dem
  bereits im Modul etablierten Muster.
- [Fakt, real gelesen] `KlassifikationsErgebnis.ergebnis` enthält
  `'FEHLGESCHLAGEN'` als Wert von `laufStatus.ergebnis` **innerhalb**
  `status: 'ABGESCHLOSSEN'` — es ist **kein** eigener `LaufStatus.status`-
  Wert (`src/checkpoint-store/types.ts`, `stelleLaufstatusFest`-Rückgabe,
  Abschnitt 0 des Plans). Beide in GOAL genannten Vorgänger-Zustände
  (`KLAERUNG_ERFORDERLICH`, `ABGESCHLOSSEN`+`FEHLGESCHLAGEN`) sind reine
  Beobachtungen des **Aufrufers** über den Vorgängerlauf — der Controller
  selbst prüft den Zustand des Vorgängerlaufs an keiner Stelle und
  verzweigt nicht danach (Ablehnung wäre ein neues, nicht angefordertes
  Feature). Kein Code dafür in diesem Vertrag.
- [Fakt] `state/findings.md` F-109 (Windows-Pfadlänge, gelöst): Test-
  `laufId`-Präfixe in diesem Modul bleiben ≤4 Zeichen.
- [Fakt] `AusfuehrungsEingaben` (`src/execution-controller/types.ts:51-
  59`) hat aktuell keine `vorgaengerLaufId`. Neues optionales Feld dort
  (SCOPE Punkt 1) — nicht in `AusfuehrungsOptionen`: Letztere ist laut
  eigenem Kopfkommentar reine Durchreichung, „kein Feld wird vom
  Controller selbst gelesen oder ausgewertet (D5)" — `vorgaengerLaufId`
  wird dagegen vom Controller aktiv gelesen und verarbeitet, gehört
  strukturell zu den Eingaben, nicht zu den Optionen.

SCOPE:

1. `src/execution-controller/types.ts` — `AusfuehrungsEingaben` um ein
   optionales Feld `vorgaengerLaufId?: string` erweitern, mit Kommentar,
   der auf plan-v1 Abschnitt 2.3 und AK7 verweist.
2. `src/execution-controller/index.ts`:
   - Import `ladeArtefaktVersion` aus `../lineage-registry/index.ts`,
     `laufakteArtefaktId`-Bildung analog zum bestehenden Muster (eigene
     kleine Hilfsfunktion oder Inline-Template — Konsistenz mit
     `eskalationsLaufId` als Vorbild).
   - Vor dem bestehenden `baueKontextpaket`-Aufruf: wenn
     `eingaben.vorgaengerLaufId !== undefined`, lade
     `ladeArtefaktVersion('laufakte-' + eingaben.vorgaengerLaufId,
     undefined, { basisVerzeichnis: optionen.basisVerzeichnis, schreiber:
     optionen.schreiber })`. Bei `null`: `throw new Error(...)` mit
     `vorgaengerLaufId` im Text (CONTEXT, Vorbedingungsverletzung). Bei
     Treffer: neuen `Anfrage`-Eintrag `{ pfad: 'artefakt:laufakte-' +
     eingaben.vorgaengerLaufId, frage: 'Kontext des vorherigen,
     klärungsbedürftigen/fehlgeschlagenen Laufs', begruendung:
     'Lineage-Verweis auf den Vorgängerlauf (AK7)', inhalt:
     kanonischesJson(vorgaengerLaufakteVersion.daten), notwendig: true }`
     der `eingaben.anfragen`-Liste **voranstellen** (plan-v1 Abschnitt
     2.3, wörtlich „vorangestellt") und diese erweiterte Liste, nicht
     `eingaben.anfragen`, an `baueKontextpaket` übergeben. Ohne
     `vorgaengerLaufId`: Verhalten exakt wie bisher, keine Änderung.
   - Dateikopf um WS-2b ergänzen (Muster WS-1/WS-2a-Nachträge in
     `index.ts`/`types.ts`).
3. Tests in `src/execution-controller/execution-controller.test.ts`
   (bestehende Fälle unverändert lassen, Test-`laufId`-Präfixe ≤4
   Zeichen, F-109):
   - **Fixture „Vorgängerlauf KLAERUNG_ERFORDERLICH":** `starteGateway`
     direkt aufrufen (nicht über `fuehreAufgabeDurch`), `klassifiziereLauf`
     bewusst **nicht** aufrufen — offene `run_prepared` bleibt stehen.
     `stelleLaufstatusFest(vorgaengerLaufId).status ===
     'KLAERUNG_ERFORDERLICH'` vorab belegen.
   - **AK7-positiv-A (KLAERUNG_ERFORDERLICH):** `fuehreAufgabeDurch`
     unter einer neuen `laufId = vorgaengerLaufId + '-retry-1'` mit
     `eingaben.vorgaengerLaufId` gesetzt aufrufen (Grün-Durchlauf-
     Attrappe). Danach: Ergebnis `ok:true`; `ladeArtefaktVersion(
     'kontextpaket-' + laufId)`s `eingaben` enthält einen Eintrag mit
     `pfad === 'artefakt:laufakte-' + vorgaengerLaufId` und
     `inhalts_hash === sha256Hex(kanonischesJson(vorgaengerLaufakteDaten))`
     — gegen die real geladene Vorgänger-Laufakte, nicht gegen einen im
     Test nachgebauten Wert (AK6-2-Muster). Danach:
     `stelleLaufstatusFest(vorgaengerLaufId)` unverändert
     `KLAERUNG_ERFORDERLICH` (Isolationsnachweis, F-091-Muster — ersetzt
     eine brüchige Grep-Prüfung über mehrzeilige Aufrufstellen durch
     einen echten Vorher/Nachher-Vergleich, siehe Bericht-Hinweis unten).
   - **AK7-positiv-B (FEHLGESCHLAGEN):** Vorgängerlauf über
     `fuehreAufgabeDurch` mit `attrappeOhneErgebnisobjekt` (bestehende
     F6a-Attrappe, erzeugt real `FEHLGESCHLAGEN`) real bis zum Abschluss
     durchlaufen lassen. Danach derselbe Ablauf/dieselben Assertions wie
     AK7-positiv-A, mit `stelleLaufstatusFest(vorgaengerLaufId).ergebnis
     === 'FEHLGESCHLAGEN'` vor und nach dem Retry-Lauf.
   - **Vorbedingungsverstoß:** `fuehreAufgabeDurch` mit
     `vorgaengerLaufId` auf eine nie existierende `laufId` → `await
     assert.rejects(...)`, Fehlertext enthält die angegebene
     `vorgaengerLaufId`.
   - `raeumeKette` um `vorgaengerLaufId`-Ketten erweitern
     (`lineage-laufakte-<vorgaengerLaufId>` zusätzlich zu den
     bestehenden Einträgen).
4. `scripts/check-f8-execution-controller.mjs` — **unverändert lassen**.
   Begründung (Design-Entscheidung dieses Vertrags, `[EMPFEHLUNG]`): ein
   Grep-Gate, das zuverlässig erkennt, ob `vorgaengerLaufId` an einen der
   mehrzeiligen `starteGateway`-Aufrufe durchgereicht wird, ist mit dem
   im Repo etablierten einzeiligen Regex-Muster nicht robust baubar (der
   bestehende `starteGateway`-Aufruf spannt mehrere Zeilen). Der
   Vorher/Nachher-Test in SCOPE Punkt 3 belegt die Isolation empirisch
   und direkt am realen Zustand, statt sie über eine brüchige
   Textmuster-Heuristik zu approximieren — strenger als ein Grep, nicht
   schwächer. Wenn du das anders siehst: nicht selbst umsetzen, sondern
   im Bericht begründet vorschlagen.
5. `state/gates.md` — F8-Zeile um den WS-2b-Beleg ergänzen (echter
   Befehl + Ausgabe, erst nach realem Prüflauf). `state/memory-map.md`,
   `docs/STATUS.md` nachziehen.
6. `features/F8/feature.md` — Status von `READY_FOR_TECH` auf
   `ABGESCHLOSSEN` (F-093-Muster: im selben Commit wie der letzte
   Bau-Commit dieses Vertrags, nicht als separater Nachtrag).
   `features/F8/journal.md` — Abschlussnachtrag: WS-2b, Gesamtstand F8
   (WS-1/WS-2a/WS-2b), Statuswechsel-Begründung.

NICHT:

- **Prüfung, ob der Vorgängerlauf tatsächlich `KLAERUNG_ERFORDERLICH`
  oder `FEHLGESCHLAGEN` steht.** Reine Beobachtung des Aufrufers
  (CONTEXT) — der Controller verzweigt nicht danach. Kein `if
  stelleLaufstatusFest(vorgaengerLaufId)...`-Code in diesem Modul.
- **Erzeugung/Validierung der neuen `laufId` gegen die
  `-retry-N`-Konvention.** Reine Test-/Aufrufer-Konvention (CONTEXT),
  kein Produktcode.
- **Mehrfach-Wiederaufnahme-Ketten** (Retry eines Retry-Laufs, plan-v1
  Abschnitt 10 Frage 3 sinngemäß) — fachlich offen, kein Blocker, hier
  weder gebaut noch verhindert.
- **Leitstand-/CLI-Anbindung** — `scripts/leitstand-server.mjs` bleibt
  unverändert; wer `fuehreAufgabeDurch` mit `vorgaengerLaufId` aufruft,
  ist außerhalb dieses Moduls (Feature #10, separat, `feature.md`
  Nicht-Ziele).
- **Änderungen an F1B/F2/F5/F6a/F7/F9 selbst** (D1) — der Controller
  ruft ausschließlich von außen auf.
- **Neue `AusfuehrungsErgebnis`-Rückgabefelder** für den Retry-Bezug
  (CONTEXT — Aufrufer kennt beide `laufId`s bereits).

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde
(`CLAUDE.md`-Zuschnitt-Heuristik; kleinster der drei F8-Workstreams —
ein optionales Feld, ein Ladeaufruf, ein Listen-Voranstellen). Zweites
Rot auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:

- Geänderte Dateien: `src/execution-controller/index.ts`,
  `src/execution-controller/types.ts`,
  `src/execution-controller/execution-controller.test.ts`,
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F8/feature.md` (Status), `features/F8/journal.md`.
- `scripts/check-f8-execution-controller.mjs` unverändert — im Bericht
  explizit bestätigen, dass beide bestehenden Greps weiterhin grün sind.
- Keine neuen Dateien erwartet.
- Beleg: `npm run check:template` und `npm run check` grün, Konsolen-
  ausgabe im Bericht zeigen.
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`,
  Push separat autorisiert.
- Bericht, knapp: was geändert wurde, welche Checks liefen, Ergebnis,
  Bestätigung F-093-Statuswechsel im selben Commit, echte Blocker.

ESCALATE:

- Widerspruch zwischen diesem Vertrag, plan-v1, `features/F8/feature.md`
  und realem Code (außer dem in der Vorrangregel bereits benannten,
  nicht blockierenden Fall) → anhalten, beide Stellen zitieren, melden.
- Eine reale Signatur (F2/F5/F6a/F7) weicht von den in CONTEXT zitierten
  Ständen ab → anhalten, Fundstelle zitieren, melden.
- Der Vorbedingungsverstoß-Testfall wirft nicht wie erwartet → anhalten,
  melden, nicht das Skript/den Test so lange anpassen, bis irgendein
  Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat → anhalten und melden.
- `git commit`/`git push` wird ohne frische Freigabedatei verlangt →
  nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter Freigabe.
