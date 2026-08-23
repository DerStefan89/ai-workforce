/**
 * Datei: .claude/hooks/commit-guard.cjs
 *
 * Zweck: PreToolUse-Hook auf Bash. Eine Aufgabe:
 * 1. Verweigert jeden Bash-Befehl, der `.claude/settings.json` referenziert
 *    (schließt die Bash-Lücke von guard-settings.js).
 *
 * Frühere Aufgaben "Freigabe-Datei-Pflicht vor git commit/push" und
 * "Bash-Zugriff auf state/freigabe-commit.md blockieren" wurden mit
 * Stefan-Entscheidung 23.08.2026 ersatzlos entfernt (Befund B6, Nachtrag
 * N24) — siehe state/plan-v1-harness-b6-hooks-cjs-migration.md.
 * state/freigabe-commit.md wird nicht mehr verwendet.
 *
 * Bekannte Grenze: Das Muster ist ein Substring-Test auf den Dateipfad,
 * kein exaktes Parsen des Befehlstexts.
 *
 * Geplante Erweiterung: Vertrag harness-b1b3-merge-guard-und-git-flow
 * fügt eine Sperre für den gh-Merge-Pfad und Branch-Protection-Zugriffe
 * hinzu — nicht Teil dieser Datei, folgt als eigener, separater Vertrag.
 */
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

  process.exit(0);
}

if (require.main === module) {
  let input = "";
  process.stdin.on("data", (d) => (input += d));
  process.stdin.on("end", () => verarbeiten(input));
}