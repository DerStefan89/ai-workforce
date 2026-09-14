# Plan v2 — F22 WS-1 (Router-Endpunkt, Serverseite)

Basis: `state/plan-v1-f22-ws1.md` (unverändert stehen gelassen). Dieses
Dokument trägt nur die vier Korrekturen aus dem Advisor-Pass
(`state/advisor-findings-f22-ws1.md`, Urteil „Freigegeben mit
Hinweisen"). Alle Abschnitte, die hier nicht erwähnt werden, gelten
unverändert wie in v1 (Schema/Validator Abschnitt 3, Fence-Stripping
Abschnitt 2, Reihenfolge der Umsetzung, Risiken/Nicht-behandelt).

## Korrektur A (Befund 2+3, Abschnitt 1: Prüfreihenfolge + auftragId-Check)

Ersetzt v1s Schritte 2-4 in Abschnitt 1. Reihenfolge jetzt explizit
begründet (D13 vor Existenzprüfung, wie `POST /api/laeufe` — NICHT wie
`POST /api/workflows/<id>/starten`, das der Existenz Vorrang gibt; bei
zwei bestehenden, zueinander inkonsistenten Vorbildern wird bewusst dem
Vorbild gefolgt, das die Akte selbst als D13-Grundsatz benennt: „D13 ist
unbedingt und läuft vor jedem request-feld-spezifischen Check",
`scripts/leitstand-server.mjs:3246-3249`):

```js
const rohId = pfad.slice('/api/auftraege/'.length, pfad.length - '/routen'.length)
const auftragId = dekodiereSegment(rohId)
if (auftragId === null || auftragId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(auftragId)) {
  sendeJson(res, 400, { grund: `Auftrag-ID ${JSON.stringify(rohId)} ist ungültig` })
  return
}
// D13 VOR der Existenzprüfung (bewusst: D13 ist unbedingt, Muster POST /api/laeufe,
// Zeile 3246-3249 — abweichend von POST /api/workflows/<id>/starten, das 404 vor 409
// stellt; hier gilt derselbe Grundsatz wie beim Direktstart eines Laufs, nicht wie
// beim Laden eines bereits bestehenden Workflow-Datensatzes)
if (laufAktiv) {
  sendeJson(res, 409, { grund: `ein anderer, über diese Serverinstanz gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang` })
  return
}
const auftragVersion = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
if (auftragVersion === null) {
  sendeJson(res, 404, { grund: `Auftrag '${auftragId}' nicht gefunden` })
  return
}
```

`laufId = \`router-${auftragId}-${Date.now()}\`` und die
`laufIdBelegt`-Prüfung (v1, unverändert) folgen danach.

## Korrektur B (Befund 6, Abschnitt 4: `waehleWorkflowVorlage`-Aufruf)

```js
const workflow = waehleWorkflowVorlage(klassifikation, auftragId, auftragVersion.daten.titel ?? auftragId, repoWurzel)
```

`repoWurzel` ist dieselbe Closure-Variable wie in Abschnitt 1 (Zeile
2239) — viertes Argument jetzt explizit, kein stiller Default
`process.cwd()` mehr (Konsistenz zur eigenen Disziplin bei der
Worker-Auflösung, die `repoWurzel` bereits explizit durchreicht).

## Korrektur C (Befund 7, Abschnitt 5: `workitem_referenz` bleibt Annahme)

Keine Code-Änderung — Bestätigung: der Advisor fand ebenfalls keine reale
Quelle für das Format `workitem:<quelle>:<id>` im Auftragstext (weder
Erzeuger noch Konsument existiert im aktuellen Repo-Stand). v1s Plan
(tolerante Regex + `[Annahme]`-Kommentar mit Verweis auf Korrektur 3 der
Akte) bleibt so umzusetzen. Kein Blocker: WS-2 befüllt dieses Feld erst;
WS-1 liefert nur die Leseseite, testbar mit präparierten
Auftragstexten im Gate (Abschnitt 6). Kommentar im Code muss explizit
sagen, dass das Format nicht belegt ist und mit F22 WS-2 zu verifizieren
bleibt.

## Korrektur D (Befund 9+10, Abschnitt 6: Gate-Testvorlage + AK7-Lesart)

- Testvorlage: `scripts/check-f15-workflow.mjs`s `starteTestserver`-Helfer
  (nicht `check-f15-automat-real.mjs`, das laut eigenem Kopfkommentar
  NICHT mockt, und nicht `check-f11-auftrag.mjs`, ein reines Text-Gate
  ohne HTTP-Server). `starteTestserver` startet einen echten HTTP-Server
  über `erzeugeRequestHandler` mit injizierbarer `fuehreAufgabeDurchFn`-
  Attrappe — exakt das Muster, das Fall (b) (409 bei laufAktiv, über eine
  langsame Attrappe) und Fall (c) (schemawidrige Klassifikation über eine
  Attrappe mit präpariertem Rohstrom-Rückgabewert) brauchen.
- Fall (a) (AK7, „Vorschlag ohne Router-Artefakt wird abgelehnt"): KEIN
  HTTP-Ablehnungspfad vorhanden (kein Code prüft beim Start eines
  Workflows auf ein existierendes `router-<auftragId>`-Artefakt) — die
  Garantie ist AUSSCHLIESSLICH strukturell (ein Workflow entsteht in
  diesem Workstream nur über den Codepfad NACH einem erfolgreichen
  Router-Artefakt, Abschnitt 3 vor Abschnitt 4 im selben `nachLauf`-Callback).
  Der Gate-Test für (a) weist deshalb die STRUKTUR nach, nicht eine
  Laufzeit-409/404: z. B. ein einzelner Aufruf der internen
  Registrierungs-Helferfunktion (falls Abschnitt 3+4 als benannte Helfer
  statt inline im Callback gebaut werden — siehe Bauhinweis unten) mit
  einer präparierten, ungültigen Klassifikation zeigt, dass weder
  Artefakt noch Workflow entstehen; zusätzlich ein Code-Kommentar am
  Gate, der die strukturelle (nicht Laufzeit-) Natur dieses Nachweises
  ausdrücklich benennt, damit AK7 nicht später als „muss einen echten
  409/403 zurückgeben" missverstanden wird.

**Bauhinweis, aus Korrektur D folgend**: Abschnitt 2-4 (Nachbearbeitung,
Artefakt-Registrierung, Workflow-Registrierung) werden als BENANNTE,
EXPORTIERTE Helferfunktion(en) statt vollständig inline im `nachLauf`-
Callback gebaut (z. B. `verarbeiteRouterErgebnis(laufakte, auftragId,
laufId, ...) -> { ok, grund } | { ok: true, routerArtefakt, workflow }`),
damit Fall (a) und (c) des Gates sie direkt mit präparierten Daten
aufrufen können, ohne einen echten Werkzeuglauf zu simulieren (Bauauftrag
Punkt 6: „Rot-Faelle mit praeparierten Daten, nicht per Mock des
Werkzeuglaufs"). Der `nachLauf`-Callback selbst bleibt dünn: liest die
Laufakte, ruft die Helferfunktion, schreibt bei `!ok` einen
`startfehlerListe`-Eintrag.

## Status

Freigegeben mit Hinweisen (Advisor-Pass, `state/advisor-findings-f22-ws1.md`).
Bau kann mit v1 + diesen vier Korrekturen beginnen.
