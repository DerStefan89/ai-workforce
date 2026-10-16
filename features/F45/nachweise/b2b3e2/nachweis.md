# Nachweis F45 B2b-3e-2 — Budget-Feld, eine Regel für Bereiche, Formular-Reste

Stand 16.10.2026 (nach der Korrekturrunde), Branch `f45/b2b3e2-formular`. Plan `features/F45/plan-b2b3e2-v2.md` (mit
Nachtrag), Delta-Advisor-Pass `features/F45/advisor-b2b3e2-delta.md`, Gate `scripts/check-f45-b2b3e2-formular.mjs`.

## 1 Instanz (`instanz.mjs`, Port 4406, neutrale Umgebung)

Neue Instanz, erster Import `scripts/neutrale-umgebung-starten.mjs` (F-1125). Ausgabe beim Start (Kennung zufällig):

```
Neutrale Umgebung: C:\aiw-nachweis\lauf-cP9QRj (wird beim Beenden entfernt)
Testinstanz B2b-3e-2 offen: http://127.0.0.1:4406/#/projekt (beenden mit Strg+C)
```

Alte Instanzen unverändert.

## 2 Render-Nachweis (`render/erzeuge-nachweis.mjs`), Ausschnitt `#auftrag-formular`

Ansichten je Fall: de 1440, de 390, ru 390, de 1440 hell (ru und hell aus der Korrekturrunde, design-guardian 1) — 12 Bilder.

| Fall | Was das Bild zeigt | Pfadprobe |
| --- | --- | --- |
| `f1-felder-*` | „Vereinbarte Bereiche“ und „Token-Budget · optional“ aufgeklappt; Platzhalter „Leer lassen = Standard“; Hinweis beginnt mit „Leer = Standard der Kontrolltiefe: Fast-Lane 5.300.000, Standard 14.700.000, Hoch 14.700.000.“ (ru: 5 300 000 …) | sauber |
| `f2-budget-*` | Budget `1,5` ⇒ Fehlerzeile „„1,5“ ist keine gültige Token-Zahl — bitte eine ganze Zahl ab 1, zum Beispiel 2000000 oder 2.000.000.“, beide Felder bleiben offen, kein POST | sauber |
| `f3-muster-*` | Bereich `src/*.ts` ⇒ Fehlerzeile „„src/*.ts“ ist ein Muster — „*“ ist nur als ganzer Eintrag oder am Ende erlaubt …“ (F-1123 (9)) | sauber |

Die Spalte „Hinweis Budget“ im Protokoll beginnt jetzt mit den Zahlen (qa 9). Die Spalte „Projektordner“ zeigt nur
`C:\aiw-nachweis\lauf-…\temp\…`. Waagerechter Überlauf: in keinem Schritt (`scrollWidth/clientWidth` = Viewport-Breite).
Eine Suche mit dem Muster der Pfadprobe (`scripts/render-pfadprobe.mjs`) über den ganzen Nachweis-Ordner liefert keinen
Treffer.

Nicht gerendert (Auftragsumfang „neue Formularteile“): Kappung „Vereinbart: …“ (F-1123 (14)) und Rand der Zeile „nicht
bestimmbar“ (F-1123 (15)) an der Abnahme — belegt nur über View-Test bzw. CSS (F-1123 (16) bleibt offen); 200 % Zoom und tr.
