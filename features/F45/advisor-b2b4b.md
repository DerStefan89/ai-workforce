# Advisor-Pass F45 B2b-4b „Jarvis im Arbeitsordner“ — Plan v1

Geprüft: `features/F45/plan-b2b4b.md` (v1) gegen `8ee5f8b`. Subagent `architecture-advisor`, frischer Kontext, nur
Read/Grep/Glob, 21.10.2026. Gestrafft übernommen.

## Befunde

1. **Rückfallzeile widerspricht Gate (c)** — vor Bau. [Fakt] Rückfall ohne `block` enthielt „Set-Location“, Gate (c)
   verbietet das Literal in `src/jarvis/index.ts`. Rückfall ohne das Wort formulieren.
2. **Golden (b) tragfähig, Angaben unvollständig** — vor Bau. [Fakt] Trennung „absichtliche Basisänderung“ / „sonst nichts
   geändert“ ist sauber. Fehlend: Eingaben, voller Hash, exakte Zeichenketten der zwei Zeilen. Zusätzlich zweiten Hash auf
   den neuen Text ohne Ordner.
3. **Gate b2a3 (g): Literal mit „…“** — vor Bau. Festen Teil `, verlaufsfenster, baueJarvisOrte(repoWurzel,
   offeneAblaufOrte()))` genau 2× prüfen, `cdZeile`/`ortZeile(` 0× im Server.
4. **Gate (f) nicht selbstbezüglich** — vor Bau. Festen Vergleich `ortZeile('C:\Projekte\mein projekt') ===
   "Set-Location -LiteralPath 'C:\Projekte\mein projekt' -ErrorAction Stop"` behalten.
5. **D13 synchron belegt, Absicherung mit Lücke** — vor Bau. [Fakt, entlastend] kein `await` zwischen `if (laufAktiv)`
   (`:10745`, `:10788`) und `laufAktiv = true` (`:10412`). [Schlussfolgerung] Statische Prüfung zusätzlich: `offeneAblaufOrte`
   nicht `async`, kein `await`/`readdirAsync` darin. Die Laufzeitprobe erkennt ein eingefügtes `await` nur zeitabhängig.
6. **ENOENT ist kein Fehler** — vor Bau. ENOENT still `[]`, nur andere Fehler loggen; nur Verzeichnisse (`withFileTypes`).
7. Hinweis: `check-f813-csrf.mjs:301` meldet jedes `.method` in `scripts/leitstand/*.mjs` — vermeiden.
8. Hinweis: Ladekennung `auftrag-${workflow.auftrag_id}` im Bau belegen.
9. Hinweis: Ratschen-Kandidat vor dem Bau nennen.
10. [Fakt, entlastend] `cdZeile` danach ohne Nutzer; eine Sortierquelle; laufende Abläufe auszuschließen unnötig; Rotfälle
    b2a3 bleiben; keine Route; Zuschnitt passt.

## Urteil: Freigegeben mit Hinweisen

Punkte 1–6 als Präzisierung in Plan v2, kein weiterer Advisor-Pass nötig.
