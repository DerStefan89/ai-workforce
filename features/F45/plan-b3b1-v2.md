# Plan F45 B3b-1 v2 — Design-Prüfkette im Skelett

Basis: `features/F45/plan-b3b1.md` (v1) + Advisor-Pass (frischer Kontext, 29.10.2026): **GO mit Auflagen**, kein Schnitt.
v1 gilt weiter, außer wo hier geändert.

## Auflagen (eingearbeitet)

1. **Typprüfung ohne DOM** (hoch): `render-nachweis.mjs` wird in jedes Projekt kopiert, auch ohne UI. Browser-Code geht
   als String-Ausdruck an `page.evaluate`/`addInitScript` — keine DOM-Typen nötig, `lib` bleibt `["ES2023"]`. Der
   Abschnitt UI-Projekte verlangt kein `"DOM"`. Probelauf prüft beide Skripte unter der unveränderten tsconfig der Vorlage.
2. **Reduzierte Bewegung**: gezählt werden nur Animationen mit `playState !== 'finished'` (vor `pause()`) — das Muster
   `animation-duration: .01ms` + `fill: both` ist kein Fehlalarm.
3. **Übersprungene Ordner** wie `check-dateigroesse.mjs`: `node_modules` und Punkt-Ordner in jeder Tiefe (`.git`,
   `.next`, `.render-nachweis` …), `dist`/`build`/`coverage` an der Wurzel. Eigene Sammelfunktion (kein Umbau der
   bestehenden Datei — Prüfsumme und Test bleiben).
4. **`AUSNAHMEN`-Map** (Pfad → Begründung) wie `check-dateigroesse.mjs`; erlaubte Präludien im Header und in der
   Gate-Vorlage. Tailwind `@theme` / `@layer` nicht erlaubt — Projekt nutzt dann die Ausnahme mit Begründung.
5. **LCP**: bis 3 s auf einen Eintrag warten, erst dann „nicht messbar“ ⇒ rot.
6. Ein Kontext je Variante (frisch, ohne Cache); `transition: none` zählt nicht als Bewegung; Farbfunktionen nur als
   `\bname\(` (kein Treffer in `color-mix(in oklab, …)`).
7. Pfadtest in eigener Datei `scripts/skelett-render-nachweis.test.mjs` (+ `ratsche.json`), Fälle `../`, `%2e%2e/`,
   `..%5c..%5c`, Geschwister `dist-x`; Präfixprüfung mit `ordner + sep`. Haupteinstieg über realpath.
8. Gate-Vorlage: ältere Projekte tragen `check-design-tokens` beim Nachrüsten von Hand in `check` ein.

## Entscheidungen gegen Advisor-Empfehlung (Auftrag geht vor)

- **A — `playwright@1.63.0` exakt**: der Auftrag verlangt es ausdrücklich mit Grund. Umsetzung: `--save-exact`, Satz
  „= installierte Version der Workforce; gleiche Version ⇒ gleiche Browser-Revision, sonst `npx playwright install
  chromium`“. Advisor-Einwand (Regel „Versionen nur in der Paketdatei“, Vorbild `@biomejs/biome@<Version>`) geht als
  Hinweis an Stefan.
- **`url`-Modus und `protokoll.json`**: Advisor „kann weg“, Auftrag verlangt beides ⇒ bleibt (klein; Verbraucher
  `protokoll.json` = B3b-2).

## Bestätigt

B: `render.json` fehlt ⇒ rot, `{}` gültig. C: `dist` übersprungen, Probelauf mit Build-Schritt. D: LCP nicht messbar ⇒
rot (nach Warten). E: Pfadtest bleibt.
