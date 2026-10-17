# Plan v2 — F45 B2b-3b-2b-1b „R1: Stefan-Ablehnung nur mit eindeutigem Ablehnungstext“

Stand 17.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2b1b.md` (Freigegeben mit Hinweisen, Zuschnitt passt). Plan v1
(`plan-b2b3b2b1b.md`) bleibt unverändert stehen. Hier nur die Änderungen gegenüber v1; alles andere gilt wie dort.

## Entscheidungen
- O1 Prüfung im Evaluator auf dem hash-geprüften Rohstrom (B6). **Begründung korrigiert (B1):** der Ablehnungstext ist für jeden
  Token-Inhaber über `warte` lesbar; es trägt, dass das tool_result einer statisch gesperrten ID allein die CLI schreibt, mit festem
  Präfix. Der Zufallsteil bindet jede Entscheidung an ihren Eintrag.
- O2 „jedes tool_result zur ID muss passen“ (B2, B12).
- O3 Nur der Hash ins Protokoll (B5). Wortlaut: der Text steht im Rohstrom (`rohstrom.json`), nicht im Protokoll.
- O4 Unverändert sicher (B4), kein Code.
- O5 r1d mit echtem `fuehreAufgabeDurch`, nur Prozessstart und F4-Fixture ersetzt (B10).
- **O6 Nur die belegte String-Form** (`content` ist ein String) zählt; jede andere Form ⇒ zählt nicht (Advisor-Empfehlung,
  Entscheidungsregel 4 „Komplexität reduzieren“, sichere Richtung). **Vorgelegt an Stefan im Bericht**; Umstellung auf die Array-Form
  wäre eine Zeile + ein Testfall.
- Text ASCII: `Stefan hat den Befehl abgelehnt. (Ref <randomUUID>)` — ohne Umlaute (B12; „abgelehnt“ ist ASCII).

## Änderungen an §1
- 4. Parameter `ergebnisse` von `gleicheAblehnungenAb`: fehlt er oder ist er keine Map ⇒ wie „kein tool_result“ ⇒ `nicht_nur_stefan`;
  wirft nie (B9). Evaluator baut ihn nur, wenn `rueckfragen` weder undefined noch null ist, kein Umgehungsverdacht und Ablehnungen da sind.
- `ermittleToolErgebnisse(zeilen)` liefert `Map<id, { fehler, text }[]>`, `text` = `content`, wenn String, sonst null.

## Änderungen an §3 (Gate und Tests)
- r1d Zusatzprüfungen (B10): kein Startfehler „nicht bestätigt“ für den Lauf; Speicher/Protokoll hat zwei `stefan_abgelehnt` je mit
  `ablehnung_hash`; Hash von A = sha256 des tool_result-Texts von A; die Attrappe sieht `--permission-prompt-tool` in den Tokens.
- r1t: jeder Negativfall mit Positivkontrolle im selben Fall (B7); Rot gegen main nur über fehlenden Export und „gefälschter Hash“ (B11).
- Fixtures zentral umstellen (B7): Standard-`eintrag()` mit gültigem Hash an `stefan_abgelehnt`, Klassifizier-Helfer mit passender
  tool_result-Zeile.
- Nachziehliste (B8), je mit ehrlichem Vermerk im Kopf:
  - Gate 2b-1a: (g) Text über `v.warte`, tool_result-Zeilen im Rohstrom; (r3) Fälschung t3 mit Hash; Gegenprobe alter Pfad mit
    tool_result-Zeilen.
  - Gate b2b3b2a: `alterPfad`, `gleich`, `nurStefan` (Z. 150, 350).
  - Gate b2b3b1b: `eintrag()` (Z. 110), (e1) Z. 116-119, (p3) Text aus `antwort.message` als tool_result, (p2) neues Beispiel.
  - Tests: `protokoll.test.ts`, `result-evaluator.test.ts` (~1119), `execution-controller.test.ts` (1668-1699),
    `rueckfrage-vermittlung.test.mjs` (318-321), `rueckfrage-protokoll.test.mjs` (31), Gateway-Test `ermittleToolErgebnisse`.
  - Gate b2b3b1 (g2) bleibt unberührt (prüft nur `/abgelehnt/`).

## Änderungen an §4 (Doku)
- ARCHITECTURE §4 R1-Satz (B1–B3): gilt für statisch bzw. nicht über den Kanal gelaufene Ablehnungen („Waschen“); eine echte Rückfrage,
  die ein lokaler Prozess vor Stefan ablehnt, zählt weiter (DEKLARIERT). Tragend: nur die CLI schreibt das tool_result, Nicht-Kanal-Texte
  haben einen festen Präfix. Grenze: wer in den stdout der CLI schreiben kann, umgeht die ganze Klassifikation — R1 hebt die Hürde von
  zwei HTTP-Aufrufen auf einen Eingriff in den Prozess-stdout. Voraussetzung (2b-2 belegen): CLI übernimmt die Nachricht wörtlich als
  String-`content`.
- F-1128-Nachtrag: „R1 erledigt (für das Waschen)“, Prüfpflicht zu (4): tool_result trägt den Text wörtlich; F-1128 bleibt offen.
