/**
 * Datei: .claude/hooks/commit-guard.cjs
 *
 * Zweck: PreToolUse-Hook auf Bash. Vier Aufgaben:
 * 1. Verweigert jeden Bash-Befehl, der `.claude/settings.json` referenziert
 *    (schließt die Bash-Lücke von guard-settings.js).
 * 2. Verweigert den Merge-Pfad nach main über `gh` (PR-Merge-Unterbefehl
 *    oder ein API-Pfad, der auf `/merge`/`/merges` endet — `mergeable`
 *    bleibt ausdrücklich frei, kalibrierter Leseweg auf mergeable_state)
 *    sowie jeden Bash-Zugriff, lesend wie schreibend, auf die
 *    Branch-Protection-Regel selbst (`branches/…/protection`). `git merge`
 *    bleibt frei — lokaler, gewollter Vorgang.
 * 3. Verweigert `git commit` / `git push`, außer eine frische Freigabe-Datei
 *    (state/freigabe-commit.md, Frischefenster 10 Minuten) liegt vor. Bei
 *    gültiger Freigabe: Datei löschen, Befehl durchlassen — eine Freigabe
 *    gilt für genau einen Commit.
 * 4. Verweigert jeden Bash-Befehl, der `state/freigabe-commit.md`
 *    referenziert — schützt den zweiten Schlüssel selbst vor Lese-,
 *    Schreib- oder Löschzugriff über Bash.
 *
 * Aufgabe 3 und 4 waren bereits vor dem 23.08.2026 im Einsatz (Befund B6,
 * Nachtrag N24, damals ersatzlos entfernt) und werden hier mit
 * state/plan-v2-harness-freigabedatei-wiederherstellung.md
 * wiederhergestellt. Zusätzlich neu, war in der Vorfassung nicht enthalten:
 * state/freigabe-commit.md ist jetzt auch über guard-settings.js gegen das
 * Edit/Write-Werkzeug geschützt, nicht mehr nur gegen Bash.
 *
 * Bewusste Abweichung von der Fail-Open-Konvention der übrigen Hooks in
 * diesem Repo: Ein Guard, der bei Störung (unlesbares JSON, fehlendes
 * tool_input.command) durchlässt, ist kein Guard. Dieser Hook verweigert
 * stattdessen — fail-closed.
 *
 * Bekannte Grenzen:
 * - Aufgabe 1/2: Substring-Test auf den Dateipfad bzw. Befehlstext, kein
 *   exaktes Parsen. Für Aufgabe 2 gilt zusätzlich: Der Rot-Fall belegt
 *   ausschließlich den Bash-Pfad; GitHub-Weboberfläche, `curl`/andere
 *   HTTP-Clients, MCP-Werkzeuge und WebFetch bleiben offen. Zusätzlich
 *   nicht erfasst: die Rulesets-API (`repos/…/rulesets`) — der Schutz
 *   dieses Repos liegt in der klassischen Protection-API, nicht in
 *   Rulesets.
 * - Aufgabe 3: Das Muster für `git commit`/`git push` ist breit, nicht
 *   exakt (Befehlstext enthält `git` UND `commit`/`push`, je als
 *   eigenständiges Wort, irgendwo im String). Bei einer freien Shell
 *   (Variablen, Aliase, kodierte Befehle) ist die Lücke nicht vollständig
 *   zu schließen.
 * - Aufgabe 3: Der Dateipfad wird aus `eingabe.cwd || process.cwd()`
 *   gebildet — liegt das Arbeitsverzeichnis nicht auf der Repo-Wurzel,
 *   zeigt der Pfad ins Leere und der Hook meldet fälschlich "keine
 *   Freigabedatei". Bekannt, geerbt aus der Vorfassung, hier nicht
 *   behoben (siehe state/assumption-ledger.md).
 * - Aufgabe 3: Zwischen Zeitstempel-Prüfung und `fs.unlinkSync`
 *   (Einmalgebrauch) liegt ein TOCTOU-Fenster bei parallel laufenden
 *   git-Prozessen. Bekannt, geerbt aus der Vorfassung, hier nicht behoben.
 *
 * Dekodierung und Zeitstempel-Parsen sind als eigene, reine Funktionen
 * ausgelagert und über module.exports verfügbar. Grund: Die Freigabe-Datei
 * ist für das Modell absichtlich unerreichbar (siehe Aufgabe 4) — ein
 * Bash-Aufruf, der `state/freigabe-commit.md` referenziert, wird
 * verweigert, bevor der Hook sie je läse. Ein Ende-zu-Ende-Test des
 * Kodierungsfalls über einen echten Git-Befehl ist deshalb aus der
 * Modell-Seite nicht möglich; die beiden reinen Funktionen sind die
 * einzige Ebene, auf der genau dieser Fall kalibrierbar ist.
 */
const fs = require("fs");
const path = require("path");

const FREIGABE_DATEI = "state/freigabe-commit.md";
const FRISCHEFENSTER_MINUTEN = 10;
const BEISPIEL_FORMAT =
  'Format: "Freigegeben: <ISO-Zeitstempel>", z. B. ' +
  '"Freigegeben: 2026-08-17T14:03:00" (Ortszeit, ohne Offset), ' +
  '"Freigegeben: 2026-08-17T14:03:00+02:00" (mit Offset) oder ' +
  '"Freigegeben: 2026-08-17T12:03:00Z" (UTC).';

/**
 * Buffer -> Text. Erkennt UTF-8-BOM (abschneiden) und UTF-16 LE/BE
 * (an der Byte-Order-Mark erkennbar, BE wird auf LE zurückgetauscht, da
 * Node keinen nativen utf16be-Decoder mitbringt). Ohne erkennbare BOM:
 * UTF-8.
 */
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

/**
 * Text -> Date oder null. Sucht "Freigegeben: <ISO-Zeitstempel>" am
 * Zeilenanfang (Anker `^` und `m`-Flag bewusst unverändert — sonst
 * matcht jede Fließtextzeile mit dem Wort "Freigegeben"). Optionaler
 * Zeitzonen-Offset (`Z`, `+hh:mm`, `-hh:mm`, auch ohne Doppelpunkt) wird
 * mit erfasst; fehlt er, bleibt die bisherige Ortszeit-Interpretation von
 * `new Date(...)` unverändert. Optionale Sekundenbruchteile beliebiger
 * Länge (`.123`, `.123456`, `.1234567`, je nach Quelle — `toISOString()`,
 * Python, PowerShell, `date -u -Ins` liefern unterschiedlich viele Stellen)
 * werden ebenfalls erfasst — sonst dieselbe Fehlerklasse wie B2:
 * abgeschnittener Suffix, Rest fälschlich als Ortszeit gelesen.
 */
function parseFreigabeZeitstempel(text) {
  const treffer = text.match(
    /^Freigegeben:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/m
  );
  if (!treffer) {
    return null;
  }

  let iso = treffer[1];
  const offsetOhneDoppelpunkt = iso.match(
    /^(.*\d{2}:\d{2}(?::\d{2})?)([+-]\d{2})(\d{2})$/
  );
  if (offsetOhneDoppelpunkt) {
    iso = `${offsetOhneDoppelpunkt[1]}${offsetOhneDoppelpunkt[2]}:${offsetOhneDoppelpunkt[3]}`;
  }

  const zeitstempel = new Date(iso);
  if (isNaN(zeitstempel.getTime())) {
    return null;
  }
  return zeitstempel;
}

function verweigern(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

function verarbeiten(input) {
  let eingabe;
  let command;
  try {
    eingabe = JSON.parse(input);
    command = eingabe.tool_input?.command;
  } catch {
    verweigern(
      "commit-guard: Eingabe nicht lesbar — fail-closed, Befehl verweigert."
    );
    return;
  }

  if (typeof command !== "string" || command.length === 0) {
    verweigern(
      "commit-guard: kein Befehlstext gefunden — fail-closed, Befehl verweigert."
    );
    return;
  }

  const normalisiert = command.replace(/\\/g, "/");

  if (normalisiert.includes(".claude/settings.json")) {
    verweigern(
      "commit-guard: Bash-Zugriff auf geteilte .claude/settings.json blockiert. " +
        "Die Datei ist Team-Policy und wird nur vom Menschen im eigenen Editor geändert."
    );
    return;
  }

  // Aufgabe 4: Bash-Zugriff auf die Freigabe-Datei selbst blockieren —
  // lesend, schreibend, löschend. Muss vor Aufgabe 3 stehen: Aufgabe 3
  // liest dieselbe Datei per fs, aber nur intern im Hook, nie über Bash.
  if (normalisiert.includes(FREIGABE_DATEI)) {
    verweigern(
      "commit-guard: Bash-Zugriff auf state/freigabe-commit.md blockiert. " +
        "Der zweite Schlüssel darf nicht vom Modell gelesen, geschrieben oder gelöscht werden."
    );
    return;
  }

  // Aufgabe 2: Merge-Pfad nach main über `gh` sowie Bash-Zugriff auf die
  // Branch-Protection-Regel selbst. Musterbau und Prüfung stehen bewusst in
  // einem eigenen try/catch: Ein Wurf in new RegExp(...) soll fail-closed
  // verweigern statt den Hook unkontrolliert abstürzen zu lassen.
  try {
    const MERGE_GRENZE_VOR = '(^|[\\s"\'`;&|()])';
    const MERGE_GRENZE_NACH = '($|[\\s"\'`;&|()])';
    const istGhBefehl = new RegExp(
      MERGE_GRENZE_VOR + "gh" + MERGE_GRENZE_NACH
    ).test(command);
    const istMergeToken = new RegExp(
      MERGE_GRENZE_VOR + "merge" + MERGE_GRENZE_NACH
    ).test(command);
    const enthaeltMergePfad =
      normalisiert.includes("/merge") || normalisiert.includes("/merges");

    if (istGhBefehl && (istMergeToken || enthaeltMergePfad)) {
      verweigern(
        "commit-guard: gh-Merge-Pfad nach main blockiert (PR-Merge-Unterbefehl " +
          "oder /merge(s)-API-Endpunkt). Merge auf main bleibt Menschensache, " +
          "nicht Bash/gh. Lesewege wie mergeable_state bleiben offen."
      );
      return;
    }

    if (
      normalisiert.includes("branches/") &&
      normalisiert.includes("/protection")
    ) {
      verweigern(
        "commit-guard: Bash-Zugriff auf die Branch-Protection-Regel blockiert " +
          "— lesend wie schreibend. Leseweg auf ihre Wirkung bleibt offen " +
          "(gh api repos/…/pulls/<n> -> mergeable_state)."
      );
      return;
    }
  } catch {
    verweigern(
      "commit-guard: Prüfung nicht ausführbar — fail-closed, Befehl verweigert."
    );
    return;
  }

  // Aufgabe 3: git commit/push ohne frische Freigabe-Datei verweigern.
  // Selbe Wortgrenzen-Konvention wie Aufgabe 2 (gh/merge) — bewusst
  // wiederverwendet statt neu erfunden.
  try {
    const FREIGABE_GRENZE_VOR = '(^|[\\s"\'`;&|()])';
    const FREIGABE_GRENZE_NACH = '($|[\\s"\'`;&|()])';
    const istGitBefehl = new RegExp(
      FREIGABE_GRENZE_VOR + "git" + FREIGABE_GRENZE_NACH
    ).test(command);
    const istCommitOderPush = new RegExp(
      FREIGABE_GRENZE_VOR + "(commit|push)" + FREIGABE_GRENZE_NACH
    ).test(command);

    if (istGitBefehl && istCommitOderPush) {
      const cwd = eingabe.cwd || process.cwd();
      const dateiPfad = path.join(cwd, FREIGABE_DATEI);

      let rohBuffer;
      try {
        rohBuffer = fs.readFileSync(dateiPfad);
      } catch {
        verweigern(
          `commit-guard: git commit/push ohne Freigabe-Datei (${FREIGABE_DATEI}) verweigert. ` +
            `Freigabe im eigenen Editor anlegen. ${BEISPIEL_FORMAT}`
        );
        return;
      }

      const inhalt = dekodiereFreigabeInhalt(rohBuffer);
      const zeitstempel = parseFreigabeZeitstempel(inhalt);

      if (!zeitstempel) {
        verweigern(
          `commit-guard: ${FREIGABE_DATEI} hat keine gültige Zeile "Freigegeben: <ISO-Zeitstempel>" — verweigert. ${BEISPIEL_FORMAT}`
        );
        return;
      }

      const minutenAlt = (Date.now() - zeitstempel.getTime()) / 60000;
      if (minutenAlt < 0) {
        verweigern(
          `commit-guard: Zeitstempel in ${FREIGABE_DATEI} liegt in der Zukunft — Uhr oder Zeitzone prüfen — verweigert.`
        );
        return;
      }
      if (minutenAlt > FRISCHEFENSTER_MINUTEN) {
        verweigern(
          `commit-guard: Freigabe in ${FREIGABE_DATEI} ist ${Math.round(minutenAlt)} Minuten alt ` +
            `(Frischefenster ${FRISCHEFENSTER_MINUTEN} Minuten) — verweigert. Neue Freigabe anlegen.`
        );
        return;
      }

      try {
        fs.unlinkSync(dateiPfad);
      } catch {
        verweigern(
          `commit-guard: Freigabe-Datei ${FREIGABE_DATEI} konnte nicht gelöscht werden — ` +
            "fail-closed, Befehl verweigert, um Mehrfachverbrauch auszuschließen."
        );
        return;
      }
    }
  } catch {
    verweigern(
      "commit-guard: Prüfung nicht ausführbar — fail-closed, Befehl verweigert."
    );
    return;
  }

  process.exit(0);
}

if (require.main === module) {
  let input = "";
  process.stdin.on("data", (d) => (input += d));
  process.stdin.on("end", () => verarbeiten(input));
}

module.exports = { dekodiereFreigabeInhalt, parseFreigabeZeitstempel };
