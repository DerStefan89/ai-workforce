/**
 * Datei: public/leitstand/kopf-werkzeuge.js
 *
 * Zweck: Kopf-Knöpfe VS Code | Terminal | GitHub (F44 WS-8b). VS Code ist ein echter Link
 * 'vscode://file/<repo_pfad>' auf den Ordner des aktiven Projekts — gebaut NUR aus der Konstante
 * VSCODE_PRAEFIX und dem repo_pfad aus dem Projektregister (GET /api/projekte), nie aus
 * Modellausgabe. Terminal und GitHub sind Bausteine „kommt“ (statisch in index.html, kommt.js):
 * kein Terminal-Panel, keine Ausführung, keine GitHub-URL aus git remote (bräuchte eine Leseroute,
 * F-961).
 *
 * Der Link braucht einen ABSOLUTEN Pfad (Laufwerk wie C:\… oder /…). Ein relativer repo_pfad —
 * der Starteintrag 'ai-workforce' trägt '.' — löst der Server gegen sein Arbeitsverzeichnis auf,
 * das der Browser nicht kennt; der Knopf bleibt dann aria-disabled mit Hinweis im title (F-968).
 *
 * Wird aufgerufen von:
 * - public/leitstand/projekt-kontext.js (renderVsCodeLinks in renderProjektKontext — bei jedem
 *   Projektwechsel und nach dem Laden des Registers)
 * - public/leitstand/views/projektakte.js (baueVsCodeLink — Quellen der Projektakte mit dem absoluten Pfad
 *   aus GET …/projektakte; F46 D1)
 * - public/leitstand/kopf-werkzeuge.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein DOM-Zugriff beim Import.
 * - Nur absolute Laufwerks- oder POSIX-Pfade; UNC und relative Pfade bleiben ohne Link.
 * - Der Link steht zweimal im DOM (Kopf und, bis 1279 px, Sidebar bzw. mobiles Menü) — beide
 *   tragen [data-werkzeug-vscode] und werden gemeinsam gesetzt.
 */

import { t } from './i18n.js'

/** Fester Anfang jedes VS-Code-Links. */
export const VSCODE_PRAEFIX = 'vscode://file/'

/**
 * Baut den VS-Code-Link für einen Projektordner.
 * @param repoPfad - repo_pfad aus dem Projektregister
 * @returns 'vscode://file/…' (Backslash → '/', encodeURI, dazu # und ?) oder null ohne absoluten Pfad;
 *   ein UNC-Pfad (\\server\share) und das Wurzelverzeichnis allein liefern ebenfalls null (Prüfpass
 *   WS-8b, qa S3: vscode://file/ kennt keinen Rechnernamen)
 */
export function baueVsCodeLink(repoPfad) {
  if (typeof repoPfad !== 'string') return null
  const pfad = repoPfad.trim().replaceAll('\\', '/')
  if (!/^(?:[A-Za-z]:\/|\/(?!\/))./.test(pfad)) return null
  const kodiert = encodeURI(pfad.replace(/^\/+/, '')).replaceAll('#', '%23').replaceAll('?', '%3F')
  return VSCODE_PRAEFIX + kodiert
}

/**
 * Setzt alle VS-Code-Knöpfe auf den Link des aktiven Projekts oder deaktiviert sie.
 * Aktiv: <a href> ohne role/tabindex. Ohne Link: kein href, role=link, tabindex=0 (fokussierbar wie
 * ein Baustein „kommt“) und aria-disabled — initKommt (kommt.js) hält Klick und Enter an.
 * @param repoPfad - repo_pfad des aktiven Projekts oder null/undefined
 */
export function renderVsCodeLinks(repoPfad) {
  const link = baueVsCodeLink(repoPfad)
  for (const element of document.querySelectorAll('[data-werkzeug-vscode]')) {
    if (link === null) {
      element.removeAttribute('href')
      element.setAttribute('role', 'link')
      element.setAttribute('tabindex', '0')
      element.setAttribute('aria-disabled', 'true')
      element.title = t('kopf.vscodeOhne')
    } else {
      element.setAttribute('href', link)
      element.removeAttribute('role')
      element.removeAttribute('tabindex')
      element.removeAttribute('aria-disabled')
      element.title = t('kopf.vscodeTitel')
    }
  }
}
