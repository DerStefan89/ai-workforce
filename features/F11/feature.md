# F11 — Auftrag als Kontrollartefakt und geführter Start

## ID

F11

## Titel

Auftrag als Kontrollartefakt und geführter Start

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein realer Auftrag lässt sich im Leitstand anlegen und starten, ohne dass
ein Mensch JSON schreibt und ohne Terminal. Der Auftrag ist dabei ein
echtes Kontrollartefakt, kein UI-Objekt (§16.2: der Leitstand hält keine
eigene Wahrheit).

Zwei Lücken aus Meilenstein 1 werden geschlossen:

1. Es gibt kein Feld für einen Auftragstext — `bauePromptAusKontextpaket`
   (`src/execution-controller/index.ts`) baut den Prompt ausschließlich
   aus den von F5 akzeptierten Kontextpaket-Elementen. Der Satz „Setze X
   um" hat im Datenmodell keinen Platz.
2. Es gibt keine Auftrags-Entität — der Kern kennt nur `laufId` und
   `profilReferenz`.

Entschieden (Stefan, 06.09.2026):

- **E-M2-1 Option A:** eigenes Feld `auftragstext`, dem Evidenzteil des
  Prompts als getrennter Abschnitt vorangestellt. Nie ein
  Kontextpaket-Element. Die F-124-Entscheidung („nur von F5 akzeptierte
  Evidenz landet im Prompt") bleibt in Kraft.
- **E-M2-2 Option A:** ein Auftrag hält N Läufe, ohne Automat. Welcher
  Lauf als Nächstes startet, wählt weiterhin ausschließlich der Mensch
  (Orchestrierungs-Stufe 1). E-192/F-090 bleiben unberührt.

## Scope

- `AUFTRAG_V0`-Payload samt Schema, registriert über F2s
  `registriereKernArtefakt` (AK1).
- `auftragstext` in `AusfuehrungsEingaben`, Prompt-Zusammensetzung in F8
  (AK2), mechanisch geprüfte Trennung von Auftrag und Evidenz (AK3).
- Serverseitige Startvorlage für die maschinenkonstanten Startfelder
  (AK4) und Erweiterung der Body-Feldsperre um genau diese Felder (AK5).
- Serverseitiges Lesen der ausgewählten Evidenzdateien innerhalb der
  Repo-Wurzel (AK6).
- Durchsetzung von D13 im Startpfad (AK7, löst F-128).
- Realer Nachweis inklusive eines schreibenden Laufs über den Leitstand
  (AK8).
- Gate `scripts/check-f11-auftrag.mjs`, eingehängt in `npm run check`
  (AK9).

## Nicht-Ziele

- Jede Form von Vorschlag, welcher Lauf als Nächstes zu starten ist —
  A4-Territorium, mit E-192/F-090 entschieden (YAGNI).
- Zustandsautomaten auf Workstream- oder Execution-Ebene. Die
  Auftragsakte ist reine Zuordnung, keine Übergangslogik.
- Mehrprojektverwaltung über das eine reale Profil hinaus; vollständiges
  Rollenmodell (bleibt M3).
- Timeout und Abbruch eines laufenden Laufs (eigenes Feature F14,
  F-127).
- Lauf-Detailansicht, Entscheidungs-Rückweg, Wiederaufnahme ohne
  Handarbeit (F12/F13).
- Änderung des F6a-Vertrags: `AufrufEingaben.prompt` bleibt unveränderte
  Durchreichung, `baueAufruf` baut weiterhin keinen Text selbst.

## Akzeptanzkriterien

1. **AK1 Auftragsartefakt.** Ein Auftrag wird als `AUFTRAG_V0` über F2s
   `registriereKernArtefakt` unter der Artefakt-ID `auftrag-<auftragId>`
   registriert, mit Schema
   `schemas/kontrollzustand-auftrag-payload.schema.json` und Beispiel
   unter `schemas/examples/`, geprüft von
   `scripts/check-datenformate.mjs`. Kein eigener Dateibaum unter
   `kontrollzustand/` — die bestehende F1-Hash-Kette wird genutzt, wie
   bei jedem anderen Kernartefakt. Felder mindestens: `auftrag_schema`,
   `auftrag_id`, `titel`, `auftragstext`, `erstellt_am`.
2. **AK2 Auftragstext im Prompt.** `AusfuehrungsEingaben` bekommt das
   Pflichtfeld `auftragstext: string`. `fuehreAufgabeDurch` setzt den
   an F6a übergebenen Prompt aus zwei klar getrennten Abschnitten
   zusammen: dem Auftragstext und dem bisherigen, aus dem Kontextpaket
   gebauten Evidenzteil. `eingaben.aufrufEingaben` bleibt unverändert
   (D5, reine Durchreichung), `baueAufruf` unverändert.
3. **AK3 Auftrag ist keine Evidenz.** Der Auftragstext wird nie zu einem
   Kontextpaket-Element. Nachweis zweistufig: (a) Grep-Prüfung, dass
   kein Codepfad `auftragstext` an `baueKontextpaket` reicht; (b)
   Laufzeitprüfung — nach einem Lauf mit einem charakteristischen
   Auftragstext enthält die registrierte Kontextpaket-Payload diesen
   Text nicht, und `paket.elemente` hat unverändert genau so viele
   Einträge wie ohne Auftragstext.
4. **AK4 Startvorlage.** Die maschinenkonstanten Startfelder
   (`werkzeugStartziel`, `werkzeugVersionDeklariert`,
   `berechtigungskontext`, `profilReferenz`, Modell, Standard-Budget)
   stehen in einer versionierten, schemageprüften Vorlagendatei im Repo
   und werden serverseitig gelesen. Der Ablageort darf die bestehende
   Validierung von `profiles/*.json` gegen `schemas/profile.schema.json`
   nicht brechen — die Vorlage ist kein Profil.
   Die Vorlage definiert außerdem **benannte Werkzeugsätze** (mindestens
   einen lesenden und einen schreibenden); der Startauftrag wählt einen
   davon über seinen Namen, nie über eine freie Werkzeugliste.
5. **AK5 Erweiterte Body-Sperre.** Enthält der Body eines Startauftrags
   eines der Felder `werkzeugStartziel`, `werkzeugVersionDeklariert`,
   `berechtigungskontext`, `profilReferenz` oder eine freie
   `erlaubte_werkzeuge`-Liste, wird er mit 400 ABGELEHNT — nicht still
   ignoriert. Die bestehende `AusfuehrungsOptionen`-Sperre (F10 AK3)
   bleibt unverändert daneben bestehen.
6. **AK6 Evidenzdateien liest der Server.** Der Startauftrag benennt
   Evidenzdateien nur über ihren Pfad; `Anfrage.inhalt` füllt der Server
   durch echtes Lesen. Ein Pfad, der absolut ist, `..` enthält oder
   aufgelöst außerhalb der Repo-Wurzel liegt, wird mit 400 abgelehnt,
   BEVOR gelesen wird. Eine nicht existierende Datei wird mit 400
   abgelehnt, nicht als leerer Inhalt weitergereicht.
7. **AK7 D13-Sperre.** Solange in dieser Serverinstanz ein über
   `POST /api/laeufe` gestarteter Lauf noch nicht zurückgekehrt ist,
   wird ein weiterer Startauftrag mit 409 abgelehnt — es entsteht nie
   ein zweiter gleichzeitiger Kindprozess (D13, löst F-128).
   Ausdrücklich NICHT gesperrt wird durch alte, verwaiste Läufe in
   `KLAERUNG_ERFORDERLICH` aus früheren Serverläufen: sie werden
   sichtbar gemeldet, blockieren den Start aber nicht — sonst genügte
   ein einziger Absturz, um den Leitstand dauerhaft unbrauchbar zu
   machen.
8. **AK8 Realer Nachweis, lesend und schreibend.** Zwei reale, über den
   Leitstand ausgelöste Läufe mit echtem Claude-Code-Kindprozess:
   (a) ein lesender Lauf, der einen Auftragstext beantwortet;
   (b) ein schreibender Lauf mit `Write` im gewählten Werkzeugsatz, der
   real eine Datei ändert — erster Nachweis gegen einen git-ignorierten
   Scratch-Pfad nach dem Muster von
   `scripts/verify-f6b-ws-g-schreiblauf.mjs`, danach gegen eine echte
   Datei in einem Feature-Branch. Belegt über Rohereignisstrom
   (`exitCode`, `permission_denials`, tatsächlicher Write) und den
   geänderten Dateiinhalt, nie über die Selbstauskunft des
   Kindprozesses. Keine Attrappe außerhalb des Gates.
9. **AK9 Gate.** `scripts/check-f11-auftrag.mjs`, eingehängt in
   `npm run check`, prüft AK3, AK5, AK6 und AK7 mechanisch.

## Zuordnung

Meilenstein 2, Deliverable „Bedienbarer Leitstand", erstes Feature und
zugleich der vertikale End-to-End-Slice von Meilenstein 2
(`docs/projekt/zielfassung.md` §13.3,
`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1b).

## Dependencies

- Hard: **F2** (`registriereKernArtefakt`, `ladeArtefaktVersion`) — die
  Auftragsakte ist ein Kernartefakt, kein neuer Speicher.
- Hard: **F8** (`fuehreAufgabeDurch`) — bleibt der einzige Auslösepfad;
  AK2 ändert seine Eingaben, nicht seine Rolle.
- Hard: **F5** (`baueKontextpaket`, `elementSchluessel`) — der
  Evidenzteil des Prompts bleibt unverändert an F5s akzeptierte Elemente
  gebunden (F-124).
- Hard: **F10** (`scripts/leitstand-server.mjs`, `public/leitstand/`) —
  Startendpunkt, Options-Sperre, laufId-Reservierung und Pflicht-
  `.catch()` werden erweitert, nicht ersetzt.
- Soft: **F6a** — unverändert; `prompt` bleibt Durchreichung.
- Blockierend: **der Doku-PR zu E-M2-3 muss gemergt sein**, bevor WS-1
  beginnt — sonst verweist diese Akte unter „Zuordnung" auf einen
  Meilenstein, den `docs/projekt/zielfassung.md` §13 nicht kennt
  (F-129).

## Workstream-Liste

- **WS-1** — AK1, AK2, AK3: Auftragsartefakt, Auftragstext,
  mechanisch geprüfte Trennung von Auftrag und Evidenz. Reiner
  Kerneingriff, ohne Serveränderung.
- **WS-2** — AK4, AK5, AK6, AK7 und das Startformular: Startvorlage,
  erweiterte Body-Sperre, serverseitiges Lesen der Evidenzdateien,
  D13-Sperre, Gate (AK9).
- **WS-3** — AK8: die beiden realen Nachweisläufe, lesend und
  schreibend.

Reihenfolge zwingend WS-1 → WS-2 → WS-3.

## Entscheidungs-Referenzen

- **E-M2-1 / E-M2-2** (Stefan, 06.09.2026) — Auftragstext als eigenes
  Feld; Auftrag hält N Läufe ohne Automat.
- **F-124** — der Prompt-Evidenzteil bleibt an F5s akzeptierte Elemente
  gebunden; AK3 schützt diese Entscheidung mechanisch.
- **E-192 / F-090** — keine Zustandsautomaten; die Auftragsakte ist
  Zuordnung, keine Übergangslogik.
- **D13** (`docs/projekt/zielfassung.md` §16.1) — genau ein aktiver
  Arbeitsstrang; AK7 setzt das erstmals technisch durch.
- **F-114** — zwei Schreiber im selben Arbeitsverzeichnis, real
  beobachtet; AK7 verringert die Wahrscheinlichkeit einer Wiederholung.
- **F-128** — Leitstand erzwang D13 bisher nicht; von AK7 gelöst.
- **§16.2** — der Leitstand ist Projektion, keine eigene Wahrheit;
  deshalb ist der Auftrag ein F2-Artefakt und kein Serverzustand.
- **F10 AK3** — bestehende `AusfuehrungsOptionen`-Sperre, von AK5
  erweitert, nicht ersetzt.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
