# F41 WS-3 — Messung des realen Reallaufs (Pflicht-AK F-666)

Alle Daten unten sind lesend belegt — Quelle `C:\Users\stefa\Projekte\haushaltsbuch\kontrollzustand\` (Workflow-/Laufakten, Entscheidungsartefakte) und `C:\Users\stefa\Projekte\ai-workforce\kontrollzustand-roh\` (Rohströme; alle Rohströme dieses Laufs liegen dort statt unter dem Projekt selbst — F-683, offen). Nichts im Kontrollzustand wurde für diese Messung verändert.

**Auftrag:** `1c82e21f-dd90-43bb-8338-78c9a750b002` ("Projekt-Anlage: Eine lokale, nur für dich laufende Web-App, die das monatliche Grundgerüst für ein Haushaltsbuch liefert…"), `herkunft: projekt_interview`. **Workflow:** `router-1c82e21f-dd90-43bb-8338-78c9a750b002`, vier Schritte (`workflow-vorlagen/hoch.json`), `ziel` trägt `[Untergrenze hoch wegen herkunft projekt_interview]`.

## Router (Schritt e)

- Lauf-ID: `router-1c82e21f-dd90-43bb-8338-78c9a750b002-1790277994809`.
- Worker: `claude-code` (kein `worker`-Feld in der Laufakte → Standardpfad; **wegen F-681** — die zwei vorangegangenen Router-Läufe dieses Auftrags scheiterten am verdoppelten Startvorlagenpfad, `codex` UND `claude-code` waren `verfuegbar:false`, der Router fiel danach auf den fehleranfälligen `claude-code`-Klassifikationspfad zurück, F-337/F-391 — dieser dritte Lauf `-1790277994809` ist der erste NACH dem F-681-Fix).
- Start/Ende: `2026-09-24T19:26:35.460Z` → `2026-09-24T19:26:54.916Z` (Dauer `verbrauch.dauer_ms` 16.306 ms).
- Verbrauch: `input_tokens 2`, `output_tokens 1524`, `cache_read_tokens 6271`, `cache_write_tokens 12513`.
- Modellklassifikation: `kontrolltiefe: "standard"`, `risikoklasse: "niedrig"` — der Router selbst erkannte `herkunft.art: projekt_interview` NICHT als Hoch-Auslöser und schlug `standard` vor.
- Tatsächlich geladene Vorlage: **`hoch.json`** (vier Schritte, erster Schritt `schritt-1-architekt`) — die serverseitige AK9-Untergrenze (`herkunft.art === 'projekt_interview'` hebt zwingend auf `hoch` an) griff und überschrieb die Modellklassifikation. Das gespeicherte Router-Artefakt trägt dabei weiterhin `vorlage: 'standard'` (F-686, bereits erfasst) — das `ziel`-Feld des WORKFLOWS trägt den Untergrenzen-Vermerk korrekt, nur das Router-Artefakt selbst nicht.

## f1 — `architekt`

- Lauf-ID: `288d90fa-a1a5-4e63-bb01-37a72175a4dd`, Worker `codex`/`gpt-6-astra`.
- Start/Ende: `2026-09-24T19:31:51.496Z` → `2026-09-24T19:34:07.182Z` (Dauer `verbrauch.dauer_ms` 135.650 ms ≈ 135,7 s).
- Verbrauch: `input_tokens 20873`, `output_tokens 4058`.
- Ergebnis: **ERFOLGREICH**, `beobachtungsbasis_vollstaendig: true`. **Lief noch mit dem F-681-Bug** (Capability-Auszug zu diesem Zeitpunkt fälschlich "alle Worker nicht verfügbar", siehe `state/findings.md` F-681) — der Lauf selbst war davon nicht betroffen, weil `architekt` `worker: 'codex'` fest in der Startvorlage trägt und keine Selbsteinschätzung der Verfügbarkeit über den Auszug trifft; der fehlerhafte Auszug hätte aber real ein Modell verwirren können, das seine eigene Werkzeugverfügbarkeit aus dem Kontextpaket abliest.
- `module[]`: 4 Einträge (Weboberfläche, Lokale Anwendung, Datenhaltung, Monatsauswertung) — schlank geschnitten, keine erkennbare Vorratsarchitektur (kein Frontend-Framework, kein Cloud-Dienst, kein Auth-System).
- `adr_entwuerfe[]`: 1 Eintrag — "Lokale Web-App mit Python, SQLite und browsernativer Oberfläche": Python-Prozess + SQLite als Speicherform, mit Alternativen (IndexedDB, Frontend-Framework, Desktop-Wrapper) und Konsequenzen.
- `entscheidungen_mensch[]`: **3 Einträge** — Mindesthistorie (Anzahl Vormonate), welche Monate in den Durchschnitt einfließen, wie negative Ausgaben/gemischte Kategorien beim Vergleich behandelt werden. Alle drei fachlich entscheidungsreif (je mit echten Optionen).
- Speicherform (Python/SQLite) NICHT als `entscheidungen_mensch`-Frage gestellt, obwohl der Coach-Auftragstext sie bewusst offen ließ (F-685, siehe unten) — der Architekt legte sie sich implizit selbst fest.

## e2 — Architektur-Entscheidung eingetragen

- Artefakt `workflow-entscheidung-router-1c82e21f-dd90-43bb-8338-78c9a750b002`, `entschieden_am: 2026-09-24T19:35:05.262Z`.
- Drei Antworten: „Drei Vormonate", „Alle Kalendermonate ab erster Buchung", „Ausgaben und Einnahmen getrennt vergleichen".
- **Beleg, dass der Workflow real anhielt und fortsetzte:** zwischen dem Ende von `schritt-1-architekt` (19:34:07Z) und der Registrierung der Entscheidung (19:35:05Z) lag der Workflow real auf `KLAERUNG_ERFORDERLICH`/`WARTET_FREIGABE` (Regel 1c, `entscheidungenMenschAusstehend`); direkt danach (19:35:18Z) startete `schritt-2-architektur` (Lauf `3943c565-…`) — der Automat setzte real fort, ohne dass ein Mensch `schritt-1-architekt` erneut anstoßen musste.

## f3 — `architecture-advisor` (zwei Versuche)

**Versuch 1 — `3943c565-dd33-4df4-895f-56daf1e1fb4a`:** Start `19:35:18.330Z`, Ende `19:35:18.366Z` (36 ms) — **FEHLGESCHLAGEN**, `startfehler.code: "ENAMETOOLONG"` (F-682, damals offen). Kein inhaltlicher Advisor-Beitrag möglich; reiner Prozessstart-Fehler vor jedem Modellaufruf. Workflow hielt korrekt auf `KLAERUNG_ERFORDERLICH`.

**Versuch 2 (Reparaturfassung, nach dem F-682-Fix) — `0b389b1a-cb78-4477-af58-189547c7fc33`:** Worker `claude-code`/`claude-sonnet-5`. Start `2026-09-25T05:34:54.453Z` → Ende `05:36:52.876Z` (Dauer `verbrauch.dauer_ms` 115.584 ms ≈ 115,6 s, 18 Turns). Verbrauch: `input_tokens 10`, `output_tokens 11261`, `cache_read_tokens 151866`, `cache_write_tokens 43546`. Ergebnis: **ERFOLGREICH**, `Urteil: BEREIT_NACH_KORREKTUR`.

**Kernaussagen (wörtlich gekürzt):**
- Bestätigt: Modulzuschnitt minimal, keine Vorratsarchitektur; Cent-genaue Ganzzahlbeträge, FK-Löschsperre statt Kaskade, getrennte Aggregation — "fundierte, begründete Entscheidungen mit sauber abgewogenen Alternativen"; Sicherheitsüberlegungen (Loopback-Bindung, Origin/Host-Prüfung, JSON-Content-Type-Pflicht) als "genau die Art von echtem Fehlerfall, die hier abgedeckt sein sollte".
- **Substanzieller Kritikpunkt (Neues, das der Architekt übersah):** "Die Wahl eines separaten Python-Prozesses als Backend passt nicht zur vorgefundenen Werkzeugumgebung. Die Permission-Allowlist in `.claude/settings.json` erlaubt ausschließlich `npm run check|check:template|lint|typecheck|test` als Bash-Befehle; für Python … existiert keinerlei Freigabe." Empfiehlt eine schlanke Node-Lösung als konsistenter.
- Kleinere, nicht blockierende Lücken: kein Backup-Konzept für die SQLite-Datei, kein Hinweis zum Prozess-Lifecycle.
- Bestätigt zusätzlich, dass die drei Menschen-Entscheidungen (siehe e2) korrekt in den Architektur-Entwurf eingeflossen sind.

## f4 — `ausfuehrung`

- Lauf-ID: `40045f94-6692-44a8-9514-766c5c5f295e`, Worker `claude-code`/`claude-sonnet-5`.
- Start/Ende: `2026-09-25T05:39:43.398Z` → `05:40:41.404Z` (Dauer `verbrauch.dauer_ms` 55.729 ms ≈ 55,7 s, 10 Turns).
- Verbrauch: `input_tokens 10`, `output_tokens 5191`, `cache_read_tokens 168728`, `cache_write_tokens 42526`.
- Ergebnis (Workflow-Feld): **ERFOLGREICH**. **Real geschriebene Dateien: keine** — der Lauf stellte stattdessen eine Rückfrage mit 3 Optionen an den Menschen (siehe Wortlaut unten), weil der Auftragstext `npm run check`/`validiereRoadmapDaten` (`src/projektkontext/index.ts`)/`scripts/check-feature.mjs`/`docs/adr/TEMPLATE.md` verlangt — keine dieser Dateien/Skripte existiert im neu angelegten `haushaltsbuch`-Repo (F-684, bereits erfasst).
- `stderr` trägt real: `"Ignoring 5 permissions.allow entries from .claude/settings.json: this workspace has not been trusted. Run Claude Code interactively here once and accept the trust dialog, or set projects[\"C:/Users/stefa/Projekte/haushaltsbuch\"].hasTrustDialogAccepted: true in C:\Users\stefa\.claude.json.\n"` — die kopierte Projekt-Allowlist griff real nicht (neues Finding, siehe unten).
- Rückfrage-Wortlaut (gekürzt): „Bevor ich Dateien anlege, muss ich einen Blocker klären: Der Auftrag setzt eine Validierungs-Infrastruktur voraus, die im Repo nicht existiert. […] Frage an dich: Wie soll ich vorgehen? 1. Ich lege die Dokumentation so an … vermerke aber explizit, dass `npm run check` mangels vorhandenem Harness aktuell nicht ausführbar ist. 2. Du sagst mir, dass das fehlende Harness an anderer Stelle erwartet wird … 3. Etwas anderes …"
- **Trotz offener Rückfrage lief der Workflow automatisch zum Review weiter** — `leseSelbstblockadeAusAusfuehrungstext` erkennt nur die feste Markdown-Zeile `- [x] Blockiert`; der Rückfragetext trägt dieses Signal nicht (neues Finding, siehe unten).

## f5 — `code-reviewer` (automatisch)

- Lauf-ID: `5fee123f-78d0-49de-b055-8adcdc8c98e0`, Worker `codex`/`gpt-6-astra`.
- Start/Ende: `2026-09-25T05:40:43.460Z` → `05:41:37.176Z` (Dauer `verbrauch.dauer_ms` 53.696 ms ≈ 53,7 s).
- Verbrauch: `input_tokens 75502`, `output_tokens 661`, `cache_read_tokens 55552`.
- Ergebnis (Workflow-Feld): **ERFOLGREICH** (kein `ENAMETOOLONG`, kein `FEHLGESCHLAGEN` — F-682-Fix hält auch in einem vollständigen `hoch`-Lauf).
- `urteil`: **`BLOCKIERT`**.
- `befunde[]` (2 Einträge, beide `schwere: HOCH`):
  1. Fundstelle `docs/projekt/kontext/beschreibung.md; docs/projekt/roadmap.json; features/F1–F5/feature.md` — „Die beauftragte Dokumentation fehlt vollständig." Beleg: „Im Arbeitsverzeichnis haushaltsbuch existiert keine der sieben geforderten Dateien. git status und git diff sind leer."
  2. Fundstelle `package.json; src/projektkontext/index.ts; scripts/check-feature.mjs` — „Die geforderte Validierung ist im aktuellen Arbeitsverzeichnis nicht möglich." Beleg: „Alle drei Dateien fehlen. npm run check wurde deshalb nicht ausgeführt. Die Laufakte des Vorgängerlaufs nennt abweichend das Arbeitsverzeichnis C:\Users\stefa\Projekte\ai-workforce." — der Reviewer hat damit selbständig denselben `arbeitsverzeichnis_pfad`-Bruch bemerkt, den F-670 bereits dokumentiert.
- `empfehlung`: „Zielrepository und Prüfgrundlage abgleichen, anschließend die sieben Dokumentationsdateien erstellen und validieren. Dieser Lauf hat ausschließlich Lesezugriff und konnte die fehlenden Dateien daher nicht anlegen."
- **Beide Befunde korrekt** (2× HOCH, real zutreffend — der Reviewer hat den mechanisch "erfolgreichen", aber inhaltlich leeren `ausfuehrung`-Schritt real aufgedeckt).

## Abschluss / Abnahme

- **Workflow-Endstatus: `GESTOPPT`.** Stefan lehnte über `POST /api/workflows/<id>/abnahme` ab: `entscheidung-workflow-router-1c82e21f-dd90-43bb-8338-78c9a750b002-abnahme`, `ergebnis: ABGELEHNT`, `begruendung: "mechanisch bestanden"`, `entschieden_am: 2026-09-25T06:00:22.996Z`, `bezug: { ausfuehrung_lauf_id: 40045f94-…, review_lauf_id: 5fee123f-…, workflow_version: 1 }`.
- Gesamtkosten: aus den Laufakten sind ausschließlich Token-Zahlen belegt (`total_cost_usd` wird bewusst nie gelesen, Kern-Entscheidung 30) — eine Dollarsumme aus der Verbrauch-Ansicht (Dashboard) wurde für diese Messung nicht zusätzlich erhoben (Out of Scope, reine Lesemessung aus dem Kontrollzustand).

### Tabelle aller Läufe

| Schritt | Lauf-ID | Rolle | Worker/Modell | Dauer | Verbrauch (in/out/cache-read) | Urteil/Status |
| --- | --- | --- | --- | --- | --- | --- |
| Router (e) | `router-…-1790277994809` | router | claude-code/claude-sonnet-5 | 16,3 s | 2 / 1524 / 6271 | `standard` (real `hoch` geladen, F-686) |
| f1 architekt | `288d90fa-…` | architekt | codex/gpt-6-astra | 135,7 s | 20873 / 4058 / 0 | ERFOLGREICH |
| f3 advisor (V1) | `3943c565-…` | architecture-advisor | claude-code/claude-sonnet-5 | 0,04 s | — | FEHLGESCHLAGEN (ENAMETOOLONG, F-682) |
| f3 advisor (V2) | `0b389b1a-…` | architecture-advisor | claude-code/claude-sonnet-5 | 115,6 s | 10 / 11261 / 151866 | ERFOLGREICH, BEREIT_NACH_KORREKTUR |
| f4 ausfuehrung | `40045f94-…` | ausfuehrung | claude-code/claude-sonnet-5 | 55,7 s | 10 / 5191 / 168728 | ERFOLGREICH (0 Dateien, Rückfrage) |
| f5 review | `5fee123f-…` | code-reviewer | codex/gpt-6-astra | 53,7 s | 75502 / 661 / 55552 | ERFOLGREICH, BLOCKIERT (2× HOCH) |

## Ziel-Tabelle (Pflicht-Urteil PRO ZIEL, Lehre F-665 — nie pauschal „erfüllt")

| Ziel | Mechanik | Inhalt |
| --- | --- | --- |
| 1. `architekt` liefert `entscheidungen_mensch` → Regel 1c hält real an | **JA** — 3 Fragen, Workflow real auf `KLAERUNG_ERFORDERLICH` | **JA** — alle drei Fragen fachlich entscheidungsreif (echte Optionen), real beantwortet |
| 2. Entscheidung eingetragen → Workflow setzt real fort | **JA** — Artefakt registriert 19:35:05Z, `schritt-2-architektur` startete 19:35:18Z ohne Menscheneingriff | **JA** — die drei Antworten flossen laut Advisor-Urteil korrekt in den Entwurf ein |
| 3. `architecture-advisor` liefert ein auswertbares Urteil | **JA — erst im zweiten Versuch** (V1 scheiterte technisch an F-682, V2 nach dem Fix lieferte `Urteil: BEREIT_NACH_KORREKTUR`) | **JA** — echter, neuer Befund (Python vs. Node/npm-Ökosystem, mit konkretem Beleg aus `.claude/settings.json`), keine Bestätigungsfloskel |
| 4. `ausfuehrung` läuft schreibend gegen das neue Projekt | **JA (mechanisch)** — Lauf ERFOLGREICH, real gestartet und beendet | **NEIN** — 0 Dateien geschrieben; der Lauf stellte stattdessen eine berechtigte Rückfrage, die vom Automaten nicht als Halt erkannt wurde (Ursache: F-684, Symptom: neues Finding a) |
| 5. `code-reviewer` läuft ERFOLGREICH durch (kein `ENAMETOOLONG`) | **JA** — F-682-Fix hält auch im vollständigen `hoch`-Lauf, kein technischer Fehlschlag | **JA (im Sinne der Qualitätssicherung)** — `urteil: BLOCKIERT`, beide HOCH-Befunde real zutreffend: der Reviewer hat den leeren Baudurchgang korrekt aufgedeckt |

**Gesamturteil:** F-666 ist **mechanisch erfüllt** — alle fünf Ziele sind technisch real durchlaufen (Regel 1c hielt an und setzte real fort, der Advisor lieferte ein auswertbares Urteil, `ausfuehrung` und `code-reviewer` liefen beide ohne technischen Fehlschlag). **Ein inhaltlicher Baudurchgang ist NICHT belegt** — `ausfuehrung` hat keine einzige Datei geschrieben; Ursache ist F-684 (die Coach-Vorlage schreibt ai-workforce-spezifische Prüfvoraussetzungen in jeden Auftrag, die im neu angelegten Fremdprojekt strukturell fehlen). Der `code-reviewer` hat diesen Zustand korrekt als `BLOCKIERT` erkannt; Stefan hat den Workflow folgerichtig mit der Begründung „mechanisch bestanden" abgelehnt.

## Explizite Messpunkte (Auftragspunkt 2)

1. **Hat die Entscheidung (f2) den Lauf real angehalten und fortgesetzt?** Ja — Beleg: Workflow hielt zwischen 19:34:07Z (Ende `schritt-1-architekt`) und 19:35:05Z (Entscheidung registriert) auf `KLAERUNG_ERFORDERLICH`/`WARTET_FREIGABE`, `schritt-2-architektur` startete direkt danach (19:35:18Z) ohne weiteren Menscheneingriff außer der Freigabe.
2. **Fand der Advisor etwas, das der Architekt übersehen hat?** Ja — die Laufzeitwahl (Python-Prozess vs. das im Repo real vorgefundene, ausschließlich Node/npm-zentrierte Werkzeug-Ökosystem samt `.claude/settings.json`-Permission-Allowlist, die keinen Python-Befehl freigibt). **Einschränkung:** die Begründung des Advisors stützt sich dabei teils auf Artefakte, die dem Fremdprojekt NICHT eigen sind, sondern aus der kopierten ai-workforce-Baseline stammen (`.claude/settings.json`-Allowlist, F41-WS-1-Kopie) bzw. aus dem vom Coach injizierten Auftragstext (`npm run check`/`validiereRoadmapDaten` — F-684) — der Advisor beurteilt damit teilweise ai-workforce-Konventionen, nicht zwingend echte Eigenschaften des Zielprojekts `haushaltsbuch` (siehe neues Finding unten).
3. **Welche Dateien hat `ausfuehrung` (f4) im neuen Repo angelegt?** Keine — 0 Dateien. Der Lauf stellte stattdessen eine Rückfrage mit 3 Optionen (siehe f4-Abschnitt).
4. **Review-Urteil (f5):** `BLOCKIERT`, 2 Befunde (beide `schwere: HOCH`), `empfehlung`: Zielrepository/Prüfgrundlage abgleichen, dann die sieben Dokumentationsdateien real anlegen und validieren.
