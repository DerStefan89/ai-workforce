# Rückfrage-Kanal im Lauf — Einzelheiten zu ARCHITECTURE.md §3 und §4

Herkunft: wörtlich aus `ARCHITECTURE.md` §3 und §4 verschoben (F45 K „Kontext-Diät“, 17.10.2026), nicht gekürzt. Die Regeln
stehen als Sätze im Kern `ARCHITECTURE.md` §3 und §4. Dieser Text ist gleich verbindlich; bei Widerspruch gilt der Kern, und
jeder Widerspruch ist ein Befund; eine Regeländerung ändert Kern und Detail gemeinsam. §-Angaben im Text meinen `ARCHITECTURE.md`. Lesen nur bei Bedarf — wenn eine Aufgabe das
Thema berührt.

---

## Aus §3 Auth

**Rückfrage-Kanal im Lauf** (F45 B2b-3b-1a, E-B2b-3-1 = A, Spike `features/F45/nachweise/b2b3a/spike.md`). Ein
Ausführungslauf kann über einen je Lauf mitgegebenen stdio-MCP-Server (`--permission-prompt-tool
mcp__rueckfrage__rechte_pruefen`, Werkzeug `frage_stefan`) Stefan einen Bash-Befehl außerhalb der Allowlist vorlegen oder
eine Entscheidungsfrage stellen. Der Kanal ist **Opt-in** (F45 B2b-3b-2b-2a-1): nur mit `LEITSTAND_RUECKFRAGE=1` (genau
dieser Wert) setzen CLI-Bindeblock und `baueProjektHandlerMap` die Handler-Option `rueckfrage`, und nur über
`rueckfrageOptionFuer` (`scripts/leitstand/rueckfrage-einschalten.mjs`); ohne die Variable bleibt das Argv aller Läufe
bitgleich, und die Konsole meldet beim Start „Rückfrage-Kanal: an/aus“ — ERZWUNGEN am Quelltext (gemeinsame Regel
`scripts/_rueckfrage-aus-pruefung.mjs` in vier Gates) und funktional (Gate f45-b2b3b2b2a-einschalten (o1)(o2)). Die url ist die
API-Basis der Instanz — Workforce `http://<Loopback>:<PORT>/api`, Projekt `…/api/projekte/<id>`; das MCP-Skript hängt
`/rueckfrage/anfrage…` an, der Multi-Projekt-Dispatcher leitet an die Instanz weiter (Gate (d)); sie steht vor dem Binden fest,
Port 0 ⇒ Kanal aus. Jede Instanz hat ihre eigene Vermittlung, eine Rückfrage steht nur in der Liste ihrer Instanz; ein Token
einer anderen Instanz ⇒ 403 ⇒ Ablehnung. Mit Kanal bekommt der Ausführungsauftrag die Regelzeilen `RUECKFRAGE_REGEL`
(`src/rueckfrage`: Entscheidungen über `frage_stefan`, zuerst vor „- [x] Blockiert“; nicht freigegebene Bash-Befehle gehen an
Stefan; eine Ablehnung nicht umgehen) — unversioniert wie die cd-Regel, ohne Kanal bleibt der Auftragstext bitgleich. Seit
B2b-3b-2b-2a-3 (F-1132 (5), Entscheidung): weist das MCP-Skript eine Frage mit „Frage ungültig — nicht an Stefan gestellt“ zurück
(leer, zu lang, zu viele oder zu lange Optionen), stellt das Modell sie einmal korrigiert neu; wird auch sie zurückgewiesen, gilt das
wie „keine Antwort“ und damit der Hinweis zu „- [x] Blockiert“. Keine Regelzeile beginnt selbst mit „- [x]“ (Selbstblockade-Erkennung
der Korrekturschleife); Wortlaut und Vorrang per Test an `rueckfrage-mcp.mjs` gekoppelt.
**Anzeige** (F45 B2b-3b-2b-2a-2, Teil A Warteschlange): `GET /api/zustand` trägt `rueckfrageStatus` (`{ an: true, warteGrenzeMs }`
bzw. `{ an: false }`; den Ausschaltgrund nennt nur die Startzeile der Konsole); bei „an“ zeigt der Leitstand ein Band (mit wartenden
Rückfragen Anzahl, nächste Frist, Link) und zählt offene Rückfragen am Navigationspunkt „Entscheidungen“ mit.
`public/leitstand/rueckfrage-kanal.js` hängt am einen Poll (kein eigener Timer), fragt `GET …/rueckfragen` der Instanz des aktiven
Laufs (Register `GET /api/projekte`, `laufAktiv`; ohne Treffer `/api` nur für diesen Takt) und zeigt die Rückfragen als eigene Art
„kanal“ zuerst in „Deine Entscheidungen“ — getrennt von der Workflow-Rückfrage (F-689). Bash wörtlich und vollständig (je Zeile
nummeriert, Zeilen- und Zeichenzahl, keine Höhenbegrenzung), nur „Einmal erlauben“/„Ablehnen“; Frage mit Optionen und freier Antwort;
Restzeit bis zur Frist. Alles als Text (escaped); Steuer- und Formatzeichen (Cc, Cf, Cs, Zl, Zp) und die Markenzeichen ⟦ ⟧ selbst
erscheinen als Marke ⟦U+XXXX⟧ (im Befehl bleiben `\n`/`\t`, in der Frage `\n`, in Optionen nichts); NBSP und andere Zs,
Variationsselektoren und Homoglyphen bleiben unmaskiert, Emoji-Folgen mit Zero-Width-Joiner erscheinen dagegen mit Marke ⟦U+200D⟧
(sichere Richtung); eine Befehlszeile steht in Speicher-Reihenfolge (`unicode-bidi: bidi-override`, rechts-nach-links-Schrift wird nicht
umgeordnet), Frage und Optionen nicht (Grenze). Einziger Schreiber der Kanal-Gruppe ist rueckfrage-kanal.js
(Gate f21-ws2 (f-kanal)). `GET /api/rueckfragen` trägt zusätzlich `entschieden` — die letzten 20 Entscheidungen von
Warteschlangeneinträgen aller Läufe der Instanz (Ringpuffer im Speicher, nach Neustart leer, auch beendeter Läufe) mit `ergebnis`
und `herkunft`; Befehl und freie Antwort darin über `maskiereGeheimnisse` — wie die offene Liste ohne Token für jeden lokalen Prozess
lesbar (DEKLARIERT). „Zuletzt entschieden“ zeigt sie, `nicht_browser` als rote Marke „nicht aus dem Browser“; ohne aktiven Lauf
fragt der Leitstand die zuletzt benutzte Instanz (nach dem Neuladen der Seite `/api`), die Historie eines Projektlaufs ist dann
bis zum nächsten Lauf dort nicht sichtbar (Grenze). Keine neue Route
(F-1131); Gate f45-b2b3b2b2a2-anzeige. **Abnahme** (F45 B2b-3b-2b-2a-3): `GET /api/laeufe/<id>` trägt `rueckfrageKanal`
(aus `daten` der Terminalmarke, `scripts/leitstand/lauf-terminal-projektion.mjs`; `null` ohne Kanal). Das Lauf-Detail zeigt den Block
„Rückfrage-Kanal im Lauf“ (Antworten mit dem Hinweis, dass auch nicht bestätigte Ablehnungen mitzählen, davon von der Auswertung
bestätigte, unbeantwortete getrennt; alle null ⇒ „keine Rückfrage“, unterscheidbar von „kein Kanal“ = kein Block). Den Grund einer
Verweigerung ordnet `public/leitstand/rueckfrage-abnahme.js` einer Klasse zu (echt — `kein_eintrag`, `kein_protokoll`: der Standardsatz
bleibt; automatisch; Stefans Ablehnung nicht bestätigt; Protokoll unbrauchbar; nicht geprüft/E-186 nur im Block) und ersetzt bei einer
Kanal-Ursache den Standardsatz in der Lauf-Notiz und in der Sichtungs-Notiz des F-760-Halts (die Workflow-Seite holt das Lauf-Detail
dazu einmal je Lauf). R3 erscheint als eigene rote Meldung (dauerhaft, Text escaped, täuschende Zeichen maskiert); der Eintrag der
Startfehlerliste trägt `art: 'rueckfrage_abweichung'` und heißt in „Deine Entscheidungen“, „Als Nächstes“ und der Startfehler-Liste
„Protokoll-Abweichung“ mit Link zum Lauf (er darf den gefüllten Hauptknopf tragen; nur eine wartende Kanal-Rückfrage oben unterdrückt
ihn, E-Hauptknopf = A, Stefan 17.10.2026). Seit F45 B2b-3b-2b-2b-1 (E-R3-Sichtung = B, Stefan 17.10.2026) braucht „Sichtung bestätigt –
weiter“ bei R3 einen zweiten, ausdrücklichen Schritt („Protokoll-Abweichung ansehen“ zeigt den R3-Text escaped, erst dann „Abweichung gesehen
– Sichtung bestätigt – weiter“); ohne R3 bleibt es ein Klick — DEKLARIERT als Bedien-Hürde der Oberfläche, der Server prüft den zweiten
Schritt nicht (Gate f45-b2b3b2b2b1-nachweis (a)). Gate f45-b2b3b2b2a3-abnahme. **Nachweislauf** (F45 B2b-3b-2b-2b-1): Anleitung
`docs/harness/rueckfrage-nachweislauf.md` (zwei Läufe in einem Projekt), Auswertung nur lesend mit
`scripts/leitstand/nachweis-rueckfrage-auswerten.mjs` (je Prüfpunkt erfüllt / nicht erfüllt / nicht belegbar mit Fundstelle, CLI-abhängige Punkte bei einer anderen CLI-Version als deklariert „erfüllt mit Abweichung“ — E-F-1136 (1) = B; die mcp-config
eines Laufs ist nirgends gespeichert, url, `--permission-prompt-tool` und Werkzeugsatz sind deshalb nur indirekt belegt, Frist und timeout
DEKLARIERT; Gate f45-b2b3b2b2b1-nachweis (b)–(d)). Bis der Lauf gefahren und ausgewertet ist und 2b-2b-2 den Kanal einschaltet — **noch
nicht für echte Läufe nutzen** (außer dem Nachweislauf). Grenzen:
- Die Vorentscheidung liegt im Leitstand (`src/rueckfrage`), nicht in der CLI: mit „allow“ führte die CLI im Spike Write
  und Bash auch außerhalb des Arbeitsordners aus. Nur ein Bash-Befehl geht an Stefan (wörtlich angezeigt, nur „einmal
  erlauben“ oder „ablehnen“); Datei-Werkzeuge, Werkzeuge außerhalb des Werkzeugsatzes, Hintergrund-Ausführung,
  E-182-Verbotswerte und unbekannte Eingabefelder werden ohne Rückfrage abgelehnt, ebenso (F45 B2b-3b-2a, F-1126 (3)) ein
  Befehl mit Steuer- oder Formatzeichen (`\r`, ANSI, Bidi-Overrides, Null-Breiten; `\n`/`\t` erlaubt). Sperrregeln,
  Deny-Regeln und Hooks greifen vor dem Kanal (Spike Frage 3). Die Zeichenregel ist ERZWUNGEN (Gate f45-b2b3b2a-absicherung (z1)).
- Grenzen je Lauf (F45 B2b-3b-2a): höchstens 20 gleichzeitig offene Rückfragen (darüber automatisch abgelehnt, mit
  Protokolleintrag) und höchstens 200 Protokolleinträge einschließlich automatischer Ablehnungen (darüber abgelehnt ohne
  Eintrag; jede offene Rückfrage hält ihren Platz frei) — ERZWUNGEN (Gate f45-b2b3b2a-absicherung (o1)).
- **Token gibt kein Antwortrecht — ERZWUNGEN** (Gate f45-b2b3b1-rueckfrage (r2)(r3)): das Token je Lauf gilt nur zwischen
  Start und Ende des Laufs und nur für `POST /api/rueckfrage/anfrage` und `…/<id>/warten`; dort gibt es keine
  Antwort-Route, und die Antwort-Route lehnt jede Anfrage mit Token-Kopf ab. Zum Antworten braucht es kein Token — der
  Schutz der Antwort liegt allein im DEKLARIERT-Teil darunter.
- **Nur Stefan antwortet — DEKLARIERT.** Die Antwort-Route `POST /api/rueckfragen/<id>/antwort` gibt Rechte, während ein
  Lauf aktiv ist — eine von Stefan zur Kenntnis genommene Abweichung vom Muster „rechtegebende Routen gesperrt, solange
  ein Lauf aktiv ist“ (F-1061), eng begrenzt: nur diese Route, nur offene Rückfragen offener Läufe, jede Rückfrage-ID
  genau einmal beantwortbar. Host- und CSRF-Haken greifen zentral; eine Anfrage ohne Origin (lokaler Prozess) lassen sie
  durch. Bekannte Grenze: jeder lokale Prozess — auch Laufcode über die npm-Skripte der Allowlist oder ein einmal
  erlaubter Bash-Befehl — kann jede Leitstand-Route aufrufen
  (`docs/adr/ausfuehrung-bash-allowlist.md`) — der Kanal ist eine Bedien-Grenze für das Modell, keine Sicherheitsgrenze
  gegen selbst ausgeführten Code. E-B7 = A (Stefan, 16.10.2026): das bleibt DEKLARIERT; die Vermittlung hält je Antwort die
  Herkunft im Protokoll fest (`herkunft`: `browser` bei Sec-Fetch-Site same-origin bzw. passendem Origin, sonst
  `nicht_browser`) — ein Hinweis, kein Schutz (Kopfzeilen sind fälschbar); angezeigt seit B2b-3b-2b-2a-2 („Zuletzt entschieden“).
- Jede Rückfrage hat eine Wartegrenze (10 min) und endet spätestens mit dem Lauf (abgelehnt bzw. „keine Antwort von
  Stefan“); jeder Fehler im Skript endet als Ablehnung, nie als Erlaubnis.

## Aus §4 Fehlerbehandlung

- Eine Ablehnung allein durch Stefan über den Rückfrage-Kanal (Protokoll `rueckfragen-<laufId>` im Kontrollzustand: je Ablehnung genau ein Eintrag `stefan_abgelehnt` mit gleicher `tool_use_id`, gleichem Werkzeug und gleichem Input-Hash, kein Umgehungsverdacht; Abgleich in `src/rueckfrage/protokoll.ts`) ergibt `ERFOLGREICH` mit `daten.abgelehnt_durch_stefan`, jede andere Ablehnung (automatisch, Zeitüberschreitung, Werkzeugsatz-Sperre, ohne oder mit ungültigem Protokoll) bleibt `VERWEIGERT`. Quelle der Wahrheit ist seit F45 B2b-3b-2a der Speicherstand der Vermittlung im Leitstand-Prozess (`eintraegeVon`, gleicher Prozess wie der Controller, `ermittleRueckfrageProtokoll`); die Datei ist das Audit und gilt nur, wenn sie dazu passt — weichen beide ab oder fehlt der Speicherstand (Lauf nicht offen, Neustart), gilt „nicht nur Stefan“ (ERZWUNGEN gegen eine gefälschte Datei, F-1128 (1)); jede solche Abweichung steht seit F45 B2b-3b-2b-1a mit Grund in der Startfehlerliste des Leitstands (F-1128 R3). Die Datei hat je Entscheidung eine Version mit nur den neuen Einträgen (Schema v1, `ab`), beim Lesen lückenlos zusammengesetzt; eine Lücke gilt als Abweichung (bekannte Grenzen: der Schreib-Rückruf wirft erst, nachdem die Version geschrieben ist; dieselbe laufId wird neu geöffnet — im Server durch die laufId-Sperre nicht erreichbar). Seit F45 B2b-3b-2b-1b (F-1128 R1) zählt eine Ablehnung durch Stefan nur, wenn jedes tool_result ihrer ID im hash-geprüften Rohstrom `is_error` trägt und als String genau den eindeutigen Ablehnungstext, den die Vermittlung je Ablehnung erzeugt (mit Ref) und an die CLI gibt — Protokoll und Speicherstand tragen dessen Hash `ablehnung_hash`, der zu den verglichenen Feldern gehört. Das schließt das „Waschen“ einer statischen oder nicht über den Kanal gelaufenen Ablehnung (ID nachträglich mit dem Token stellen und ablehnen) — ERZWUNGEN, weil das tool_result einer solchen ID allein die CLI schreibt, mit eigenem Text mit festem Präfix (Gate f45-b2b3b2b1b-r1 (r1d)); und die Ref entsteht erst bei Stefans Entscheidung, also kann kein Text, den CLI oder Hook zu einer anderen ID schreiben, sie enthalten (Annahme: kein Projekt-Hook gibt als Ablehnungsgrund einen von außen zur Laufzeit beeinflussbaren Text ohne Präfix zurück — heute erfüllt, commit-guard und guard-settings). Es bleibt DEKLARIERT: eine echte Rückfrage, die ein lokaler Prozess vor Stefan über die Antwort-Route ablehnt, zählt weiter; wer in den stdout der CLI schreiben kann, umgeht die ganze Klassifikation — R1 hebt die Hürde von zwei HTTP-Aufrufen auf einen Eingriff in den Prozess-stdout. Voraussetzung (im echten Lauf zu belegen, F-1128 (4); Nachweislauf und Auswertung seit F45 B2b-3b-2b-2b-1, Prüfpunkte P1/P4, `docs/harness/rueckfrage-nachweislauf.md`): die CLI übernimmt die Ablehnungsnachricht wörtlich als String-`content`; tut sie es nicht, zählt keine Ablehnung durch Stefan (sicher, aber wirkungslos). Seit F45 B2b-3b-2b-2a-1 (F-1128 (3)/R3) stehen bei einem Lauf mit Kanal in `daten` der Terminalmarke zusätzlich: bei VERWEIGERT `rueckfrage_abgleich` `{ art, grund }` (`abgleich` mit festem Grund aus `ABGLEICH_GRUENDE` in `src/rueckfrage/protokoll.ts`, z. B. `ablehnungstext_passt_nicht`, `kein_eintrag`; `abweichung` mit dem R3-Grund; `kein_protokoll`; `nicht_geprueft` bei Umgehungsverdacht) — nur Beschriftung, die Reihenfolge des Abgleichs bleibt; bei ERFOLGREICH und VERWEIGERT — seit F45 B2b-3b-2b-2a-3 (F-1132 (1)) bei jedem Ergebnis, auch FEHLGESCHLAGEN (TIMEOUT/Abbruch) — `rueckfrage_zaehlung` (Antworten je Art `stefan_erlaubt`, `stefan_abgelehnt`, `frage_beantwortet` und davon `nicht_browser`; dazu unbeantwortet `abgelaufen` (Wartegrenze), `lauf_ende` (beim Lauf-Ende abgelehnt, einschließlich der beim Lesen noch offenen — ERZWUNGEN: zwischen dem Lesen im Controller und `beendeLauf` im Server liegt kein await, dort werden genau sie abgelehnt) und `automatisch` (auto_deny, doppelte ID, Grenzen, auch Ablehnungen über der Protokollgrenze ohne Eintrag); aus dem Speicherstand der Vermittlung, nicht aus der Datei — enthält auch nicht bestätigte Ablehnungen; scheitert `oeffneLauf` (ungültige Kanal-Daten), fehlt der Speicherstand ⇒ R3 mit Grund „Speicher fehlt (Lauf nicht offen)“ und ohne Zählung — die Anzeige nennt deshalb „Kanal für diesen Lauf nicht offen“ neben Fälschung und Schreibfehler als mögliche Ursache); bei jedem Ergebnis mit verworfenem Protokoll `rueckfrage_abweichung` (auf 500 Zeichen gekappt, bleibt nach einem Neustart, anders als die Startfehlerliste). Die Felder werden nach allen Zweigen der Klassifikation zusammengeführt; ohne Kanal bleiben `daten` bitgleich (Gate f45-b2b3b2b2a-einschalten (t)). Nach einer Ablehnung durch Stefan — maßgeblich ist der Speicherstand der Vermittlung, nicht `permission_denials` — läuft die Löschliste nicht, sie steht nur als Hinweis in der Änderungsübersicht (F-1128 (2), R2). Durchsetzungsgrad der Regel insgesamt DEKLARIERT, weil die Antwort-Route für jeden lokalen Prozess erreichbar ist (§3, „Nur Stefan antwortet — DEKLARIERT“: ein lokales Skript kann ablehnen und einmal erlauben; vor dem Einschalten Entscheidung Stefans, F-1128).
