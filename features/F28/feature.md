# F28 — Persona v1

## ID
F28

## Titel
Persona v1 (SVG-Grundlage WS-1, bildbasierte Persona WS-2 — vier abgeleitete Zustände, Kopfzeile + Chat-View)

## Status
Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

Von FEATURE_GATE auf ABGESCHLOSSEN (18.09.2026): der im WS-2-Bericht als
fehlend vermerkte echte Browser-Blick ist am selben Tag durch Stefan real
erfolgt (Kopfzeile und `#/chat` angesehen, Richtung bestätigt) — die einzige
Einschränkung, die den Status zuvor auf FEATURE_GATE gehalten hat, ist damit
aufgelöst, nicht offen geblieben.

## Ziel
Der Leitstand bekommt ein sichtbares Identitätselement — eine Persona, deren
Ausdruck sich rein mechanisch aus dem ohnehin gepollten Zustands-Aggregat
ableitet (kein eigener Datenabruf, kein Fach-Zustand, der nicht bereits im
Leitstand existiert). Charakter: ruhige, überlegene Intelligenz, glühend rot
bis rot-orange Augen, scharf/aufmerksam — nicht Horror, nicht niedlich. Die
Persona ist EIN wiederverwendbares Modul mit variabler Größe: klein
("badge") in der Kopfzeile, groß ("gross") in der Chat-View. Der Leitstand
selbst bleibt hell — nur die Persona ist eine "dunkle Insel" (Entscheidung
Stefan, 18.09.2026).

## Nicht-Ziele
- Ein Dark-Mode der übrigen Shell.
- Risse/Rauch/violette Energie als eigene, animierte Bildelemente — laut
  Auftrag ausdrücklich NICHT Teil von WS-1 (bei 2,5rem unsichtbar) und in
  WS-2 im Bild bereits eingebacken statt nachgezeichnet.
- Ein zweiter aria-live-Bereich für die große Variante — #persona-text-status
  bleibt die einzige Quelle für beide Varianten.
- Ein eigener Daten-Poll-Timer — die Persona abonniert ausschließlich
  zustand.js' bestehenden Timer.
- Mount-/Unmount-Lifecycle je View — der Router versteckt Views nur, beide
  Persona-Instanzen werden einmalig beim Bootstrap montiert.

## Workstreams
- WS-1 — Persona-Modul (SVG-Grundlage), Zustandsableitung, Header-Einbau. **Erledigt** (siehe unten).
- WS-2 — Bildbasierte Persona (persona-gesicht.webp), zwei Varianten aus einem Modul, Chat-View-Einbau. **Erledigt** (siehe unten).

## Akzeptanzkriterien WS-1
- AK1 `public/leitstand/persona-state.js`: `leitePersonaZustandAb(zustand)` — reine Funktion, liefert `'idle' | 'thinking' | 'waiting_for_human' | 'error'`, Priorität strikt `error > waiting_for_human > thinking > idle`. Nutzt `filtereAttentionWorkflows`/`filtereAttentionLaeufe` aus `attention-daten.js` (keine Duplikation der Filterregeln). Wirft nie bei null-Quellen (defekte Quelle liefert `null`, Muster `sammleZustandsQuelle`).
- AK2 `scripts/leitstand-server.mjs`, `GET /api/zustand`: additiv um `aktiverLauf: { aktiv, laufId }` aus dem bereits vorhandenen `globalerLaufZustand` erweitert (F-437) — `stelleLaufstatusFest` kennt nur `KLAERUNG_ERFORDERLICH | ABGESCHLOSSEN | NICHT_GESTARTET`, ein laufender Lauf wäre sonst nicht von einem nie gestarteten unterscheidbar. Keine neue Projektion, kein neuer Endpunkt, bestehende Felder unverändert.
- AK3 `public/leitstand/persona.js`: baut das Inline-SVG (zwei Augen, Lider, Pupillen), montiert es in `#persona-platzhalter`, abonniert `zustand.js` (`abonniere()`), setzt `data-persona-zustand`. Kein eigener Daten-Poll-Timer (Blinzeln/Cursor-Folge sind rein visuelle, I/O-freie Mechanismen, im Kopfkommentar begründet).
- AK4 `public/leitstand/style.css`: neue Tokens im `:root`-Block (`--persona-grund`, `--persona-iris-ruhig`, `--persona-iris-aktiv`, `--persona-glow`, `--persona-warten`, `--persona-fehler`, `--persona-groesse`). Keine Farbliterale außerhalb des `:root`-Blocks, auch nicht im SVG.
- AK5 `#persona-platzhalter` bleibt `aria-hidden="true"`; eigenes, neues `#persona-text-status`-Element mit `aria-live="polite"` und deutschem Klartext je Zustand.
- AK6 `prefers-reduced-motion` respektiert (Zustand nur über Farbe), zusätzlich ein sichtbarer Schalter, Präferenz in `localStorage` (F-439, Konvention gegenüber `projekt-kontext.js` im Kopfkommentar begründet).
- AK7 Gate `scripts/check-f28-persona.mjs` neu, in `npm run check` eingehängt: keine Farbliterale in `persona.js`/`persona-state.js`/`index.html`; `leitePersonaZustandAb` kalibriert (vier Zustände, null-Quellen, Prioritätskollision).

## Akzeptanzkriterien WS-2
- AK8 `scripts/leitstand-server.mjs`, `CONTENT_TYPES`: `.webp` → `image/webp` ergänzt (Blocker aus dem Auftrag — ohne diesen Eintrag liefert `sendeDatei` `application/octet-stream`, der Browser zeigt nichts). `sendeDatei` liest bereits binärsicher, unverändert.
- AK9 `public/leitstand/persona.js`: `montierePersona(host, variante)` mit `variante` `'badge' | 'gross'`, beide aus demselben Bild (`public/leitstand/persona-gesicht.webp`, von Stefan bereitgestellt). `'badge'` (`#persona-platzhalter`, 2,5rem): Bild per `object-fit: cover` + `object-position`/`transform: scale()` auf die Augenregion gezoomt, KEIN SVG-Augen-Overlay, KEIN Pupillenversatz (bei dieser Größe unsichtbar). `'gross'` (`#persona-gross`, neuer Container am Anfang von `#view-chat`, über `#chat-verlauf`, zentriert, max. 240px über `--persona-groesse`-Override): volles Bild + SVG-Overlay. Beide werden beim Bootstrap montiert und von DERSELBEN `abonniere()`-Registrierung versorgt — kein Mount-/Unmount-Lifecycle, da der Router Views nur versteckt.
- AK10 Zustandsausdruck läuft über eine Tint-Schicht (`mix-blend-mode`, Farbe aus `--persona-*`-Token, opacity pulsiert je Zustand) plus einen statischen `brightness()/saturate()`-Filter auf dem Basisbild — Risse/Gesichtsform sind im Bild eingebacken, werden nicht nachgezeichnet.
- AK11 SVG-Overlay nur für `'gross'` (`viewBox="0 0 100 100"`, `preserveAspectRatio="none"`), zeichnet ausschließlich den weißglühenden Augenkern über den im Bild vorhandenen Augen; der Kern darf per Cursor-Folge (≤ 6px, in viewBox-Einheiten umgerechnet) driften, die dunkle Augenhöhle des Bildes bleibt stehen.
- AK12 Blinzeln für beide Varianten über eine gemeinsame dunkle Lid-Schicht (`--persona-grund`), `scaleY(0)` → `scaleY(1)`, Zufallsintervall 3–7s, Cleanup per `setTimeout` (nicht `animationend` — QA-Befund WS-1, feuert nie bei unterdrückter Animation).
- AK13 Performance: Endlosanimationen animieren ausschließlich `opacity`/`transform`, kein animiertes `filter: blur()`, kein `feTurbulence`.
- AK14 ARIA/reduced motion unverändert gegenüber WS-1 für beide Varianten: Bild dekorativ (`alt=""`), beide Hosts `aria-hidden="true"`, `#persona-text-status` bleibt einzige `aria-live`-Quelle, doppeltes reduced-motion-Gate (Media Query + Schalter) weiterhin auf `.persona-host` (statt nur `#persona-platzhalter`).
- AK15 Gate `scripts/check-f28-persona.mjs` um Teil (3) erweitert: `CONTENT_TYPES` enthält `.webp` UND `persona-gesicht.webp` existiert — real gegen einen isolierten Testserver geprüft (Content-Type `image/webp`, Status 200), Rot-Fall-kalibriert gegen eine bewusst unregistrierte Endung (muss auf `application/octet-stream` zurückfallen).

## Dependencies
- F20 — Jarvis Shell v1 (`GET /api/zustand`-Aggregat, `#persona-platzhalter`-Platzhalter, `#shell-kopf`), auf dessen bestehendem Poll F28 ausschließlich aufsetzt (`abonniere()`), kein zweiter Timer.
- F21 — Workboard + Attention v1 (`attention-daten.js`, `filtereAttentionWorkflows`/`filtereAttentionLaeufe`), deren Filterregeln `persona-state.js` importiert statt dupliziert.
- F1B — Wirkungsmarke/Checkpoint-Store (`stelleLaufstatusFest`), dessen bekannte Grenze (kein laufender-Lauf-Zustand) F-437 löst.

## Betroffene Primitive
`GET /api/zustand` (additiv `aktiverLauf`), `CONTENT_TYPES` (additiv `.webp`), Design-Tokens (`:root`-Block style.css), `#shell-kopf`, `#view-chat`.

## Risiken
Augenkoordinaten (WS-2 AK11) sind am Bild manuell ermittelt und können bei einem künftigen Bildaustausch daneben sitzen — dokumentiert im Kopfkommentar von `persona.js`, keine automatische Bilderkennung (Nicht-Ziel). Badge-Zoomfaktor (`scale(2.2)`) ist visuell geschätzt, nicht gemessen.

## Bekannte Grenzen
- Die Augenkoordinaten (`AUGENKOORDINATEN` in `persona.js`) und der Badge-Zoomfaktor (`--persona-badge-zoom`) sind visuelle Schätzwerte (Auftrag: "visuell feinjustieren, falls es daneben sitzt") — kein Automatisierungswerkzeug hat sie gegen einen Screenshot vermessen. Stefan hat die Richtung am 18.09.2026 real im Browser bestätigt (siehe Feature Review); eine Nachschärfung der exakten Werte bleibt bei Bedarf eine spätere, kleine Iteration, kein offener Blocker.
- `state/findings.md` F-438 (Farbliteral-Gate deckt nur `style.css`/die drei F28-Persona-Dateien ab, nicht JS-Dateien projektweit) bleibt bewusst offen — F28s eigenes Gate mitigiert nur den eigenen Zuschnitt.

## Feature Review
WS-1: `code-reviewer`- und `qa`-Pass mit frischem Kontext durchgeführt
(18.09.2026). `code-reviewer`: Freigegeben, keine kritischen Befunde. `qa`:
Freigegeben mit Hinweisen (vier niedrigschwerige Befunde — irreführendes
Schalter-Label bei aktiver OS-Präferenz, Klassen-Leak bei unterdrückter
Animation, fehlender Gate-Fall für komplett fehlendes `aktiverLauf`-Feld,
Doku-Drift in `zustand.js`) — alle vier behoben, `npm run check` danach
erneut grün (557 Tests).

WS-2: zwei Review-Runden. Erste Runde (`code-reviewer` + `qa`, je frischer
Kontext, 18.09.2026): `qa` Freigegeben mit Hinweisen, `code-reviewer` **Nicht
freigegeben** — zwei kritische, übereinstimmend gefundene CSS/DOM-Geometrie-
Befunde: (1) das Augenkern-Overlay ('gross') wurde im DOM NACH der
Lid-Schicht eingehängt und lag dadurch im Stapelkontext darüber — der
glühende Augenkern blieb beim Blinzeln sichtbar statt vom Lid verdeckt zu
werden; (2) `.persona-lid-bild` ist ein unskaliertes Geschwisterelement von
`.persona-bild`, dessen badge-Zoom (`transform: scale(2.2)` um
`transform-origin 50%/40%`) die sichtbare Augenposition verschiebt, ohne
dass die unveränderte Lid-Geometrie mitzieht. Beide behoben: `persona.js`
hängt die Lid-Schicht jetzt IMMER zuletzt ein (feste Reihenfolge
Bild+Tint → Overlay (nur 'gross') → Lid); `style.css` bekam eine
badge-spezifische `.persona-host-badge .persona-lid-bild`-Regel, deren Werte
aus der Transform-Formel `R = o + s·(L−o)` hergeleitet und im Kommentar
dokumentiert sind (inkl. Warnung: ändert sich Zoomfaktor/Anker, muss das Band
neu berechnet werden). Zweite, gezielte Nachprüfung (`code-reviewer`,
frischer Kontext, nur die zwei Fixes): Freigegeben — Einhängereihenfolge für
beide Varianten korrekt, Geometrie-Rechnung nachgerechnet und bestätigt,
keine neuen Befunde, kein toter Code. `npm run check` danach erneut grün
(557 Tests, inkl. erweitertem `check-f28-persona.mjs` Teil 3).

Automatisierte Live-Verifikation blieb eingeschränkt: kein
Browser-Automatisierungswerkzeug in dieser Umgebung verfügbar — Nachweis
stattdessen über (a) Syntax-Check beider JS-Module, (b) einen real gegen
einen isolierten, frisch gestarteten Testserver laufenden HTTP-Roundtrip
(Content-Type `image/webp`, Status 200, Rot-Fall-Kalibrierung gegen eine
unregistrierte Endung), (c) einen Curl-Abgleich gegen einen bereits
laufenden, projektfremden Leitstand-Prozess, der bestätigt, dass dessen
statische Auslieferung (liest bei jedem Request frisch von der Platte) den
aktuellen `persona.js`-Inhalt zeigt, (d) eine von zwei unabhängigen
Review-Läufen bestätigte, rechnerische Herleitung der Zuschnitts-/
Lid-Geometrie. Die fehlende Pixel-Kontrolle ist damit erledigt: Stefan hat
das Ergebnis am 18.09.2026 real im Browser gesehen (Kopfzeile, `#/chat`) und
die Richtung bestätigt — Status deshalb `ABGESCHLOSSEN`.

**Nachzug (18.09.2026, vor git-flow):** Badge-Zoomfaktor und vertikaler
Anker waren in `.persona-bild` und in der davon abgeleiteten
`.persona-lid-bild`-Regel als getrennt gepflegte Literale/von Hand
ausgerechnete Prozentwerte geführt — zwei neue Tokens
(`--persona-badge-zoom`, `--persona-badge-anker-y`) plus `calc()` in der
Lid-Regel leiten das Band jetzt live aus denselben zwei Werten ab (Formel
unverändert, `R = o + s·(L−o)`, `L` 34 %/48 %). Kein Verhaltensunterschied
beabsichtigt — rechnerisch weiterhin ≈ 26,8 %/≈ 30,8 %, `npm run check`
danach erneut grün.
