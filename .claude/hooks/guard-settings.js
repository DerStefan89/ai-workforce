// Blockiert Schreibzugriff (Edit/Write) auf geteilte Dateien:
// - .claude/settings.json: Team-Policy (Permission-Freigaben gehoeren nach
//   .claude/settings.local.json, nicht hierher).
// - state/freigabe-commit.md: der zweite Schluessel aus commit-guard.cjs.
//   War bisher nur gegen Bash geschuetzt (siehe dort, Aufgabe 4), nicht
//   gegen das Edit/Write-Werkzeug selbst - ein Modell haette die Datei mit
//   einem plausiblen Zeitstempel selbst anlegen und damit die
//   Freigabepruefung umgehen koennen, die nur Inhalt/Alter prueft, nicht
//   Herkunft. Siehe state/plan-v2-harness-freigabedatei-wiederherstellung.md.
// "ask" wird von der VS-Code-Extension ignoriert (Issue #13339 im
// anthropics/claude-code-Repo) - daher "deny" statt Rueckfrage.
const GUARDED_FILES = [
  {
    path: ".claude/settings.json",
    suffix: "/.claude/settings.json",
    reason:
      "Schreibzugriff auf geteilte settings.json blockiert. Absichtliche " +
      "Aenderung: Hook in .claude/settings.json (hooks.PreToolUse) temporaer " +
      "entfernen, Grund im Commit nennen.",
  },
  {
    path: "state/freigabe-commit.md",
    suffix: "/state/freigabe-commit.md",
    reason:
      "Freigabedatei darf nur vom Menschen im eigenen Editor angelegt " +
      "werden, nicht vom Modell.",
  },
];

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let filePath = "";
  try {
    filePath = JSON.parse(input).tool_input?.file_path || "";
  } catch {}

  const normalized = filePath.replace(/\\/g, "/");
  const guarded = GUARDED_FILES.find(
    (f) => normalized === f.path || normalized.endsWith(f.suffix)
  );

  if (guarded) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: guarded.reason,
        },
      })
    );
  }
  process.exit(0);
});
