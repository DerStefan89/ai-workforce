# F16 AK12 — Analyse: Was die Argv-Allowlist durchsetzt (und was nicht)

Eigene Lektüre von `src/codex-gateway/codex-argv-allowlist.ts`
(`pruefeCodexAufruf`), ohne Bezug auf ein Reviewer-Urteil aus einem
vorherigen Schritt (F-270: kein Ergebnis-Artefakt zwischen Stufe 1 und
Stufe 2 dieses Laufs).

## Was die Allowlist durchsetzt

`pruefeCodexAufruf` prüft ein Argv-Tokens-Array für `codex exec` gegen
eine geschlossene Grammatik, nicht gegen eine Verbotsliste:

- Position 0 muss `exec` sein.
- `--json` höchstens einmal.
- `--sandbox` genau einmal, mit dem einzig erlaubten Wert `read-only`.
- `--model` genau einmal, gefolgt von einem nicht-leeren String-Wert.
- `--output-schema` höchstens einmal, gefolgt von einem absoluten Pfad.
- Genau ein abschließendes Prompt-Token ohne führendes `-`.
- Jedes weitere Token mit führendem `-` wird abgelehnt — auch ein heute
  unbekannter Schalter, da die Prüfung nicht gegen eine feste Liste
  bekannter verbotener Namen läuft, sondern jedes Token entweder einem
  der oben genannten erlaubten Fälle zuordnet oder ablehnt.
- Werteposition-Härtung: ein Wert, der selbst mit `-` beginnt (z. B. ein
  `-c` an der Wertposition von `--model`), wird über `wertMangel`
  zurückgewiesen, damit ein abwählender Schalter nicht unter dem
  Deckmantel eines Wertes durchrutscht.

Ergebnis: Ein Aufruf, der zusätzliche oder unbekannte Schalter enthält
(z. B. `-c`, `--enable`, `--disable`, `-p`/`--profile`,
`ignore-user-config`, `ignore-rules`), wird abgelehnt, weil diese Tokens
in keinem der erlaubten Fälle vorkommen und mit `-` beginnen.

## Was die Allowlist ausdrücklich NICHT durchsetzt

Die Allowlist ist eine Argv-Grammatikprüfung, keine Laufzeit- oder
Dateisystemkontrolle. Sie prüft nur, welche Tokens an den Codex-Prozess
übergeben werden dürfen — nicht, was der gestartete Prozess mit diesen
Argumenten tatsächlich tut.

Die reale Schreibgrenze entsteht dadurch, dass `--sandbox` als einzig
zulässigen Wert `read-only` erzwingt, also durch den deklarierten Wert
des Sandbox-Schalters im Argv. Ob Codex diesen Wert tatsächlich als
Schreibsperre respektiert, ist eine Eigenschaft des Codex-Prozesses
selbst (der Sandbox-Implementierung von `codex-cli`), nicht eine
Eigenschaft, die diese Datei prüfen oder erzwingen kann. Mit anderen
Worten: Die tatsächliche Schreibgrenze eines Laufs ist `--sandbox
read-only` als Betriebsmodus des gestarteten Werkzeugs — nicht der hier
deklarierte Werkzeugsatz oder die Argv-Grammatik an sich (F-323). Die
Allowlist verhindert, dass ein Aufruf diesen Schutz per Argv abwählt
(z. B. über `-c 'sandbox_permissions=[...]'`); sie kann aber nicht
nachweisen oder erzwingen, dass die Sandbox-Implementierung selbst
fehlerfrei ist.
