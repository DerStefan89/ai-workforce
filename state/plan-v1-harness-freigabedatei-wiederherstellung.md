SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: harness-freigabedatei-wiederherstellung

GOAL:
`git commit`/`git push` verlangen wieder eine frische, gültige
Freigabedatei (`state/freigabe-commit.md`), wie vor dem 23.08.2026 (B6).
Zusätzlich ist die Datei jetzt auch gegen das Edit/Write-Werkzeug
geschützt, nicht nur gegen Bash — diese Lücke bestand im Ursprungsdesign
und wird hier erstmals geschlossen. Beides ist durch einen gemessenen
Rot-/Grün-Fall UND einen gemessenen Lade-/Smoke-Test auf der realen
Zielmaschine belegt, nicht nur behauptet.

CONTEXT:
- [Fakt] `.claude/hooks/commit-guard.cjs` (aktueller Stand, 121 Zeilen)
  hat genau zwei Aufgaben: (1) Bash-Zugriff auf `.claude/settings.json`
  blockieren, (2) `gh`-Merge-Pfad nach main und Bash-Zugriff auf die
  Branch-Protection-Regel blockieren. Beide Aufgaben laufen fail-closed
  (ungültiges JSON oder fehlender `command` → verweigern). Datei ist
  bereits `.cjs` (CommonJS erzwungen, `package.json` hat `"type":
  "module"`) — keine Dateiumbenennung nötig, nur Ergänzung.
- [Fakt] Historische Fassung `.claude/hooks/commit-guard.js`, Stand
  unmittelbar vor Commit `f8d11f6` (B6-Migration, die sie entfernt hat),
  hatte eine DRITTE und VIERTE Aufgabe (dort als Aufgabe 1 und 3 geführt).
  Wortlaut der beiden reinen Funktionen, 1:1 zu übernehmen:

```js
  const FREIGABE_DATEI = "state/freigabe-commit.md";
  const FRISCHEFENSTER_MINUTEN = 10;
  const BEISPIEL_FORMAT =
    'Format: "Freigegeben: <ISO-Zeitstempel>", z. B. ' +
    '"Freigegeben: 2026-08-17T14:03:00" (Ortszeit, ohne Offset), ' +
    '"Freigegeben: 2026-08-17T14:03:00+02:00" (mit Offset) oder ' +
    '"Freigegeben: 2026-08-17T12:03:00Z" (UTC).';

  function dekodiereFreigabeInhalt(buffer) {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf
    ) {
      return buffer.subarray(3).toString("utf8");
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return buffer.subarray(2).toString("utf16le");
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      const payload = buffer.subarray(2);
      const vertauscht = Buffer.alloc(payload.length);
      for (let i = 0; i + 1 < payload.length; i += 2) {
        vertauscht[i] = payload[i + 1];
        vertauscht[i + 1] = payload[i];
      }
      return vertauscht.toString("utf16le");
    }
    return buffer.toString("utf8");
  }

  function parseFreigabeZeitstempel(text) {
    const treffer = text.match(
      /^Freigegeben:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/m
    );
    if (!treffer) return null;
    let iso = treffer[1];
    const offsetOhneDoppelpunkt = iso.match(
      /^(.*\d{2}:\d{2}(?::\d{2})?)([+-]\d{2})(\d{2})$/
    );
    if (offsetOhneDoppelpunkt) {
      iso = `${offsetOhneDoppelpunkt[1]}${offsetOhneDoppelpunkt[2]}:${offsetOhneDoppelpunkt[3]}`;
    }
    const zeitstempel = new Date(iso);
    if (isNaN(zeitstempel.getTime())) return null;
    return zeitstempel;
  }
```

  Ablauflogik der historischen Aufgabe 1 (git commit/push-Erkennung, mit
  denselben Wortgrenzen-Mustern wie in der AKTUELLEN `commit-guard.cjs`
  bereits für die `gh`-Erkennung verwendet — Stil beibehalten):
  `command` auf `git` UND (`commit` ODER `push`) als eigenständige Token
  prüfen (Muster `(^|[\s"'`;&|()])TOKEN($|[\s"'`;&|()])`, wie in der
  aktuellen Datei Zeilen 76-83 für `gh`/`merge` bereits vorhanden). Trifft
  beides zu: `state/freigabe-commit.md` relativ zu `eingabe.cwd` lesen,
  mit `dekodiereFreigabeInhalt` dekodieren, mit
  `parseFreigabeZeitstempel` parsen. Kein gültiger Zeitstempel oder Datei
  fehlt → verweigern (mit `BEISPIEL_FORMAT` in der Meldung). Zeitstempel
  in der Zukunft → verweigern. Älter als `FRISCHEFENSTER_MINUTEN` (10)
  → verweigern. Sonst: Datei per `fs.unlinkSync` löschen (Einmalgebrauch),
  bei Löschfehler verweigern (fail-closed, nicht mehrfach verbrauchbar
  lassen), sonst durchlassen.
  Historische Aufgabe 3: jeder Bash-Befehl, dessen normalisierter Text
  `state/freigabe-commit.md` enthält, wird blockiert — lesend, schreibend,
  löschend, unabhängig vom sonstigen Befehlsinhalt.
- [Fakt] `.claude/hooks/guard-settings.js` (aktueller Stand): `Edit|Write`-
  Hook, `GUARDED_FILES`-Array mit genau einem Eintrag
  (`.claude/settings.json`). Matching-Logik: exakter Pfad ODER Endung auf
  konfigurierten `suffix`.
- [Fakt, Befund dieser Sitzung, Option A entschieden] `state/
  freigabe-commit.md` ist aktuell NICHT gegen das Edit/Write-Werkzeug
  geschützt — nur gegen Bash (siehe oben). Ein Modell könnte die Datei
  über `Write`/`Edit` selbst mit einem plausiblen Zeitstempel anlegen und
  damit den commit-guard-Hook umgehen, der nur Inhalt/Alter prüft, nicht
  Herkunft. Diese Lücke bestand bereits im Ursprungsdesign (vor
  23.08.2026), ist also kein neuer Fehler, sondern eine ungeprüfte
  Vorannahme, die hier erstmals geschlossen wird: `GUARDED_FILES` in
  `guard-settings.js` um einen zweiten Eintrag (`state/
  freigabe-commit.md`) erweitern.
- [Fakt] `state/freigabe-commit.md` existiert aktuell nicht (zuletzt am
  28.08.2026 gelöscht, siehe Vertrag-3-Aufräumung). Das ist der korrekte
  Ruhezustand — die Datei entsteht nur für den Moment einer Freigabe.
- [Fakt] Ziel-Laufzeitkonfiguration: `package.json` hat `"type":
  "module"`, `.cjs`-Endung erzwingt CommonJS trotzdem (wie bei B6
  gelöst). Node-Version auf der Sandbox/Brücke: `v22.23.2` — das ist
  NICHT die reale Zielmaschine. Auf der realen Zielmaschine (Windows, wo
  auch gebaut wird) ist laut früher verifiziertem Stand `v24.16.0` im
  Einsatz. [offene Unsicherheit] ob beide Versionen exakt identisch mit
  der zum Ausführungszeitpunkt tatsächlich aktiven Version sind — deshalb
  ist SCOPE 8 unten als GEMESSENER Test verlangt, nicht als Annahme.
- [Fakt] Erst nach erfolgreichem, gemessenem Nachweis (SCOPE 6-9) darf
  ein separates Projektchat-Dokument (nicht Teil dieses Repos, dieser
  Vertrag rührt es nicht an) von "DEKLARIERT" auf "ERZWUNGEN" zurückgesetzt
  werden — das erledigt der Projektchat selbst nach Abschluss, nicht diese
  Sitzung.

SCOPE:
1. `git status` sauber, aktueller `main`, eigener Branch angelegt.
2. `.claude/hooks/commit-guard.cjs`: dritte und vierte Aufgabe ergänzen,
   Logik und Funktionswortlaut wie in CONTEXT beschrieben 1:1 übernehmen
   (Konstanten, beide reinen Funktionen, Erkennung, Freigabeprüfung,
   Einmalgebrauch, Bash-Sperre auf die Datei selbst). `module.exports`
   um `dekodiereFreigabeInhalt` und `parseFreigabeZeitstempel` ergänzen.
   Kopfkommentar aktualisieren: jetzt vier Aufgaben, Verweis auf diesen
   Vertrag statt auf die B6-Entfernung, `BEISPIEL_FORMAT`-Text
   übernehmen.
3. `.claude/hooks/guard-settings.js`: `GUARDED_FILES` um `state/
   freigabe-commit.md` erweitern (Option A), mit eigenem `reason`-Text
   ("Freigabedatei darf nur vom Menschen im eigenen Editor angelegt
   werden, nicht vom Modell").
4. Rot-Fall Freigabedatei-Pflicht: `git commit` (Testfall, z. B. leerer
   `--allow-empty`-Commit in einer Wegwerf-Umgebung oder Trockenlauf, wie
   in Vertrag 2 üblich) OHNE vorhandene `state/freigabe-commit.md` →
   verweigert. Wortlaut zeigen.
5. Grün-Fall Freigabedatei-Pflicht: Stefan legt außerhalb dieser Sitzung
   (eigener Editor) eine gültige, frische `state/freigabe-commit.md` an.
   Erst danach `git commit` erneut versuchen → durchgelassen, Datei
   danach automatisch gelöscht. Wortlaut und `git status` (Datei weg)
   zeigen. Das Modell legt diese Datei zu KEINEM Zeitpunkt selbst an —
   siehe NICHT.
6. Rot-Fall Edit/Write-Guard: Versuch, `state/freigabe-commit.md` per
   `Write`- oder `Edit`-Werkzeug anzulegen/zu ändern → verweigert.
   Wortlaut zeigen.
7. Grün-Fall Edit/Write-Guard (Regressionsnachweis): eine andere,
   ungeschützte Datei bleibt per `Write`/`Edit` weiterhin änderbar, UND
   `.claude/settings.json` bleibt weiterhin blockiert (bestehender Schutz
   nicht beschädigt). Beide Wortlaute zeigen.
8. Lade-/Smoke-Test auf der REALEN Zielmaschine (nicht Sandbox/Bridge):
   `commit-guard.cjs` gezielt laden (z. B. `node -e "require('./.claude/
   hooks/commit-guard.cjs')"` oder gleichwertig) und Exit-Code sowie
   `node --version` der tatsächlich verwendeten Maschine zeigen. Ziel:
   Nachweis, dass das Skript unter der real aktiven Node-Version
   tatsächlich lädt — nicht nur, dass es bei Erfolg korrekt sperrt.
9. `state/gates.md`: neue Zeile(n) für Freigabedatei-Pflicht und
   Edit/Write-Guard ergänzen (Prüft-Spalte, Rot-/Grün-Fall-Wortlaut wie
   in Schritt 4-7), Kalibrierungs-Log-Eintrag mit Datum und allen
   Wortlauten aus Schritt 4-8. Bestehenden Text nicht löschen.
10. Commit über Branch + PR nach `git-flow`, CI-Status melden, NICHT
    selbst mergen.

NICHT:
- `state/freigabe-commit.md` selbst anlegen, befüllen oder mit einem
  Zeitstempel versehen — weder per Bash noch per Write/Edit-Werkzeug.
  Das ist ausschließlich Stefans Handlung, außerhalb dieser Sitzung.
- Volle Core-Eigentümerschaft über Git-Operationen einführen (kein
  automatisiertes Erzeugen/Prüfen der Freigabe durch das System selbst) —
  Mindestauflage 1 verlangt ausdrücklich nur den kleineren Mechanismus.
- `.claude/settings.json` ändern — die Hook-Verdrahtung (Dateinamen,
  Matcher) bleibt identisch, nur die beiden Skriptdateien wachsen.
- Ein Projektchat-Dokument (`claude/*.md`) anfassen — liegt nicht in
  diesem Repo.
- Weitere Guards oder Hooks einführen, die über SCOPE hinausgehen.
- Produktcode schreiben.

BUDGET:
Ein Baudurchgang plus höchstens eine Korrekturrunde. Voraussetzung vor
Start: Advisor-Pass für diesen Plan ist durchlaufen, Plan v2 liegt vor.

OUTPUT:
- `git diff --staged` vollständig zeigen, ausdrückliches „ja" abwarten.
- Wortlaut aller Rot-/Grün-Fälle aus Schritt 4-7.
- Lade-/Smoke-Test-Ausgabe inklusive `node --version` der realen Maschine.
- Aktualisierte Zeilen und Log-Eintrag in `state/gates.md`.
- PR-Link und CI-Status. NICHT selbst mergen.

ESCALATE:
- Lade-/Smoke-Test schlägt fehl (Skript lädt nicht unter der realen
  Node-Version) → anhalten, melden, NICHT als „wiederhergestellt"
  melden.
- Ein Rot-Fall aus Schritt 4 oder 6 tritt nicht ein → anhalten, melden,
  keine „kalibriert"-Aussage eintragen.
- `state/freigabe-commit.md` existiert bereits zu Beginn (Ruhezustand
  verletzt) → nicht löschen, melden, auf Anweisung warten.
- `git status` zu Beginn nicht sauber → anhalten, Ausgabe zeigen.

FOLGT:
- Eine mögliche spätere Fassung-2-Betrachtung „volle Core-Eigentümerschaft
  über Git-Operationen" ist ausdrücklich NICHT Teil dieses Vertrags.
