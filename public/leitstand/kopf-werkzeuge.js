/**
 * Datei: public/leitstand/kopf-werkzeuge.js
 *
 * Zweck: Kopf-Knöpfe VS Code | Terminal | GitHub (F44 WS-8b, F46 D4). VS Code ist ein echter Link
 * 'vscode://file/<pfad>' auf den Ordner des aktiven Projekts — gebaut NUR aus der Konstante
 * VSCODE_PRAEFIX und dem repo_pfad aus dem Projektregister (GET /api/projekte), nie aus
 * Modellausgabe. Terminal ist ein Baustein „kommt“ (statisch in index.html, kommt.js, E-F46-1).
 * GitHub ist seit F46 D4 echt: die Repo-Adresse kommt aus der Leseroute GET …/code
 * (remoteWebUrl, nur https://github.com/<besitzer>/<repo>), öffnet in einem neuen Tab mit
 * rel="noopener noreferrer"; ohne Adresse bleibt der Knopf aria-disabled mit Hinweis im title.
 *
 * Der VS-Code-Link braucht einen ABSOLUTEN Pfad (Laufwerk wie C:\… oder /…). Ein relativer
 * repo_pfad — der Starteintrag 'ai-workforce' trägt '.' — löst der Server gegen sein
 * Arbeitsverzeichnis auf, das der Browser nicht kennt; seit F46 D4 nimmt der Knopf dann den
 * absoluten Pfad aus der Leseroute (absoluterPfad, code-stand.js), F-968. Ohne beides bleibt er
 * aria-disabled mit Hinweis im title.
 *
 * Wird aufgerufen von:
 * - public/leitstand/projekt-kontext.js (renderVsCodeLinks in renderProjektKontext — bei jedem
 *   Projektwechsel und nach dem Laden des Registers)
 * - public/leitstand/views/projektakte.js (baueVsCodeLink — Quellen der Projektakte mit dem absoluten Pfad
 *   aus GET …/projektakte; F46 D1)
 * - public/leitstand/code-stand.js (setzeKopfAusCodeStand, F46 D4), views/code.js und
 *   views/auftrag-umgebung.js (baueVsCodeLink, pruefeGithubUrl, F46 D4)
 * - public/leitstand/views/harness-aufbau.js (baueVsCodeLink — Detail einer Harness-Datei, F46 D6)
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

/** Einziger zulässiger Anfang eines GitHub-Links (die Route liefert nur solche, der Client prüft erneut). */
const GITHUB_MUSTER = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/

/** F46 D4: absoluter Projektpfad aus der Leseroute (code-stand.js) — Rückfall, wenn repo_pfad relativ ist (F-968). */
let codeStandPfad = null

/** F46 D4: zuletzt gesetzter repo_pfad aus dem Register (renderProjektKontext), für das Neuzeichnen nach dem Code-Stand. */
let letzterRepoPfad = null

/**
 * Prüft eine GitHub-Repo-Adresse.
 * @param url - remoteWebUrl aus der Leseroute
 * @returns die Adresse oder null
 */
export function pruefeGithubUrl(url) {
  return typeof url === 'string' && GITHUB_MUSTER.test(url) ? url : null
}

/**
 * Setzt alle GitHub-Knöpfe auf die Repo-Adresse (neuer Tab, rel=noopener) oder deaktiviert sie
 * (Muster renderVsCodeLinks).
 * @param url - remoteWebUrl oder null
 */
export function renderGithubLinks(url) {
  const link = pruefeGithubUrl(url)
  for (const element of document.querySelectorAll('[data-werkzeug-github]')) {
    if (link === null) {
      element.removeAttribute('href')
      element.removeAttribute('target')
      element.removeAttribute('rel')
      element.setAttribute('role', 'link')
      element.setAttribute('tabindex', '0')
      element.setAttribute('aria-disabled', 'true')
      element.title = t('kopf.githubOhne')
    } else {
      element.setAttribute('href', link)
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
      element.removeAttribute('role')
      element.removeAttribute('tabindex')
      element.removeAttribute('aria-disabled')
      element.title = t('kopf.githubTitel')
    }
  }
}

/**
 * F46 D4: übernimmt absoluten Pfad und GitHub-Adresse aus dem Code-Stand des aktiven Projekts
 * (code-stand.js) und zeichnet VS Code und GitHub neu. null setzt zurück (Projektwechsel).
 * @param stand - { absoluterPfad, remoteWebUrl }
 */
export function setzeKopfAusCodeStand({ absoluterPfad, remoteWebUrl }) {
  codeStandPfad = typeof absoluterPfad === 'string' ? absoluterPfad : null
  if (typeof document === 'undefined') return
  renderVsCodeLinks(letzterRepoPfad)
  renderGithubLinks(remoteWebUrl)
}

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
  letzterRepoPfad = repoPfad ?? null
  const link = baueVsCodeLink(repoPfad) ?? baueVsCodeLink(codeStandPfad)
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
