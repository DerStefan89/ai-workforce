# F45 B2b-3e-1 — Delta-Advisor-Pass zu Plan v2 (`features/F45/plan-b2b3e1-v2.md`)

Subagent `architecture-advisor`, frischer Kontext, 16.10.2026. Rollengrenze: nur Read/Grep/Glob — nicht ausgeführt, nur
erschlossen: Verhalten von `os.tmpdir()`/`os.homedir()` bei Umgebungsvariablen, Rot gegen main, `rmSync` beim Beenden unter
Windows, tatsächlich gerendertes `#/projekt`.

Geprüft gegen: advisor-b2b3e.md, plan-b2b3e.md, scripts/render-nachweis.mjs, b2b3d/instanz.mjs + render/erzeuge-nachweis.mjs,
alle `features/**/instanz*.mjs`, f3a2/instanz.mjs, b2b1b/schwaerze.mjs, views/auftrag-umgebung.js, code-stand.js,
routen-code.mjs, leitstand-server.mjs (Ausschnitte), startvorlagen/ai-workforce.json, package.json, check-docs.mjs,
check-status-akten.mjs, check-feature.mjs, check-rules.mjs, scripts/_aufraeumen.ts, state/findings.md (F-1125, F-1128),
docs/STATUS.md, features/F45/feature.md, ARCHITECTURE.md §1, src/rueckfrage/protokoll.test.ts.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## Befunde

1. **MITTEL — (p3b) prüft keinen neuen Code, gegen main grün.** [Fakt] Plan Z. 99-100: Umgebung nur beim Start des Kinds;
   Z. 103-104 verlangt Rot je Fall; v1 Z. 125 hatte noch „nach Import“. [Annahme] `process.env`-Zuweisung wirkt auf
   `homedir()`/`tmpdir()`. ⇒ Kind soll `richteNeutraleUmgebungEin` mit aufzeichnendem `fs` aufrufen.
2. **[Fakt, entlastend] (p2b)** — `features/**/instanz*.mjs` = 15 Dateien wie Plan Z. 61; rot gegen main nur über „b2b3e1 muss
   dabei sein“. Hinweise: „erster Import“ festlegen; Importe der Startmodule auf `node:` + Pfadprobe begrenzen
   (`src/faehigkeiten/index.ts:36` rechnet beim Laden).
3. **[Fakt, entlastend] DOM-Probe auf `#/projekt`** — `absoluterPfad` = `resolve(repoWurzel)` (routen-code.mjs:587), neutral;
   Startvorlagen-Auszug ohne Startziele (:552-565); Start-Hinweis nur im CLI-Block (leitstand-server.mjs:656-661).
   [offene Unsicherheit] übrige Bereiche von `#/projekt` — n1 entscheidet. Lücken: `placeholder`, `C--Users-name`
   (schwaerze.mjs:41/:49), posix `/home/<name>`; Probe liest die ganze Seite (streng, sicher).
4. **[Fakt, entlastend] Aufräumen `exit` + SIGINT** — Muster leitstand-server.mjs:13076-13094. Hinweise: SIGHUP/SIGBREAK,
   `maxRetries 10/retryDelay 100` (`_aufraeumen.ts:95`); `raeumeVerzeichnis` nicht injizierbar (`_aufraeumen.ts:68`).
   [offene Unsicherheit] offene Handles beim Beenden — Verzeichnisstand nach Strg+C belegen.
5. **MITTEL — n2 belegt den Abbruch nicht eindeutig** (Exit ≠ 0 auch bei Timeout, b2b3d/erzeuge-nachweis.mjs:87) ⇒ Meldung
   mit Ort/Fundstelle + kein Bild/Protokoll prüfen; künstlichen Pfad als erfunden kennzeichnen.
6. **[Fakt, entlastend] A7 umgesetzt** (render-nachweis.mjs:153, :355-357, :373-374). Hinweis: `protokoll.push` vor dem Bild
   (:359-360) ⇒ Spalte nachträglich setzen; `main()` startet beim Import (:380) ⇒ p2a nur als Text.
7. **[Fakt, entlastend] A4, A5, A6 umgesetzt**; lokale git-Identität in Instanzen (b2b3d/instanz.mjs:42).
8. **[Fakt, entlastend] kein Gate verlangt Doku-/Statuszeile** für ein neues Gate; R1 gilt für Gate/Tests. Hinweis
   `docs/STATUS.md:103`.
9. **[Fakt, entlastend] eigenes Modul gerechtfertigt** (`hatRestpfad`, schwaerze.mjs:81-85, sucht den Namen aus `homedir()`).
10. **Kleinkram §6:** Empfehlung in 3e-1 (protokoll.test.ts:57-69 `C:\Users\stefan`; F-1128 eine Zeile).

## Urteil

**Freigegeben mit Auflagen** — B1 (p3b über das neue Modul), B2 (n2 eindeutig). Zuschnitt: ≈ 12 Dateien, ein Thema, ein
Baudurchgang plus höchstens eine Korrekturrunde realistisch; **nicht erneut schneiden**. Für n1: Abbruch an einer Stelle
außerhalb der Instanz-Konfiguration ⇒ anhalten, Befund, nicht ausweiten.

## Nächster sinnvoller Schritt

B1/B2 als Nachtrag in Plan v2 (ohne weiteren Pass), dann bauen: rote Tests, Gate rot gegen main je Fall p1, p2a, p2b, p3a, p3b;
(i) grün.
