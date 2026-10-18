/**
 * Datei: .claude/hooks/commit-guard.cjs
 *
 * Zweck: PreToolUse-Hook auf Bash. Sechs Aufgaben (5 und 6 seit F45 B1b-1,
 * F-1035; Tests: scripts/commit-guard.test.mjs):
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
 * 5. Verweigert Befehle, die einen `.claude`-Ordner kopieren, verschieben,
 *    löschen oder überschreiben (cp, mv, rm, rsync, tee, `>`/`>>`, sed -i,
 *    robocopy, Copy-Item/Move-Item/Remove-Item u. a.), auch mit Platzhaltern
 *    (`.cl*`, `.*`) und ./-Varianten. In B1a-2 hat `cp -rn .claude …` die
 *    Aufgaben 1/4 umgangen. Lesen unter `.claude` bleibt frei.
 * 6. Verweigert nicht umkehrbare Befehle: rm -rf (alle Schreibweisen),
 *    Remove-Item -Recurse -Force, rd /s /q, git branch -D, git reset --hard,
 *    git clean -f, git checkout ., git restore . (ohne --staged), git stash
 *    drop/clear, git worktree remove --force, git update-ref -d. Seit F45
 *    B2b-3b-2b-2b-2b-1 (F-1141) zusätzlich jedes andere `git stash` außer
 *    `list`/`show` (nacktes `stash`, push, save, pop, apply, branch …): es
 *    nimmt Änderungen ohne Freigabe aus dem Arbeitsbaum — sichern über einen
 *    Commit auf einem Branch (Stefan).
 *    Für 5 und 6 zählen nur Befehlsstellen (nach env/command/xargs …, nach
 *    powershell -Command); Commit-/PR-Nachrichten (-m, --body …) und
 *    Heredoc-Körper ohne Shell werden vorher entfernt.
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
 * - Aufgabe 5/6: Zerlegung an Trennzeichen und Leerzeichen, kein
 *   Shell-Parser. Offen bleiben: ein bloßes `*` (PowerShell expandiert es auch
 *   auf `.claude`; nur rekursiv+erzwungen fängt Aufgabe 6), Variablen
 *   (`$D=.claude`), kodierte Befehle, Skripte, die selbst löschen. Lesen aus
 *   `.claude` mit einem schreibenden Verb (`cp .claude/x.md /tmp`) wird
 *   mitgesperrt — Read benutzen. Nicht erkannt: Kopien eines ganzen
 *   Ordnerinhalts (`cp -r ../tpl/. ./`, `cp -r . ../x`), die `.claude`
 *   mitnehmen, ohne es zu nennen; Optionswerte nach `xargs` (`xargs -n 1 cp`).
 * - Aufgabe 6, `git stash` (F-1141): gesperrt, sobald in einem git-Glied ein
 *   Token `stash` steht, dem nicht `list`/`show` folgt — auch als Optionswert
 *   (`git log --grep stash` wird mitgesperrt, `--grep=stash` nicht; bewusst
 *   streng statt Unterbefehl-Ermittlung, die an Pfaden mit Leerzeichen nach
 *   `-C` scheitern würde). `git stash -q list` wird mitgesperrt. Offen (für
 *   alle Regeln der Aufgabe 6): Aliase (`git -c alias.s=stash s`), ein
 *   git-Programmpfad mit Leerzeichen, PowerShell-Zuweisung (`$r = git stash`),
 *   Unterausdruck (`$(git stash)`), `Start-Process`/`Invoke-Expression`;
 *   `git pull|rebase --autostash` stasht in der Sache, wird aber nicht gesperrt.
 * - Blockklammer (F-1141): der Befehl nach `{` zählt als Befehlsstelle. Das
 *   ganze Glied gilt dabei als eines — `if (Test-Path .claude) { git checkout x }`
 *   wird als Schreiben auf `.claude` mitgesperrt (sichere Richtung).
 * - Here-String (F-1141): `@'…'@` hinter einem Befehl ohne Shell ist Fließtext;
 *   geht er hinter `'@` per Pipe in eine Shell, bleibt sein Körper Befehl.
 * - PowerShell-Werkzeug (F-1042): die Hook-Eingabe hat dieselbe Form wie beim
 *   Bash-Werkzeug (tool_name 'PowerShell', tool_input { command, description },
 *   real belegt in features/F45/nachweise/b1b1/zaehlung-powershell.json); der
 *   Hook wirkt dort, sobald der Matcher in .claude/settings.json
 *   `Bash|PowerShell` lautet (Änderung = Stefan). Eine unbekannte Form ohne
 *   tool_input.command wird wie beim Bash-Werkzeug verweigert (fail-closed).
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

/**
 * Aufgabe 5/6 (F45 B1b-1, F-1035): zerlegt einen Befehl in Ketten (an
 * Zeilenumbruch, `&&`, `||`, `;`, `&`) und jede Kette in Pipeline-Glieder
 * (`|`). Umleitungen auf einen Dateideskriptor (`2>&1`) werden vorher
 * entfernt. Kein Shell-Parser — dieselbe Grenze wie Aufgabe 1/2 (Variablen,
 * Aliase, kodierte Befehle bleiben offen).
 */
function zerlegeKetten(command) {
  return command
    .replace(/\d*>&\d+/g, " ")
    .split(/\r?\n|&&|\|\||[;&]/)
    .map((kette) =>
      kette
        .split("|")
        .map((glied) => glied.trim())
        .filter((glied) => glied.length > 0)
    )
    .filter((glieder) => glieder.length > 0);
}

/** Befehlsname eines Tokens: Pfad und `.exe` entfernt, klein (`/bin/rm` → `rm`, `git.exe` → `git`). */
function befehlsname(token) {
  const name = token.replace(/\\/g, "/").split("/").pop().toLowerCase();
  return name.endsWith(".exe") ? name.slice(0, -4) : name;
}

/**
 * Tokens eines Segments, je Token umschließende Anführungszeichen/Klammern entfernt. Seit F-1141 auch eine
 * schließende Blockklammer am Token-Ende (`{git reset --hard}` → `--hard`), außer das Token enthält selbst `{`
 * (Klammer-Expansion `{.claude,src}`, `stash@{0}`, Platzhalter `{}`).
 */
function tokenisiere(segment) {
  return segment
    .split(/\s+/)
    .map((token) => token.replace(/^['"`(]+|['"`),]+$/g, ""))
    .map((token) => (token.includes("{") ? token : token.replace(/\}+$/, "").replace(/['"`),]+$/, "")))
    .filter((token) => token.length > 0);
}

/** Platzhalter-Segment (`*`, `?`, `[..]`) als Regex über genau ein Pfadsegment. */
function platzhalterZuRegex(segment) {
  let muster = "";
  for (const zeichen of segment) {
    if (zeichen === "*") muster += "[^/]*";
    else if (zeichen === "?") muster += "[^/]";
    else if (zeichen === "[" || zeichen === "]") muster += zeichen;
    else muster += zeichen.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return new RegExp(`^${muster}$`, "i");
}

/**
 * true, wenn ein Argument auf einen Ordner `.claude` zeigt: ein Pfadsegment
 * `.claude` (groß/klein egal, auch `./.claude`, `~/.claude`, Backslash), eine
 * Klammer-Expansion mit `.claude` oder ein Platzhalter-Segment mit führendem
 * Punkt, das `.claude` treffen kann (`.cl*`, `.c?aude`, `.*`). Ein bloßes `*`
 * zählt nicht (bash expandiert es nicht auf Punktdateien) — siehe Grenzen.
 */
function zeigtAufClaudeOrdner(argument) {
  const pfad = argument.replace(/\\/g, "/");
  return pfad.split("/").some((teil) => {
    const t = teil.toLowerCase();
    if (t === ".claude") return true;
    if (t.includes("{") && t.includes(".claude")) return true;
    if (t.startsWith(".") && /[*?[]/.test(t)) {
      try {
        return platzhalterZuRegex(t).test(".claude");
      } catch {
        return true;
      }
    }
    return false;
  });
}

/** Verben, die Dateien anlegen, kopieren, verschieben, löschen oder überschreiben (bash, cmd, PowerShell samt Aliasen). */
const SCHREIBENDE_VERBEN = new Set([
  "cp", "mv", "rm", "rmdir", "rd", "rsync", "tee", "robocopy", "xcopy", "del", "erase", "ln", "install",
  "touch", "mkdir", "md", "copy", "move", "copy-item", "cpi", "move-item", "mi", "remove-item", "ri",
  "set-content", "sc", "add-content", "ac", "out-file", "new-item", "ni", "rename-item", "rni", "ren", "tar",
]);
/** Vorsätze vor dem eigentlichen Befehl (`env X=1 rm`, `command cp`, `xargs rm`). */
const VORSAETZE = new Set(["env", "command", "builtin", "sudo", "nohup", "exec", "time", "nice", "xargs", "call", "start"]);
/** Shells, deren `-Command`/`-c`/`/c`-Argument wieder ein Befehl ist. */
const SHELLS = new Set(["powershell", "pwsh", "cmd", "bash", "sh", "zsh"]);
const SHELL_BEFEHL_FLAGGE = /^(-c|-command|\/c)$/i;
/** Argumente mit Fließtext (Commit-/PR-Nachrichten): ihr Inhalt ist kein Befehl. */
const TEXT_ARGUMENT = /(^|\s)(-m|--message|--body|--title|--notes)(\s+|=)("(?:[^"\\]|\\.)*"|'[^']*')/g;

/**
 * Entfernt Fließtext, der nicht ausgeführt wird: den Inhalt von Commit-/PR-Nachrichten
 * (`git commit -m "… rm -rf …"`) und Heredoc-Körper, die nicht in eine Shell oder einen
 * Interpreter gehen (`git commit -F - <<'EOF'`, `cat > datei <<EOF`). Die öffnende Zeile
 * (samt Umleitungsziel) bleibt erhalten. Seit F-1141 ebenso der Körper eines PowerShell-Here-Strings
 * (`git commit -m @'` … `'@`), wenn die öffnende Zeile ihn nicht an eine Shell oder einen Interpreter gibt;
 * was hinter dem schließenden `'@` steht, bleibt Befehl.
 */
function entferneFliesstext(command) {
  const zeilen = command.replace(TEXT_ARGUMENT, '$1$2$3""').split(/\r?\n/);
  const ergebnis = [];
  let ende = null;
  let hereString = null;
  let koerper = [];
  for (const zeile of zeilen) {
    if (hereString !== null) {
      if (!zeile.startsWith(hereString)) {
        koerper.push(zeile);
        continue;
      }
      // Geht der Here-String hinter `'@` in eine Shell oder einen Interpreter (`'@ | powershell -`), ist sein Körper Befehl.
      const rest = zeile.slice(hereString.length);
      const inShell = zerlegeKetten(rest).flat().some((glied) => verbenVon(tokenisiere(glied)).some((verb) => SHELLS.has(verb) || INTERPRETER.has(verb)));
      if (inShell) ergebnis.push(...koerper);
      ergebnis.push(rest);
      hereString = null;
      koerper = [];
      continue;
    }
    if (ende !== null) {
      if (zeile.trim() === ende) ende = null;
      continue;
    }
    ergebnis.push(zeile);
    const oeffnend = zeile.match(/@(['"])\s*$/);
    if (oeffnend !== null) {
      const ausgefuehrt = verbenVon(tokenisiere(zeile.slice(0, oeffnend.index))).some((verb) => SHELLS.has(verb) || INTERPRETER.has(verb));
      if (!ausgefuehrt) hereString = `${oeffnend[1]}@`;
    }
    const heredoc = zeile.match(/<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/);
    if (heredoc !== null) {
      const tokens = tokenisiere(zeile.slice(0, heredoc.index));
      const ausgefuehrt = verbenVon(tokens).some((verb) => SHELLS.has(verb) || INTERPRETER.has(verb));
      if (!ausgefuehrt) ende = heredoc[2];
    }
  }
  // Nicht geschlossener Here-String: Körper als Befehl werten (fail-closed).
  if (hereString !== null) ergebnis.push(...koerper);
  return ergebnis.join("\n");
}

/**
 * Befehlsnamen an Befehlsstellen eines Glieds: das erste Token nach Vorsätzen
 * (`env`, `command`, `xargs` …), Zuweisungen (`X=1`) und deren Optionen; dazu
 * je Shell-Aufruf mit `-Command`/`-c`/`/c` der Befehl danach. Ein Suchmuster
 * (`grep install`) oder ein `echo cp` zählt damit nicht als Verb. Seit F-1141
 * zusätzlich der Befehl nach einer Blockklammer `{` (PowerShell
 * `if ($?) { git … }`, `ForEach-Object { … }`, bash `{ git …; }`) — die
 * Kettenform aus CLAUDE.md wäre sonst eine Lücke für Aufgabe 5/6.
 */
function verbenVon(tokens) {
  const verben = [];
  let i = 0;
  let nachVorsatz = false;
  while (i < tokens.length) {
    const name = befehlsname(tokens[i]);
    if (VORSAETZE.has(name) || /^[A-Za-z_]\w*=/.test(tokens[i]) || (nachVorsatz && tokens[i].startsWith("-"))) {
      nachVorsatz = VORSAETZE.has(name) || nachVorsatz;
      i++;
      continue;
    }
    verben.push(name);
    if (!SHELLS.has(name)) break;
    const flagge = tokens.findIndex((token, index) => index > i && SHELL_BEFEHL_FLAGGE.test(token));
    if (flagge < 0) break;
    i = flagge + 1;
    nachVorsatz = false;
  }
  const block = tokens.findIndex((token) => token === "{" || /^\{[^,{}]+$/.test(token));
  if (block >= 0) verben.push(...verbenVon([tokens[block].slice(1), ...tokens.slice(block + 1)].filter((token) => token.length > 0)));
  return verben;
}
/** Verben, die löschen (für die Regel rekursiv + erzwungen). */
const LOESCHENDE_VERBEN = new Set(["rm", "rmdir", "rd", "del", "erase", "remove-item", "ri"]);
/** Verzeichniswechsel (für „erst in .claude wechseln, dann schreiben“). */
const WECHSEL_VERBEN = new Set(["cd", "chdir", "pushd", "set-location", "sl", "push-location"]);
/** Interpreter mit Inline-Code (`node -e`, `python -c`, `powershell -Command`). */
const INTERPRETER = new Set(["node", "python", "python3", "py", "deno", "bun", "perl", "ruby", "pwsh", "powershell"]);
const INLINE_FLAGGE = /^(-e|-c|-p|--eval|--print|-command)$/i;
/** `.claude` als Name im Fließtext (nicht `.claudeignore`, nicht `.claude-x`). */
const CLAUDE_IM_TEXT = /\.claude(?![\w.-])/i;
const POWERSHELL_FORCE = /^-f(o(r(c(e)?)?)?)?$/i;
const POWERSHELL_RECURSE = /^-r(e(c(u(r(s(e)?)?)?)?)?)?$/i;

/** Ziele der Umleitungen `>`/`>>` eines Glieds. */
function umleitungsZiele(glied) {
  return [...glied.matchAll(/\d*>>?\s*([^\s;&|<>]+)/g)].map((treffer) => treffer[1].replace(/^['"]|['"]$/g, ""));
}

/**
 * true, wenn ein Glied schreibt: schreibendes Verb an einer Befehlsstelle
 * (auch `/bin/rm`, `xargs rm`, `env X=1 cp`, `powershell -Command "Remove-Item …"`),
 * `sed -i`, `find … -delete|-exec`, `git checkout|restore`.
 */
function istSchreibendesGlied(verben, namen, klein) {
  if (verben.some((verb) => SCHREIBENDE_VERBEN.has(verb))) return true;
  if (verben.includes("sed") && klein.some((token) => /^-[a-z]*i/.test(token) || token === "--in-place" || token.startsWith("--in-place="))) return true;
  if (verben.includes("find") && klein.some((token) => token === "-delete" || token === "-exec" || token === "-execdir")) return true;
  return verben.includes("git") && namen.some((name) => name === "checkout" || name === "restore");
}

/** true bei Interpreter direkt vor einer Inline-Flagge (`node -e`, `python -c`) und `.claude` im Text. */
function interpreterMitClaude(text, tokens) {
  const inline = tokens.some((token, i) => INTERPRETER.has(befehlsname(token)) && i + 1 < tokens.length && INLINE_FLAGGE.test(tokens[i + 1]));
  return inline && CLAUDE_IM_TEXT.test(text);
}

/**
 * Aufgabe 5: Grund-Kennung, wenn eine Kette (Pipeline-Glieder) einen
 * `.claude`-Ordner kopiert, verschiebt, löscht oder überschreibt — Quelle oder
 * Ziel: Umleitung mit Ziel unter `.claude`; schreibendes Glied mit Argument auf
 * `.claude`; schreibendes Glied hinter einem Glied, das `.claude` nennt
 * (`find .claude | xargs rm`); schreibendes Glied oder Umleitung nach einem
 * Wechsel in `.claude` (imClaudeOrdner); Interpreter-Inline-Code mit `.claude`.
 * Lesen (`cat`, `ls`, `grep`) bleibt frei.
 */
function schreibtAufClaudeOrdner(glieder, imClaudeOrdner) {
  let claudeVorher = false;
  for (const glied of glieder) {
    const tokens = tokenisiere(glied);
    const namen = tokens.map(befehlsname);
    const klein = tokens.map((token) => token.toLowerCase());
    const ziele = umleitungsZiele(glied);
    const verweist = tokens.some(zeigtAufClaudeOrdner);
    const schreibend = istSchreibendesGlied(verbenVon(tokens), namen, klein);
    if (ziele.some(zeigtAufClaudeOrdner)) return true;
    if (schreibend && (verweist || claudeVorher || imClaudeOrdner)) return true;
    if (imClaudeOrdner && ziele.length > 0) return true;
    if (verweist) claudeVorher = true;
  }
  return false;
}

/** true, wenn ein Glied in einen `.claude`-Ordner wechselt (`cd .claude`, `Set-Location .\.claude`). */
function wechseltInClaudeOrdner(glied) {
  const tokens = tokenisiere(glied);
  return tokens.length > 1 && WECHSEL_VERBEN.has(befehlsname(tokens[0])) && tokens.slice(1).some(zeigtAufClaudeOrdner);
}

/**
 * Aufgabe 6: rekursives, erzwungenes Löschen (`rm -rf`/`-fr`/`-r -f`/
 * `--recursive --force`, `Remove-Item -Recurse -Force` auch abgekürzt,
 * `rd /s /q`), `git branch -D` (auch `--delete --force`, `-d -f`, `-df`),
 * `git reset --hard`, `git clean -f`, `git checkout .`, `git restore .`
 * (ohne `--staged`), `git stash drop|clear`, `git worktree remove --force`,
 * `git update-ref -d`. Optionen vor dem Unterbefehl (`git -C x …`) zählen
 * mit. Liefert den Grund oder null. Jedes übrige `git stash` außer
 * `list`/`show` sperrt stashSegment (F-1141, eigener Grund).
 */
function zerstoerendesSegment(segment) {
  const tokens = tokenisiere(segment);
  const klein = tokens.map((token) => token.toLowerCase());
  const namen = tokens.map(befehlsname);
  const verben = verbenVon(tokens);
  if (verben.some((verb) => LOESCHENDE_VERBEN.has(verb))) {
    // Kurzflaggen-Bündel (`-rf`, `-Rfv`) bis vier Buchstaben; längere Wörter nur als
    // PowerShell-Präfix von -Recurse/-Force — `-ErrorAction` oder `-Filter` zählen nicht.
    const buendel = tokens.filter((token) => /^-[a-zA-Z]{1,4}$/.test(token));
    const rekursiv =
      klein.includes("--recursive") || klein.includes("/s") || tokens.some((token) => POWERSHELL_RECURSE.test(token)) ||
      buendel.some((token) => !POWERSHELL_FORCE.test(token) && /r/i.test(token));
    const erzwungen =
      klein.includes("--force") || klein.includes("/q") || tokens.some((token) => POWERSHELL_FORCE.test(token)) ||
      buendel.some((token) => !POWERSHELL_RECURSE.test(token) && /f/i.test(token));
    if (rekursiv && erzwungen) return "rekursives, erzwungenes Löschen (rm -rf, Remove-Item -Recurse -Force, rd /s /q)";
  }
  if (!verben.includes("git")) return null;
  const erzwingtKurz = tokens.some((token) => token === "--force" || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(token));
  if (namen.includes("branch")) {
    const grossD = tokens.some((token) => /^-[a-zA-Z]*D[a-zA-Z]*$/.test(token));
    const loeschen = tokens.some((token) => token === "--delete" || /^-[a-zA-Z]*d[a-zA-Z]*$/.test(token));
    if (grossD || (loeschen && erzwingtKurz)) return "git branch -D (Löschen eines Branches ohne Merge-Prüfung)";
  }
  if (namen.includes("reset") && klein.includes("--hard")) return "git reset --hard";
  if (namen.includes("clean") && erzwingtKurz) return "git clean -f (löscht nicht versionierte Dateien)";
  if (namen.includes("checkout") && tokens.includes(".")) return "git checkout . (verwirft alle Änderungen)";
  if (namen.includes("restore") && tokens.includes(".") && !klein.includes("--staged")) return "git restore . (verwirft alle Änderungen)";
  if (namen.includes("stash") && (namen.includes("drop") || namen.includes("clear"))) return "git stash drop/clear";
  if (namen.includes("worktree") && namen.includes("remove") && erzwingtKurz) return "git worktree remove --force";
  if (namen.includes("update-ref") && klein.includes("-d")) return "git update-ref -d";
  return null;
}

/** Lesende `git stash`-Unterbefehle — die einzigen, die frei bleiben (F-1141). */
const STASH_LESEND = new Set(["list", "show"]);

/**
 * Aufgabe 6 (F-1141): true, wenn ein Glied `git stash` ausführt, außer `git stash list`/`git stash show`
 * — auch nacktes `stash`, mit globalen Optionen (`git -C x stash`, `git -c a=b stash`), über `powershell -Command`
 * oder `xargs`. Maßgeblich ist ein Token `stash` (klein, ohne Pfadkürzung: `refs/stash` zählt nicht), dem kein
 * lesender Unterbefehl folgt. Commit-Nachrichten sind vorher entfernt (entferneFliesstext).
 */
function stashSegment(segment) {
  const tokens = tokenisiere(segment);
  if (!verbenVon(tokens).includes("git")) return false;
  const klein = tokens.map((token) => token.toLowerCase());
  return klein.some((token, i) => token === "stash" && !STASH_LESEND.has(klein[i + 1] ?? ""));
}

/**
 * Aufgabe 5 und 6 als reine Funktion (exportiert für Tests): Grund der
 * Sperre oder null. Ein Wechsel in `.claude` gilt bis zum Ende des Befehls
 * (kein Nachverfolgen von `cd ..`, bewusst streng). Commit-/PR-Nachrichten und
 * Heredoc-Körper ohne Shell werden vorher entfernt (entferneFliesstext) — sie
 * dürfen „rm -rf“ oder „.claude“ nennen.
 */
function pruefeGehaerteteRegeln(roherBefehl) {
  const command = entferneFliesstext(roherBefehl);
  // Inline-Code enthält oft selbst `;` oder `|` — deshalb auf dem ganzen Befehl, vor der Zerlegung.
  if (interpreterMitClaude(command, tokenisiere(command))) {
    return (
      "commit-guard: Inline-Code (node -e, python -c, powershell -Command …) mit .claude — blockiert. " +
      "Änderungen unter .claude nur per Edit/Write mit dem genauen Dateipfad; Hooks und settings.json ändert der Mensch."
    );
  }
  let imClaudeOrdner = false;
  for (const glieder of zerlegeKetten(command)) {
    for (const glied of glieder) {
      const zerstoerend = zerstoerendesSegment(glied);
      if (zerstoerend !== null) {
        return `commit-guard: ${zerstoerend} blockiert — nicht umkehrbar. Wenn wirklich nötig, führt der Mensch den Befehl selbst aus.`;
      }
      if (stashSegment(glied)) {
        return (
          "commit-guard: git stash blockiert (frei sind nur git stash list und git stash show) — es nimmt Änderungen ohne " +
          "Freigabe aus dem Arbeitsbaum und kann sie bei einem Konflikt verstecken. Änderungen sichern über commit auf einem Branch (Stefan)."
        );
      }
    }
    if (schreibtAufClaudeOrdner(glieder, imClaudeOrdner)) {
      return (
        "commit-guard: Befehl kopiert, verschiebt, löscht oder überschreibt einen .claude-Ordner — blockiert. " +
        "Änderungen unter .claude nur per Edit/Write mit dem genauen Dateipfad; Hooks und settings.json ändert der Mensch."
      );
    }
    if (glieder.some(wechseltInClaudeOrdner)) imClaudeOrdner = true;
  }
  return null;
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

  // Aufgabe 5/6 (F45 B1b-1, F-1035): .claude als Kopier-/Lösch-/Schreibziel
  // und nicht umkehrbare Befehle. Eigener try/catch: fail-closed.
  try {
    const grund = pruefeGehaerteteRegeln(command);
    if (grund !== null) {
      verweigern(grund);
      return;
    }
  } catch {
    verweigern(
      "commit-guard: Prüfung nicht ausführbar — fail-closed, Befehl verweigert."
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

module.exports = { dekodiereFreigabeInhalt, parseFreigabeZeitstempel, pruefeGehaerteteRegeln };
