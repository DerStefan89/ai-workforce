SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, main oder ein von main
abgeleiteter Feature-Branch (vor Ausführung mit Stefan bestätigen).

## TASK: f8-execution-controller-ws1

GOAL: `src/execution-controller/` existiert real im Repo und führt einen
Lauf vollständig durch die Kette F5 → F6a → F7 → `stelleLaufstatusFest`,
ohne eine der orchestrierten Prüf-/Klassifikationsregeln nachzubauen. Die
Akzeptanzkriterien AK1, AK2, AK3, AK5, AK8, AK9 aus `features/F8/
feature.md` sind erfüllt und über `scripts/check-f8-execution-
controller.mjs` (eingehängt in `npm run check` und `npm run
check:template`) mechanisch geprüft. `npm run check` → Exit 0.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v2-f8-execution-controller.md`
  (Delta zu `state/plan-v1-f8-execution-controller.md`, der für alle
  nicht in plan-v2 genannten Abschnitte unverändert fortgilt — insbesondere
  Abschnitt 0 Verifikation, Abschnitt 1 Ziel, Abschnitt 2.1 WS-1-Ablauf,
  Abschnitt 3 Nicht-Ziele, Abschnitt 4 D1/D4/D5, Abschnitt 5, 7, 8).
  Dieser Vertrag ist eine Ausführungsanweisung dazu; bei Widerspruch gilt
  plan-v2, bei dessen Schweigen plan-v1.
- [Fakt] Advisor-Urteil zu plan-v1: FREIGEGEBEN MIT HINWEISEN, siehe
  `state/advisor-findings-f8-execution-controller.md`. Beide vom
  Auftraggeber benannten Risikopunkte (laufId-Format der Eskalations-ID,
  Parsen-statt-Lineage) betreffen ausschließlich WS-2 und sind für WS-1
  ohne Relevanz. Advisor Abschnitt 5, wörtlich: „WS-1 kann danach direkt
  in einen Handoff-Vertrag überführt werden — hierfür liegt keine offene
  technische Blockade vor."
- [Fakt] Feature-Akte: `features/F8/feature.md`, Status `READY_FOR_TECH`.
  AK1–AK9 dort sind die Produktsicht; plan-v1 Abschnitt 2.1/Abschnitt 7
  ist die technische Ausprägung und AK-zu-Workstream-Zuordnung. Bei
  Widerspruch gilt `feature.md` für WAS, plan-v1/v2 für WIE.
- [Fakt] Reale, unabhängig vom Advisor gegengelesene Signaturen (plan-v1
  Abschnitt 0, Advisor Befund 8: „kein einziger Abweichungsfund"):
  `baueKontextpaket(laufId, rolle, anfragen, profilReferenz, budget,
  optionen)` (F5, `src/context-builder/index.ts:80-210`); `baueAufruf`
  (F6a WS1, reine Konstruktion ohne Nebenwirkung); `starteGateway(
  eingaben: GatewayEingaben, optionen) → { ok:false; grund:string } |
  { ok:true; laufakte; pfad; versionSequenz }`
  (`src/claude-code-gateway/index.ts:218-311`, `types.ts:68-71`) — prüft
  bereits intern alles, was AK2/AK3 dem Controller verbieten
  (`pruefeUndVerweigereBeiTreffer`, `pruefeStartziel`,
  `aktuelle-autorisierung.json`, `ermittleIstZustand`,
  `pruefeStartfreigabe`); `klassifiziereLauf(laufId, profilReferenz,
  { laufakte }, optionen) → KlassifikationsErgebnis`
  (`src/result-evaluator/index.ts:125-134`); `stelleLaufstatusFest(
  laufId, optionen)` (`src/checkpoint-store/index.ts:697-756`, reine
  Wiederverwendung, kein eigener Code, F1B).
- [Fakt] Ablauf, feste Reihenfolge (AK1, plan-v1 Abschnitt 2.1, Schritte
  1–5): (1) `baueKontextpaket` — bei `ok:false` sofortiger Abbruch mit
  unverändertem F5-Grund, kein `baueAufruf`, kein `starteGateway`; (2)
  `baueAufruf` → `tokens`; (3) `starteGateway` — bei `ok:false` sofortiger
  Abbruch mit dem unveränderten `grund`-String des Gateways, kein eigener
  Grundtext, kein `klassifiziereLauf`-Aufruf; (4) `klassifiziereLauf`;
  (5) `stelleLaufstatusFest`. Entwurf für Ein-/Ausgabetypen
  (`AusfuehrungsEingaben`, `AusfuehrungsErgebnis`,
  `fuehreAufgabeDurch(laufId, profilReferenz, eingaben, optionen?)`) in
  plan-v1 Abschnitt 2.1 — Ausgangspunkt, keine bindende Typsignatur; Namen
  und Feinschnitt dürfen beim Bau angepasst werden, solange das
  AK1/AK2/AK5-Verhalten erhalten bleibt.
- [Fakt] D1 (Modulschnitt): `src/execution-controller/` ruft F1B, F5,
  F6a, F7 ausschließlich von außen auf (F9/WS-2 in diesem Vertrag ohne
  Bezug — kein Aufruf von `erfasseBedarf`/`erzeugeTransportpaket`/
  `haendigeAus` in diesem Scope).
- [Fakt] D4 (Grep-Gate, Muster `scripts/check-f6a-claude-code-
  gateway.mjs` AK12/AK14, real gelesen und advisor-bestätigt, Befund 9):
  zwei Prüfungen in `scripts/check-f8-execution-controller.mjs`, je mit
  Selbsttest (ein simulierter Verstoßstring muss der Regex tatsächlich
  erkennen):
  1. AK1-Grep: kein Vorkommen von `ROLLEN_AUSSCHLUSSMUSTER`,
     `pruefeUndVerweigereBeiTreffer`, `ermittleErgebnis`,
     `permission_denials`, `non_execution_kind` in
     `src/execution-controller/*.ts` (außer `*.test.ts`).
  2. AK3-Grep: kein Vorkommen von `pruefeStartfreigabe`,
     `ermittleIstZustand`, `aktuelle-autorisierung` in
     `src/execution-controller/*.ts`.
- [Fakt] D5: kein eigener `schreibeWirkungsmarke`-Aufruf für die
  Haupt-`laufId` — `starteGateway` schreibt `run_prepared`,
  `klassifiziereLauf` schreibt `terminal`, beide mittelbar, nicht vom
  Controller direkt.
- [Fakt, hier aufgelöst statt vertagt] plan-v1 Abschnitt 10, Frage 4
  (`GatewayOptionen`-Durchreichung): `starteGateway` nimmt
  `optionen.starter`/`optionen.aktuelleAutorisierungPfad`/
  `optionen.settingsPfad`/`optionen.rohBasisVerzeichnis` entgegen
  (Abschnitt 0). plan-v2 nennt diese Frage in der Zusammenfassung „vor
  WS-2b bzw. im WS-2-Handoff-Vertrag" zu klären — das steht im
  Widerspruch zu plan-v1s eigenem Wortlaut an der Fundstelle selbst
  („Detailfrage für den Handoff-Vertrag", ohne WS-Zuordnung) und zur
  AK-Tabelle (plan-v1 Abschnitt 7): AK8 — „Tests laufen ausschließlich
  gegen `Starter`-Attrappe" — ist WS-1 zugeordnet, nicht WS-2. Da AK8 Teil
  dieses Vertrags ist, gehört die Optionen-Form-Entscheidung hierher, nicht
  in den WS-2-Vertrag. Siehe SCOPE Punkt 3 und Bericht-Hinweis unten.
- [Fakt] `scripts/check-contract.mjs` prüft dieses Dateiformat selbst
  (SCHRITT 0 am Anfang, acht Marker `## TASK:`/`GOAL:`/`CONTEXT:`/
  `SCOPE:`/`NICHT:`/`BUDGET:`/`OUTPUT:`/`ESCALATE:`) — Vorbild für den
  Aufbau dieses Vertrags: `state/tasks/f0-datenformate.md`.
- [Fakt] `src/execution-controller/` existiert im Repo noch nicht
  (geprüft vor Erstellung dieses Vertrags).

SCOPE:
1. `src/execution-controller/{index,types}.ts`,
   `execution-controller.test.ts` — neuer, eigenständiger Modulordner
   (D1). Einstiegsfunktion nach plan-v1 Abschnitt 2.1, Ablauf exakt die
   fünf Schritte aus CONTEXT — nur bis Schritt 5
   (`stelleLaufstatusFest`), kein Eskalationsschritt.
2. Controller-eigene `Optionen`-Form entwerfen (löst plan-v1 Abschnitt 10
   Frage 4 innerhalb dieses Vertrags): muss alle für Tests (AK8)
   benötigten Felder von F5-, F6a- (`GatewayOptionen`) und F1B-Optionen
   unverändert an die jeweilige Funktion durchreichen können, ohne sie
   selbst zu interpretieren (D5-Konsistenz) — reale Optionen-Typen der
   vier Module vor dem Entwurf selbst nachlesen, nicht aus diesem Vertrag
   übernehmen.
3. `scripts/check-f8-execution-controller.mjs` — AK1-Grep und AK3-Grep
   (D4), je mit Selbsttest-Muster wie `check-f6a-claude-code-
   gateway.mjs` AK14.
4. `package.json` — Gate-Skript einzeln in `check` UND in
   `check:template` eintragen (zwei getrennte Skript-Strings, Muster F0
   Delta 2, `state/tasks/f0-datenformate.md` Punkt 6).
5. Tests (Muster: F6a/F9-Testdateien, `Starter`-Attrappe statt echtem
   Prozess/Netz, AK8):
   - AK1: Grün-Durchlauf ruft `baueKontextpaket`/`baueAufruf`/
     `starteGateway`/`klassifiziereLauf` je genau einmal (Spy/Zähler),
     plus das AK1-Grep-Gate selbst grün.
   - AK2: F6a-Rot-Fall (z. B. verbotener Aufrufparameter) →
     `{ ok:false, stufe:'gateway', grund }` identisch zum `grund` von
     `starteGateway`, `klassifiziereLauf` nicht aufgerufen (Spy/Zähler).
   - AK3: das AK3-Grep-Gate grün.
   - AK5: nach Grün-Durchlauf `stelleLaufstatusFest(laufId).status ===
     'ABGESCHLOSSEN'` und `.ergebnis === klassifikation.ergebnis`.
   - AK8: alle Tests laufen gegen die `Starter`-Attrappe aus F6a, kein
     echter Claude-Code-Prozess, kein Netzzugriff.
   - AK9: `npm run check` → Exit 0.
6. `state/gates.md` — neue Tabellenzeile für `check-f8-execution-
   controller.mjs`, Rot-/Grün-Beleg mit echtem Befehl+Ausgabe aus dieser
   Sitzung (Muster F0 SCOPE.7), erst nach realem Prüflauf eintragen.
7. `state/memory-map.md`, `docs/STATUS.md` — Einträge für das neue Modul
   nach realem Bau-/Prüflauf (Muster F0 SCOPE.8/9).
8. `features/F8/journal.md` anlegen (Muster `features/AF-F001/
   journal.md`, `features/F0/journal.md`): Nachträge für `feature.md`,
   Challenge (E-192/E-193), plan-v1, Advisor-Pass, plan-v2, dieser
   Vertrag.

NICHT:
- WS-2a (E-186-Eskalation über F9: `erfasseBedarf`/
  `erzeugeTransportpaket`/`haendigeAus`, AK4/AK6) — hängt an einer noch
  offenen Beleg-Frage zu D2: der Advisor-Pass (Befund 7) hat mit
  Codebeleg gezeigt, dass die Lineage-Kette strukturell artefaktId-, nie
  laufId-skaliert ist, und dass F8s synthetischer
  `artefakt:laufakte-<laufId>`-Schlüssel denselben Codepfad nutzt wie F9
  (`human-transport/index.ts:128,333`) — das ist der reale Beleg für die
  Unbedenklichkeit des Musters. Ob dieser Codepfad damit bereits als
  „durch F9 vollständig geprüft" gilt oder ob F8 hier eine neue Anwendung
  (Lauf-zu-Lauf statt artefaktintern) ist, für die noch ein eigener
  Testfall/Advisor-Vermerk fehlt, ist vor dem WS-2a-Vertrag zu klären —
  nicht Teil dieses WS-1-Vertrags.
- WS-2b (erneuter Anlauf nach `KLAERUNG_ERFORDERLICH`/
  `FEHLGESCHLAGEN`, AK7) — hängt zusätzlich an der noch offenen
  Wiederaufnahme-`laufId`-Konvention (plan-v1 Abschnitt 10, Frage 2).
- Delta 1/Delta 2 aus `plan-v2-f8-execution-controller.md`
  (Fehlerpfad-Verhalten bei Wurf innerhalb der Eskalationsschritte;
  feste Aufrufreihenfolge Eskalation vs. Schritt 5) — betreffen
  ausschließlich WS-2a, hier ohne Wirkung.
- Autorisierungs-/Startfreigabeprüfung (bleibt `starteGateway`/F4,
  E-193), Prozessstart (bleibt F6a), Klassifikationsregeln (bleibt F7),
  Kontextpaket-Regeln/Budget/Rollen-Ausschlussmuster (bleibt F5) —
  `features/F8/feature.md` Nicht-Ziele, unverändert.
- A4-Zustandsebenen-/Automatenmodell (E-192, F-090), Konsolentext-Deutung,
  automatischer Neustart einer bestehenden `laufId`, Leitstand-Bedienung —
  `feature.md` Nicht-Ziele, unverändert.
- Änderungen an F1B/F5/F6a/F7 selbst — der Controller ruft ausschließlich
  von außen auf (D1).

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde
(`CLAUDE.md`-Zuschnitt-Heuristik). Plan-v1 Abschnitt 6 stuft WS-1 selbst
so ein: „zusammenhängender, reiner Orchestrierungs-Workstream ohne
Fremdmodul-Änderung — ein Baudurchgang plus höchstens eine
Korrekturrunde realistisch." Zweites Rot auf demselben Gate ⇒
BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien: `src/execution-controller/{index,types,execution-
  controller.test}.ts`, `scripts/check-f8-execution-controller.mjs`,
  `features/F8/journal.md`.
- Geänderte Dateien: `package.json` (`check` und `check:template`),
  `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`.
- Beleg: `npm run check:template` und `npm run check` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest: für AK1-Grep und
  AK3-Grep je einen echten Rot-Fall zeigen (simulierter Verstoßstring,
  Exit-Code + benannte Regel), danach den Grün-Zustand wiederherstellen
  (Konvention „Rot-Fall-Kalibrierung an geprüfter Logik", Skill
  `handoff-vertrag`: Testfixture/simulierter String abweichend, nicht
  der geprüfte Modulcode selbst).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische `state/freigabe-commit.md`,
  Push separat autorisiert. Feature-Akte (falls in diesem Zug geändert)
  und alle in diesem Auftrag erzeugten Dateien sind Teil desselben
  Commits (F-005/F-035-Muster).
- Bericht: was geändert wurde, welche Checks liefen, Ergebnis, wie die
  Optionen-Form-Frage (SCOPE Punkt 2) real gelöst wurde, echte Blocker.

ESCALATE:
- `state/plan-v2-f8-execution-controller.md` oder `state/plan-v1-f8-
  execution-controller.md` fehlt oder widerspricht diesem Vertrag →
  abbrechen, melden, nichts anlegen.
- Der Kalibrierungstest für AK1-Grep oder AK3-Grep reproduziert sich
  nicht wie erwartet (erwarteter Rot-Fall bleibt aus) → anhalten, welche
  Prüfung betrifft es, was tatsächlich passierte, melden. Nicht das
  Skript so lange anpassen, bis irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat → anhalten und melden. Kein Nachziehen fremder Stellen.
- Eine reale Signatur (F5/F6a/F7/F1B) weicht von den in CONTEXT zitierten
  Ständen ab → anhalten, Fundstelle zitieren, melden. Nicht die
  abweichende Signatur stillschweigend im Controller kompensieren.
- Eine der vorgegebenen Formulierungen widerspricht `features/F8/
  feature.md` oder den zitierten Entscheidungen (E-192/E-193) → anhalten,
  beide Stellen zitieren, melden. Nicht selbst entscheiden, welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter Freigabe.
