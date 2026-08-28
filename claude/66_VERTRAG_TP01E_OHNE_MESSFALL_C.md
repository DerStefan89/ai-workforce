# 66 — Vertrag: tp-01e-fehllauf-beobachtungsbasis (ohne Messfall C)

Stand: 28.08.2026. Advisor-Pass: nicht nötig (reine Beobachtung/
Protokollierung, keine Hook-/Konfigurationsänderung, keine
Designentscheidung).

Grundlage: claude/37_HANDOFF_VERTRAEGE.md, Vertrag 3. Geändert gegenüber
dem Originaltext: Messfall C (Kontingentgrenze) wird NICHT durchgeführt —
Entscheidung Stefan/Projektchat, 28.08.2026. Grund: Messfall C fährt das
Sieben-Tage-Kontingent absichtlich bis zur Sperre und kann danach bis zu
sieben Tage jede weitere Claude-Code-Sitzung blockieren. Das Risiko steht
in keinem Verhältnis zum Erkenntnisgewinn. Die Lücke bleibt offen und
dokumentiert ([offene Unsicherheit]), statt durch eine Ersatzannahme
geschlossen zu werden.

## TASK: tp-01e-fehllauf-beobachtungsbasis

GOAL:
Zwei der drei ungemessenen Fehlläufe eines nicht-interaktiven
Claude-Code-Laufs belegen — Abbruch, Zeitüberschreitung — mit
Prozess-Exit-Code, stderr und der Frage, ob überhaupt ein terminales
Ergebnisobjekt entsteht. Der dritte Fall (Kontingentgrenze) wird bewusst
NICHT gemessen (Betriebsrisiko, Entscheidung Stefan/Projektchat
28.08.2026) und bleibt als offene, dokumentierte Lücke stehen statt als
Ersatzannahme.

CONTEXT:
- [Fakt] 09_TECHNICAL_PROOF_OFFENE_PUNKTE.md, TP-01 verlangt wörtlich
  "Exit-Code", "stdout/stderr" und "Verhalten bei Abbruch/Timeout/
  Kontingentgrenze".
- [Fakt] claude/13_TP_ERGEBNISSE_LAUFEND.md Abschnitt 2 berichtet keinen
  Prozess-Exit-Code und kein stderr.
- [Fakt] Ziel-Fassung §16.5 macht "ungültige Beobachtungsbasis" zum
  ersten Klassifikationszweig; §16.6 hängt die Wiederaufnahme an das
  Vorliegen eines validierten terminalen Laufartefakts.
- [Fakt] Ziel-Fassung §16.8 Punkt 5 führt "Erkennung eines nach Absturz
  möglicherweise noch laufenden Werkzeugprozesses" als offenen Punkt.
- [Fakt, mit Stefan/Projektchat entschieden 28.08.2026] Messfall C
  (Kontingentgrenze) entfällt. Grund: bis zu siebentägige Kontingentsperre
  bei absichtlicher Auslösung, Risiko unverhältnismäßig zum
  Erkenntnisgewinn.

SCOPE:
1. Vorbereitung: Belege werden FORTLAUFEND in die Ergebnisdatei
   geschrieben, nicht am Ende gesammelt. Nach jedem Messfall wird
   gespeichert.
2. Messfall A (Abbruch): einen nicht-interaktiven Lauf mit einem länger
   laufenden Auftrag starten und den Prozess von außen beenden.
   Festhalten: Prozess-Exit-Code, vollständiges stderr, letzte Zeilen der
   strukturierten Ausgabe, ob ein terminales Ergebnisobjekt vorliegt, ob
   ein Kindprozess zurückbleibt.
3. Messfall B (Zeitüberschreitung): denselben Lauf mit einem künstlich
   kurzen äußeren Zeitlimit starten. Dieselben fünf Punkte festhalten.
4. Messfall C (Kontingentgrenze): NICHT durchführen. In Schritt 5 als
   offene, unbelegte Lücke vermerken — Grund und Datum nennen, nicht
   raten oder aus A/B extrapolieren.
5. Ergebnisse in state/tp-nachtrag.md unter einem neuen Abschnitt
   "TP-01 e" ergänzen (Pfad hier bewusst ohne Backticks). "Stand dieser
   Fassung:" aktualisieren. Messfall C ausdrücklich als
   "[offene Unsicherheit] — nicht gemessen, Entscheidung Stefan/
   Projektchat 28.08.2026, Betriebsrisiko Kontingentsperre" eintragen.
6. state/assumption-ledger.md: Eintrag (c) bleibt Status "offen" — NICHT
   auf "bestätigt"/"widerlegt" setzen. Ergänzen: "bewusst nicht gemessen,
   Messfall C ausgelassen, siehe state/tp-nachtrag.md Abschnitt TP-01e",
   mit Datum.
7. Commit über Branch + PR nach git-flow, CI-Status melden, NICHT selbst
   mergen.

NICHT:
- Aus einem beobachteten Verhalten auf die Ursache schließen. Nur
  festhalten, was gemessen wurde.
- Messfall C durchführen oder das Kontingent absichtlich in Richtung der
  Sperre treiben, auch nicht teilweise.
- Produktcode, Hooks, Konfiguration oder Gates ändern.

BUDGET:
Ein Baudurchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- Für jeden der zwei durchgeführten Messfälle (A, B): Aufruf, Exit-Code,
  stderr, letzte Ausgabe, Vorhandensein eines terminalen Ergebnisobjekts,
  Restprozesse — je im Wortlaut.
- Ergänzte Datei state/tp-nachtrag.md, inkl. Vermerk zu ausgelassenem
  Messfall C.
- Aktualisierter state/assumption-ledger.md (Eintrag (c) bleibt offen,
  mit Begründungsvermerk).
- git diff --staged vollständig, ausdrückliches "ja" abwarten.
- PR-Link und CI-Status. NICHT selbst mergen.

ESCALATE:
- Nach Messfall A oder B bleibt ein Werkzeugprozess aktiv → anhalten,
  Zustand zeigen.
- Ein Messlauf hinterlässt Änderungen im Arbeitsbaum → anhalten,
  git status zeigen.
- Das Kontingent nähert sich während Messfall A/B ungewollt der Sperre
  (z. B. über 80% Auslastung) → anhalten, melden, nicht fortsetzen.
- git status zu Beginn nicht sauber → anhalten, zeigen.

FOLGT:
Nichts vertagt. Messfall C bleibt dauerhaft offene Lücke, kein
automatischer Folgevertrag.
