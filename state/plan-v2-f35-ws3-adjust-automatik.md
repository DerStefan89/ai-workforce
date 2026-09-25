# Plan v2 — F35 WS-3 „ADJUST-Automatik"

Delta zu `state/plan-v1-f35-ws3-adjust-automatik.md` nach Advisor-Pass
(Urteil: Freigegeben mit Hinweisen — voller Bericht dort nicht dupliziert,
nur die eingearbeiteten Korrekturen). v1 bleibt unverändert stehen.

## Eingearbeitet (vor Umsetzungsbeginn verlangt)

**OP2 gelöst — kein dritter Lesevorgang.** Der bestehende
`akVerstoesse`-Block (`scripts/leitstand-server.mjs:4493-4498`) lädt
`laufakteVersion`/`geparstFuerAk` bereits unter GENAU denselben
Vorbedingungen wie der neue Hook. Fix: `let befunde` eine Ebene höher
deklarieren (neben `let akVerstoesse`, vor dem `if`-Block), im Block
zusätzlich `befunde = geparstFuerAk?.befunde ?? []` zuweisen. Der Hook
liest `befunde` direkt aus dieser Closure-Variable — kein zusätzlicher
`ladeArtefaktVersion`-Aufruf, keine Erweiterung der FACHLICHEN
Verantwortung des Blocks (er berechnet weiterhin nur, was er ohnehin schon
geladen hatte, gibt nur ein zusätzliches bereits vorhandenes Feld nach
außen).

**OP3 gelöst — Code-Schnipsel korrigiert.** `wendeAutomatischeAnpassungAn`
bekommt NUR `workflowId` (nicht `workflowVersion`/`ausfuehrungSchritt` aus
der veralteten Closure `workflowDaten`). Sie lädt intern frisch — exakt das
Muster des menschlichen POST-Handlers (`ladeArtefaktVersion('workflow-<id>')`
unmittelbar vor dem Schreiben, `scripts/leitstand-server.mjs:7615`) — und
findet `ausfuehrungSchritt`/`reviewSchritt` über die injizierten
`findeAusfuehrungsSchritt`/`findeReviewSchritt` auf der frisch geladenen
Fassung. Finale Signatur:

```js
wendeAutomatischeAnpassungAn(
  { schreibeWorkflowFortschritt, workflowStatusZuAusgang, beschreibeAutomatAusgang, findeAusfuehrungsSchritt, findeReviewSchritt },
  { workflowId, begruendung, erzeuger, profilReferenz, ladeOptionen }
)
```

`ermittleNaechstenSchritt`, `registriereKernArtefakt`,
`validiereEntscheidungsDaten` werden DIREKT aus `src/` importiert (nicht
injiziert) — Regel: injiziert wird nur, was ausschließlich server-lokal
existiert (`leitstand-server.mjs`, closure-frei); importiert wird, was
bereits unabhängig aus `src/` verfügbar ist (Advisor-Befund 18/19, OP5).
Fünf server-lokale Funktionen werden injiziert:
`schreibeWorkflowFortschritt`, `workflowStatusZuAusgang`,
`beschreibeAutomatAusgang`, `findeAusfuehrungsSchritt`,
`findeReviewSchritt`.

Innen: `ladeArtefaktVersion('workflow-<id>')` → 404-artiges
`{ ok:false, grund }` wenn `null`; `findeAusfuehrungsSchritt`/
`findeReviewSchritt` auf der geladenen Fassung; wenn
`ausfuehrungSchritt === null || ausfuehrungSchritt.lauf_id === null` →
`{ ok:false, grund }` (Muster POST-Handler Zeile 7668-7672 — beim
Automaten-Aufrufer strukturell unerreichbar, weil der Hook nur nach einem
gerade erfolgreich gelaufenen Review feuert, dessen Vorschritt zwangsläufig
gelaufen ist, aber die Prüfung bleibt als Tiefenverteidigung, HEUTE
UNERREICHBAR-Stil wie OP1). Rest wie v1 Abschnitt 2: `bezug`,
`abgenommeneVersion`, `abnahmeDaten` (`ergebnis: 'ANPASSUNG_ANGEFORDERT'`
fest), validieren, `registriereKernArtefakt` mit `herkunft: { erzeuger,
schritt: 'entscheidung-workflow-abnahme' }`, danach
`schreibeWorkflowFortschritt`-Reset (identischer Callback wie im
bisherigen POST-Handler-Block).

**AK4-Abhängigkeit dokumentiert (Advisor-Befund 25).** Der Hook-Kommentar
in `starteWorkflowSchritt` hält ausdrücklich fest: "Der Automat startet
NIE `starteWorkflowSchritt` selbst — `wendeAutomatischeAnpassungAn`
schreibt nur einen zurückgesetzten Zustand, dieselbe Konstruktion wie der
menschliche `ANPASSUNG_ANGEFORDERT`-Pfad. Dass daraus tatsächlich
`WARTET_FREIGABE` statt eines unbemerkt bei `LAEUFT` steckenbleibenden
Workflows entsteht, hängt an `freigabe: 'ZWINGEND'` am Ausführungsschritt
der Vorlage (`workflow-vorlagen/standard.json`/`hoch.json`) — dieselbe
externe Abhängigkeit wie beim menschlichen Pfad (AK24-Kommentar oben,
Zeile 7788-7793), von WS-3 nicht neu eingeführt, hier nur ein zweites Mal
benannt, damit sie nicht nur an einer Stelle im Code steht."

## Mitlaufende Entscheidungen (bewusst, nicht stillschweigend)

- **OP1:** die D13-Prüfung im Hook (`!laufAktiv &&
  !globalerLaufZustand.aktiv`) bleibt stehen, strukturell immer wahr
  (Advisor-Befund 1/2 bestätigt), Kommentar im „HEUTE UNERREICHBAR, kein
  eigener Rot-Fall im Gate"-Stil (Muster Zeile 4364-4371/4709-4711).
- **OP4:** Einfügepunkt für den UI-Hinweis ist
  `public/leitstand/views/workflows.js:389-395`
  (`renderAbnahmeEntscheidung`, `entscheidung.status === 'ok'`-Zweig,
  framework-freie Template-String-Funktion mit `escapeHtml`) — additiv
  einen Satz bei `entscheidung.erzeuger === 'kern'`, sonst unverändert.
- **OP5:** wie oben aufgelöst (5 injiziert, 3 importiert). Die
  „gemeinsames Modul für die 5 server-lokalen Funktionen"-Idee ist eine
  sauberere Lösung, aber ein breiterer Refactor (mind. 4 bestehende
  Aufrufstellen von `schreibeWorkflowFortschritt` allein) — als
  Backlog-Idee vermerkt (nicht Teil dieses Zuschnitts), nicht umgesetzt.
- **Gate-Fall (d):** 3 verkettete Zyklen über echten HTTP-Rundlauf, Muster
  `warteBis`-Polling (bereits etabliert). Realistisches Restrisiko auf
  Timing-Nacharbeit akzeptiert (Advisor-Befund 27), kein Alternativentwurf
  gewählt — bei Flakiness im ersten Lauf wird die Wartezeit erhöht, nicht
  das Testdesign gewechselt.

## Bestätigt, unverändert aus v1

Hook-Einfügepunkt (`starteWorkflowSchritt`, nach der
eingefroren-Prüfung, vor der bestehenden
`naechster.art !== 'starte'`-Rückgabe), Auslöse-Bedingungen (Bauauftrag
Punkt 2), `zaehleKernVersionen`, GET-Projektion (`erzeuger`,
`automatische_iteration`), Gate-Fälle (a)-(f), Feature-Akte-Update — siehe
v1. Der Advisor fand hier keinen Korrekturbedarf (Befunde 20-24, 26:
AK4 strukturell erzwungen, kein Overeager-Risiko, kein Verstoß gegen
Nicht-Ziele/ARCHITECTURE.md §2, kein Doppelauslösungs-Risiko).

## Nächster Schritt

Bau beginnen: neues Modul, Server-Umbau (POST-Handler + Hook + GET-Projektion),
UI-Ergänzung, Gate, Feature-Akte. Reviewer-/QA-Pass danach (kein zweiter
Advisor-Pass nötig, Empfehlung des ersten Passes).
