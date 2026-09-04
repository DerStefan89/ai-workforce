# Advisor-Befund: Plan v1 — F8 Execution Controller

## 1. Kopf — Prüfgrundlage

Geprüft (alle Dateien vollständig oder in den referenzierten Bereichen real gelesen, nicht aus dem Plan übernommen):

- `ARCHITECTURE.md` (vollständig)
- `state/plan-v1-f8-execution-controller.md` (vollständig, der zu prüfende Plan)
- `features/F8/feature.md` (vollständig)
- `features/F0/feature.md`, `features/F2/feature.md` (vollständig)
- `src/checkpoint-store/index.ts` (Zeilen 60–100, 690–756 — `pruefeLaufId`, `stelleLaufstatusFest`)
- `src/lineage-registry/index.ts` (vollständig) und `types.ts` (vollständig)
- `src/human-transport/index.ts` (Zeilen 1–260)
- `src/claude-code-gateway/index.ts` (Zeilen 130–315) und `types.ts` (Zeilen 40–71)
- `src/result-evaluator/index.ts` (Zeilen 60–135)
- `src/context-builder/index.ts` (Zeilen 1–210) und `types.ts` (vollständig)
- `schemas/kontrollzustand-checkpoint-payload.schema.json`, `kontrollzustand-wirkungsmarke-payload.schema.json`, `kontrollzustand-bedarf-payload.schema.json`, `kontrollzustand-laufakte-payload.schema.json` (alle vollständig bzw. per Grep gescannt)
- `scripts/check-f6a-claude-code-gateway.mjs` (Auszüge AK12/AK14)
- `state/findings.md` (F-090/F-091, Auszug)
- Repo-weite Grep-Suchen nach `pruefeLaufId`, `randomUUID`, `split(`, laufId-Regex-Mustern

**Rollengrenze:** nur Read/Grep/Glob, kein Bash, kein Schreibrecht. Das hat die Prüftiefe an genau einer Stelle eingeschränkt: `npm run check`/Tests wurden nicht selbst ausgeführt, die Bewertung basiert ausschließlich auf statischer Lektüre — für einen Plan (nicht fertigen Code) ist das die vorgesehene, ausreichende Prüftiefe.

## 2. Marker-Legende

`[Fakt]` im Code/Doku belegt · `[Schlussfolgerung]` aus Fakten abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]` weder belegt noch widerlegt.

## 3. Befunde

### 3.1 Pflichtprüfung 1 — laufId-Format-Vereinbarkeit der Eskalations-laufId

1. **[Fakt]** Der einzige reale Format-/Zeichen-Constraint für `lauf_id` im gesamten Repo ist `pruefeLaufId` in `src/checkpoint-store/index.ts:75-84`: verboten sind `/`, `\`, das Literal `..` sowie Steuerzeichen (`charCodeAt < 32`); jeder nicht-leere String ohne diese Zeichen ist gültig. Alle JSON-Schemas unter `schemas/` (`kontrollzustand-checkpoint-payload.schema.json:10-13`, `kontrollzustand-wirkungsmarke-payload.schema.json:12`, `kontrollzustand-bedarf-payload.schema.json:11`, `kontrollzustand-laufakte-payload.schema.json:21`) definieren `lauf_id` nur als `{"type":"string","minLength":1}` — kein `pattern`, kein Regex. Gezielte Grep-Suche nach einem zweiten laufId-Regex im Repo (`lauf_id.*pattern|laufId.*regex|pattern.*lauf`) fand außer einer Prosa-Erwähnung in `features/F6a/feature.md` keinen weiteren Regelsatz.
2. **[Fakt, entlastend]** Die Eskalations-laufId `${ausloesenderLaufId}-eskalation-${randomUUID()}` (Plan Abschnitt 2.2, Zeile 197-199) enthält keines der verbotenen Zeichen: `randomUUID()` (`node:crypto`) liefert ausschließlich Kleinbuchstaben-Hex und Bindestriche, `-eskalation-` enthält weder `/`, `\`, `..` noch Steuerzeichen. Da `ausloesenderLaufId` bereits eine gültige, durch den Store gelaufene laufId sein muss, besteht die zusammengesetzte ID `pruefeLaufId` zeichengenau. Geprüft: Zeichen für Zeichen gegen die vier Verbotsregeln, kein Treffer.
3. **[Fakt, entlastend]** Das Muster `${praefix}-${randomUUID()}` ist im Repo kein Neuland, sondern bereits durchgängig verwendeter Erzeugungsweg für Test-laufIds, die real durch `schreibeCheckpoint`/`pruefeLaufId` laufen: `src/checkpoint-store/checkpoint-store.test.ts:38`, `src/lineage-registry/lineage-registry.test.ts:30`, `src/human-transport/human-transport.test.ts:37`, `src/claude-code-gateway/claude-code-gateway.test.ts:44`, `src/context-builder/context-builder.test.ts:24`, `src/result-evaluator/result-evaluator.test.ts:35`, `src/invocation-policy/invocation-policy.test.ts:43`, `src/authorization-boundary/authorization-boundary.test.ts:32`. D3s Format ist damit kein neues Risiko, sondern eine bereits vieltausendfach getestete Form.
4. **[offene Unsicherheit]** `pruefeLaufId` verbietet `#` nicht, `context-builder/index.ts:97-103` verbietet `#` im rohen `Anfrage.pfad` (einziger Pfad-Validitätscheck dort). Enthielte eine laufId ein `#`, würde WS-2bs synthetischer Lineage-Eintrag `artefakt:laufakte-<laufId>` als `ungueltiger_pfad` abgelehnt — bricht `baueKontextpaket` sauber ab (kein stiller Verlust, aber der neue Lauf käme über Stufe 1 nie durch AK7). Vorbestehende, nicht F8-spezifische Lücke; kein Blocker, Kandidat für einen Hygiene-Guard-Testfall im Handoff-Vertrag.

**Ergebnis:** Kein Format-Konflikt gefunden. Realer Beleg statt Vermutung erbracht.

### 3.2 Pflichtprüfung 2 — Parsen statt strukturierter Lineage

5. **[Fakt]** Repo-weite Grep-Suche nach `split(` und `-eskalation-`/`eskalationsLaufId` in `src/` findet ausschließlich fachfremde Treffer (`result-evaluator/index.ts:47` Whitespace-Split für Tokens, `invocation-policy/verbotene-aufrufparameter.ts:38` Split eines verbotenen Werts, `lineage-registry/index.ts:66` und `claude-code-gateway/prozessstart.ts:40` Dateinamens-Basename-Split). Es existiert im gesamten Produktionscode kein Codepfad, der eine laufId zerlegt, um eine Eltern-Kind-Beziehung abzuleiten.
6. **[Fakt, entlastend]** Der Plan trägt die Eltern-Kind-Beziehung ausschließlich über F2s strukturierten `eingaben[].pfad`-Mechanismus: `registriereKernArtefakt`/`pruefeStale` (`lineage-registry/index.ts:85-114`, `209-232`) vergleichen `eingaben[].pfad` gegen einen vom Aufrufer gelieferten `Record<string,string>`-Schlüssel — der Registry ist die Herkunft dieses Strings vollständig gleichgültig, es gibt keine laufId-Prüflogik in diesem Pfad. `baueKontextpaket` (`context-builder/index.ts:180-206`) reicht `Anfrage.pfad` unverändert als `eingaben[].pfad` durch. Der laufId-String-Suffix (`-eskalation-<uuid>`, `-retry-<n>`) wird an keiner Stelle zurückgelesen — er dient ausschließlich als Verzeichnisname/menschenlesbares Merkmal.
7. **[Schlussfolgerung]** D2s eigene Formulierung ("hier verweist das Muster zum ersten Mal über eine laufId-Grenze hinweg — das ist eine neue Anwendung") überzeichnet die Neuheit: Die Lineage-Kette ist strukturell nie laufId-skaliert gewesen, sondern ausschließlich `artefaktId`-skaliert (`lineage-<artefaktId>`, `lineage-registry/index.ts:47-49`). Der Codepfad, den F8 für WS-2a/WS-2b nutzt, ist identisch zu dem bereits von F9 genutzten und advisor-geprüften Pfad (`human-transport/index.ts:128,333`). Offene Frage 1 (Plan Abschnitt 10) ist damit strukturell keine neue Prüffrage, sondern eine bereits beantwortete — nur die Wortwahl im Plan suggeriert unnötige Restunsicherheit. Empfehlung: Formulierung präzisieren, nicht neu verhandeln.

**Ergebnis:** Kein Parsen-statt-Lineage-Verstoß gefunden, weder im Plan-Text noch im vorhandenen Code. Beleg erbracht.

### 3.3 Weitere Befunde

8. **[Fakt, entlastend]** Alle in Plan-Abschnitt 0 zitierten Signaturen, Zeilennummern und Verhaltensbehauptungen (u. a. `starteGateway` `claude-code-gateway/index.ts:218-311`, `GatewayEingaben`/`GatewayErgebnis` `types.ts:46-71`, `stelleLaufstatusFest` `checkpoint-store/index.ts:697-756`, `klassifiziereLauf`/`ermittleErgebnis` `result-evaluator/index.ts:76-134`, `laufakteArtefaktId` `claude-code-gateway/index.ts:139-141`) unabhängig gegengelesen — stimmen wörtlich bzw. inhaltlich mit dem Plan überein. Kein einziger Abweichungsfund. Die zitierte `resumeZiel`-Invariante (`checkpoint-store/index.ts:739`) ist wortgleich belegt.
9. **[Fakt, entlastend]** D4s Grep-Gate-Ansatz ist die reale Wiederverwendung eines bereits etablierten, selbsttestenden Verfahrens: `scripts/check-f6a-claude-code-gateway.mjs` (AK12-Grep Zeilen 167-189, AK14-Grep mit Selbsttest Zeilen 137-165) verifiziert, dass die Grep-Regel einen simulierten Verstoß tatsächlich erkennt. Konsistent mit ARCHITECTURE.md-Prinzip „Wartbarkeit/Komplexität reduzieren" statt neuer Abstraktion.
10. **[Fakt]** `erzeugeTransportpaket` wirft real `throw new Error(...)` (`human-transport/index.ts:116`), falls die referenzierte BEDARF_V0-Version nicht gefunden wird; darunterliegende `schreibeCheckpoint`/`schreibeWirkungsmarke` können ebenfalls werfen. Der Plan definiert `AusfuehrungsErgebnis` (Abschnitt 2.1) mit genau drei Ausgängen — keinem für „Eskalationsschritt (WS-2a) selbst wirft". Passt zwar zum im Repo etablierten Idiom „throw = Vorbedingungsverletzung, kein Fachergebnis" (vgl. `lineage-registry/index.ts:243-245`, `human-transport/index.ts:90-92`), aber der Plan sagt nirgends explizit, dass ein solcher Wurf unkatched als Promise-Rejection an den Aufrufer von `fuehreAufgabeDurch` durchgereicht wird, und ob der (zu diesem Zeitpunkt bereits `ABGESCHLOSSEN`/`VERWEIGERT` klassifizierte) auslösende Lauf davon unberührt bleibt. Im CLAUDE.md-DoD ausdrücklich verlangte, im Plan fehlende Fehlerpfad-Angabe.
11. **[Fakt, entlastend]** `features/F8/feature.md` Scope-Satz (Zeile 30-31) listet F4 unter den direkt aufgerufenen Modulen, während die eigene Dependencies-Sektion (Zeile 115) F4 nur als „Weich — nur mittelbar über starteGateway" führt und die Nicht-Ziele (Zeile 53-55) direkte Autorisierungsprüfung ausdrücklich ausschließen. Plan v1s D1 (Abschnitt 4) listet korrekt nur „F1B, F2, F5, F6a, F7, F9" — ohne F4 — und deckt sich damit mit dem tatsächlichen Code. Kleine interne Inkonsistenz in feature.md, kein Plan-Mangel.
12. **[offene Unsicherheit]** Reihenfolge zwischen WS-2a (Eskalation) und Schritt 5 (`stelleLaufstatusFest`) aus Abschnitt 2.1 ist im Plan nicht explizit als „zwischen Schritt 4 und Schritt 5" fixiert, sondern nur implizit aus der Abschnittsgliederung erschließbar. Der F-091-Nachweis zeigt zwar, dass das Ergebnis unabhängig von der genauen Reihenfolge identisch bleibt, aber die exakte Aufrufreihenfolge sollte im Handoff-Vertrag unmissverständlich fixiert werden, bevor Tests geschrieben werden.
13. **[Fakt, entlastend]** Windows-Pfadlängen-Risiko (Umgebung: Windows 11) durch die zusätzliche Zeichenlast (`-eskalation-<uuid>` = 48 Zeichen) geprüft: kein bestehender Constraint im Repo (ARCHITECTURE.md „Bekannte Fallen" nennt nur OneDrive-Reparse-Points, CRLF, Flaky-Gates — keine Pfadlängen-Falle), kein Hinweis auf real aufgetretene Pfadlängenprobleme. Geringe [offene Unsicherheit], kein Blocker.

## 4. Urteil

**Freigegeben mit Hinweisen.**

Begründung: Beide vom Auftraggeber explizit als Risiko benannten Prüfpunkte — laufId-Format-Vereinbarkeit der Eskalations-ID und „Parsen statt strukturierter Lineage" — wurden mit echtem Codebeleg geprüft und ergaben **keinen** Verstoß; beide Mechanismen sind bereits im Repo etablierte, getestete Muster (Befunde 2, 3, 5, 6). Die Abschnitt-0-Verifikation des Plans ist durchgehend akkurat — keine einzige Abweichung zwischen Plan-Zitat und realem Code (Befund 8). Die verbleibenden Findings sind Hinweise, keine Blocker:

**Vor Umsetzungsbeginn zu klären (nicht blockierend, aber vor Handoff-Vertrag fixieren):**
- Finding 10: expliziter Fehlerpfad/Verhalten bei Wurf innerhalb der Eskalationsschritte (WS-2a) fehlt im Plan-Vertrag.
- Finding 12: exakte Aufrufreihenfolge Eskalation vs. `stelleLaufstatusFest` (Schritt 5) im Handoff-Vertrag fixieren.

**Dürfen mitlaufen (keine Vorbedingung für Bau):**
- Finding 4: `#`-Lücke in laufId vs. `Anfrage.pfad`-Validierung — vorbestehend, nicht F8-spezifisch, optionaler Testfall.
- Finding 7: D2s Risikoformulierung in Abschnitt 10 sollte präzisiert werden (die Frage ist strukturell bereits beantwortet) — redaktionell, kein technisches Risiko.
- Finding 11: feature.md-interne Scope/Dependencies-Inkonsistenz — Korrektur der feature.md, kein Plan-Mangel.
- Finding 13: Windows-Pfadlänge — Beobachtung, kein akuter Trigger.

## 5. Nächster sinnvoller Schritt

Stefan entscheidet: (a) Findings 10/12 im Handoff-Vertrag für WS-2 explizit auflösen (Fehlerpfad-Verhalten der Eskalationsschritte, Aufrufreihenfolge Eskalation/Schritt 5), (b) Abschnitt-10-Frage 1 im Plan redaktionell entschärfen (Verweis auf diesen Befund), (c) die übrigen offenen Fragen (2–4 im Plan) wie vorgesehen vor WS-2b-Bauauftrag klären. WS-1 kann danach direkt in einen Handoff-Vertrag überführt werden — hierfür liegt keine offene technische Blockade vor.
