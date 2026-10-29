# Nachweis F45 B3b-1 — Probelauf Design-Prüfkette im Skelett

Datum: 29.10.2026. Plan: `features/F45/plan-b3b1-v2.md`. Ort: Wegwerf-Ordner unter `os.tmpdir()` (Kopie von
`vorlagen/projekt-skelett/` ohne `HERKUNFT.md`, `git init`), danach nicht weiter verwendet.

## Aufbau

- Mini-Seite als Quelle in `src/` (`index.html`, `style.css`): Farb-Tokens in `:root` und
  `@media (prefers-color-scheme: dark) { :root { … } }`, Dauer/Easing als Tokens, Einblend-Animation (`opacity`,
  `transform`, `fill: both`) auf Überschrift und Absatz, `@media (prefers-reduced-motion: reduce)` schaltet sie ab.
- Build = Kopie `src/` → `dist/` (das Token-Gate prüft die Quelle; `dist/` überspringt es als erzeugte Ausgabe).
- `render.json`: `{ "ordner": "dist", "seiten": ["/"] }` (Bildfolge und Budget = Standard).
- `npm i -D --save-exact playwright@1.63.0` — Chromium aus dem vorhandenen Browser-Cache, kein Download.
- Zusätzlich `@biomejs/biome`, `typescript`, `@types/node` in den Versionen der Workforce, `biome.json` und
  `tsconfig.json` wörtlich aus der Gate-Vorlage (ohne `"DOM"` in `lib`).

## Ergebnisse

| Lauf | Befehl | Erwartet | Ergebnis |
|---|---|---|---|
| Token-Gate grün | `node scripts/check-design-tokens.mjs` | Exit 0 | Exit 0, „1 CSS-Datei(en) ohne Befund“ |
| Token-Gate rot 1 | `.knopf { background: #c00; }` angehängt | Exit 1, Datei:Zeile | Exit 1, `src/style.css:43: Farbliteral in „background“ außerhalb eines Token-Blocks …` |
| Token-Gate rot 2 | reduced-motion-Block entfernt | Exit 1 | Exit 1, „Bewegung (@keyframes, animation, transition) ohne @media (prefers-reduced-motion: reduce) …“ |
| Render grün | `npm run check:render` | Exit 0 | Exit 0, 5 Ansichten, 14 Bilder, Protokoll `protokoll.md` (hier) |
| Render rot Budget | `dist/gross.png` (Rauschbild 3,4 MB) eingebunden | Exit 1, Budget | Exit 1: `/ (reduziert): 3443979 Bytes > 1000000`, dazu `/ (mobil-hell): waagerechter Überlauf` (Bild 400 px + Rand bei 390 px — echter Fund, nicht geplant) |
| Lint Gate-Vorlage | `npx biome check --error-on-warnings .` | Exit 0 | Exit 0 (nach Formatierung und zwei Aufteilungen wegen Komplexität) |
| Typprüfung Gate-Vorlage | `npx tsc --noEmit` (ohne DOM) | Exit 0 | Exit 0 |
| Harness | `npm run check:template`, `check-dateigroesse` | Exit 0 | Exit 0 |

Protokolle (`protokoll.md`, `protokoll.json`) beider Läufe ohne absolute Pfade und ohne Port (geprüft per Suche nach
Laufwerk, `Users`, `AppData`, `Temp`, `127.0.0.1`: 0 Treffer).

## Befund im Probelauf: LCP bei Einblendung

Der erste grüne Lauf war rot: „LCP nicht messbar“. Gegenprobe mit zwei Seiten im selben Browser: ohne Animation
LCP 36 ms; dieselbe Überschrift mit Einblendung aus `opacity: 0` → kein LCP-Eintrag, auch nach 3 s und auch, wenn die
Animation auf ihr Ende gestellt wird. Folge: LCP und Bytes misst jetzt die Variante „reduziert“ (dort ist die
Einblendung aus) — gemessen wird die Lade- und Renderzeit, nicht die Animationsdauer. Datei-Kopf von
`scripts/render-nachweis.mjs`, Gate-Vorlage und F-1255 nennen das.

## Korrekturrunde (nach code-reviewer und qa)

Gleiche Wegwerf-Kopie, endgültiger Code. Lint und Typprüfung unter der Gate-Vorlage erneut grün, Token-Gate und
`check:template` grün.

| Lauf | Ergebnis |
|---|---|
| Render grün (endgültig) | Exit 0, Spalte HTTP 200, Protokoll `protokoll.md` (hier) |
| Render rot Budget (endgültig) | Exit 1: Bytes 3443979 > 1000000, Überlauf bei 390 px |
| `seiten: ["/", "/fehlt.html"]` | Exit 1: `/fehlt.html (…): Seite liefert HTTP 404` in allen fünf Varianten (vorher: irreführend „LCP nicht messbar“) |
| `seiten: ["//beispiel.de/"]` | Exit 1: `render.json: "seiten" (Pfade mit /) ungültig` — kein Aufruf eines fremden Hosts |
| Reset-Muster `animation-duration: 0.01ms !important` unter reduziert, vor der Korrektur, 3× | 3× „2 laufend“, d. h. ein stabiler Fehlalarm (direkt nach `load` noch nicht gezeichnet) |
| dasselbe, nach der Korrektur (zwei Frames abwarten), 3× | 3× „0 laufend“; dafür meldet Chromium dort weder LCP noch FCP (nur `first-paint`), also bleibt das Ergebnis rot mit dem Hinweis „mit animation: none abschalten“ (Entscheidung offen, siehe Bericht) |
| Gegenprobe: reduce-Block ohne Wirkung | Exit 1: `2 Animation(en) laufen trotz „Bewegung reduzieren“` |

## Bilder (WebP, verkleinert)

- `start-desktop-hell-0ms.webp` — Bildfolge bei 0 ms: Text fast unsichtbar und versetzt (Start der Einblendung; ganz
  leicht sichtbar; Ursache nicht untersucht, die Bildfolge zeigt den Ablauf trotzdem).
- `start-desktop-hell-1000ms.webp` — bei 1000 ms: voll sichtbar.
- `start-reduziert-0ms.webp` — „Bewegung reduzieren“ bei 0 ms: sofort voll sichtbar, 0 Animationen.
- `start-desktop-dunkel.webp` — Dunkel-Tokens greifen.
