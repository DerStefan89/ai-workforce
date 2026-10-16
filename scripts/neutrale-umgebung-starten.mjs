/**
 * Datei: scripts/neutrale-umgebung-starten.mjs
 *
 * Zweck: Seiteneffekt-Modul für Render-Instanzen (F45 B2b-3e-1, F-1125): richtet beim Import die neutrale Umgebung ein
 * (scripts/neutrale-umgebung.mjs — HOME/USERPROFILE/TEMP/TMP auf einen Laufordner unter `C:\aiw-nachweis` bzw.
 * `AIW_NEUTRAL_WURZEL`) und entfernt den Laufordner beim Prozessende.
 *
 * Wird aufgerufen von: neuen Instanzen `features/F45/nachweise/<id>/instanz.mjs` (ab b2b3e1) als ERSTER Import — ES-Module
 * werten Importe in Reihenfolge aus, so sind die Variablen gesetzt, bevor ein Modul beim Laden Pfade berechnet
 * (z. B. src/faehigkeiten/index.ts, src/ressourcen/skill-installation.ts). Gate f45-b2b3e1 (p2b) prüft das. Die älteren
 * Instanzen bleiben bewusst ohne (Entscheidung A6, F-1125) — ein Neu-Rendern dort erzeugt wieder persönliche Pfade, die
 * Pfadprobe des Render-Helfers bricht dann ab.
 *
 * Wichtig: Entfernt wird synchron im `exit`-Handler; Strg+C (SIGINT), SIGTERM, SIGHUP (Konsolenfenster geschlossen) und
 * unter Windows SIGBREAK beenden über process.exit(130) — „durch Signal beendet“ (der Leitstand-CLI-Block beendet dagegen
 * bewusst mit 0, leitstand-server.mjs; hier zählt nur, dass `exit` aufräumt). Ein hart beendeter Prozess
 * (`taskkill /F`) hinterlässt den Laufordner — dann `C:\aiw-nachweis\lauf-*` von Hand löschen.
 */

import { richteNeutraleUmgebungEin } from './neutrale-umgebung.mjs'

const { laufordner, entferne } = richteNeutraleUmgebungEin()
process.once('exit', entferne)
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', ...(process.platform === 'win32' ? ['SIGBREAK'] : [])]) {
  process.once(signal, () => process.exit(130))
}
console.log(`Neutrale Umgebung: ${laufordner} (wird beim Beenden entfernt)`)
