SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: `ai-workforce`-Repository-Wurzel (dort, wo `package.json`
und `.claude/settings.json` liegen).

## TASK: f6a-ws3-realer-nachweis

GOAL:
Ein echter `claude -p`-Lauf mit ausschließlich lesenden Tools läuft real
über `starteGateway` (WS2, gemerged PR #42, Commit `7123041`), erzeugt
eine echte Laufakte unter `kontrollzustand/` und einen echten Rohstrom
unter `kontrollzustand-roh/` auf der Zielmaschine (Windows) — nicht nur
gegen die Attrappe in Tests. Ergebnis wird in `state/gates.md`
dokumentiert (Muster Zeile 970, F1-Präzedenzfall
`verify-rename-atomicity.mjs`).

CONTEXT:
- [Fakt] WS2 gebaut und gemerged: `src/claude-code-gateway/index.ts`
  (`starteGateway`), `src/claude-code-gateway/prozessstart.ts`
  (`starteProzess`, `execFile`). PR #42, Commit `7123041`.
- [Fakt] Plan: `state/plan-v1-f6a-ws2-ws3-prozessstart.md`, Abschnitt
  „Scope — WS3" — Skript `scripts/verify-f6a-real-run.mjs`, manuell,
  **nicht** in der Standardkette (Präzedenz F1
  `scripts/verify-rename-atomicity.mjs`, `state/gates.md` Zeile 970).
- [Fakt] `state/plan-v2-f6a-claude-code-gateway.md`, Delta 3 —
  `state/gates.md`-Eintrag für WS3 verbindlich zugesagt, Format wie der
  bestehende F1-Eintrag.
- [Fakt] `state/tp-nachtrag.md`, TP-03d Messfall 1/2 — Muster für einen
  realen, lesenden `claude -p --output-format json --setting-sources
  project`-Aufruf und dessen reale Ergebnisform.
- [Entscheidung Stefan, Option B] Kein Rot-Fall-Schritt, kein
  Schreibvorgang im externen Autorisierungs-Repo
  (`ai-workforce-autorisierung`) — F-053 ist nicht Gegenstand von WS3.
- [Offene Unsicherheit, Plan Abschnitt 8 Punkt 2] `execFile`-Verhalten
  unter Windows für den Namen `claude` ist real ungeprüft — genau das
  klärt dieser Nachweis.
- [Fakt] F-059 (`state/findings.md`): `modell_beobachtet` bleibt `null`,
  bis reale Daten vorliegen. Dieser Lauf ist die Gelegenheit, das reale
  JSON-Feld zu identifizieren — kein Pflichtbestandteil des Nachweises
  selbst, siehe FOLGT.

SCOPE:
1. `scripts/verify-f6a-real-run.mjs` — manuelles Skript, ruft
   `starteGateway` mit einem realen, lese-beschränkten Tokens-Array auf
   (Muster TP-03d), gegen ein Zielverzeichnis ohne Schreibrisiko (z. B.
   ein Wegwerf-Testverzeichnis oder das Repo selbst rein lesend).
2. Realer Lauf, dabei bestätigen:
   a. `execFile('claude', tokens, ...)` startet unter Windows
      tatsächlich (inkl. `.cmd`-Wrapper-Frage, Offene Unsicherheit 2).
   b. Eine echte Laufakte entsteht unter `kontrollzustand/`.
   c. Ein echter Rohstrom entsteht unter `kontrollzustand-roh/<lauf_id>/`,
      nicht committet.
   d. F2-Registrierung (`registriereKernArtefakt`) erfolgt real.
3. Ergebnis — echte Ausgabe im Wortlaut, wie beim F1-Präzedenzfall — in
   `state/gates.md` dokumentieren (Format Zeile 970ff.).
4. Falls das reale Ergebnisobjekt ein erkennbares Modellfeld enthält:
   als Beobachtung notieren (siehe FOLGT — kein Pflichtteil dieses
   Vertrags, keine Codeänderung „nebenbei").

NICHT:
- Kein Rot-Fall-Nachweis für F-053/E-188.
- Kein Schreibvorgang im externen Autorisierungs-Repo.
- Keine Einhängung von `verify-f6a-real-run.mjs` in `npm run
  check`/`check:template`.
- Keine Codeänderung an `starteGateway`/`starteProzess` im Zuge dieses
  Vertrags — nur beobachten und dokumentieren.

BUDGET: Ein Durchgang, manuell von Stefan ausgeführt/beaufsichtigt
(ggf. mit einer Claude-Code-Sitzung als Werkzeug, keine unbeaufsichtigte
Automatisierung).

OUTPUT:
- `scripts/verify-f6a-real-run.mjs` (neu).
- `state/gates.md`-Eintrag (Delta 3, Format wie Zeile 970).
- Realer Beleg: Pfad zur erzeugten Laufakte + Rohstrom-Verzeichnis, im
  Gates-Eintrag referenziert.
- Alle erzeugten/geänderten Dateien Teil desselben Commits
  (F-005/F-035-Regel).

ESCALATE:
- `execFile('claude', ...)` scheitert unter Windows (z. B.
  `.cmd`-Wrapper nicht gefunden, `ENOENT`) → anhalten, melden — das ist
  die zu klärende Unsicherheit, kein Grund für eine stille Anpassung
  ohne Rücksprache.
- Der reale Lauf erzeugt unerwartet eine Schreibwirkung, obwohl nur
  lesende Tools konfiguriert sind → sofort anhalten, das ist ein
  Sicherheitsbefund, kein Doku-Punkt.
- Kein Ergebnisobjekt trotz mehrerer Versuche (Netz, Auth) → anhalten,
  melden, nicht als Fehllauf-Erfolg umdeuten.

FOLGT: Falls WS3 ein reales `model`-Feld identifiziert — kleiner
Folge-Nachtrag zur Schließung von F-059 (kein eigener Slug nötig,
direkt an diesen Vertrag/Commit anhängen oder als eigener Mini-Commit).
