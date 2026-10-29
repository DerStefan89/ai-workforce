# Plan F45 B3b-1 — Design-Prüfkette im Skelett

Auftrag: Challenger 29.10.2026, GO_STANDARD. Branch `feature/f45-b3b1-design-skelett`, Basis main `6874681` (#395).
Ziel: Fremdprojekte aus `vorlagen/projekt-skelett/` bekommen Token-/Bewegungs-Gate in `npm run check`, einen
Render-Nachweis `npm run check:render`, Design-Referenzen als Eingabe und einen aktualisierten design-guardian als
Beispiel. Kein Leitstand-Code, keine Route, kein Lauf-Schritt (B3b-2).

## 1. Dateien

| Pfad | Art | Inhalt |
|---|---|---|
| `vorlagen/projekt-skelett/scripts/check-design-tokens.mjs` | neu | reine Funktion `pruefeCss(dateien)` + `pruefeDesignTokens(wurzel)`, Haupteinstieg wie `check-dateigroesse.mjs` (realpath) |
| `vorlagen/projekt-skelett/scripts/render-nachweis.mjs` | neu | `check:render`, siehe 3 |
| `vorlagen/projekt-skelett/package.json` | ändern | `check`: `… check-dateigroesse.mjs && node scripts/check-design-tokens.mjs && …`; neu `"check:render": "node scripts/render-nachweis.mjs"` |
| `vorlagen/projekt-skelett/docs/harness/gate-vorlage-node.md` | ändern | Tabellenzeile Token-Gate; Abschnitt „UI-Projekte“ |
| `vorlagen/projekt-skelett/docs/examples/design-guardian.example.md` | ändern | Bewegung, Render-Nachweis Pflicht, Token-Gate, 390 px/Zoom 200 %, Referenzen |
| `vorlagen/projekt-skelett/docs/design/referenzen/README.md` | neu | Ablage-Regeln |
| `vorlagen/projekt-skelett/CLAUDE.md` | ändern | ≤ 10 Zeilen netto, nur UI |
| `vorlagen/projekt-skelett/HERKUNFT.md` | ändern | Abschnitt „Nachgezogen in F45 B3b-1“, Abweichungen, Prüfsummen |
| `src/projekt-anlegen/index.ts:434` | ändern | `.gitignore` = `kontrollzustand/\n.render-nachweis/\n` |
| `scripts/check-f41-projekt-anlegen.mjs:343` | ändern | der „passende Test“: erwarteter `.gitignore`-Inhalt (einzige Stelle, die ihn prüft — gesucht über `src`/`scripts`) |
| `scripts/skelett-check-design-tokens.test.mjs` | neu | Verhaltens-Tests (node:test), Muster `skelett-check-dateigroesse.test.mjs` (liegt bewusst nicht im Skelett) |
| `scripts/ratsche.json` | ändern | neue Testdatei in `formatiert` (g3) |
| `docs/projekt/fixpaket-f45.md` | ändern | Zeile B3b → B3b-1/B3b-2, Gestrichen, Reihenfolge-Notiz |
| `state/findings.md` | ändern | F-1253…F-1259 neu; F-1076, F-911, F-1059, F-1058 |
| `features/F45/nachweise/b3b1/` | neu | `nachweis.md`, `protokoll.md`, wenige WebP |

## 2. check-design-tokens.mjs

- Dateien: alle `*.css` rekursiv; übersprungen `node_modules`, `.git`, `.render-nachweis` (jede Tiefe) und `dist`
  (an der Wurzel, wie `check-dateigroesse` — erzeugte Ausgabe). Symlinks nicht verfolgt.
- Je Datei: (1) Anzahl `/*` ≠ Anzahl `*/` ⇒ Befund, Datei sonst nicht weiter geprüft. (2) Kommentare, Strings und
  `url(…)` entfernen. (3) Kleiner Klammer-Scanner: Stapel der Block-Präludien; je Deklaration (`;`/`}`-getrennt) Farbliterale
  suchen: Hex `#` mit 3/4/6/8 Hex-Ziffern, Funktionen `rgb rgba hsl hsla hwb lab lch oklab oklch color` (Groß/klein egal).
  Erlaubt nur, wenn die Deklaration `--name:` ist UND der Stapel genau `[:root-Selektor]` oder
  `[@media (prefers-color-scheme: …), :root-Selektor]` ist. `:root-Selektor` = Kommaliste aus `:root`, `:root[data-theme…]`,
  `:root:not([data-theme…])` (letzteres ist das übliche Muster „dunkel, außer hell erzwungen“). Befund mit Datei:Zeile.
- Bewegung: kommt in irgendeiner Datei `@keyframes`, eine Eigenschaft `animation…` oder `transition…` vor ⇒ mindestens
  ein `@media (prefers-reduced-motion: reduce)` in irgendeiner Datei, sonst Befund.
- Keine CSS-Datei ⇒ grün „kein UI“. Exit 1 bei Befund.
- Bekannte Grenzen (in Datei-Header): benannte Farben (`red`) nicht erkannt; Farben in HTML-`style`, JS, SVG nicht
  geprüft; `/*` in Strings zählt mit; CSS-in-JS/Präprozessoren (`.scss`) nicht. Ziel ist die häufigste Drift, kein Parser.

## 3. render-nachweis.mjs (`npm run check:render`, nicht in `check`)

- `render.json` fehlt ⇒ rot mit Verweis auf Gate-Vorlage (bewusste Entscheidung des Projekts, welche Seiten zählen).
  Felder: `ordner` (Standard `dist`, relativ, innerhalb der Wurzel) ODER `url` (`^http://(127.0.0.1|localhost)(:port)?/`;
  beides ⇒ rot); `seiten` (Standard `["/"]`); `bildfolgeMs` (Standard `[0,150,400,1000]`); `budget` (`lcpMs` 2500,
  `bytes` 1 000 000). Ungültige Werte ⇒ rot.
- `ordner`: `node:http` auf 127.0.0.1, Port 0 (Zufall), nur GET (sonst 405), Pfad dekodiert + `resolve` + Präfixprüfung
  gegen den Ordner (sonst 403), Ordner ⇒ `index.html`, kleine MIME-Tabelle. `finally`: Server und Browser schließen.
- `playwright` dynamisch (`await import(name)`); fehlt es ⇒ Exit 1 „npm i -D playwright@… — Gate-Vorlage Abschnitt
  UI-Projekte“. Typen: kleine JSDoc-typedefs nur für die genutzten Methoden (kein `any`, tsc auch ohne playwright grün).
- Je Seite fünf Varianten (neue Seite je Variante, `emulateMedia` vor `goto`, `waitUntil: 'load'`):
  `desktop-hell` 1440×900 light · `desktop-dunkel` dark · `mobil-hell` 390×844 light · `reduziert` 1440×900 reducedMotion
  reduce · `zoom-200` 720×450 bei deviceScaleFactor 2 (wie Workforce `scripts/render-nachweis.mjs` F-867).
- Messung in `desktop-hell` VOR dem Anhalten: LCP über `addInitScript` (PerformanceObserver `largest-contentful-paint`,
  `buffered: true`) und Bytes = `transferSize` von navigation + allen resource-Einträgen. Kein LCP-Eintrag ⇒ rot
  („nicht messbar“ — nicht gemessen ist nicht grün).
- Bildfolge (`desktop-hell`, `reduziert`): je Zeitpunkt `getAnimations()`, `pause()`, `currentTime = ms`, Bild;
  Zahl der Animationen ins Protokoll. Übrige Varianten: ein Bild beim letzten Zeitpunkt.
- Rot bei: Animationen > 0 in `reduziert`; `scrollWidth > clientWidth` in `mobil-hell`; LCP > `lcpMs`; Bytes > `bytes`.
- Ausgabe `.render-nachweis/` (vorher `rmSync`): PNGs `<seite>-<variante>[-<ms>ms].png`, `protokoll.md` (Tabelle
  Seite/Variante/Bilder/Animationen/Überlauf/LCP/Bytes + Befunde + Ergebnis), `protokoll.json`. Nur relative Namen und
  Seitenpfade, nie der Ordnerpfad oder der Zufallsport.
- Grenzen (Header + F-1255): kein Dev-Server/SSR-Start; rAF-/GSAP-Animationen sieht `getAnimations()` nicht; fertige
  Animationen ohne `fill` zählen nicht; LCP gegen localhost misst Renderzeit, nicht Netz; `transferSize` cross-origin
  ohne `Timing-Allow-Origin` = 0.
- Grenzen des Codes: ≤ 800 Zeilen (Ziel < 300), Funktionen Komplexität ≤ 15, Biome-formatiert nach Gate-Vorlage, unter
  deren `tsconfig` (checkJs) fehlerfrei — dafür braucht `lib` `"DOM"` (Callbacks in `page.evaluate`); die Gate-Vorlage
  nennt das im Abschnitt UI-Projekte.

## 4. Doku

- Gate-Vorlage: Tabellenzeile „Design-Tokens | `node scripts/check-design-tokens.mjs` | Farbliteral außerhalb Token-Block,
  Bewegung ohne reduced-motion, offener Kommentar“. Abschnitt „UI-Projekte“: `npm i -D playwright@1.63.0` (exakt — der
  Chromium im vorhandenen Browser-Cache passt dazu, kein Download), `lib` + `"DOM"`, `.gitignore` + `.render-nachweis/`
  (alte Projekte), render.json-Beispiel + Budget, `npm run check:render` vor „fertig“.
  Spannung: Die Vorlage sagt sonst „Versionen nur in der Paketdatei“. Der Auftrag verlangt die exakte Version mit Grund;
  sie steht im Befehlsblock, nicht in Prosa, und nicht in CLAUDE.md/ARCHITECTURE.md (check-docs Prüfung 2 scannt nur
  diese). → Advisor-Frage A.
- design-guardian-Beispiel, Referenzen-README, CLAUDE.md wie Auftrag 5–7.

## 5. Tests (`scripts/skelett-check-design-tokens.test.mjs`)

Grün: Tokens in `:root`, in `:root[data-theme=dark]`, in `@media (prefers-color-scheme: dark) { :root:not(…) }`,
Verwendung `var(--x)`; Animation mit reduced-motion-Block (andere Datei); keine CSS-Datei ⇒ „kein UI“; Hex in Kommentar,
String, `url()`; `dist/` und `node_modules/` übersprungen. Rot: Literal außerhalb `:root` (Hex und `oklch()`), Literal
in `:root` ohne `--`, Animation/transition ohne reduced-motion, offener Kommentar. Dazu ein Test für die Pfadprüfung des
Servers (`loeseDateiPfad`: `../` und `%2e%2e/` ⇒ abgelehnt) — Sicherheitseigenschaft, drei Zeilen.

## 6. Probelauf (Wegwerf-Kopie unter `os.tmpdir()`)

Skelett kopieren, `git init`; Mini-Seite: Quelle `src/index.html` + `src/style.css` (Tokens hell/dunkel, Einblend-
Animation `fill: both`, reduced-motion-Block), `build` kopiert nach `dist/` — weil das Token-Gate `dist/` als erzeugte
Ausgabe überspringt (Auftrag sagt „Mini-Seite in dist/“: liegt dort, aber als Build-Ergebnis). `render.json` mit
`seiten ["/"]`. `npm i -D playwright@1.63.0`. Läufe: Token-Gate grün; rot (Literal außerhalb `:root`); rot (Animation
ohne reduced-motion); `check:render` grün; rot (großes Bild > 1 MB). Zusätzlich: beide Skripte unter biome.json/tsconfig
der Gate-Vorlage (Workforce-Biome/tsc) geprüft. Nachweis nach `features/F45/nachweise/b3b1/`.

## 7. Prüfung

lint, typecheck, test, Lagebild, `check-skelett-herkunft`, `check-ratsche`, Probelauf. Kein voller Gate-Lauf.

## 8. Fragen an den Advisor

A. Version `playwright@1.63.0` exakt in der Gate-Vorlage — tragbar gegen die Regel „Versionen nur in der Paketdatei“?
B. `render.json` fehlt ⇒ rot (statt still Standardwerte) — richtig?
C. `dist/` im Token-Gate überspringen und Probelauf mit Build-Schritt — oder `dist/` prüfen, wenn keine andere CSS liegt?
D. LCP nicht messbar ⇒ rot — zu streng?
E. Test für die Pfadprüfung — nötig oder weg?
