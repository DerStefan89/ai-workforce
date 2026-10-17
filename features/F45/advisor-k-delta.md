# Delta-Advisor-Pass Plan K v2 (features/F45/plan-k-v2.md)

Subagent `architecture-advisor`, frischer Kontext, 17.10.2026; geprüft gegen plan-k-v2.md, advisor-k.md, Kernentwurf
(Scratchpad `kern-voll.md`), ARCHITECTURE.md, `docs/architektur/*.md`, check-docs, die vier Anker-Gates,
check-wachstumsbremse-server, check-f21-workboard, check-f40-lagebild, erzeuge-lagebild, src/projektkarte, src/workboard/findings.ts.
Rollengrenze: nur Read/Grep/Glob; Bytes, Byte-Gleichheit und Gate-Läufe nicht selbst gemessen. Abgelegt vom Autor, in der
Sache unverändert, in der Form gekürzt.

## Befunde

1. **Kernsatz sinnentstellt** (mittel, vor Bau). [Fakt] Original :34 / `docs/architektur/kette.md`: im selben Schreibvorgang wie der
   Nachlauf des Advisors wird der **Rückweg** geschrieben (Gate check-f45-b2b1-rueckweg.mjs:50), nicht Plan v2. Kern korrigieren.
2. **Tabelle nicht geschlossen** (mittel, vor Bau). [Fakt] Fehlend: claude-plugins „kein Lauf importiert“; Lauf-Kopie „nur die
   zugeordneten Teile“; Umfang kein Artefakttyp; Positivliste skills/agents/commands; Plugin-Kopie „gelöscht nur durch Stefan“;
   `_` kein Anfang einer Plugin-id; Stand-Datei „gelesen nur beim Serverstart“; Kanal „genau dieser Wert“, „nur über
   `rueckfrageOptionFuer`“ (Gate einschalten (o3)); Instanz-Trennung, fremdes Token ⇒ 403 (Gate einschalten (d)); keine Regelzeile
   beginnt mit „- [x]“; Token nur zwischen Start und Ende, nur anfrage/warten; „Abweichung = Lauf rot“; „bis dahin sperren die
   Schreib-Routen“; W1-Ausgleich durch Auslagern reiner Helfer. Korrektur: gegatete und sicherheitsnahe Regeln als Sätze in den
   Kern, Rest mit Grund „nur Detail“; Deckel neu messen.
3. **R1 überzeichnet** (niedrig–mittel). [Fakt] Original :200: stdout-Umgehung bleibt DEKLARIERT. Halbsatz ergänzen.
4. **Kern-Einleitung unvollständig** (niedrig). Verweise ERZWUNGEN, (a2) nur bei lesbarer Referenz, Gate/JSON DEKLARIERT.
5. **Projektkarte** (niedrig). §3 beginnt mit den zwei Auth-Schichten; nach ≈ 2000 Zeichen fallen spätere Kanal-Grenzen weg — besser
   als heute, nicht vollständig; ehrlich so benennen. [Fakt, entlastend] kein `[FÜLLUNG` außerhalb des Kommentars.
6. **Normalisierung der Archivregel** wie `normalisiereStatus` (`**` weg, trim, klein); „beginnt mit“ ⊂ `includes` ⇒ archivierte
   bleiben ERLEDIGT [Fakt, entlastend].
7. **(a2)-Referenz** — `leseReferenz` aus W1 ist an `BREMSE_PFAD` gebunden; parametrisieren statt kopieren; Fall „fehlt auf main“
   (trifft den K-Branch) in den Unit-Test.
8. **(v1) Link-Basis** festlegen: relativ zum Ordner der Datei.
9. [Fakt, entlastend] Keine Fehlalarme erwartet (Regex schließt `*`, `<>` aus; Ordnerregel lässt fremde Wurzeln heraus).
10. [Fakt, entlastend] Alle Anker erfüllt; Pflichttitel beschrieben.
11. [Fakt, entlastend, Sichtvergleich] Detaildateien entsprechen den Herkunftszeilen; Nachweis-Skript muss die Präfixe
    „- `scripts/` — “/„- `schemas/` — “ bei den Teilstücken kennen.
12. [Fakt, entlastend] bitgleicher Auftragstext und „ID genau einmal“ gegatet; Lagebild unberührt; P4-Allowlist trägt über beide Dateien.
13. Risiken: Code-Reviewer der Workforce sieht nur den Kern (deshalb 1/2); B2b-3b-2b-2b-2 muss Kern und `rueckfrage-kanal.md`
    gemeinsam ändern — Hinweis im fixpaket.

Erster Pass: 1, 2, 4–13, 15, 17, 18 ausgeräumt; 3 teilweise (s. 1/2); 14 und 16 teilweise (s. 5/4).

## Urteil

- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

Vor dem Bau: Textkorrekturen 1–4 (keine neue Planrunde). Im Bau: 5–8, Messungen.

## Nachtrag (Autor, 17.10.2026) — Umsetzung der Hinweise

- 1–4: im Kern umgesetzt (siehe ARCHITECTURE.md §1 `scripts/`, §1 `src/`, §2, §3, §4, Einleitung); Deckel nach Messung neu gesetzt.
- 5: in plan-k-v2 nicht nachgetragen (v2 bleibt Beleg); hier: „besser als heute, nicht vollständig“.
- 6: Gate (6) und Archivskript normalisieren wie `normalisiereStatus`; die Wortliste ist in `src/workboard/findings.ts` nicht
  exportiert, ein Export wäre Produktcode ⇒ Kopie mit Verweis auf die Quelle.
- 7: `leseReferenz` bleibt eine eigene Kopie im K-Gate — W1-Gate unverändert lassen (keine Bedingung eines Bestands-Gates
  berühren); Fall „fehlt auf main“ im Unit-Test. Zusammenlegen ist ein Kandidat für W2.
- 8: Link-Basis = Ordner der Datei (so implementiert, im Kopf des Gates genannt).
- 13: Hinweis in der fixpaket-Zeile K.
