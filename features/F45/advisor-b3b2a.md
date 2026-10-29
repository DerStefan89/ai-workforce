# Advisor-Pass F45 B3b-2a „Render-Nachweis im Lauf (Kern)“ zu Plan v1

Geprüft: `features/F45/plan-b3b2a.md` gegen main `12d5ee9` (architecture-advisor, frischer Kontext, 29.10.2026).
Marker: [BELEGT] Fakt mit Datei:Zeile, [SCHLUSS] Schlussfolgerung, [ANNAHME] nicht selbst nachgeprüft, [OFFEN] offene Unsicherheit.

## Urteil

**Nicht freigegeben — Paket zu groß.** Keine Neukonzeption nötig; Plan v2 braucht den Schnitt 2a-1/2a-2, K1–K4 und
Entscheidungen zu K2 und H4. Für Plan v2 reicht ein Delta-Pass.

## Pflichtkorrekturen

- **K1 „Nur Ausführung“ ≠ „nur Arbeitsordner“.** [BELEGT] `laufort.loeschliste` ist für jeden Workflow-Schritt gesetzt,
  auch mit `arbeitsordner: null` (`scripts/leitstand-server.mjs:7992`, `:6208`, `:6501`). [SCHLUSS] Der Render liefe
  im Projektordner — gegen den Auftrag und ARCHITECTURE.md §2 („im Projektordner bleibt der Kern lesend“). Korrektur:
  `laufImArbeitsordner && laufort.loeschliste === true` (wie die Löschliste, `:6642`); Integrationstest im echten
  Arbeitsordner plus Negativfall Projektordner.
- **K2 Build in `check:render` schreibt außerhalb der geprüften Vorbedingung.** [BELEGT] `ordner` ist standardmäßig
  `dist`, `.gitignore` neuer Projekte nur `kontrollzustand/` und `.render-nachweis/` (`src/projekt-anlegen/index.ts:435`).
  [SCHLUSS] Ein vom Kern gestarteter Build legt nach der Änderungsübersicht ungetrackte Ausgabe ab. Entscheidung:
  (a) Build-Zeile streichen oder (b) behalten, Gate-Vorlage verlangt Build-Ausgabe in `.gitignore` (DEKLARIERT).
  Empfehlung (b); in beiden Fällen ein Satz in `docs/architektur/arbeitsordner.md`.
- **K3 Hinweis-Klasse falsch.** [BELEGT] Amber-Muster der Abnahme ist `note amber` (`workflow-abnahme.js:177`, `:529`).
- **K4 UI-DoD fehlt.** [BELEGT] CLAUDE.md verlangt für UI einen Render-Nachweis (`npm run render-nachweis`, F-622) und
  design-guardian; Fälle ok/ROT/fehlt in hell, dunkel, mobil.
- **K5 Zu groß.** [SCHLUSS] Drei Schichten plus Skelett plus Register (≈ 25 Dateien); Integrationstest im Arbeitsordner
  und UI-Schleife tragen je eine eigene Korrekturschleife.

## Hinweise

- H1 Neue Code-Dateien formatiert und ohne Biome-Befund (auch info); `scripts/leitstand/*.mjs` 0 checkJs-Fehler.
- H2 GET `/api/workflows/<id>` baut dieselbe Prüfergebnis-Projektion ohne `versionSequenz` (`:8844-8860`) — ein Helfer
  für beide spart weitere ≈ 12 Zeilen.
- H3 „render.json ist eine Datei“ per `statSync(p, { throwIfNoEntry: false })?.isFile() === true`.
- H4 Der Prüfschritt läuft auch nach VERWEIGERT ohne Bypass-Verdacht (`:6628-6629`) — bewusst entscheiden; mit
  `laufErfolgreich` gälte dieselbe Regel wie bei der Löschliste.
- H5 Ein Wurf im try würde als „Prüfschritt konnte nicht registriert werden“ gemeldet — folgenlos, solange der Render
  nie wirft; werfenden Rückruf testen.
- H6 Unit-Test mit injiziertem argv (kein echtes npm), echtes `npm run` nur im Integrationstest. Fehlende Fälle:
  Projektordner ohne Render, Ad-hoc-Lauf ohne Render, D13 409 während des Renders, ungültige Daten ⇒ 'fehlt',
  Projektion nach Auslagern bitgleich.
- H7 `findeNpmCli` korrekt auf beiden Plattformen; der Import zieht den Modulgraphen von projekt-anlegen mit
  (vertretbar, sauberer: injizierbarer argv-Erzeuger).
- H8 F-1262 auch in `gate-vorlage-node.md:230-232` nachziehen.
- H9 Ortssatz: „… solange der Arbeitsordner besteht“.
- H10 Register erst nach dem Bau auf erledigt setzen.
- H11 Kill des Prozessbaums nur best effort (F-181) — ZEITGRENZE als DEKLARIERT führen.
- H12 Projektion mit `letzteZeilen(ausgabe_ende, 40)` statt bis zu 16 KB je 2-s-Abfrage; `gestartet_am` weglassen;
  `abnahme.pruefung.wert.*` wiederverwenden.

## In Ordnung

Leser-Isolation (alle Leser exakte Literale, kein Präfix-Scan), Schema v0 ohne Änderung, D13/Reihenfolge vor
`meldeLaufende`, `fuehrePruefungDurch` wirft nie, check-ignore-Muster, `.gitignore` neuer Projekte, W1-Bilanz
(≈ −8, mit H2 ≈ −20), Bitgleichheit der Projektion, `workflow-abnahme.js` ohne Wachstum machbar, argv auf Windows/Linux,
Projekte ohne UI bitgleich.

## Schnitt-Vorschlag

- **B3b-2a-1 „Kern + API + Skelett“** (≈ 0,3 AT): `render.ts` + Unit-Test, Server-Nachlauf (K1, H3, H4),
  `abnahme-pruefung.mjs` (beide Projektionen, H2, `renderNachweis`) und GET-Feld, Integrationstest im Arbeitsordner,
  Skelett F-1262 (H8), Gate-Vorlage (K2), HERKUNFT.md, Register und F-1271.
- **B3b-2a-2 „Karte“** (≈ 0,15 AT): `abnahme-render.js`, Einbindung ohne Zeilenwachstum, i18n, View-Test,
  Render-Nachweis und design-guardian (K3, K4).

## Pflichtfragen

- Muss das existieren? `render.ts`, `renderNachweisFaellig`, `registriereRenderNachweis`, `abnahme-pruefung.mjs`,
  `abnahme-render.js`, F-1271: ja. Neue `.wert.*`-Schlüssel und `gestartet_am` in der Projektion: nein.
- Einfachste Lösung? Der Plan mit Prädikat wie Löschliste, einem Projektionshelfer, 40 Zeilen Ausgabe-Ende, vorhandenen
  Wertetexten und `note amber`.
- Was kann weg? `gestartet_am`, neue `.wert.*`-Schlüssel, 16 KB je Abfrage, die doppelte Projektion
  (`:8844-8860`), ggf. die Build-Zeile (K2 = a).
