SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: `ai-workforce`-Repository-Wurzel (dort, wo `package.json`
und `.claude/settings.json` liegen).

## TASK: f7-result-evaluator

GOAL:
Ein neues Modul `src/result-evaluator/` klassifiziert einen von F6a
abgeschlossenen Lauf ausschließlich aus `beobachtungsbasis_vollstaendig`,
dem über F6as `leseErgebnisobjekt` geparsten Ergebnisobjekt und
`permission_denials[]` in genau einen der drei Terminalausgänge
(`FEHLGESCHLAGEN` / `VERWEIGERT` / `ERFOLGREICH`, ARCHITECTURE §4,
in dieser Prüfreihenfolge), schreibt das Ergebnis über F1Bs
`schreibeWirkungsmarke(..., 'terminal', { ergebnis })` und besteht
`npm run check` inklusive des neuen Gates
`scripts/check-f7-result-evaluator.mjs`.

CONTEXT:
- [Fakt] Plan: `state/plan-v1-f7-result-evaluator.md` (31.08.2026,
  advisor-geprüft, PR #44 auf `main`) — vollständige technische
  Grundlage. Abschnitte 2 (Scope), 3 (NICHT), 4 (Design-Entscheidungen
  1-5), 5 (Ablageort), 8 (offene Unsicherheiten). Bei jedem Widerspruch
  zwischen `features/F7/feature.md` und diesem Plan gilt der Plan
  (jünger, advisor-geprüft) — siehe OUTPUT, Punkt 3.
- [Fakt] Feature-Akte: `features/F7/feature.md`, AK1-10, Nicht-Ziele.
- [Fakt, real gelesen 02.09.2026] `src/claude-code-gateway/index.ts:71`
  `function leseErgebnisobjekt(stdout: string): Record<string, unknown> | null`
  — **nicht exportiert**. Parst `stdout` als JSON, akzeptiert nur ein
  Objekt mit `type === 'result'`. Muss exportiert werden (F-062).
- [Fakt, real gelesen 02.09.2026] `src/claude-code-gateway/index.ts:137-142`
  schreibt den Rohstrom als
  `JSON.stringify({ stdout, stderr, exitCode })` nach
  `kontrollzustand-roh/<lauf_id>/rohstrom.json`; `rohstrom_referenz.inhalts_hash`
  ist `sha256Hex` über genau diesen String. F7 muss denselben String
  hashen, nicht das reserialisierte Objekt.
- [Fakt, real gelesen 02.09.2026] `src/claude-code-gateway/types.ts`
  `LaufakteV0Daten` — trägt `beobachtungsbasis_vollstaendig: boolean` und
  `rohstrom_referenz: { pfad, inhalts_hash }`, bewusst **kein**
  `ergebnis` und kein `permission_denials`.
- [Fakt, real gelesen 02.09.2026] `src/checkpoint-store/index.ts:530`
  `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz, optionen)`
  — wirft synchron, wenn bei `art: 'terminal'` kein gültiges
  `zusatz.ergebnis` gesetzt ist. Kein halb geschriebener Zustand.
- [Fakt, real gelesen 02.09.2026]
  `src/invocation-policy/verbotene-aufrufparameter.ts:33`
  `pruefeAufrufparameter(parameter: string[]): { ok, grund? }` — erwartet
  ein **Tokens-Array**; deckt mit `enthaeltTokenFenster` auch
  mehrwortige Verbotseinträge (`--permission-mode bypassPermissions`) ab.
  `VERBOTENE_AUFRUFPARAMETER` und `pruefeAufrufparameter` sind beide über
  `src/invocation-policy/index.ts:42-43` exportiert.
- [Fakt] Reale Fixture-Quellen in `state/tp-nachtrag.md`, Wortlaut-Zitate:
  - TP-03d Messfall 1 (Zeile 28-30): `"permission_denials":[]` + `result`
    → Fixture für `ERFOLGREICH`.
  - TP-03d Messfall 2 (Zeile 61): `permission_denials` mit
    `tool_input: {"query": "..."}` → Fixture für `VERWEIGERT` mit einem
    `tool_input` **ohne** `command`-Feld.
  - TP-03d Messfall 3 (Zeile 156): `permission_denials` mit
    `tool_input: {"command":"npm run allowlist-redfall-probe", ...}` →
    Fixture für `VERWEIGERT` mit `command`-Feld, **ohne** verbotenen
    Aufrufparameter. Diese dritte Fixture ist im Plan nicht genannt,
    ist aber die aussagekräftigste für den `tool_input`→Tokens-Adapter
    (Design-Entscheidung 5) — benutzen.
  - TP-01e Messfall A/B: kein Ergebnisobjekt bei Abbruch/Zeitüberschreitung
    → Fixture für `beobachtungsbasis_vollstaendig: false`.
- [Fakt] `src/claude-code-gateway/prozessstart.ts:44/55` enthält bereits
  `attrappeMitValidemErgebnis` / `attrappeOhneErgebnisobjekt` als
  wörtliche TP-Fixtures. Wiederverwenden statt neu abtippen, soweit sie
  passen.
- [Fakt, real gelesen 02.09.2026] `stelleLaufstatusFest`
  (`src/checkpoint-store/index.ts:697`) paart `run_prepared` und
  `terminal` per FIFO; ein zweites, unpaariges `terminal` landet im
  Diagnosefeld `terminaleOhneRunPrepared` und ändert den Status nicht.
  Ein versehentlicher Doppelaufruf von F7 verschwindet also nicht still
  — F7 braucht **keine** eigene Idempotenzprüfung.
- [Fakt] `scripts/check-f6a-claude-code-gateway.mjs:127-155` (AK14) ist
  das Formmuster für eine Grep-Regel **mit Selbsttest**. Die Regel selbst
  hat reale Erkennungslücken (F-060) — Form übernehmen, Schwäche nicht.
- [Fakt] F-046: Reviewer-/QA-Pass in frischem Kontext ist vor dem Merge
  Pflicht, nicht optional.
- [Annahme, Design-Entscheidung 4] Ein fehlendes `permission_denials`-Feld
  wird wie ein leeres Array behandelt, nicht als Fehler. Real belegt ist
  das Feld in allen drei TP-03d-Messfällen — die Annahme ist defensiv,
  nicht empirisch erzwungen.
- [offene Unsicherheit, Plan Abschnitt 8.4] Ob ein Split von
  `tool_input.command` am Leerzeichen ausreicht, oder ob Shell-Quoting
  einen eingebetteten Umgehungsversuch durchrutschen lässt. Im Bau gegen
  einen konstruierten Testfall verifizieren, nicht nur gegen die realen
  Fixtures.
- [offene Unsicherheit, Plan Abschnitt 8.3] Verhalten, wenn
  `rohstrom_referenz.pfad` nicht mehr existiert (Rohstrom ist nicht
  committet). Vorgabe: wie Hash-Abweichung → `FEHLGESCHLAGEN`, Grund
  `rohstrom_fehlt`, eigener Testfall.
- [Fakt] `is_error` / `non_execution_kind` sind in `state/tp-nachtrag.md`
  an keiner Stelle real belegt (F-061). Sie werden informativ
  durchgereicht und beeinflussen die Klassifikation nicht. Nicht raten,
  kein Schema-Zwang.

SCOPE:
1. `src/claude-code-gateway/index.ts`: `leseErgebnisobjekt` exportieren
   (`export function`). Reine Sichtbarkeitsänderung, kein
   Verhaltensunterschied, keine bestehenden F6a-Tests anfassen. Schließt
   F-062.
2. `src/result-evaluator/types.ts` und `src/result-evaluator/index.ts` neu:
   `klassifiziereLauf(laufId, profilReferenz, eingaben, optionen?)`, wobei
   `eingaben` die vom Aufrufer bereits geladene `LaufakteV0Daten` trägt
   (Design-Entscheidung 2 — F7 baut **keinen** eigenen Laufakte-Lesepfad).
   Ablauf exakt in dieser Reihenfolge:
   1. Rohstrom von `laufakte.rohstrom_referenz.pfad` lesen, SHA-256 über
      den gelesenen String bilden, gegen `inhalts_hash` vergleichen.
      Abweichung → `FEHLGESCHLAGEN`, Grund `rohstrom_integritaet`.
      Datei fehlt → `FEHLGESCHLAGEN`, Grund `rohstrom_fehlt`.
   2. `beobachtungsbasis_vollstaendig === false` → `FEHLGESCHLAGEN`,
      Grund `beobachtungsbasis_unvollstaendig`.
   3. Rohstrom als `{ stdout, stderr, exitCode }` parsen,
      `leseErgebnisobjekt(stdout)` (aus F6a importiert) aufrufen. `null`
      → `FEHLGESCHLAGEN`, Grund `kein_ergebnisobjekt`.
   4. `permission_denials` lesen; fehlt das Feld oder ist es kein Array,
      wie leeres Array behandeln (nicht werfen). Nicht leer →
      `VERWEIGERT`.
   5. Für jede Verweigerung: `tool_input` über einen kleinen, neuen
      Adapter in Tokens übersetzen (String-Felder extrahieren,
      `command` am Leerzeichen tokenisieren), dann
      `pruefeAufrufparameter` (F4, wiederverwendet) aufrufen. Treffer in
      `bypass_verdacht_anzahl` zählen. **Nur zählen, nicht eskalieren.**
   6. Sonst → `ERFOLGREICH`.
   7. `is_error` / `non_execution_kind`, falls im Ergebnisobjekt
      vorhanden, ungeprüft und `unknown`-typisiert ins Rückgabeobjekt
      kopieren.
   Danach in **allen drei** Ausgängen
   `schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis }, optionen)`
   — auch bei `FEHLGESCHLAGEN`, sonst bliebe der Lauf in F1B dauerhaft
   `KLAERUNG_ERFORDERLICH`.
3. `src/result-evaluator/result-evaluator.test.ts`: alle drei
   Terminalausgänge; Hash-Abweichung; fehlende Rohstrom-Datei;
   `beobachtungsbasis_vollstaendig: false` **mit** nicht-leerem
   `permission_denials` (AK2 — FEHLGESCHLAGEN muss gewinnen); fehlendes
   `permission_denials`-Feld; `tool_input` mit `query` (TP-03d Messfall 2);
   `tool_input` mit `command` ohne Verbotswert (Messfall 3);
   konstruierter `tool_input.command` **mit** Verbotswert aus
   `VERBOTENE_AUFRUFPARAMETER` (E-186-Zählung greift); konstruierter Fall
   mit eingebettetem Verbotswert in einem längeren String (Plan 8.4);
   `is_error`/`non_execution_kind` vorhanden → informativ durchgereicht,
   `ergebnis` unverändert.
4. `scripts/check-f7-result-evaluator.mjs` neu, eingehängt in
   `npm run check` **und** `npm run check:template` (Muster: F6a-Gate in
   `package.json`):
   - AK4-Grep über `src/result-evaluator/*.ts` (ohne `*.test.ts`): kein
     Codepfad, der ein Ergebnis aus Konsolen-/Fließtext ableitet — also
     keine String-Inspektion von `stdout` oder des `result`-Feldes
     (`.includes(`, `.match(`, `.indexOf(`, `.search(`, RegExp-`.test(`).
     Das Lesen von `permission_denials` ist hier ausdrücklich **erlaubt**
     (anders als in F6as AK12) — es ist F7s Aufgabe.
   - Selbsttest zur Regel mit **mindestens drei** verschiedenen
     simulierten Verstoßformen (F-060-Lehre: ein einziger Selbsttestfall
     hat die Lücken der AK14-Regel nicht aufgedeckt). Erkennt das Muster
     einen davon nicht, ist das ein Befund, kein Grund zur Abschwächung
     des Tests.
   - Fixture-Prüfung: die realen TP-Auszüge aus dem Test laufen durch
     `klassifiziereLauf` und liefern das erwartete `ergebnis`.

NICHT:
- Eigener Laufakte-Lesepfad, Cache oder F2-Zugriff in F7 — der Aufrufer
  übergibt die geladene Laufakte (Design-Entscheidung 2).
- Ein eigenes Klassifikationsartefakt/`KLASSIFIKATION_V0`-Schema parallel
  zur Wirkungsmarke (Design-Entscheidung 1).
- Eskalation eines E-186-Treffers (Benachrichtigung, Blockade). F7 zählt
  nur; die Eskalation braucht einen Adressaten, den es ohne F8 nicht gibt.
- „Blockiert"-Zustand aktiv erzeugen oder eine Blocker-Kennung bauen —
  vollständig durch F1Bs `stelleLaufstatusFest` abgedeckt.
- Eigene Idempotenz-/Doppelaufrufprüfung (siehe CONTEXT,
  `terminaleOhneRunPrepared`).
- Festlegung des exakten `is_error`/`non_execution_kind`-Feldnamens
  (F-061) — bleibt offen, klärt sich real erst mit WS3.
- Änderungen an F1B, F2, F4 oder an F6as Verhalten. Die einzige
  F6a-Änderung ist das `export`-Schlüsselwort aus SCOPE 1.
- Härtung der AK14-Grep-Regel im F6a-Gate (F-057/F-060) — eigene,
  bereits erfasste Finding-Arbeit, kein Teil dieses Vertrags. Der neue
  F7-Gate-Selbsttest darf sie nicht stillschweigend mit-reparieren.
- F-053 (E-188-Rot-Fall-Nachweis) — außerhalb dieses Features.

BUDGET: Ein Baudurchgang (Plan Abschnitt 6, ein Workstream). Bei rotem
`npm run check` selbst nachbessern, solange die Ursache innerhalb dieses
Scopes liegt — kein zweiter Vertrag nötig.

OUTPUT:
- Code, Tests und Gate-Skript wie oben; `package.json` um das neue Gate
  in beiden check-Ketten ergänzt.
- `features/F7/feature.md`: betroffene Akzeptanzkriterien (AK1-10) mit
  Nachweis/Status ergänzen. Akte nicht umschreiben.
- `features/F7/feature.md`, Scope-Abschnitt: die Signaturzeile
  `klassifiziereLauf(laufId, profilReferenz, optionen)` und die Formulierung
  „liest die Laufakte" widersprechen der advisor-geprüften
  Design-Entscheidung 2 des Plans (Aufrufer übergibt die Laufakte). Auf
  die Planfassung nachziehen und in `state/findings.md` als neues Finding
  (`PROCESS_IMPROVEMENT`, P2) erfassen: gleiches Muster wie F-058 —
  eine Advisor-Korrektur wurde im Plan, aber nicht an allen zitierenden
  Stellen nachgezogen.
- `state/findings.md`: F-062 auf `gelöst` setzen (Export erfolgt);
  F-061 bleibt offen, unverändert.
- `state/gates.md`: Eintrag für F7 nach dem Muster der bestehenden
  Einträge.
- Alle erzeugten/geänderten Dateien (Code, Tests, Gate, `package.json`,
  Feature-Akte, Findings, Gates, ggf. `state/memory-map.md`) sind Teil
  **desselben** Commits, nicht nur der Produktcode (F-005, wiederholt
  F-035).
- Commit-Vorbereitung nach `.claude/skills/git-flow/SKILL.md`. Kein
  Commit ohne ausdrückliche Freigabe. Stagen ausschließlich mit
  expliziten Pfaden, nie `-A` oder `.`.

ESCALATE:
- `npm run check` / `npm run test` zeigt einen unerwarteten roten Befund
  außerhalb dieses Scopes (F1B, F2, F4, F6a-Bestandscode) → anhalten,
  melden, nichts an fremdem Code ändern.
- Der Selbsttest der neuen AK4-Grep-Regel zeigt, dass das Muster einen
  simulierten Verstoß **nicht** erkennt, und die Regel lässt sich nicht
  innerhalb dieses Scopes wirksam machen → anhalten und melden. Die Regel
  abschwächen, damit der Selbsttest grün wird, ist ausdrücklich kein
  zulässiger Ausweg (F-004, F-060).
- Ein erwarteter Rot-Fall reproduziert sich nicht (z. B. der
  konstruierte E-186-Treffer wird nicht gezählt, oder die
  Hash-Abweichungs-Fixture liefert nicht `FEHLGESCHLAGEN`) → anhalten,
  melden, Fixture nicht so lange umbauen, bis sie passt.
- Der `tool_input`→Tokens-Adapter lässt sich nicht so bauen, dass er die
  drei realen TP-03d-`tool_input`-Formen **und** den konstruierten
  Einbettungsfall abdeckt → anhalten und melden statt eine unvollständige
  Prüfung als vollständig auszugeben.
- Der Export von `leseErgebnisobjekt` erzwingt entgegen der Annahme eine
  Verhaltens- oder Teständerung in F6a → anhalten und melden; F6as
  Verhalten ist nicht Gegenstand dieses Vertrags.
- Ein Befund lässt F3, die volle F4-Startfreigabe oder F-053 wieder
  relevant erscheinen → nicht selbst entscheiden, an Stefan eskalieren.

FOLGT:
- `state/tasks/f6a-ws3-realer-nachweis.md` (existiert, noch nicht
  ausgeführt) — klärt real, ob und wie `is_error`/`non_execution_kind`
  in der Ausgabe vorkommen (F-061). Danach kleiner Nachtrag an F7,
  keine Architekturänderung.
- F8 (Execution Controller, nicht gebaut, kein Vertrag) — übernimmt die
  von E-186 zusätzlich verlangte Eskalation eines gezählten
  Bypass-Verdachts.
