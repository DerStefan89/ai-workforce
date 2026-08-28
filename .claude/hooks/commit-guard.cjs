/**
 * Datei: .claude/hooks/commit-guard.cjs
 *
 * Zweck: PreToolUse-Hook auf Bash. Zwei Aufgaben:
 * 1. Verweigert jeden Bash-Befehl, der `.claude/settings.json` referenziert
 *    (schließt die Bash-Lücke von guard-settings.js).
 * 2. Verweigert den Merge-Pfad nach main über `gh` (PR-Merge-Unterbefehl
 *    oder ein API-Pfad, der auf `/merge`/`/merges` endet — `mergeable`
 *    bleibt ausdrücklich frei, kalibrierter Leseweg auf mergeable_state)
 *    sowie jeden Bash-Zugriff, lesend wie schreibend, auf die
 *    Branch-Protection-Regel selbst (`branches/…/protection`). `git merge`
 *    bleibt frei — lokaler, gewollter Vorgang.
 *
 * Frühere Aufgaben "Freigabe-Datei-Pflicht vor git commit/push" und
 * "Bash-Zugriff auf state/freigabe-commit.md blockieren" wurden mit
 * Stefan-Entscheidung 23.08.2026 ersatzlos entfernt (Befund B6, Nachtrag
 * N24) — siehe state/plan-v1-harness-b6-hooks-cjs-migration.md.
 * state/freigabe-commit.md wird nicht mehr verwendet.
 *
 * Bekannte Grenze: Das Muster ist ein Substring-Test auf den Dateipfad,
 * kein exaktes Parsen des Befehlstexts. Für Aufgabe 2 gilt zusätzlich: Der
 * Rot-Fall belegt ausschließlich den Bash-Pfad; GitHub-Weboberfläche,
 * `curl`/andere HTTP-Clients, MCP-Werkzeuge und WebFetch bleiben offen.
 * Zusätzlich nicht erfasst: die Rulesets-API (`repos/…/rulesets`) — der
 * Schutz dieses Repos liegt in der klassischen Protection-API, nicht in
 * Rulesets.
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

  process.exit(0);
}

if (require.main === module) {
  let input = "";
  process.stdin.on("data", (d) => (input += d));
  process.stdin.on("end", () => verarbeiten(input));
}