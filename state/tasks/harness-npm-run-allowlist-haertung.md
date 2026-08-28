SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: harness-npm-run-allowlist-haertung

GOAL:
Den in Vertrag tp-03d-wirkungsgrenze-und-hash-baseline real ausgelösten
ESCALATE-Befund schließen: die Präfix-Freigabe Bash(npm run *) erlaubt
jeden Skriptnamen, auch einen, der im selben Lauf erst neu in
package.json geschrieben wurde. Ersetzt die Freigabe durch eine feste
Liste tatsächlich genutzter Skriptnamen.

CONTEXT:
- [Fakt] state/tp-nachtrag.md, Abschnitt "TP-03 d, Messfall 1": Aufruf
  npm run tp03d-probe über nicht-interaktive Claude-Instanz ergab
  permission_denials[] leer, Marker-Ausgabe erschien.
- [Fakt] .claude/settings.json, aktueller Stand:
  permissions.allow = ["Bash(npm run *)"],
  permissions.deny = ["Bash(echo PERMISSIONS_DENY_PROBE)"] (Kalibrierungs-
  Canary, unabhängig von diesem Vertrag, nicht anfassen).
- [Fakt] .claude/hooks/guard-settings.js: GUARDED_FILES enthält genau
  eine Datei, .claude/settings.json, hartes deny auf Edit/Write. Der
  Guard nennt selbst den Workaround für eine gewollte Änderung: den
  PreToolUse-Hook-Eintrag für guard-settings.js in .claude/settings.json
  temporär entfernen, Grund im Commit nennen, danach wieder einfügen.
- [Fakt] .claude/hooks/commit-guard.cjs blockiert zusätzlich jeden
  Bash-Zugriff (auch lesend, z. B. cat) auf .claude/settings.json —
  kalibriert 23.08.2026, state/gates.md. Änderungen müssen daher über
  das Edit/Write-Werkzeug erfolgen, nicht über Bash.
- [Annahme, mit Stefan/Projektchat entschieden] package.json bleibt
  bewusst ungeschützt. Die Lösung liegt in der Freigabeliste, nicht im
  Schreibschutz von package.json.

SCOPE:
1. git status sauber, aktueller main, eigener Branch angelegt.
2. Aktuellen scripts-Abschnitt aus package.json vollständig auslesen,
   im Wortlaut festhalten.
3. Für jeden vorhandenen Skriptnamen prüfen, ob er in einem bestehenden
   Vertrag (state/tasks/*.md), in .github/workflows/ci.yml oder in
   .claude/skills/*/SKILL.md tatsächlich per npm run <name> aufgerufen
   wird. Nur tatsächlich genutzte Namen in die neue Freigabeliste
   übernehmen. Nicht zuordenbare Namen einzeln auflisten, NICHT
   automatisch freigeben.
4. .claude/settings.json ändern: "Bash(npm run *)" aus permissions.allow
   entfernen, durch je einen Eintrag "Bash(npm run <name>)" pro in
   Schritt 3 bestätigtem Namen ersetzen. Wegen Schreibschutz: den
   hooks.PreToolUse-Eintrag für guard-settings.js in derselben Datei
   temporär entfernen, Änderung vornehmen, Eintrag im selben
   Bearbeitungsschritt wieder einfügen, vor jedem Commit.
5. Rot-Fall: neues, harmloses Test-Skript (anderer Name als
   tp03d-probe) in package.json ergänzen, per npm run <neuer-name> über
   eine nicht-interaktive Claude-Instanz ausführen. Erwartet: jetzt
   Verweigerung (permission_denials[] NICHT leer). Wortlaut zeigen.
   Test-Skript danach vollständig entfernen, git status zeigen.
6. Grün-Fälle: jeden in Schritt 3 übernommenen Skriptnamen einzeln per
   npm run <name> über eine nicht-interaktive Claude-Instanz ausführen.
   Erwartet: keine Verweigerung. Wortlaut je Fall zeigen.
7. Ergebnis in state/tp-nachtrag.md unter neuem Abschnitt "Option B,
   Freigabeliste-Härtung" festhalten: alter/neuer permissions.allow-
   Wortlaut, Rot-/Grün-Fälle, Messfall 1 aus Vertrag tp-03d-... als
   geschlossen markieren.
8. state/gates.md: bestehende Zeilen um die kalibrierten Rot-/Grün-Fälle
   aus Schritt 5/6 ergänzen, mit Datum. Bestehenden Text nicht löschen.
9. Neuen Hash von .claude/settings.json in state/tp-nachtrag.md,
   Abschnitt "Gültigkeitsschlüssel, Ausgangsstand" als zusätzliche,
   datierte Zeile ergänzen, alten Wert nicht überschreiben.
10. Commit über Branch + PR nach git-flow, CI-Status melden, NICHT
    selbst mergen.

NICHT:
- Schreibschutz für package.json einführen (Option A, verworfen).
- permissions.deny oder andere Hooks anfassen.
- Mehr Skriptnamen freigeben als in Schritt 3 bestätigt.
- Vertrag tp-01e-fehllauf-beobachtungsbasis in derselben Sitzung
  beginnen.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde.

OUTPUT:
- Vollständiger scripts-Abschnitt aus Schritt 2.
- Liste übernommener vs. ausgeschlossener Skriptnamen mit Begründung.
- Alter/neuer permissions.allow-Wortlaut.
- Rot-/Grün-Fälle im Wortlaut.
- git diff --staged vollständig, ausdrückliches "ja" abwarten.
- PR-Link und CI-Status. NICHT selbst mergen.

ESCALATE:
- Rot-Fall aus Schritt 5 zeigt KEINE Verweigerung → sofort anhalten,
  melden, nicht nachbessern ohne Rücksprache.
- Ein Grün-Fall aus Schritt 6 wird verweigert → anhalten, melden.
- guard-settings.js verweigert die Änderung trotz Workaround → anhalten,
  Hook NICHT dauerhaft entfernen/umgehen, melden.
- git status zu Beginn nicht sauber → anhalten, zeigen.
- Skriptnamen aus Schritt 3 nicht eindeutig zuzuordnen → anhalten,
  Liste zeigen, nicht raten.

FOLGT:
state/tasks/tp-01e-fehllauf-beobachtungsbasis.md — erst nach Abschluss
dieses Vertrags.
