# F45 F-3b-2 — Nachweis: Plugins im Workforce-Lauf

Stand 14.10.2026, Branch `f45/f3b2-plugins-im-lauf` (Basis `340d823`), CLI `2.1.299`, Modell `claude-sonnet-5`. Plan
`features/F45/plan-f3b.md` v3 + v3.1 (Delta-Advisor-Pass: freigegeben mit Auflagen A1–A15). Spike: `spike.md`. Pfade geschwärzt
(`<HOME>`, `<WURZEL>`), keine Sitzungs-ids (`<ID>`).

## 1 Tests zuerst (F-1092)

Roter Lauf vor den Modulen, 14.10.2026 15:31:47 (`node --test` über `src/plugin-lauf/plugin-lauf.test.ts`,
`src/plugin-kopie/kopie.test.ts`, `src/claude-code-gateway/claude-code-gateway.test.ts`, `src/faehigkeiten/faehigkeiten.test.ts`):
115 Tests, 6 fehlgeschlagen — `baueAufruf` mit `pluginDirs`, `pruefeInitZeile` mit Plugin-Soll, `baueFaehigkeitenStart` mit Plugins
(2 Fälle), T10 `plugin_daten`, und `src/plugin-lauf/plugin-lauf.test.ts` mit `ERR_MODULE_NOT_FOUND` (Modul fehlte; 15:35:12
nach der Umstellung auf v3.1 erneut rot). Nach dem Bau grün; zusätzlich Controller-Test (Plugin-Soll durchgereicht, Datenordner-
und Lauf-Kopie-Befund ohne Abbruch) und Oberflächen-Test (`empfehlung-anzeige.test.mjs`), beide nach dem Modul geschrieben (vermerkt).

## 2 Gate `scripts/check-f45-f3b2-lauf.mjs`

(a)–(m) und (o) grün, (n) Rot-Selbsttest mit 26 verfälschten Eingängen (nach der Korrekturrunde: (c) über bereiteEmpfehlungFuerStartVor, (f) doppelter Manifest-Name, (m) Abruf vor dem D13-Bereich, (o) Zuordnung ohne Freigabe). Angepasst: f45-f3a (d) — `--plugin-dir` nur im Gateway; f45-f3b1
(f) — Lauf ohne Zuordnung bitgleich, der Server baut kein eigenes `--plugin-dir`-Literal, `src/plugin-lauf` darf die Plugin-Felder
nennen. Beide behalten ihre Rotfälle.

## 3 Echter Beleg (`beleg.mjs`, Zählungen `zaehlung-beleg-L1.json`, `zaehlung-beleg-L2.json`)

Echter Startweg: `bereitePluginStartVor` (Stefans echte lokale Datei, nur gelesen; echte CLI-Liste; Prüfberichte dieses Checkouts;
Kopie-Wurzel `~/.ai-workforce/plugin-kopien`) → `loeseAusfuehrungsEingabenAuf` → `fuehreAufgabeDurch` → echte CLI im Wegwerf-Repo,
Kontrollzustand in tmp. Der Beleg schreibt die Lauf-Kopie wie jeder echte Lauf nach
`~/.ai-workforce/plugin-kopien/_lauf/a9d70284…` (Advisor A14).

| Lauf | Zuordnung | Prüfung vor dem Lauf | `--plugin-dir` | `init.plugins` | `init.skills` | Aufrufe | Ergebnis |
|---|---|---|---|---|---|---|---|
| L1 | `superpowers:systematic-debugging` → Ausführung (Freigabe `86c91777…`, Bericht `…-447a3772@1`) | 3 222 ms, Zustand freigegeben | 1 (Lauf-Kopie) | `superpowers@inline` (6.2.0) | `superpowers:systematic-debugging` | Skill ✓, Read `…/_lauf/<hash>/skills/systematic-debugging/root-cause-tracing.md` ✓ („# Root Cause Tracing“) | ERFOLGREICH, 15,3 s, 0 Verweigerungen |
| L2 | keine (Kopie der lokalen Datei ohne `plugin_zuordnung`) | `keine`, kein CLI-Abruf | — | nur die eingebauten (Lauf ohne Fähigkeiten, Argv wie vor F-3b-2) | eingebaute | — (Modell: „Kein Skill-Werkzeug verfügbar“) | ERFOLGREICH, 8,3 s |

L1 im Detail: Init-Gate ohne Verstoß (Soll `superpowers@inline`, Skill auch in `init.slash_commands`); Instruktion im Auftrag
„Plugin-Fähigkeiten in diesem Lauf (von Stefan der Ausführung zugeordnet): Skills superpowers:systematic-debugging
(Skill-Werkzeug).“; `faehigkeiten_im_lauf`: Eintrag Quelle `plugin`, Hash `86c91777…`, Aufrufe 1, fehlgeschlagen 0;
`faehigkeiten_im_lauf.plugins`: Lauf-Kopie `a9d70284…` nach dem Lauf unverändert, Datenordner `abweichungen: []`. Beobachtungsblock
für den Code-Reviewer: „Skills geladen: superpowers:systematic-debugging · aufgerufen: superpowers:systematic-debugging“.
Advisor A6 gemessen: eine Hilfsdatei des Skills außerhalb des Arbeitsordners ist im `-p`-Lauf lesbar (Werkzeugsatz `Read` ohne
Pfadregel).

Eine nicht zugeordnete Rolle sieht das Plugin nicht: L2 im echten Lauf; Rollen ohne Fähigkeiten-Weg (lesende Rollen, Codex)
bekommen keinen Katalog-Kontext — Gate (c)/(k), Test L1/L2 (`pluginKennungen` für `qa` leer, Codex → „nicht geladen (nur Claude
Code)“ ohne CLI-Abruf). Hinweis: Läufe ohne jede Fähigkeit laden weiterhin die eingebauten Plugins (kein `--settings`, bitgleich
zu vorher, F-3a Spike S0b) — nicht Teil von F-3b-2.

Unter `~/.claude` durch den Beleg: `plugins/data` unverändert (Vergleich vorher/nachher), Sitzungsordner unter `projects/` wie jeder
Lauf.

## 4 Render-Nachweis (`render/`, Testinstanz `instanz.mjs` über dem Kontrollzustand des Belegs)

- `lauf-detail-l1` (1440 dunkel), `-hell`, `-zoom200`, `-ru-390`: „Fähigkeiten im Lauf“ mit Quelle „Plugin“, Aufruf 1, Block
  „Plugin-Lauf-Kopien“ (Kopie-/Lauf-Kopie-Hash, nach dem Lauf unverändert) und Datenordner unverändert — echte Laufakte L1.
- `lauf-detail-l2`: echter Lauf ohne Zuordnung, kein Plugin-Block.
- `lauf-detail-befund` (1440 dunkel), `-390-hell`: feste Antwort aus L1 abgeleitet — Datenordner im Lauf verändert, Lauf-Kopie nach
  dem Lauf verändert, ein Agent eines anderen Plugins ohne Freigabe („keine Freigabe — wirkt nicht“).
- `freigabe-plugins-1440`, `-390-hell`, `-en-1440`: Freigabedialog eines Ausführungsschritts (feste Antworten aus F44 WS-4a) mit
  „Plugin-Fähigkeiten im Lauf“ (ein Skill angekreuzt „läuft mit“, ein Agent eines anderen Plugins „ohne Freigabe — wirkt nicht“) und dem Hinweis auf die
  Prüfung beim Start.
