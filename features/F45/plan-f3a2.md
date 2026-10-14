# F45 F-3a-2 — Plan: Reiter „Plugins aus deinem Claude Code“

Stand 14.10.2026, Branch `f45/f3a2-plugins-anzeige` (Basis `a427f0b`, F-3a-1). Maßgeblich: `docs/projekt/fixpaket-f45.md`
Zeile F-3a-2, `state/findings.md` F-910, F-1091 (1)(2)(18). Kein eigener Advisor-Pass (reine Anzeige auf fertiger Route,
Auftrag Stefan).

## Briefing

1. **Ziel:** Stefans Plugin-Bestand (GET `…/plugins`, F-3a-1) in der Capability Library sichtbar machen — nur lesen.
2. **Referenz:** Muster Katalog (`views/capability-library.js`: Tabelle + Detail-Aside, `.library-*`), Sammlung
   (reine Anzeige-Datei + View), Route `scripts/leitstand/routen-plugins.mjs`, Typen `src/claude-plugins/types.ts`.
3. **Module:**
   - `public/leitstand/plugins-anzeige.js` (neu, rein, ohne DOM): `renderPluginsZustand`, `renderPluginListe`,
     `renderPluginDetail`, `renderEingebaut` (Aktiv-Zeile intern `aktivHtml`) — alle Routenwerte nur über `escapeHtml`.
   - `public/leitstand/views/plugins.js` (neu): `erzeugePluginSteuerung({ hole, zeichne })` (testbar ohne DOM: laden nur über
     `beiReiterwahl()`/`neuLaden()`, Überholschutz, Zurücksetzen beim Projektwechsel) + DOM-Anbindung.
   - `api.js`: `holePlugins` (präfigiert = Instanz des aktiven Projekts, `instanz_pfad` = dessen Ordner; Zeitlimit 15 s,
     Route selbst 10 s).
   - `index.html`: Reiter `faehigkeiten-reiter-plugins` + Panel; `views/capabilities.js`: Rückruf der Reiterwahl,
     Projektwechsel, globales „Neu laden“ nur bei gewähltem Reiter.
   - `style.css`: wenige `.pl-*`-Regeln, nur vorhandene Tokens.
   - `src/claude-plugins/types.ts`: Typ `PluginAntwort` (Antwortform mit `instanz_pfad`, F-1091 (18)) — reine Doku/Typ,
     Route-Semantik unverändert.
4. **Zustände:** nicht geladen (Hinweis „wird beim Wählen geladen“) · lädt · Liste + Detail · leer (Claude Code meldet keine
   Plugins; eingebaute bleiben sichtbar) · unlesbar (Route `status: 'fehler'` mit Grund, oder Abruf scheitert mit Grund) ·
   Teilfehler je Plugin im Detail. Fester Hinweis „Noch nicht im Workforce-Lauf nutzbar — kommt im nächsten Schritt.“ in allen
   Zuständen (Challenger 14.10.2026: ohne interne Kennung).
5. **Akzeptanzkriterien:**
   - AK1 Liste: Name, Marketplace, Version, Status je Plugin; Auswahl öffnet Detail.
   - AK2 Detail: Skills (allowed-tools), Agents (tools), Commands (allowed-tools), Hooks (Ereignis, Matcher, Befehl), MCP
     (gepinnt ja/nein + Art), LSP; Risiken als Fakten (Art übersetzt, Bestandteil, Text roh); Hash/Grund, Lizenz, Teilfehler.
   - AK3 Eingebaute getrennt, je Eintrag Quelle; Referenzliste mit Messversion (`cli_version`), Lesefehler der Liste mit Grund.
   - AK4 `aktiv` bei scope ≠ user nicht als Stand dieses Projekts: Status „Je nach Ordner“ (Scope und Installationsprojekt unter dem Namen), im Detail Wert laut Abruf aus
     `instanz_pfad` und Installationsprojekt `projekt_pfad`, Hinweis auf die Messung (siehe unten).
   - AK5 Abruf nur bei Reiterwahl und „Neu laden“; kein Poll, kein Abruf beim Seitenaufruf/Projektwechsel.
   - AK6 i18n de/en/tr/ru; jede Zeichenkette der Route escaped (XSS-Rotfall im Gate).
   - AK7 Keine Aktivierung, kein Knopf mit Wirkung (nur Auswahl und „Neu laden“).
6. **Risiken:** Reiterleiste wird mit sechstem Reiter bei 390 px/ru eng (Render-Nachweis); Pfade im Detail können lang sein
   (`overflow-wrap:anywhere`); Messung `enabled` gilt für CLI-Version der Messung (Datei nennt sie).

## Messung F-1091 (2) — vor dem Bau

`features/F45/nachweise/f3a2/messung-scope-local.mjs`: isolierter `CLAUDE_CONFIG_DIR`, lokaler Marketplace, Mess-Plugin mit
`--scope local` in Ordner A. Ergebnis (`messung-scope-local.json`): Liste aus A `enabled: true`, aus B und C `false`;
nach `disable` in A überall `false`; `projectEnabled` immer `false`. Echter `~/.claude/plugins` unverändert.
**Folge: `enabled` hängt vom Arbeitsordner des Aufrufs ab** → Oberfläche zeigt bei scope local den Wert nur als „laut Abruf
aus <instanz_pfad>“ mit Installationsprojekt, nie als Stand dieses Projekts. scope project ist nicht gemessen und wird
genauso vorsichtig gezeigt (Ordnerbezug laut Settings-Ebene).

## Tests zuerst (rot vor dem Modul)

`public/leitstand/plugins-anzeige.test.mjs` und `public/leitstand/views/plugins.test.mjs` vor den Modulen; erster Lauf rot
(Modul fehlt) als Beleg im Bericht.

| Fall | erwartet |
|---|---|
| Liste aus Fixture (voll/nur-skill/kaputt) | drei Zeilen, Name/Marketplace/Version/Status; nur-skill Status „Je nach Ordner“ |
| Detail voll | Hooks SessionStart + PostToolUse mit Befehl, MCP latest „nein“, fest „ja“, Risiken 8 Zeilen |
| Detail kaputt | Teilfehler sichtbar |
| aktiv bei local | Text nennt instanz_pfad und projekt_pfad, kein „aktiv in diesem Projekt“ |
| eingebaut | getrennter Block, Messversion aus `cli_version`; Quelle cli-liste ohne Version; `eingebaut_fehler` mit Grund |
| leer | Leertext + eingebaute weiter sichtbar |
| unlesbar | Grund aus Route bzw. Abruf |
| XSS | Name/Command/Hook-Befehl mit `<script>` und `"><img onerror>` → kein rohes `<script`/`<img`, Attribute geschlossen |
| Steuerung | `erzeuge…` ruft `hole` nicht; `beiReiterwahl`/`neuLaden` je einmal; überholte Antwort verworfen; Zurücksetzen ohne Abruf |
| i18n | alle dynamischen Schlüssel (Risiko-Arten, Scopes, Pin-Arten) in allen vier Sprachen |

## Gate `scripts/check-f45-f3a2-anzeige.mjs` (in `npm run check` nach F-3a-1)

(a) Fixture-Bestand über den echten Handler → Liste und Detail rendern (Zeilen, Bestandteile, Hook- und MCP-Risiko);
(b) Hinweis F-3b in Panel-HTML und Render; (c) eingebaute getrennt mit Messversion; (d) leer/unlesbar mit Grund;
(e) XSS-Rotfall (Plugin-Name, Command, Hook-Befehl); (f) kein Abruf ohne Reiterwahl (Steuerung + Quelltext: `holePlugins`
nur in `views/plugins.js`, nicht in `ladeCapabilities`, nicht im Poll); (g) `starteWorkflowSchritt(` genau 6×;
(h) kalibrierte Rotfälle für (a)–(g).

## Prüfer

code-reviewer + qa + design-guardian (Render-Nachweis 1440/390, hell/dunkel, ru 390, 200 %: Liste, Detail mit Hook- und
MCP-Risiko, leer, unlesbar; Fixture-Instanz auf Port 4199). Höchstens eine Korrekturrunde + Nachpass, dann einmal
`npm run check`.

## Abweichungen beim Bau (Code-Review 11, QA 13)

- Steuerung `erzeugePluginSteuerung` liegt in `plugins-anzeige.js` (ohne DOM, testbar), nicht in `views/plugins.js`; deshalb
  kein eigenes `views/plugins.test.mjs` — alle Fälle in `plugins-anzeige.test.mjs`.
- Zeitlimit 20 s statt 15 s (CLI-Grenze 10 s + Ordner lesen/hashen); Zeitüberschreitung mit eigenem Text.
- Gate (b) prüft den F-3b-Hinweis im Panel (statisch über jedem Zustand), nicht im Render.
- Rot-Beleg vor dem Modul: erster Testlauf scheiterte am fehlenden Modul `plugins-anzeige.js` (F-1092).
- Korrekturrunde: Reiterwahl lädt nur bei einem Wechsel auf den Reiter (erneuter Klick nicht); „Neu laden“ nur, wenn auch
  das Register Capability Library gewählt ist; Scope + Installationsprojekt und Risiko-Anzahl in der Liste; Bestandteile
  aufklappbar, leere Arten in einer Zeile; Hash und Commit voll; Ladezeit im Kopf; Hinweis „gemessen“ nur bei scope local.
- Nachzug nach den Nachpässen: Klick auf den schon gewählten Reiter lädt, solange nach einem Projektwechsel nichts geladen
  ist (sonst führte der Text „wird gelesen, wenn du diesen Reiter wählst“ in die Irre); vier über Variablen gewählte
  i18n-Schlüssel in `DYNAMISCHE_SCHLUESSEL`; vier weitere Gate-Rotfälle.

## Nicht-Ziele

Keine Aktivierung/Freigabe, kein Lauf geändert (`init.plugins` bleibt `[]`), keine Route-Semantik geändert, nichts unter
`~/.claude`.
