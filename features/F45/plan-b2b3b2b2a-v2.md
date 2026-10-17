# Plan v2 — F45 B2b-3b-2b-2a-1 „Rückfrage-Kanal: Einschalten (Opt-in), Server/Evaluator/Gate“

Stand 17.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2b2a.md` (**zu groß** ⇒ vorab freigegebener Schnitt; 2a-1 freigegeben
mit Hinweisen). Plan v1 (`plan-b2b3b2b2a.md`) bleibt stehen. Gebaut wird nur **2a-1 (Punkte 1–5)**; 2a-2 (Punkte 6–9, Oberfläche)
bekommt eigenen Plan und Advisor-Pass. Hier nur die Änderungen gegenüber v1 §1–§5.

## Änderungen
- **B3** `rueckfrageBasisAusUmgebung(env, port)` ⇒ `{ an: true, basis } | { an: false, grund }`. `rueckfrageOptionFuer(basis, projektId?)`
  ⇒ `{}` oder `{ rueckfrage: { an: true, url } }`, nur mit nicht leerem String als Basis (sonst `{}`); Projekt-id nur bei `ID_MUSTER`.
- **B2** Aufrufstellen nur inline: `...rueckfrageOptionFuer(rueckfrageBasis)` im defaultHandler (vor `arbeitsordner: true })`, B11),
  `...rueckfrageOptionFuer(rueckfrageBasis, projekt.id)` in `baueProjektHandlerMap`. `rueckfrageBasis` im CLI-Block genau einmal
  `= rueckfrageBasisAusUmgebung(process.env, PORT)` (bzw. dessen `basis`); `baueProjektHandlerMap(`-Aufrufe übergeben nur
  `rueckfrageBasis` (CLI-Block) bzw. `rueckfrageBasis: istWorkforceInstanz && rueckfrageAn ? rueckfrage.url : undefined` (Live-Anlage, B5).
- **B1/B2 Gate-Ersatzbedingung** (alle vier Stellen: b2b3b1 (f) :528, r1 :360, rest :397, absicherung :416): in jeder
  `erzeugeRequestHandler(`-Argumentliste von `leitstand-server.mjs` bleibt nach Entfernen genau der Tokens
  `...rueckfrageOptionFuer(rueckfrageBasis)` / `...rueckfrageOptionFuer(rueckfrageBasis, projekt.id)` kein `\brueckfrage(Vermittlung)?\b`;
  zusätzlich (neues Gate): `rueckfrageBasis` genau eine Zuweisung aus `rueckfrageBasisAusUmgebung(process.env, PORT)`, jeder
  `baueProjektHandlerMap(`-Aufruf nennt `rueckfrage` nur in den zwei erlaubten Formen; funktional (o1): ohne Variable `{}`.
  Die vier Bestands-Gates bekommen dieselbe Funktion aus einem gemeinsamen Gate-Helfer (`scripts/_rueckfrage-aus-pruefung.mjs`), damit
  die Regel nicht viermal auseinanderläuft.
- **B5** Plansatz „nur die Workforce-Instanz hat projektHandlerMap“ war falsch; Bedingung `istWorkforceInstanz && rueckfrageAn`.
- **B6** `src/rueckfrage/types.ts:29` Doku der url nachziehen; nur b2b3b1 Lauf A/B zwingend umstellen, die übrigen der Einheitlichkeit
  halber (kosmetisch, keine Bedingung betroffen).
- **B7** Gate (d) bindet zuerst und bildet die Basis aus dem echten Port; Restgrenze im Bericht: dass ein Lauf in einer Projektinstanz die
  Projekt-url in der mcp-config bekommt, belegt (d) nicht (baueProjektHandlerMap reicht keine Vermittlung/`fuehreAufgabeDurchFn` durch) —
  nur Quelltext (Verdrahtung) + Funktion (`rueckfrageOptionFuer`).
- **B9** Regeltext mit wörtlichem Vorrang: „zuerst `frage_stefan`; nur wenn keine Antwort kommt, gilt der Hinweis `- [x] Blockiert`“.
- **B10** `rueckfrage_*` erst nach allen Zweigen in `klassifiziereLauf` in `daten` zusammenführen; Zählung nur wenn geliefert; R3-Grund
  auf `PROTOKOLL_GRENZEN.grund` (bzw. 500 Zeichen) kappen; je Code ein eingefrorenes Ergebnisobjekt; Zugang nur umhüllen, wenn gesetzt;
  Typ `RueckfrageZaehlung` statt `object`.
- **B11** `leitstand-arbeitsordner.test.mjs:467` Endmarke auf die nächste Funktion umstellen.
- **B12** Grenze in `wachstumsbremse-server.json` auf das Ist senken.
- **B13** F-1126 (5): „Kanal an ohne url“ ist im Produkt nicht erreichbar (`rueckfrageOptionFuer` setzt immer eine url); Katalog-Kollision
  über den echten Start ⇒ nach 2b-2b (echter Lauf). F-1126 (6) ⇒ 2b-2b.
- **B14** Startzeile bei „an“: „Anzeige folgt mit 2a-2 — noch nicht für echte Läufe nutzen“; ebenso in ARCHITECTURE §3.

## Doku
ARCHITECTURE §3/§4; fixpaket-f45 Zeile B2b-3b-2 geteilt (2b-2a-1 einschalten/Server, 2b-2a-2 Anzeige, 2b-2b echter Lauf);
Nachträge F-1126, F-1128; neue Findings ab F-1132.

## Nachtrag Bau (17.10.2026) — Abweichungen vom Plan, gleichwertig
- CLI-Variable heißt `rueckfrageStand` (Ergebnis `{ an, basis | grund }`), das Token `...rueckfrageOptionFuer(rueckfrageStand.basis)`;
  `baueProjektHandlerMap` erhält `rueckfrageBasis: rueckfrageStand.basis` (code-reviewer 5).
- v1 §5 „Zugang im Controller umhüllen“ ist anders gebaut: Gate b2b3b2a-absicherung (a2) prüft die Aufrufzeile
  `ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, optionen.rueckfrageZugang)` wörtlich — statt die Bedingung anzupassen,
  merkt sich der Zugang der Vermittlung die gemeldete Abweichung (`zugang.abweichung()`), der Controller liest sie danach
  (`leseRueckfrageAbweichung`), ebenso die Zählung (`leseRueckfrageZaehlung`).
- Gemeinsame Gate-Regel zusätzlich (code-reviewer 1, qa M3): Schlüssel `rueckfrage:` im Server genau einmal, `rueckfrageStand` nie
  nachträglich verändert, Vorgabewerte `rueckfrage = undefined` / `rueckfrageBasis = undefined`; mit Rotfällen im Gate (o3).
- Bestands-Gate b2b3b1b-auswertung (e4) und Unit-Test e4: Gleichheit „ohne Protokoll = Feld fehlt“ bleibt bis auf `rueckfrage_abgleich`,
  das genau bei VERWEIGERT stehen muss (neue Bedingung).
- ARCHITECTURE §3 nennt den Loopback-Host als `<Loopback>` (check-docs wertet `127.0.0.1` als Versionsnummer).
