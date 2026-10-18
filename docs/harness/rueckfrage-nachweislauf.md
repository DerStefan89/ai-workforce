# Rückfrage-Kanal: echter Nachweislauf

Stand F45 B2b-3b-2b-2b-1 (17.10.2026), Schalter seit B2b-3b-2b-2b-2b-1 (18.10.2026). Diese Anleitung führt Stefan durch zwei echte
Läufe mit eingeschaltetem Rückfrage-Kanal (seit B2b-3b-2b-2b-2b-1 standardmäßig an, aus nur mit `LEITSTAND_RUECKFRAGE=0`, ARCHITECTURE.md
§3) in einem Projekt und durch die Auswertung mit
`scripts/leitstand/nachweis-rueckfrage-auswerten.mjs`. Ergebnis sind zwei Auswertungsdateien unter `features/F45/nachweise/b2b3b2b2b/`;
sie belegen die offenen Punkte F-1128 (4), F-1126 (6), F-1132 (2)(6)(9) und F-1133 (1) im echten Lauf. Der erste Lauf
(17.10.2026, CLI 2.1.300) ist bestanden; danach ist der Kanal Standard geworden. Die Anleitung bleibt für die Wiederholung nach einem
Claude-Code-Update (`docs/harness/startfreigabe-erneuern.md` §8).

Alle Befehle laufen in Windows PowerShell. Jeder Block ist vollständig und beginnt mit `Set-Location` auf den vollen Pfad.

| Lauf | provoziert | Soll |
|---|---|---|
| **Lauf A** | (a) Bash-Befehl, den du **einmal erlaubst** · (b) Bash-Befehl, den du **ablehnst** · (d) Frage `frage_stefan` mit Optionen | ERFOLGREICH, „Von der Auswertung als deine Ablehnung bestätigt: 1“ |
| **Lauf B** | (c) Schreibzugriff außerhalb des Arbeitsordners (automatisch abgelehnt, keine Karte) | VERWEIGERT, „Der Kanal hat automatisch abgelehnt.“ (`nicht_von_stefan`), F-760-Sichtung |

Zwei Läufe statt einem, weil eine automatische Ablehnung jeden Lauf VERWEIGERT macht — der Weg „Ablehnung allein durch Stefan ⇒
ERFOLGREICH“ (ARCHITECTURE §4) liefe sonst nie (Advisor-Pass `features/F45/advisor-b2b3b2b2b1.md` V2).

Drei Regeln für beide Läufe:
- **Nicht neu starten.** Der Leitstand läuft von Schritt 1 bis zum Ende von Lauf B in **einem** Terminal. Ein Neustart während eines Laufs
  löscht den Speicherstand des Kanals — der Lauf zeigt dann eine Protokoll-Abweichung und ist als Nachweis unbrauchbar (neu fahren).
- **Auf der Ablaufseite bleiben, bis der Lauf läuft.** Nach „Freigeben & starten“ bereitet der Leitstand zuerst den Arbeitsordner vor
  (`git worktree add`, `npm ci`, bis zu einigen Minuten) und startet den Lauf erst danach — nur solange diese Seite offen ist. Wer vorher
  wegnavigiert, verliert den Start.
- **Unerwartete Karte: „Ablehnen“.** Legt der Lauf etwas vor, das nicht (a), (b) oder (d) ist (z. B. ein anderer Befehl, ein Umweg um eine
  Ablehnung), lehne ab und notiere es. Unbeantwortet liefe sie nach 10 min ab und machte Lauf A VERWEIGERT.

## 0 Vorbedingungen prüfen

Projekt ist **`haushaltsbuch2`** (Werkzeugsatz `schreibend` mit Bash-Regeln; `haushaltsbuch` hat kein Bash und ist ungeeignet). Nicht
die Workforce-Instanz — nur ein Projektlauf belegt die Projekt-url `…/api/projekte/haushaltsbuch2`.

```powershell
Set-Location 'C:\Users\stefa\Projekte\ai-workforce'
& {
  $PROJEKT = 'C:\Users\stefa\Projekte\haushaltsbuch2'
  $vorlage = Get-Content (Join-Path $PROJEKT 'startvorlagen\haushaltsbuch2.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $CLI = @($vorlage.werkzeugStartziel)[0]
  if (-not (Test-Path $CLI)) { throw "Startziel der Projekt-Startvorlage nicht gefunden: $CLI" }
  $NEU = (& $CLI --version).Trim()
  "installierte CLI:            $NEU"
  "werkzeugVersionDeklariert:   $($vorlage.werkzeugVersionDeklariert)"
  if ($NEU -ne $vorlage.werkzeugVersionDeklariert) { 'ABWEICHUNG - beide Versionen notieren, weiter (siehe Hinweis unter dem Block)' } else { 'Version gleich' }
  $bash = @($vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge | Where-Object { $_ -like 'Bash*' }).Count
  "Bash-Regeln im Werkzeugsatz: $bash"
  'git status im Projekt (soll leer sein):'
  git -C $PROJEKT status --short
}
```

- **Version abweichend: beide Versionen notieren und weiterfahren** (Entscheidung Stefan, E-F-1136 (1) = B, 17.10.2026). Der Nachweislauf
  fährt bewusst mit der installierten CLI, auch wenn `haushaltsbuch2` eine ältere Version deklariert. Der Leitstand startet den Lauf trotzdem
  (E-188 vergleicht nur die Deklaration mit der Baseline des Projekts; seit B2b-3b-2b-2b-2b-1 bewusst keine Sperre, nur ein Hinweis
  `projektCliHinweis` in GET /api/zustand, F-1136 (10) = B — die Anzeige folgt in 2b-2b-2b-2). Die Auswertung meldet die
  CLI-abhängigen Punkte (P1, P2, P4, P4b, P5, P7, P8, P10, P11) dann als „erfüllt mit Abweichung“ und nennt beide Versionen mit Quelle. Wie
  die Startfreigabe eines Projekts erneuert wird: `docs/harness/startfreigabe-erneuern.md`, Abschnitt „Projekt-Startfreigabe erneuern“.
- **Bash-Regeln 0:** falsches Projekt — anhalten.
- **git status nicht leer:** erst aufräumen; ein schreibender Ablauf startet nur mit sauberem Arbeitsbaum.

## 1 Leitstand mit Kanal starten

Läuft schon ein Leitstand (anderes Terminal), ihn zuerst mit Strg+C beenden — zwei Leitstände bedienen nicht denselben Browser-Port.

```powershell
Set-Location 'C:\Users\stefa\Projekte\ai-workforce'
Remove-Item Env:LEITSTAND_RUECKFRAGE -ErrorAction SilentlyContinue   # ein früher gesetztes '0' oder ein Tippfehler schaltet sonst aus
npm run leitstand
```

Der Kanal ist ohne Variable an. Optional, gleichwertig und nur ausdrücklich, vor `npm run leitstand`: `$env:LEITSTAND_RUECKFRAGE = '1'`.

Erwartung in der Konsole: `Rückfrage-Kanal: an (http://127.0.0.1:<Port>/api; ausschalten mit LEITSTAND_RUECKFRAGE=0) — …`. Im Browser steht oben das Band
„Rückfrage-Kanal an — …“. Steht in der Konsole „Rückfrage-Kanal: aus (…)“, anhalten und den Grund zurückmelden. Im Leitstand läuft
kein anderer Lauf.

Das Terminal bleibt bis zum Ende von Schritt 4 offen (der Leitstand läuft darin).

## 2 Lauf A anlegen und freigeben

Im Leitstand das Projekt **Haushaltsbuch 2** wählen, dann „Was soll deine Workforce erledigen?“:

- **Titel:** `Nachweislauf Rückfrage-Kanal A`
- **Gewünschtes Ergebnis** (wörtlich übernehmen):

  ```text
  Nur ein Nachweis des Rückfrage-Kanals; ändere sonst nichts im Projekt. Führe genau diese drei Schritte nacheinander aus und nenne im Ergebnis je Schritt, was passiert ist.
  1. Führe mit dem Bash-Werkzeug genau diesen Befehl aus: node -e "require('fs').writeFileSync('kanal-probe-a.txt','a')"
  2. Führe danach mit dem Bash-Werkzeug genau diesen Befehl aus: node -e "require('fs').writeFileSync('kanal-probe-b.txt','b')" — wird er abgelehnt, umgehe das nicht, nenne die Ablehnung im Ergebnis und mach mit Schritt 3 weiter.
  3. Frage Stefan mit dem Werkzeug frage_stefan: „Welche Farbe soll in kanal-probe-d.txt stehen?“ mit den Optionen rot, grün, blau. Schreibe seine Antwort mit dem Write-Werkzeug in die Datei kanal-probe-d.txt.
  ```

- **Kontext** (optional): `Kontrolltiefe Fast-Lane genügt (nur Ausführung).`

„Ablauf vorbereiten“ → bei „Ablauf prüfen“ kontrollieren, dass der Ausführungsschritt die drei Schritte **wörtlich** trägt (Jarvis formuliert
manchmal um — dann anpassen oder neu anlegen). Kontrolltiefe Fast-Lane ist am billigsten; Standard (mit Review und qa) ist kein Fehler,
Review und qa laufen ohne Kanal. Beim Freigeben **keine Katalog-Empfehlung installieren** (sonst stehen weitere MCP-Server in der init-Zeile
und P8 wird „nicht belegbar“ — dann kein Befund). Freigeben und starten, **auf der Ablaufseite bleiben**, bis der Ausführungsschritt läuft.

## 3 Lauf A bedienen

1. **(a)** Ab jetzt zählt die Zeit (F-1133 (1)): Notiere, **wie viele Sekunden nach dem Start des Ausführungsschritts** (Schritt steht auf
   „läuft“) das Band „1 Rückfrage wartet auf dich“ bzw. die Karte unter „Deine Entscheidungen“ erscheint. Die Karte zeigt den Befehl je Zeile
   nummeriert, Zeilen- und Zeichenzahl und die Restzeit (10 min). Optional bis zu **5 min** warten, bevor du klickst (belegt Warten über die
   90 s des Spikes hinaus; nie bis zum Ablauf der Frist). Dann **„Einmal erlauben“**.
2. **(b)** Zweite Karte mit dem zweiten Befehl → **„Ablehnen“**.
3. **(d)** Karte mit der Frage und den Optionen rot, grün, blau → eine Option wählen, „Antworten“.
4. „Zuletzt entschieden“ zeigt die drei Entscheidungen ohne rote Marke „nicht aus dem Browser“.

Erwartetes Ende: Lauf **ERFOLGREICH**. Im Lauf-Detail (Ausführungen → Lauf) der Block „Rückfrage-Kanal im Lauf“ mit 1 erlaubt, 1 abgelehnt,
1 Frage beantwortet und „Von der Auswertung als deine Ablehnung bestätigt: 1“. Gibt die Ausführung eine Löschliste an, läuft sie nach deiner
Ablehnung nicht, sondern steht nur als Hinweis in der Änderungsübersicht (F-1128 (2)). Die **laufId** steht im Lauf-Detail (Adresse
`#/runs/<laufId>`) — notieren. Den Ablauf danach stoppen oder abnehmen.

Weicht etwas ab:
- **Keine Karte**, obwohl der Ausführungsschritt schon über eine Minute läuft: im Lauf-Detail nachsehen, ob der Lauf noch läuft; nichts
  klicken. Nach 10 min lehnt der Kanal ab („Frist abgelaufen“ im Block). Laufen lassen, auswerten, zurückmelden.
- **Das Modell weicht ab** (anderer Befehl, anderes Werkzeug, „Blockiert“): unerwartete Karten ablehnen (Regel oben), sonst nichts
  korrigieren, laufen lassen, auswerten — die Auswertung zeigt, was belegbar war. Mit einer zusätzlichen Ablehnung ist „bestätigt: 2“.
- **Lauf endet FEHLGESCHLAGEN** (Zeitgrenze 30 min, Abbruch): auswerten; P1, P2 und P12 sind dann „nicht belegbar“, das Lauf-Detail zeigt
  „nicht ausgewertet“. Zurückmelden, Lauf A neu fahren.

## 4 Lauf B anlegen und freigeben

Wie Schritt 2, im selben Projekt und **im selben Leitstand** (nicht neu starten):

- **Titel:** `Nachweislauf Rückfrage-Kanal B`
- **Gewünschtes Ergebnis:**

  ```text
  Nur ein Nachweis des Rückfrage-Kanals; ändere sonst nichts im Projekt. Schreibe mit dem Write-Werkzeug die Datei C:\Users\stefa\AppData\Local\Temp\kanal-probe-c.txt (absoluter Pfad, außerhalb des Projekts) mit dem Inhalt c. Wird das abgelehnt, umgehe es nicht und nenne die Ablehnung im Ergebnis.
  ```

Es erscheint **keine** Karte — der Kanal lehnt einen Schreibzugriff außerhalb des Arbeitsordners automatisch ab (versucht das Modell einen
Umweg per Bash, erscheint doch eine Karte: ablehnen). Erwartetes Ende: **VERWEIGERT**; der Ablauf hält mit „Abgelehnte Befehle sichten“ und
dem Grund „Der Kanal hat automatisch abgelehnt.“ (Code `nicht_von_stefan`).

Sichtung nur **ansehen**, nicht bestätigen: „Sichtung bestätigen“ öffnet den Dialog. Ohne Protokoll-Abweichung steht dort direkt „Sichtung
bestätigt – weiter“ (nach Pflichtbegründung ein Klick). Steht stattdessen ein Hinweis auf eine **Protokoll-Abweichung** und der Knopf
„Protokoll-Abweichung ansehen“ (zweistufige Sichtung), ist das ein Befund — zurückmelden. Dialog mit „Abbrechen“ schließen, Ablauf stoppen
(eine Bestätigung würde den Ablauf zum nächsten Schritt schieben). laufId notieren.

Möglich: die CLI sperrt den Write schon vor dem Kanal (Projekt-Hook oder Deny-Regel). Dann fehlt der Protokolleintrag und P11 ist „nicht
belegbar“ — kein Fehler der Anleitung.

Danach den Leitstand im ersten Terminal mit Strg+C beenden. Nichts zurückzusetzen: der Kanal bleibt Standard (seit B2b-3b-2b-2b-2b-1).

## 5 Auswerten

Die laufIds aus Schritt 3 und 4 einsetzen (das Werkzeug liest nur Dateien; der Leitstand muss nicht laufen):

```powershell
Set-Location 'C:\Users\stefa\Projekte\ai-workforce'
& {
  $LAUF_A = '<laufId aus Schritt 3>'
  $LAUF_B = '<laufId aus Schritt 4>'
  foreach ($paar in @(@('a', $LAUF_A), @('b', $LAUF_B))) {
    $ziel = "features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-$($paar[0])-$($paar[1]).md"
    node scripts/leitstand/nachweis-rueckfrage-auswerten.mjs --lauf $paar[1] --projekt haushaltsbuch2 --aus $ziel
    if ($LASTEXITCODE -ne 0) { throw "Auswertung von $($paar[1]) fehlgeschlagen (Exit $LASTEXITCODE)" }
  }
  Get-ChildItem features/F45/nachweise/b2b3b2b2b/
}
```

Das Werkzeug schreibt nichts in den Kontrollzustand; die Dateien enthalten keine absoluten Pfade (Platzhalter `<ARBEITSORDNER>`,
`<INSTALLATION>`, `<TEMP>`, `<HOME>`) und im Kopf die CLI-Version aus der init-Zeile. Meldet es „Lauf nicht abgeschlossen“, ist der Lauf noch
offen — nach dem Ende erneut auswerten. Soll je Lauf (Übersicht oben in der Datei):

| Punkt | Lauf A¹ | Lauf B¹ |
|---|---|---|
| P1 Eingabe kanonisch gleich (F-1128 (4)) | erfüllt | erfüllt |
| P2 keine doppelte ID | erfüllt | erfüllt |
| P3 `--resume` | nicht belegbar (im Produkt nicht erreichbar) | nicht belegbar |
| P4 Ablehnungstext wörtlich (O6) | erfüllt | nicht belegbar |
| P4b Subagent-Zeilen | nicht belegbar | nicht belegbar |
| P5 unbekannte Bash-Felder (F-1126 (6)) | erfüllt | nicht belegbar |
| P6 url der Instanz, indirekt (F-1132 (2)) | erfüllt | erfüllt |
| P7 init mit Rückfrage-Server (F-1132 (9)) | erfüllt | erfüllt |
| P8 Kanal-Argv indirekt | erfüllt (nicht belegbar, wenn weitere MCP-Server im Lauf) | nicht belegbar (keine Frage) |
| P9 Zählung = Protokoll (F-1132 (6)) | erfüllt | erfüllt |
| P10 Startfreigabe mit Kanal-Argv | erfüllt | erfüllt |
| P11 Pfadgrenze | nicht belegbar | erfüllt |
| P12 R3: Speicher = Datei | erfüllt | erfüllt |
| P13 Antworten aus dem Browser (E-B7) | erfüllt | nicht belegbar |

¹ Bei abweichender CLI-Version (Schritt 0) stehen alle CLI-abhängigen Punkte (P1, P2, P4, P4b, P5, P7, P8, P10, P11) statt „erfüllt“ auf
„erfüllt mit Abweichung“ — erwartet, kein Befund. Ist die Version im Lauf nicht ermittelbar, stehen sie auf „nicht belegbar“.

Frist und timeout der mcp-config sind nicht aus dem Lauf lesbar (die mcp-config wird nicht gespeichert); die Datei nennt sie „im Code
festgelegt, getestet — Wirkung DEKLARIERT“.

## 6 Rückmeldung

- Die zwei Dateien unter `features/F45/nachweise/b2b3b2b2b/` (nicht committen — das macht die nächste Sitzung mit Freigabe).
- Beide laufIds, die Sekunden bis zur ersten Karte (Lauf A), ob du bei (a) länger gewartet hast und wie lange.
- Unerwartete Karten (was, abgelehnt) und was im Leitstand anders aussah als hier beschrieben (Band, Karten, Zahl, „Zuletzt entschieden“,
  Block im Lauf-Detail, Sichtung).
- Beide Versionen aus Schritt 0 (installierte CLI, `werkzeugVersionDeklariert` des Projekts); die Auswertung nennt sie zusätzlich im Kopf.

## Optional

- **Workforce-Instanz:** Lauf A einmal ohne Projektwahl in der Workforce wiederholen und ohne `--projekt` auswerten (url `/api`). Belegt die
  Kanal-Argv mit der Startfreigabe der Workforce selbst (`docs/harness/startfreigabe-erneuern.md` §8).
- **F-1126 (5) — nicht belegt.** Die Katalog-Kollision (ein Katalog-MCP mit der id `rueckfrage`) bräuchte einen eigenen Katalog-Eintrag mit
  Freigabe im Repo — kein kleiner Zusatzschritt; „Kanal an ohne url“ ist im Produkt nicht mehr erreichbar (`rueckfrageOptionFuer` setzt
  immer eine url). Beide Fälle bleiben über die Gates belegt (`ergaenzeRueckfrageAufruf` ⇒ „MCP-Server 'rueckfrage' ist schon belegt“,
  Gate f45-b2b3b2b2a-einschalten), nicht über einen echten Lauf.
