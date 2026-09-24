/**
 * Datei: scripts/leitstand/routen-f41.mjs
 *
 * Zweck: Reine Formprüfung des HTTP-Bodys von POST /api/projekte (F41 WS-1,
 * features/F41/feature.md). Kennt weder das bestehende Register noch das
 * Dateisystem — dafür src/projekt-anlegen/index.ts (loeseZielordner,
 * kopiereBaseline, pruefeStartbedingung1FuerRepo), das der Server NACH
 * dieser Formprüfung aufruft (Muster scripts/leitstand/routen-f39.mjs:
 * pruefeWorkflowEntscheidungsformular prüft auch dort nur die Form, die
 * fachliche Prüfung bleibt eine eigene Funktion).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * scripts/check-f41-projekt-anlegen.mjs.
 */

import { NEUE_PROJEKT_ID_MUSTER } from '../../src/projekt-anlegen/index.ts'

/**
 * Prüft NUR die Form des HTTP-Bodys von POST /api/projekte — id-Muster,
 * name als nicht-leerer String, zielordner (falls gesetzt) als nicht-leerer
 * String. Kollisionsfreiheit gegen das Gesamtregister ist NICHT Teil dieser
 * Funktion (braucht das geladene Register, kennt dieses Modul bewusst
 * nicht) — das prüft der Server direkt nach einem erfolgreichen Aufruf
 * dieser Funktion.
 * @param body - geparster, sonst unbekannter Request-Body
 * @returns { ok: true, id, name, zielordner } oder { ok: false, grund }
 */
export function pruefeNeuesProjektFormular(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }
  if (typeof body.id !== 'string' || !NEUE_PROJEKT_ID_MUSTER.test(body.id)) {
    return { ok: false, grund: "'id' muss ein kleinbuchstabiger String mit Bindestrich sein (2-41 Zeichen, Muster ^[a-z0-9][a-z0-9-]{1,40}$)" }
  }
  if (typeof body.name !== 'string' || body.name.length === 0) {
    return { ok: false, grund: "'name' muss ein nicht-leerer String sein" }
  }
  if ('zielordner' in body && (typeof body.zielordner !== 'string' || body.zielordner.length === 0)) {
    return { ok: false, grund: "'zielordner' muss, wenn gesetzt, ein nicht-leerer String sein" }
  }
  return { ok: true, id: body.id, name: body.name, zielordner: typeof body.zielordner === 'string' ? body.zielordner : undefined }
}
