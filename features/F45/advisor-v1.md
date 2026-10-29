# Advisor-Pass F45 V1 Live-Vorschau: Plan v1

**Geprüfter Plan:** `features/F45/plan-v1.md` (Branch `f45/v1-live-vorschau`, Basis main `4a07c1c`)
**Geprüft gegen:** `ARCHITECTURE.md`, `CLAUDE.md`, `public/leitstand/views/dashboard.js`, `public/leitstand/rollen-kreis.js`, `public/leitstand/api.js`, `public/leitstand/projekt-kontext.js`, `public/leitstand/shell.js`, `public/leitstand/views/projekte-uebersicht.js`, `public/leitstand/projekt-aufruf-anzeige.js`, `public/leitstand/produkte-anzeige.js`, `public/leitstand/views/workflows.js`, `public/leitstand/views/workflow-abnahme.js`, `public/leitstand/index.html` (Zeilen 1–563 und Grep über den Rest), `public/leitstand/style.css` (Cockpit- und Container-Abschnitte), `public/leitstand/projekt-wechsel.test.mjs`, `src/projekt-aufruf/index.ts`, `src/projekte/index.ts`, `scripts/check-kette.mjs`, `scripts/ratsche.json`, `docs/architektur/ratsche.md`, `scripts/architektur-kern.json`, `scripts/check-f43-projekt-aufrufen.mjs`, `scripts/check-f813-csrf.mjs`, `scripts/check-f21-ws2-workboard-oberflaeche.mjs`, `scripts/check-f44-i18n.mjs`, `features/F43/feature.md`, `features/F45/feature.md`, `docs/projekt/fixpaket-f45.md`, `docs/design/abgleich-f46.md`, `state/findings.md` (F-1178, F-1129, F-1130, F-371, F-1242, F-1243).

Frischer Kontext (Subagent `architecture-advisor`), 28.10.2026. Wortlaut des Berichts, gespeichert vom Autor des Plans.

**Rollengrenze:** Nur Read, Grep und Glob, kein Bash und kein Git. Einschränkungen:
1. Biome, tsc und `node --test` liefen nicht. Rote Tests (Befund 5), kognitive Komplexität und die Zeilenrechnung (Befund 4) aus dem Quelltext abgeleitet, nicht gemessen.
2. Kein Browser. Verhalten von iframe und CSP (Weiterleitung, `display: contents`, Neuladen über `src`, `loading="lazy"`) aus Spezifikationswissen, entsprechend markiert.
3. Kein `git log`, kein Diff. Merge-Stand W2a–W2d nur aus der Akte und dem mitgelieferten Commit-Kontext.
4. Nicht vollständig durchsucht, ob eine Leitstand-Route projektsteuerbare Inhalte als HTML ausliefert (wichtig für Befund 2).

**Marker:** [Fakt] = mit Datei:Zeile belegt · [Fakt, entlastend] = geprüft und in Ordnung · [Schlussfolgerung] = aus Fakten abgeleitet · [Annahme] = nicht belegt, plausibel · [offene Unsicherheit] = nicht entscheidbar mit diesen Mitteln.

---

## A. Vor Baubeginn zu klären

**1. CSP weicht von E-VORSCHAU-1 ab, ohne dass der Plan es sagt. `'self'` hebelt die eigene Sperre aus.**
- [Fakt] Stefans Entscheidung: „CSP `frame-src` nur die geprüfte localhost-URL“ (`docs/projekt/fixpaket-f45.md:119`, `:189`, `features/F45/feature.md:57`, `state/findings.md:8473`). Plan §3.4 setzt `frame-src 'self' http://localhost:* http://127.0.0.1:*` (`plan-v1.md:80`); unter O1–O7 nicht genannt.
- [Schlussfolgerung] Eine statische meta-CSP kann keine URL je Projekt nennen; der Projektwechsel lädt die Seite nicht neu (`projekt-kontext.js:108–129`), eine gesetzte Policy lässt sich nur verschärfen. Platzhalter technisch begründet, aber als Abweichung zu benennen und von Stefan zu bestätigen.
- [Schlussfolgerung] Variante B: Server sendet beim Ausliefern von `index.html` einen CSP-Header aus den `vorschau_url` des Registers (Registeränderung wirkt ohnehin erst nach Neustart, `projekt-aufruf-anzeige.js:63`, `:68`). Näher an der Entscheidung, aber Serveränderung unter der Wachstumsbremse (`ARCHITECTURE.md:50–56`).
- [Fakt] `'self'` erlaubt, den Leitstand selbst einzubetten — genau das soll §3.1 verhindern. Der Leitstand hat heute keine Frames (nur Kommentar in `scripts/check-f813-csrf.mjs:196`). Empfehlung: `'self'` streichen, egal welche Variante.

**2. „Gleiche Herkunft doppelt gesperrt“ stimmt so nicht — Weiterleitungen umgehen beide Sperren.**
- [Fakt] Der Server verfolgt Weiterleitungen nicht und wertet 302 als erreichbar (`src/projekt-aufruf/index.ts:220–222`; `check-f43-projekt-aufrufen.mjs:457–459`). Der Client prüft nur die eingetragene URL.
- [Schlussfolgerung] Das iframe folgt Weiterleitungen und JS-Navigation; `http://localhost:*` (und `'self'`) lassen den Leitstand-Port zu. Eine Projekt-App kann ihren Frame auf den Leitstand umlenken, der dann mit `allow-scripts allow-same-origin` in derselben Herkunft wie die einbettende Seite läuft.
- [Schlussfolgerung] Folgen begrenzt: im Frame läuft nur Leitstand-Code; dessen POSTs tragen die Leitstand-Origin und passieren den CSRF-Haken (`check-f813-csrf.mjs:194–212`).
- [offene Unsicherheit] Ob eine Leitstand-Route projektsteuerbare Inhalte als HTML ausliefert.
- Abhilfe: (a) als DEKLARIERTES Restrisiko in Plan und Gate-Kopf, oder (b) Header `Content-Security-Policy: frame-ancestors 'none'`/`X-Frame-Options: DENY` vom Server (per meta nicht möglich; Serveränderung).

**3. Muss der Ausklapper existieren? Eher nicht.**
- [Fakt] Schätzung V1 0,3–0,5 AT (`features/F45/feature.md:190`, `fixpaket-f45.md:119`); Plan ohne eigene Schätzung.
- [Schlussfolgerung] Der Ausklapper bringt eigenen Zustand (`detailOffen`, Umschalter mit `aria-expanded`, i18n-Schlüssel, Fokus-ID, Öffnen per Pfeiltaste, Tabpanel mit `hidden`).
- Variante i: Panel immer sichtbar, kompakt unter dem Kreis in Karte b, Tab-Semantik unverändert (`rollen-kreis.js:142`), kein neuer Zustand.
- Variante S: Vorschau als eigener Block in voller Breite unter dem Cockpit, Cockpit unangetastet — weicht von Stefans Platzierung ab.
- [Fakt] Bekommt/Liefert sind im Design-Abgleich als „K“ (kommt, Fixpaket B2) geführt (`docs/design/abgleich-f46.md:121`); Streichen ist eine Designentscheidung über V1 hinaus, für design-guardian und Stefan zu benennen.

**4. Zeilenneutralität `dashboard.js` (≤ 1 035, AK 8) ohne benannten Ausgleich unrealistisch.**
- [Fakt] Ratsche `zeilen: 1035` (`scripts/ratsche.json:44`); über 800 Zeilen zeilenneutral (`docs/architektur/ratsche.md:45`).
- [Schlussfolgerung] Grob: `detailKarte` −31; Ausklapper ≈ +25; Verdrahtung ≈ +15 bis +21; Saldo ≈ +9 bis +15 ⇒ `check-ratsche` (a) rot. Ausgleich benennen: Variante i (≈ −8–9), Dateikopf (63 Zeilen) kürzen (Richtung F-1130, z. B. „Entfallen“ `:33–35`), oder Rendern von Rolle im Detail in ein eigenes Modul.
- [offene Unsicherheit] Genaue Zahlen hängen von der Zeilenführung ab; ob neue Zweige in `initBedienung` die Komplexität 15 reißen (Ist 2).

---

## B. Darf mitlaufen

**5.** [Fakt] `projekt-wechsel.test.mjs:503` und `:1007` prüfen `uebersicht-cockpit`.innerHTML; nach der Aufteilung schreibt `render()` nur `-links`/`-rechts` ⇒ beide rot. Zeilenneutral auf `-rechts` bzw. `-links` umstellen (Datei eingefroren auf 1 161, `ratsche.json:24`).

**6.** [Fakt] `setzeGeruest` ersetzt `#view-dashboard` samt Panel (`dashboard.js:842–850`); `setzeAktivesProjekt` benachrichtigt ohne ID-Vergleich (`projekt-kontext.js:100`, `:122–128`), `projekte-uebersicht.js:559` ruft es auch für dieselbe ID. [Schlussfolgerung] Bei gleicher ID und gleichem Schlüssel schreibt das Panel nichts ⇒ neue Karte bleibt auf dem Gerüst-Text. Lösung: Panel-Cache in `setzeGeruest` zurücksetzen; Unit-Fall „nach Reset wird geschrieben“.

**7. O5:** [Fakt, entlastend] Neue ID beim Projektwechsel ist durch „kein Abruf außerhalb des neuen Präfixes“ schon abgesichert (`projekt-wechsel.test.mjs:283–287`, `:428–432`, `:446–450`). [Schlussfolgerung] „Poll lädt nicht nach“ deckt eine Änderung an `:473` ohne neue Zeile (`|| u.includes('/projekt-aufruf')`). „iframe-Element identisch“ beweist nur ein echtes DOM (DOM-Beleg §3.7); „ein Abruf mit der ID“ gehört in den Unit-Test. Eigenes Schein-DOM kann weg.

**8.** [Schlussfolgerung] Gate (a)/(b) wiederholen die Testtabelle; (d) ist ein Regex über Funktionsrümpfe, bricht bei Umbenennung, per Alias umgehbar. Nur (c) prüft nichts anderes ab — passt in den Test. [Fakt] Tests gelten als Durchsetzung (`ratsche.md:14–15`), `ARCHITECTURE.md:166` verlangt Rot/Grün-Fall; nach E-PRUEF-2 B laufen Tests lokal (`feature.md:78`). Empfehlung: kein neues Gate; sonst (d) auf das Importverbot reduzieren. [offene Unsicherheit] Regel „je Feature ein Gate“ nicht gefunden.

**9.** [Schlussfolgerung] „Nach Neu laden +1 Anfrage“ übersieht die Serverprüfung (`pruefeVorschau` GET, `src/projekt-aufruf/index.ts:220`) ⇒ +2; Anfragen nach User-Agent trennen. „≥ 3 Poll-Ticks unverändert“ richtig.

**10. O2:** [Fakt] Server lässt nur `^http://(localhost|127\.0\.0\.1):([1-9][0-9]{0,4})$` zu (`src/projekte/index.ts:33`), unbekannter Leitstand-Port fail-closed (`:75–80`). Client dieselbe Regel plus „Port ≠ `location.port`“; Tabelle gegen `vorschauPortAus` (Import aus `src/` im Test zulässig, Vorbild `empfehlung-anzeige.test.mjs:14`).

**11.** [Fakt] `vorschauKurzstand` (`produkte-anzeige.js:126–132`) und `entscheiden.abnahme.vorschau.*` decken die Zustände; darauf aufbauen. Hinweise `keineUrl`/`nichtZulaessig` brauchen „danach den Leitstand neu starten“ (`projekt-aufruf-anzeige.js:63`, `:68`). `rel="noopener noreferrer"` wie `workflow-abnahme.js:756`.

**12. O7:** [Fakt] F-1129 (`findings.md:8137`) und F-1130 (`:8146`) haben „Maßnahme: W2“, offen. [Annahme] F-371, F-509 auf der W2-Zeile (`fixpaket-f45.md:118`). W2 auf erledigt nur mit Umhängen dieser Maßnahmen, sonst eigener Buchhaltungs-Commit.

**13.** Delegation „Neu laden“ unklar (Vorschlag: `initBedienung` ruft `vorschau.neuLaden()`); Umschalter braucht feste `id` (Fokus, `dashboard.js:198–207`); iframe läuft nach Projektwechsel im verborgenen `#view-dashboard` im Hintergrund des ganzen Leitstands (`dashboard.js:1029–1034`); [Annahme] per `display: none` verborgene iframes lädt Chrome sofort; „ab 1 060 px“ meint „bis 1 060 px“ (`style.css:6374`); F-1178 Fundstelle korrigieren; `holeProjektAufruf` ohne Zeitlimit — unkritisch (Server 2 s).

**14. O6:** [Fakt] `ARCHITECTURE.md:16` „Jede Regel steht hier als Satz“; Luft 1 074 Bytes. [Fakt, entlastend] Präzedenz: F-849 nicht im Kern. [Schlussfolgerung] Ein Satz (≈ 200–250 Bytes) empfohlen, kein Muss.

---

## C. Entlastend

- E1 [Fakt, entlastend] Rasterregeln nur an `.uebersicht-cockpit`/`.uebersicht-spalte` (`style.css:5470–5480`, `:6374–6382`, `:6413–6428`), keine Kindselektoren; `display: contents` hält a, b, c, d in DOM-Reihenfolge. `setzeBlock` schreibt nur sein Element; `hidden` an `#uebersicht-inhalt` lädt das iframe nicht neu; zerstört nur durch `setzeGeruest` (gewollt).
- E2 [Fakt, entlastend] `render()` lädt nur Nachträge/Beobachtung (`:855–856`); `ladeAlles` nur bei Betreten/Projektwechsel (`:1021`, `:1033`).
- E3 [Fakt, entlastend] `holeProjektAufruf` erfüllt die `hole*`-Regel von f21 (f) (`check-f21-ws2-workboard-oberflaeche.mjs:199–209`).
- E4 [Fakt, entlastend] POSTs von anderem lokalen Port lehnt der Leitstand ab (`check-f813-csrf.mjs:194–201`).
- E5 [Schlussfolgerung, entlastend] `allow-scripts allow-same-origin` für fremde Herkunft kein Ausbruch; `frame-src` per meta gültig; Inline-Theme-Skript unberührt.
- E6 [Fakt, entlastend] O1: geführter erster Schritt führt nach `#/projekt` (`dashboard.js:817`); so lassen.
- E7 [Fakt, entlastend] O4: F-1178 existiert mit genau diesem Inhalt; F-1244 frei.
- E8 [Fakt, entlastend] F-849 sauber; `erreichbar === true` ⇒ „nicht zulässig“ bekommt nie ein iframe.
- E9 [Fakt, entlastend] F43-Nicht-Ziele eingehalten.
- E10 [Fakt, entlastend] Zu entfernende `uebersicht.detail.*` nur in `dashboard.js`; „Start Building“ wörtlich zulässig.
- E11 [Annahme] `iframe.src = url` navigiert auch bei gleichem Wert neu; DOM-Beleg prüft das.

---

## Urteil: Nicht freigegeben

A1 (CSP-Abweichung unbenannt), A2 (Risikoaussage zu stark), A4 (Ratsche rot ohne Ausgleich), A3 (Variante bestimmt den Umfang). Lösbar mit Plan v2 als Delta; der Architekturansatz trägt.

Vor Baubeginn: A1 CSP-Form, `'self'` weg; A2 Weiterleitungen DEKLARIERT oder `frame-ancestors 'none'`; A3 Variante; A4 Zeilenausgleich. Mitlaufen: 5, 6, 9, 10, 11, 13; Kürzung 7, 8; 12 nur mit Umhängen; 14 nach Wahl.

**Schnitt nötig: Nein** — ein einziges prüfbares Artefakt; Vorschau und Umzug von Rolle im Detail nicht trennbar; gekürzt statt geschnitten. Header-Lösung ≈ +0,1 AT, kein Schnitt.

Nächster Schritt: Stefan entscheidet CSP-Form (A1, A2) und Platzierung (A3); danach Plan v2 als Delta. Delta-Advisor nur bei Variante S oder Header-Lösung.
