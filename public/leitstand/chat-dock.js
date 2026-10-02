/**
 * Datei: public/leitstand/chat-dock.js
 *
 * Zweck: Neutrale Kopplung „Chat-Dock mit Entwurf öffnen“ (F44 WS-8b, Prüfpass cr 3). Views wie
 * views/projekt.js („Lieber mit dem Coach besprechen“) rufen oeffneChatMitEntwurf, ohne shell.js zu
 * importieren — die Shell trägt beim Bootstrap den eigentlichen Öffner ein (registriereChatOeffner).
 * So lädt eine View (und ihr node:test) nicht den ganzen Shell-Graphen. Muster: beiNeuerAntwort in
 * views/chat.js.
 *
 * Wird aufgerufen von:
 * - public/leitstand/shell.js (registriereChatOeffner in initChatDock)
 * - public/leitstand/views/projekt.js (oeffneChatMitEntwurf)
 * - public/leitstand/views/roadmap.js (oeffneChatMitEntwurf — „Jarvis zur Roadmap fragen“, „Frag Jarvis dazu“; F46 D1)
 *
 * Wichtig: Import-sicher, ohne DOM. Vor der Registrierung meldet ein Aufruf einen Fehler in der
 * Konsole und tut sonst nichts.
 */

/** @type {((auswahl: { modus: string, untermodus?: string, entwurf?: string }, ausloeser?: HTMLElement) => void) | null} */
let oeffner = null

/**
 * Trägt den Öffner der Shell ein (einmalig beim Bootstrap).
 * @param fn - (auswahl, ausloeser) => void
 */
export function registriereChatOeffner(fn) {
  oeffner = fn
}

/**
 * Öffnet das Chat-Dock im gewünschten Modus mit einem Entwurf in der Eingabe — ohne zu senden.
 * @param auswahl - { modus: 'jarvis' | 'sparring', untermodus?: 'feature' | 'projekt', entwurf?: string }
 * @param ausloeser - der auslösende Knopf (bekommt beim Schließen den Fokus zurück)
 */
export function oeffneChatMitEntwurf(auswahl, ausloeser) {
  if (oeffner === null) {
    console.error('Chat-Dock: kein Öffner registriert (shell.js initChatDock lief nicht).')
    return
  }
  oeffner(auswahl, ausloeser)
}
