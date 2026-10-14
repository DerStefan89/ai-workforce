# Nachweis F45 F-3a-2 — Reiter „Plugins aus deinem Claude Code“

Stand 14.10.2026, Branch `f45/f3a2-plugins-anzeige` (Basis `a427f0b`). Plan `features/F45/plan-f3a2.md`.

## Messung F-1091 (2): hängt `enabled` bei scope local vom Arbeitsordner ab?

`messung-scope-local.mjs` (Hand, nicht in `npm run check`): eigener `CLAUDE_CONFIG_DIR` unter tmpdir, lokaler Marketplace mit
einem Mess-Plugin, drei Ordner A/B/C. `claude plugin install mess-plugin@mess-markt --scope local` in A, dann
`claude plugin list --json` aus A, B, C; danach `disable --scope local` in A und erneut aus A und B. Rohdaten
`messung-scope-local.json` (Pfade geschwärzt, CLI-Version im letzten Schritt).

| Aufruf aus | Stand | `enabled` | `projectPath` | `projectEnabled` |
|---|---|---|---|---|
| A (Installationsprojekt) | installiert, an | `true` | A | `false` |
| B | installiert, an | `false` | A | `false` |
| C | installiert, an | `false` | A | `false` |
| A | nach `disable` | `false` | A | `false` |
| B | nach `disable` | `false` | A | `false` |

**Ergebnis: abhängig.** `enabled` ist nur aus dem Installationsprojekt `true`; aus jedem anderen Ordner `false`. `projectEnabled`
blieb in allen Fällen `false` (Bedeutung ungeklärt, wird nicht angezeigt). Echter `~/.claude/plugins`: 0 Abweichungen
(lstat-Momentaufnahme vor/nach). **Folge für die Anzeige:** bei scope ≠ user zeigt die Liste „Je nach Ordner“ mit Scope und
Installationsprojekt, das Detail den Wert „laut Abruf aus `<instanz_pfad>`“ mit dem Installationsprojekt `<projekt_pfad>` und dem
Hinweis „Gemessen: … aus einem anderen Ordner (etwa dem Arbeitsordner eines Laufs) kann er anders lauten“ — also kein
allgemeiner Stand dieses Projekts. scope project/unbekannt ist nicht gemessen und trägt „Nicht gemessen: …“.

## Render-Nachweis (`render/`)

Testinstanz `instanz.mjs` (`LEITSTAND_PORT=4199`): Fixture-Bestand `scripts/_plugin-fixture.ts` plus ein Plugin mit langem Namen
und Marketplace, über den echten Abruf der Route (Leser, Maskierung); Wegwerf-Pfade durch `C:\fixture` ersetzt — keine Plugins,
Pfade oder IDs von Stefan. Leer und unlesbar über Antwort-Attrappen der Klickfolgen. Kein waagerechter Überlauf in allen 11 Folgen.

| Folge | zeigt |
|---|---|
| `plugins-{de-1440, de-1440-hell, de-390, en-390-hell, ru-390, tr-1440, de-1440-zoom200}` | Reiterleiste mit dem neuen Reiter (scrollt bei 390 px/200 % in sich, wie die übrigen Register) → vor der Wahl nichts geladen → Reiter gewählt → Liste (4 Plugins, Marken „8 Risiken“/„Teilfehler“, Scope + Installationsprojekt bei local) → Detail „voll“ (8 Risiken inkl. Hook und MCP) → Hooks und MCP aufgeklappt (Befehl, gepinnt ja/nein) → Detail „nur-skill“ (scope local mit Ordnerbezug und Messhinweis) → Detail „kaputt“ (Teilfehler); eingebaute getrennt mit Messversion |
| `plugins-leer-{de-1440, ru-390-hell}` | „Claude Code meldet keine installierten Plugins.“, eingebaute bleiben |
| `plugins-unlesbar-de-1440-hell` | Route `status: 'fehler'` mit Grund |
| `plugins-unlesbar-en-390` | HTTP 500 → Grund aus dem Abruf |

Wiederholen: `LEITSTAND_PORT=4199 node features/F45/nachweise/f3a2/instanz.mjs` (offen lassen), dann
`node features/F45/nachweise/f3a2/render/erzeuge-nachweis.mjs [basis] [ordner]`.

## Grenzen

- Kein echter Abruf von Stefans Bestand in diesem Nachweis (Vorgabe: nur Fixture). Die echte Route ist in F-3a-1 belegt
  (`../f3a/gegenprobe.json`).
- Die Messung gilt für die CLI-Version der Messung; eine spätere CLI kann `enabled` anders bilden.
