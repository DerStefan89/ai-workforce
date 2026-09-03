SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: f6b-ws-d-wirksamkeitsnachweis-herkunftspruefung

GOAL: pruefeStartbedingung2 (F4, E-188) nimmt den Wirksamkeitsnachweis
nicht mehr als beliebiges, vom Aufrufer konstruiertes Objekt entgegen,
sondern als Referenz auf eine commit-gepinnte Datei im externen
Autorisierungs-Repo — geprüft über dieselbe Lesekette wie
pruefeStartbedingung1 (Pfad-Präfix, .gitattributes, Hash-Vergleich
Arbeitsbaum/Commit, Schema). Ein Aufrufer kann E-188 damit nicht mehr
durch bloßes Konstruieren eines passenden Objekts umgehen.

CONTEXT:
- [Fakt] src/invocation-policy/index.ts, aktueller Stand (nach WS-C,
  PR #52), Zeilen 337-380 (pruefeStartbedingung2): Signatur
  `pruefeStartbedingung2(wirksamkeitsnachweis: unknown, istZustand:
  IstZustand, istUebrigeFelder: IstUebrigeFelder): BedingungErgebnis`.
  Ruft `validiereWirksamkeitsnachweisEintrag(wirksamkeitsnachweis)`,
  castet danach auf `WirksamkeitsnachweisEintrag`, vergleicht Feld für
  Feld (inkl. `startziel_pfad` seit WS-C) gegen den aus istZustand +
  istUebrigeFelder gebauten istGueltigkeitsschluessel.
- [Fakt] src/invocation-policy/index.ts, pruefeStartbedingung1 (Zeilen
  ~270-330): liest baselineReferenz.pfad, prüft über
  leiteRepoRelustelPfadAb(baselineReferenz.pfad, repoWurzel) auf
  Pfad-Präfix, liest .gitattributes über leseAusCommit(repoWurzel,
  baselineReferenz.commit_hash, '.gitattributes') und prüft
  gitattributesPinntZeilenenden, liest Arbeitsbaum-Inhalt über
  readFileSync, liest Commit-Inhalt über leseAusCommit, vergleicht
  beide Hashes (sha256Hex) gegen baselineReferenz.datei_hash, parst
  JSON, validiert über validiereBaselineEintrag.
- [Fakt] src/invocation-policy/types.ts: `BaselineReferenz { pfad:
  string; commit_hash: string; datei_hash: string }`. Kein analoger Typ
  für den Wirksamkeitsnachweis existiert.
- [Fakt] src/invocation-policy/index.ts, Zeilen 61-66:
  `StartfreigabeEingaben { baselineReferenz: BaselineReferenz;
  istZustand: IstZustand; wirksamkeitsnachweis: unknown;
  istUebrigeFelder: IstUebrigeFelder }`.
- [Fakt] src/invocation-policy/index.ts, Zeile 393-403
  (pruefeStartfreigabe): ruft `pruefeStartbedingung1(eingaben.
  baselineReferenz, eingaben.istZustand, optionen)` dann
  `pruefeStartbedingung2(eingaben.wirksamkeitsnachweis, eingaben.
  istZustand, eingaben.istUebrigeFelder)` — OHNE optionen-Weitergabe an
  Bedingung2 (Bedingung2 kennt repoWurzel heute nicht).
- [Fakt] src/invocation-policy/invocation-policy.test.ts: fünf
  bestehende Tests reichen wirksamkeitsnachweis als Inline-Objekt durch
  (Zeilen 114, 135, 162, 184, 229), gebaut über die Helper-Funktion
  gueltigerWirksamkeitsnachweis(istZustand, istUebrigeFelder). Für
  pruefeStartbedingung1/Baseline existiert bereits ein Datei-Schreib-
  Helper committeBaseline(repoWurzel, laufId, inhalt) (Muster:
  neuesExternesRepo() legt ein temporäres Git-Repo an, committeBaseline
  schreibt+committet eine Datei hinein) — wiederverwendbares Vorbild für
  den Wirksamkeitsnachweis, nicht zwingend identischer Code.
- [Fakt] scripts/check-f4-invocation-policy.mjs enthält eigene
  Bedingung2-Fixtures (Grün-Fall + Drift-Fall, F11-Querkonsistenz,
  um Zeile 211-222) nach demselben Inline-Objekt-Muster — betroffen von
  derselben Umstellung.
- [Fakt] Finding F-077 (state/findings.md, BUG, P1): benennt exakt diese
  Lücke, Lösungsweg als E3 entschieden (claude/105_F6B_ENTSCHEIDUNGEN_...
  im Claude-Projekt "AI Workforce", nicht im Repo).
- [Fakt] ai-workforce-autorisierung (externes Repo,
  C:\Users\stefa\ai-workforce-autorisierung) enthält aktuell nur einen
  Commit mit .gitattributes — keine reale Baseline- oder
  Wirksamkeitsnachweis-Datei. Das Schreiben einer solchen Datei ist
  NICHT Teil dieses Vertrags (siehe NICHT).
- [Schlussfolgerung] Die gemeinsame Kern-Lesekette (Pfad-Präfix,
  .gitattributes, Arbeitsbaum/Commit-Hash-Vergleich, JSON.parse) ist für
  Baseline und Wirksamkeitsnachweis identisch bis auf den
  Schema-Validator danach (validiereBaselineEintrag vs.
  validiereWirksamkeitsnachweisEintrag) — sollte in eine gemeinsame,
  private Hilfsfunktion ausgelagert werden, damit die beiden Prüfungen
  nicht auseinanderdriften können (Muster wie F11, wo genau eine solche
  Divergenz real ein Problem war).

SCOPE:
- Neuer Typ `WirksamkeitsnachweisReferenz { pfad: string; commit_hash:
  string; datei_hash: string }` in src/invocation-policy/types.ts —
  eigener, benannter Typ, kein Wiederverwenden von BaselineReferenz
  (unterschiedliche Semantik trotz gleicher Form).
- StartfreigabeEingaben.wirksamkeitsnachweis (unknown) umbenennen zu
  wirksamkeitsnachweisReferenz (WirksamkeitsnachweisReferenz).
- pruefeStartbedingung2 neue Signatur:
  (wirksamkeitsnachweisReferenz: WirksamkeitsnachweisReferenz,
  istZustand: IstZustand, istUebrigeFelder: IstUebrigeFelder, optionen:
  PruefOptionen = {}): BedingungErgebnis. Liest und verifiziert die
  referenzierte Datei über dieselbe Lesekette wie pruefeStartbedingung1
  (Pfad-Präfix, .gitattributes, Hash-Vergleich Arbeitsbaum/Commit),
  danach unverändert die bestehende Feld-für-Feld-Prüfung.
- Gemeinsame private Hilfsfunktion für den Lesekette-Teil, von
  pruefeStartbedingung1 UND pruefeStartbedingung2 genutzt.
  pruefeStartbedingung1s äußere Signatur und äußeres Verhalten bleiben
  dabei unverändert — bestehende Bedingung1-Tests dürfen nicht wegen
  Verhaltensänderung angepasst werden müssen (reiner Struktur-Refactor
  ist ok).
- pruefeStartfreigabe: Aufruf von pruefeStartbedingung2 um
  eingaben.wirksamkeitsnachweisReferenz und optionen erweitern.
- Neue Rot-Fälle für pruefeStartbedingung2, symmetrisch zu
  pruefeStartbedingung1s bestehenden: referenzierter Pfad außerhalb des
  externen Repos, fehlendes/nicht-pinnendes .gitattributes,
  Hash-Abweichung Arbeitsbaum vs. Commit vs. datei_hash, Commit oder
  Pfad nicht auffindbar, Schema-Verstoß der referenzierten Datei
  (bestehender Fall, jetzt über Datei statt Inline-Objekt).
- Die fünf bestehenden Bedingung2-Tests (Zeilen 114, 135, 162, 184, 229)
  auf das neue Referenz-Muster umstellen — Wirksamkeitsnachweis wird
  vor dem Test in ein temporäres externes Repo committet (Vorbild:
  committeBaseline/neuesExternesRepo), dann per
  WirksamkeitsnachweisReferenz übergeben. Bestehende Prüfaussagen
  (welches Ergebnis, welche Fehlermeldung) bleiben inhaltlich gleich.
- check-f4-invocation-policy.mjs: dieselbe Umstellung für die dortigen
  Bedingung2-Fixtures.
- state/findings.md: F-077 auf gelöst setzen, Verweis auf konkrete
  Implementierung (Typ, Funktion, Zeilen).

NICHT:
- Keine echte Baseline- oder Wirksamkeitsnachweis-Datei im realen
  Autorisierungs-Repo (ai-workforce-autorisierung) anlegen oder
  committen — das ist WS-E, eigener Vertrag.
- Keine Änderung an pruefeStartbedingung1s äußerer Signatur oder
  beobachtbarem Verhalten.
- Keine Änderung an F6a/src/claude-code-gateway/ — es gibt weiterhin
  keinen Produktionsaufrufer von pruefeStartfreigabe.
- Kein Eingriff in E4 (rot_fall_beleg-Härtegrad) oder das optionale
  Hash-Feld dafür — das bleibt eigener Punkt, hier nicht anfassen.
- Kein Commit ohne vorherige grüne node scripts/check-contract.mjs und
  grünes npm run check. Beim Stagen ausschließlich explizite Pfade,
  nie -A oder .

BUDGET: Ein bis zwei Baudurchgänge — größer als WS-C, weil alle fünf
bestehenden Bedingung2-Tests plus die Gate-Fixtures vom
Inline-Objekt- auf das Datei-Referenz-Muster umgestellt werden, nicht
nur additiv erweitert werden.

OUTPUT:
- Geänderte Dateien wie unter SCOPE.
- Bericht: welche Dateien geändert wurden, Ergebnis von
  check-contract.mjs und npm run check (Exit-Codes), ob jeder neue
  Rot-Fall beim ersten Lauf tatsächlich rot war, bevor die
  Implementierung ihn grün gemacht hat, und ob pruefeStartbedingung1s
  bestehende Tests unverändert grün blieben (Beleg, dass der
  Struktur-Refactor verhaltensneutral war).

ESCALATE:
- Wenn pruefeStartbedingung2 oder pruefeStartfreigabe bereits an
  anderer Stelle im Repo aufgerufen werden, die hier nicht genannt ist
  — anhalten, melden, nicht eigenmächtig anpassen.
- Wenn ein neuer Rot-Fall-Test beim ersten Lauf NICHT rot ist —
  anhalten, das ist ein Kalibrierungsfehler.
- Wenn sich beim Lesen des Ist-Zustands zeigt, dass
  WirksamkeitsnachweisReferenz strukturell doch von BaselineReferenz
  abweichen muss (z. B. zusätzliches Feld nötig) — anhalten, melden,
  nicht die Form eigenmächtig erweitern.
- Wenn der Struktur-Refactor der gemeinsamen Lesekette
  pruefeStartbedingung1s bestehende Tests zum Nachbessern zwingt
  (nicht nur Import-Anpassung) — anhalten, das deutet auf eine
  ungewollte Verhaltensänderung hin.
