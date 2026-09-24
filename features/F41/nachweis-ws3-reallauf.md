# F41 WS-3 — Ablaufanleitung für den realen Reallauf (Vorbereitung)

**Dies ist eine Ablaufanleitung, kein Nachweis eines bereits gelaufenen
Durchgangs.** Dieser Auftrag (`docs/f41-ws3-vorbereitung`) bereitet nur vor;
der eigentliche Reallauf führt Stefan selbst durch und ergänzt hier die
tatsächlichen Beobachtungen (Muster `features/F39/nachweis-ws3-reallauf.md`
→ `nachweis-ws3-reallauf-messung.md`). Kein Schritt unten wurde von diesem
Auftrag selbst ausgeführt — kein Produktcode geändert, kein Lauf gestartet.

## ⚠️ Sicherheitshinweis — vor jedem Schritt lesen

**Der bestehende Nachweis-Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396`
(aus `features/F34/nachweis-ws3.md`, Teil b) darf NIEMALS geroutet oder
gestartet werden** (F-618, bereits in `features/F39/nachweis-ws3-reallauf.md`
festgehalten). Für diesen Reallauf entsteht ohnehin ein komplett neues,
eigenes Projekt (`haushaltsbuch`) mit eigenem Auftrag — der alte Auftrag hat
damit keinen Berührungspunkt, wird aber vorsichtshalber hier erneut benannt.

## Ziel dieses Reallaufs (F-666, Pflicht-AK der F41-Abnahme)

Ein vollständiger realer `hoch`-Durchlauf, der bisher in KEINEM Versuch
zusammen belegt wurde:

1. `architekt` liefert mindestens eine `entscheidungen_mensch`-Frage → Regel
   1c hält den Workflow real mit `KLAERUNG_ERFORDERLICH` an.
2. Stefan trägt die Entscheidung ein → der Workflow setzt real fort.
3. `architecture-advisor` liefert ein AUSWERTBARES Urteil (die
   `Urteil: ...`-Zeile ist seit F-641 fest Teil der Rolleninstruktion,
   `src/architecture-advisor/index.ts:40` — dieser Lauf muss sie nur noch
   tatsächlich liefern).
4. `ausfuehrung` läuft (schreibend, gegen das neue Projekt).
5. `code-reviewer` läuft ERFOLGREICH durch (die ENAMETOOLONG-Ursache aus
   F-642 ist seit PR #232 behoben — Stdin-Übergabe statt Argv — aber noch nie
   in einem vollständigen `hoch`-Lauf erneut real durchlaufen).

Zusätzlich, weil dieser Lauf erstmals gegen ein über F41 neu angelegtes
Projekt statt gegen ai-workforce selbst geht: belegt er nebenbei, dass die
E-F39-1=B-Schreibsperre (`src/ausfuehrung-vorbedingung/index.ts`) auch in
einem fremden Projektverzeichnis korrekt greift (siehe Vorbedingungen unten).

## Vorbedingungen — geprüft (lesend), Befund siehe unten

- **`npm run leitstand` läuft** (Port 4173, `http://127.0.0.1:4173`,
  `scripts/leitstand-server.mjs:531/8208`) — gegen dieses Repo, keine
  Wegwerf-Kopie.
- **Die Projektregister-Kollisionsprüfung ist frei:** `projekte.json` enthält
  aktuell nur `ai-workforce`; `projekte.lokal.json` existiert noch nicht — die
  `id` `haushaltsbuch` ist kollisionsfrei (AK3, `^[a-z0-9][a-z0-9-]{1,40}$`
  erfüllt).
- **Kann `ausfuehrung` im neuen Repo real starten? — Ja, real geprüft
  (lesend), unter Bedingung.** `pruefeAusfuehrungsVorbedingung`
  (`src/ausfuehrung-vorbedingung/index.ts:75`) läuft laut
  `leseAusfuehrungsVorbedingungRealGit`
  (`scripts/leitstand-server.mjs:2029`) gegen die `repoWurzel` des jeweils
  AKTIVEN Projekts (`AusfuehrungsOptionen`/`loeseProjektPfade`, F25) — nicht
  fest gegen ai-workforce. Die Prüfung ist eine reine Funktion ohne
  Repo-Bezug im Code selbst:
  - **Branch ≠ main/master, kein detached HEAD** — erfüllt, sobald Stefan in
    Schritt c unten `git checkout -b arbeit/start` ausführt (Schritt d der
    F41-WS-1-„Nächste Schritte"-Box).
  - **Sauberer Arbeitsbaum** — `filtereUnsaubereZeilen`
    (`src/ausfuehrung-vorbedingung/index.ts:59`) nimmt `kontrollzustand/`
    bereits als Präfix-Ausnahme aus (`AUSNAHME_PRAEFIXE`, Zeile 23) — das gilt
    für JEDES Repo, nicht nur ai-workforce, weil die Prüfung textuell auf
    Porcelain-Pfaden arbeitet, ohne Repo-Namen zu kennen. Ein frisch
    angelegtes `haushaltsbuch`-Repo mit `git init -b main` → `add -A` →
    `commit` → `checkout -b arbeit/start` (die vier Befehle aus der
    „Nächste Schritte"-Box) hat danach einen sauberen Baum und den richtigen
    Branch — kein Hindernis, **wenn** Stefan diese vier Befehle tatsächlich
    ausführt, bevor er `schritt-3-ausfuehrung` freigibt.
  - Reale Einschränkung, nicht behoben (kein Umbau, nur Beobachtung): diese
    Prüfung liest `.git/HEAD` und `git status --porcelain` synchron zum
    Freigabe-Zeitpunkt — sie ist kein Ersatzgate für „Stefan hat wirklich
    committet", sondern eine Momentaufnahme. Kein neues Finding, deckt sich
    mit dem bestehenden Vertrag (E-F39-1=B).
- **Kein `pruefbefehl` in der neuen Startvorlage — erwartet, kein
  Prüfschritt (F-667).** `schreibeStartvorlageUndProfil`
  (`src/projekt-anlegen/index.ts`) entfernt `pruefbefehl`/`pruefZeitgrenzeMs`
  bewusst (AK4c) — ein frisch angelegtes, leeres Projekt hat noch keinen
  eigenen Stack. Der `ausfuehrung`-Schritt läuft deshalb ohne automatisierten
  Prüfschritt zwischen sich und `code-reviewer` — das ist laut F-667 der
  erwartete Zustand, kein neuer Befund, keine Blockade dieses Reallaufs.
- **Codex CLI angemeldet** (`schritt-1-architekt`/`schritt-4-review` laufen
  auf Worker `codex`/`gpt-6-astra`, `workflow-vorlagen/hoch.json`) — ist Codex
  nicht verfügbar, weicht der reale Worker ab (Muster F34/F39 WS-3,
  `claude-code`-Rückfall); das ist dann zu protokollieren, kein
  Abbruchgrund.

## Ablauf

Pro Schritt: was Stefan klickt, was real erwartet wird, was zu
protokollieren ist, was bei Abweichung zu tun ist. Ein
`## <Beobachtung>`-Unterabschnitt wird beim realen Durchlauf unter jedem
Schritt ergänzt (`nachweis-ws3-reallauf-messung.md`, neu anzulegen nach
Muster `features/F39/nachweis-ws3-reallauf-messung.md`).

### a. Leitstand starten

**Befehl (PowerShell, im Repo-Wurzelverzeichnis `C:\Users\stefa\Projekte\ai-workforce`):**
```
npm run leitstand
```

**Erwartet:** `Leitstand läuft auf http://127.0.0.1:4173 (...)` in der
Konsole. Läuft bereits eine Instanz (`kontrollzustand/.leitstand.lock`),
zuerst diese beenden (Lehre aus F39 WS-3, F-636) — eine alte Instanz könnte
gegen einen alten Code-Stand laufen.

**Bei Abweichung:** Port belegt (`EADDRINUSE`) → laufenden Prozess über den
Lock-Pfad identifizieren und beenden, nicht `LEITSTAND_PORT` stillschweigend
umschalten (sonst prüft dieser Lauf einen anderen Serverstand). Echtes
Hindernis → anhalten, Befund melden, nicht workarounden.

### b. „Neues Projekt anlegen"

**Klick:** `#/projekte-uebersicht` öffnen → **„+ Neues Projekt"**
(`#projekte-anlegen-oeffnen`) → Formular öffnet sich.

**Eintragen:** `id` (`#projekte-anlegen-id`) = `haushaltsbuch`; `Name`
(`#projekte-anlegen-name`) = `Haushaltsbuch`; `Zielordner`
(`#projekte-anlegen-zielordner`, unter „Erweitert" o. Ä. eingeklappt) **leer
lassen** — Standard ist das Geschwisterverzeichnis von ai-workforce.

**Klick:** **„Anlegen"** (`#projekte-anlegen-absenden`).

**Erwartet:** `201`, „Nächste Schritte"-Box erscheint
(`#projekte-anlegen-erfolg`) mit den vier Git-Befehlen und einem Hinweis auf
das Coach-Interview; neue Karte `haushaltsbuch` erscheint in der Übersicht
(ohne Neuladen).

**Bei Abweichung:** `409` (id bereits vergeben) → laut Vorbedingungs-Check
oben nicht erwartet; tritt es doch auf, eine abweichende `id` wählen und
protokollieren, warum die Kollisionsannahme falsch war (kein Wiederholen
ohne Ursachenklärung). `422` (Startprüfung am Ziel rot) → echtes Hindernis,
anhalten, Befund melden — NICHT den zurückgebauten Ordner von Hand
nachbauen.

**Protokollieren:** exakter Zielordner-Pfad aus der Erfolgsantwort
(`projekt.repo_pfad`), Wortlaut der vier Git-Befehle.

### c. Die angezeigten Git-Befehle im neuen Repo ausführen

**Befehl (PowerShell, im NEUEN Zielordner — z. B.
`C:\Users\stefa\Projekte\haushaltsbuch`, exakten Pfad aus Schritt b
übernehmen):**
```
cd <zielordner-aus-schritt-b>
git init -b main
git add -A
git commit -m "Initiale Kopie der Harness-Baseline (F41)"
git checkout -b arbeit/start
```

**Erwartet:** vier Befehle laufen ohne Fehler durch; `git status` danach
zeigt Branch `arbeit/start`, sauberer Baum (die kopierten Dateien sind
committet). Das ist die Vorbedingung für Schritt 8 unten (`ausfuehrung`) —
ohne diesen Schritt lehnt `schritt-3-ausfuehrung` mit „Ausführung gesperrt:
du bist auf main" ab.

**Wichtig:** jeder Befehlsblock beginnt mit `cd` auf den vollständigen,
neuen Pfad (CLAUDE.md-Arbeitsweise) — NICHT im ai-workforce-Fenster
weiterarbeiten und dabei den Ordner wechseln.

**Bei Abweichung:** ein Git-Fehler hier (z. B. `user.name`/`user.email`
nicht gesetzt) → lokal beheben (globale Git-Config, kein Produktcode-Thema),
dann wiederholen. Kein Blocker dieses Auftrags.

### d. „Zum Coach-Interview", Modus Projekt

**Klick:** In der Erfolg-Box **„Zum Coach-Interview"**
(`#projekte-anlegen-coach`) — springt automatisch in `#/chat`, Hauptmodus
**Sparring**, Untermodus **Projekt**, aktives Projekt bereits auf
`haushaltsbuch` umgeschaltet (`wechsleZuSparringProjekt`).

**Eingeben (mehrere Turns, Muster `features/F34/nachweis-ws3.md`):**
vorgeschlagener Startsatz: „Eine kleine lokale Web-App für Einnahmen und
Ausgaben pro Monat, mit Kategorien und einer Monatsübersicht." Die
Speicherform (SQLite oder JSON-Datei) bewusst OFFEN lassen — das ist genau
die Art Entscheidung, die Regel 1c real auslösen soll (Ziel 1 oben).

**Erwartet:** Der Coach liefert nach einigen Turns `art: 'projekt_entwurf'`
mit vollständigem Entwurf; Feature-/Meilenstein-IDs real und kollisionsfrei
vergeben.

**Protokollieren:** Anzahl Turns bis zur Konvergenz, je Turn `art`/
`dauer_ms`/`output_tokens`, vergebene IDs, Capability-Bedarf-Tabelle.

**Bei Abweichung:** Der Coach konvergiert nicht binnen ~5 Turns → einen Turn
lang explizit nach der offenen Speicherform-Entscheidung fragen (nicht
vorschreiben) — bleibt sie danach weiter unklar, das selbst protokollieren
(kein Zwang, künstlich eine Klärungsfrage zu erzwingen).

### e. „Als Auftrag anlegen" → routen

**Klick:** Am `projekt_entwurf`-Eintrag **„Als Auftrag anlegen"**, Titel/
Auftragstext prüfen, **Anlegen** bestätigen.

**Erwartet:** `POST /api/projekte/haushaltsbuch/auftraege` liefert `201`
(`legeAuftragAn`, `public/leitstand/api.js:94` — geht wie jeder Endpunkt
außer `holeProjekte` durch `mitPraefix()`, der Präfix steht seit Schritt d
auf `/api/projekte/haushaltsbuch`, `projekt-kontext.js:50`); `herkunft: {
art: 'projekt_interview' }` automatisch gesetzt.

**Klick/Befehl:** Auftrag routen — bekannte UI-Lücke, jetzt als **F-637**
festgehalten (`state/findings.md`, „Über den Coach angelegte Aufträge haben
im Leitstand keinen „Routen"-Knopf"): kein eigener „Routen"-Knopf für einen
chat-angelegten Auftrag. Browser-DevTools-Konsole auf
`http://127.0.0.1:4173` — **Pfad MIT Projekt-Präfix**, sonst trifft der
Aufruf `ai-workforce` statt `haushaltsbuch` (`erzeugeMultiProjektDispatcher`,
`scripts/leitstand-server.mjs:8093`, leitet nur `/api/projekte/<id>/...` an
die Handler-Instanz des jeweiligen Projekts um — ein Aufruf ohne dieses
Präfix landet immer im unpräfigierten `defaultHandler`, also `ai-workforce`):
```js
fetch(`/api/projekte/haushaltsbuch/auftraege/${AUFTRAG_ID}/routen`, { method: 'POST' }).then((r) => r.json()).then(console.log)
```

**Erwartet:** `202`. Nach Laufende entsteht ein neuer Workflow — wegen
`herkunft.art === 'projekt_interview'` MUSS die Kontrolltiefe deterministisch
auf mindestens `hoch` angehoben werden (AK9, `src/router/index.ts`).

**Protokollieren:** `auftragId`, `GET /api/projekte/haushaltsbuch/workflows/<id>`
— `ziel` MUSS den
Vermerk `[Untergrenze hoch wegen herkunft projekt_interview]` tragen (außer
der Router schlug ohnehin schon `hoch` vor); `schritte[].rolle` MUSS mit
`architekt` beginnen (`workflow-vorlagen/hoch.json`, nicht
`standard.json`/`fast-lane.json`).

### f. Kette: architekt → Entscheidung eintragen → advisor → ausfuehrung → code-reviewer

**Hinweis zu Hash-Links (`#/workflows/<id>` usw.):** der Hash selbst trägt
keine Projekt-id (`registriere(/^#\/workflows\/([^/]+)$/, ...)`,
`public/leitstand/views/workflows.js:1197`) — welches Projekt ein solcher
Link tatsächlich trifft, entscheidet ausschließlich der Client-seitige
`api.js`-Präfix (`aktivesProjektPraefix`), nicht die URL. Dieser Präfix
steckt in `sessionStorage` (`projekt-kontext.js:47`) und überlebt einen
Reload IM SELBEN Tab — die Klicks unten funktionieren deshalb unverändert
gegen `haushaltsbuch`, solange der gesamte Ablauf (Schritt b bis f) in
EINEM Browser-Tab bleibt. Wird einer dieser Links dagegen in einem NEUEN
Tab/Fenster geöffnet (z. B. ein kopierter Link), fällt der Kontext still auf
`ai-workforce` zurück (kein Fehler, keine Warnung) — die Seite würde dann
den völlig falschen Workflow zeigen bzw. gegen das falsche Projekt
freigeben. Deshalb: diese Links nur im ohnehin offenen Tab anklicken, nie
in einen neuen Tab/ein neues Fenster kopieren.

**f1. `#/workflows/<id>` öffnen, `schritt-1-architekt` freigeben.**
Erwartet: Worker `codex`/`gpt-6-astra`, `--output-schema` gegen
`ergebnis-architektur.schema.json`. Nach Laufende: `ERFOLGREICH` mit
strukturiertem JSON, oder `FEHLGESCHLAGEN`
(`ergebnis_nicht_schemakonform`).

**f2. Entscheidung eintragen (Regel 1c — der eigentliche Pflicht-Prüfpunkt,
Ziel 1/2 oben).** Ist `entscheidungen_mensch[]` NICHT leer: Workflow hält mit
`KLAERUNG_ERFORDERLICH` an, Feld `architekturEntscheidung` zeigt die
Fragen. Je Frage eine Option wählen (optional Begründung), **„Entscheidung
speichern"**. Erwartet: `POST /api/projekte/haushaltsbuch/workflows/<id>/entscheidung`
(`sendeWorkflowArchitekturEntscheidung`/`public/leitstand/api.js:115-116`,
ebenfalls `mitPraefix()`) liefert `202` mit `status: 'WARTET_FREIGABE'`. **Ist `entscheidungen_mensch[]`
LEER** (z. B. weil der Coach die Speicherform doch selbst entschied): dieser
Schritt entfällt — dann ist Ziel 1 dieses Reallaufs NICHT erreicht, das ist
ehrlich zu protokollieren (kein Nachbessern des Architekten-Outputs von
Hand, kein künstliches Erzwingen einer Frage).

**f3. `schritt-2-architektur` (`architecture-advisor`) freigeben.** Erwartet:
Worker `claude-code`/`claude-sonnet-5`, Prosa-Urteil MIT `Urteil: ...`-Zeile
(F-641-Fix, jetzt fest Teil der Rolleninstruktion — der Prüfpunkt ist, ob
der Lauf sie tatsächlich liefert). Protokollieren: bestätigt der Advisor den
Architektur-Entwurf, oder weicht er ab (welcher Punkt)? Das ist der zweite
Messpunkt aus dem Auftrag: lohnt sich der Advisor — findet er etwas, das der
Architekt übersehen hat?

**f4. `schritt-3-ausfuehrung` freigeben.** Vorbedingung: Schritt c oben MUSS
bereits ausgeführt sein (Branch `arbeit/start`, sauberer Baum) — sonst
lehnt der Server mit „Ausführung gesperrt" ab (kein Fehlschlag des
Reallaufs, sondern ein übersprungener Vorbereitungsschritt; c nachholen und
wiederholen). Protokollieren: welche Dateien im NEUEN Repo tatsächlich
angelegt wurden (Beschreibung, Roadmap, Akten, ADRs, Schemas —
`adr_entwuerfe[]`/`schema_entwuerfe[]`/`module[]` aus dem Architektur-
Ergebnis gegen das reale `git diff` im `haushaltsbuch`-Repo abgleichen).

**f5. `schritt-4-review` — kein Klick, startet automatisch.** Worker
`codex`, `output_schema: 'ergebnis-code-reviewer'`. Protokollieren:
`urteil`/`befunde`/`empfehlung` — **`urteil` darf nicht `FEHLGESCHLAGEN`
(Laufstatus) sein** (Ziel 5 oben, die F-642-Ursache gilt als behoben, aber
noch nie in einem vollständigen `hoch`-Lauf erneut real durchlaufen).

**Bei Abweichung (jeder Teilschritt f1–f5):** ein einmaliger,
unerklärlicher Fehlschlag ohne Code-/Config-Änderung → „Prüfung
wiederholen" (F-656) EINMAL versuchen (Muster CLAUDE.md „Bekannte Fallen",
Flake-Fall). Wiederholt er sich, oder ist die Ursache erkennbar (z. B.
echtes Schema-/Rollenvertrags-Problem) → NICHT erneut versuchen, anhalten
und den Befund melden statt ihn wegzuklicken.

## Messvorlage (in der Beobachtungsdatei zu befüllen)

Je Lauf (f1/f3/f4/f5, plus Router-Lauf aus Schritt e):

| Schritt | Lauf-ID | Rolle | Worker/Modell | Dauer | Kosten | Urteil/Status |
| --- | --- | --- | --- | --- | --- | --- |
| Router (e) | | router | | | | |
| f1 architekt | | architekt | codex/gpt-6-astra | | | |
| f3 advisor | | architecture-advisor | claude-code/claude-sonnet-5 | | | |
| f4 ausfuehrung | | ausfuehrung | claude-code/claude-sonnet-5 | | | |
| f5 review | | code-reviewer | codex/gpt-6-astra | | | |

Zusätzlich explizit zu beantworten (Auftragspunkt 2):

1. **Hat die Entscheidung (f2) den Lauf real angehalten und fortgesetzt?**
   Ja/Nein, mit Beleg (Workflow-Status vor/nach `POST .../entscheidung`).
2. **Advisor-Urteil (f3): findet er etwas, das der Architekt übersehen hat?**
   Konkrete Fundstelle, falls ja — das ist der Messpunkt, ob sich der
   Advisor-Schritt inhaltlich lohnt (nicht nur mechanisch funktioniert).
3. **Welche Dateien hat `ausfuehrung` (f4) im NEUEN Repo angelegt?**
   Tabelle: Datei, Art (Beschreibung/Roadmap/Akte/ADR/Schema), Bezug zum
   Architektur-Entwurf.
4. **Review-Urteil (f5):** `urteil`-Wert, Anzahl/Schwere der `befunde[]`,
   `empfehlung`-Wortlaut.

Abschluss (Muster F39): Workflow-Endstatus, Gesamtkosten laut
Verbrauch-Ansicht (Dashboard, Zeitraum passend eingegrenzt),
Gesamteinschätzung, ob der Architektur-Entwurf tatsächlich zu einem
besseren Baudurchgang beigetragen hat.

## Nicht Teil dieses Auftrags

- Der reale Durchlauf selbst — dieses Dokument ist die Anleitung, nicht der
  Nachweis.
- Jede Änderung an Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396`.
- Ein Workaround für ein real gefundenes Hindernis (z. B. fehlendes Codex-
  Login, blockierter Port) — melden, nicht selbst beheben.
- Der neue UI-Knopf für „Auftrag routen" außerhalb von Findings/
  Capability-Gaps (bereits in F39 WS-3a dokumentiert, nicht Scope hier).
