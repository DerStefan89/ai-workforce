# Nachweis F45 B2b-3e-1 — keine persönlichen Pfade in Render-Screenshots (F-1125)

Stand 16.10.2026 (nach der Korrekturrunde), Branch `f45/b2b3e-budget-feld`. Plan `features/F45/plan-b2b3e1-v2.md`, Gate
`scripts/check-f45-b2b3e1-pfade.mjs`.

## 1 Neutrale Umgebung wirkt (Instanz `instanz.mjs`, Port 4405)

Ausgabe beim Start (Laufordner-Kennung zufällig):

```
Neutrale Umgebung: C:\aiw-nachweis\lauf-zt63qj (wird beim Beenden entfernt)
os.tmpdir() = C:\aiw-nachweis\lauf-zt63qj\temp
os.homedir() = C:\aiw-nachweis\lauf-zt63qj\home
Projekt = C:\aiw-nachweis\lauf-zt63qj\temp\f45-b2b3e1-render-1NkEXN\projekt
Pfadprobe darauf: []
```

## 2 DOM-Probe (`render/erzeuge-nachweis.mjs`)

- **n1** `render/n1-projekt-de-1440/`: `#/projekt` ganze Seite, ein Bild. Protokoll: Spalte „Projektordner“
  (`.umgebung-pfad`) = `C:\aiw-nachweis\lauf-zt63qj\temp\f45-b2b3e1-render-1NkEXN\projekt`, „Pfadprobe“ = `sauber`. Im Bild
  zeigen „Bereit zum Start?“, „Projektordner“, „Eigener Arbeitsordner“ und der PowerShell-Befehl nur `C:\aiw-nachweis\lauf-…`.
- **n2** `render/n2-eingeschleust/`: GET …/code antwortet im Browser mit einem **erfundenen** Pfad `C:\Users\anna\…` (kein
  echter Nutzer) als `absoluterPfad`. `ergebnis.json`: Exit 1, Meldung „Pfadprobe (F-1125): persönlicher Pfad in Screenshot
  01-eingeschleust.webp — …C:\Users\anna\AppData\Local\…“ (8 Fundstellen), **kein Bild, kein `protokoll.*`** ⇒
  `abbruchBelegt: true`.
- **n3** `render/n3-nur-protokoll/` (Korrekturrunde, qa 3): derselbe erfundene Pfad, aber **ohne Screenshot**, nur als
  `texte`-Spalte — die Probe vor dem Schreiben bricht ab: „persönlicher Pfad in protokoll.md — …C:\Users\anna\…“, kein
  `protokoll.*` ⇒ `abbruchBelegt: true`.
- `klickfolge.json`/`ergebnis.json` von n2/n3 enthalten den erfundenen Pfad absichtlich; vor dem Schreiben von
  `ergebnis.json` prüft die Probe die Meldung ohne ihn (ein echter Fund bräche ab).

## 3 Aufräumen

- Echte Instanz, Selbst-Ende über `process.exit` (`B2B3E1_ENDE_NACH_MS`): siehe §5 (Laufordner danach entfernt).
- Natürliches Prozessende eines Kurzlaufs: `lauf-pHV6Dl` samt Datei entfernt.
- Harter Abbruch (Hintergrundaufgabe gestoppt ≙ `taskkill /F`): `lauf-5d4ot5` blieb stehen — wie dokumentiert, von Hand zu
  löschen. Strg+C (SIGINT) im Terminal ließ sich hier nicht automatisiert auslösen (unter Windows beendet
  `process.kill(…, 'SIGINT')` ohne Handler); belegt ist der `exit`-Pfad, auf den SIGINT/SIGHUP/SIGBREAK über `process.exit`
  führen.

## 4 Gate

`node scripts/check-f45-b2b3e1-pfade.mjs` auf dem Branch: grün. Gegen main (`git archive main`, Gate hineinkopiert): rot je
Fall — (p1), (p2a) ×3, (p2b) ×5, (p3a), (p3b); grün bleiben die Invariante (i), die Altliste und der A6-Ausschluss (auf main
erwartungsgemäß erfüllt).

## 5 Laufordner nach dem Selbst-Ende

Instanz mit `B2B3E1_ENDE_NACH_MS=240000` gestartet, nach n1–n3 selbst beendet (Exit 0). Danach `C:\aiw-nachweis` gelistet:
nur noch `lauf-5d4ot5` (Rest des harten Abbruchs aus dem ersten Lauf, §3) — `lauf-zt63qj` ist entfernt.
