/**
 * Datei: public/leitstand/i18n/tr.js
 *
 * Zweck: Türkisches Wörterbuch des Leitstands (F44 WS-1a, E-F44-2 = B).
 *
 * Wird aufgerufen von:
 * - public/leitstand/i18n.js
 * - scripts/check-f44-i18n.mjs
 *
 * Wichtig: Maschinell übersetzt, nicht muttersprachlich geprüft (F-866).
 * Schlüsselmenge und Platzhalter wie public/leitstand/i18n/de.js (i18n-Gate).
 */

export default {
  // F44 WS-1b: Shell (Sidebar, Kopf, Persona-Status, Startfläche, Baustein „kommt“, Platzhalterseiten).
  'nav.haupt': 'Ana gezinme',
  'nav.weitere': 'Diğer alanlar',
  'nav.produktuebersicht': 'Ürün özeti',
  'nav.roadmap': 'Yol haritası',
  'nav.entwicklung': 'Geliştirme',
  'nav.ausfuehrungen': 'Çalıştırmalar',
  'nav.auftragStart': 'Görev ve başlatma',
  'nav.entscheidungen': 'Kararlar',
  'nav.produktzyklus': 'Ürün döngüsü',
  'nav.brain': 'Brain',
  'nav.alleProdukte': 'Tüm ürünler',
  'nav.nutzung': 'Kullanım',
  'nav.einstellungen': 'Ayarlar',
  'nav.profil.unterzeile': 'Kişisel atölyen',
  'nav.workforce': 'Workforce',
  'nav.zuletzt': 'Son açılanlar',

  'kopf.menue': 'Gezinmeyi aç',
  'kopf.menueSchliessen': 'Gezinmeyi kapat',
  'kopf.projekt': 'Proje',
  'kopf.projektAuswahl': 'Etkin proje',
  'kopf.projekteFehler': 'Proje listesi yüklenemedi.',
  'kopf.neuesProjekt': 'Yeni proje oluştur',
  'kopf.personaOeffnen': 'Başlangıç ekranını aç',
  'kopf.sprache': 'Dil',
  'kopf.themeTitel': 'Açık / Koyu',
  'kopf.themeHell': 'Açık tasarımı etkinleştir',
  'kopf.themeDunkel': 'Koyu tasarımı etkinleştir',
  'kopf.fragJarvis': 'Jarvis’e sor',
  'kopf.pollFehler': 'Güncelleme başarısız — ekran eski bir durumu gösteriyor olabilir.',

  'persona.status.idle': 'Fikrine hazır',
  'persona.status.thinking': 'Senin için çalışıyor',
  'persona.status.waiting_for_human': 'Seni bekliyor',
  'persona.status.error': 'Bir sorun bildiriyor',

  'start.signatur': 'JARVIS',
  'start.wortmarke': 'AI WORKFORCE',
  'start.betreten': 'Enter the Rabbit hole',
  'start.gesicht': 'Jarvis – gözler ve sırıtış uyanıyor',
  'start.warte.laedt': 'Yükleniyor…',
  'start.warte.aufmerksamkeit': { one: '{anzahl} konu dikkat gerektiriyor', other: '{anzahl} konu dikkat gerektiriyor' },
  'start.warte.fehlgeschlagen': 'Güncelleme başarısız',
  'start.warte.entscheidungen': { one: '{anzahl} karar bekliyor', other: '{anzahl} karar bekliyor' },
  'start.warte.lauf': 'Şu anda bir çalıştırma etkin',
  'start.warte.nichts': 'Şu anda bekleyen bir şey yok',

  'kommt.badge': 'yakında',

  'platzhalter.brain.eyebrow': 'Brain',
  'platzhalter.brain.beschreibung': 'Bilgi, kod ve kararlar bağlamıyla.',
  'platzhalter.brain.aktion': 'Bilgi ekle',
  'platzhalter.brain.leer.titel': 'Henüz bilgi grafiği yok',
  'platzhalter.brain.leer.text': 'Bu ürünün bilgi, kod ve kararları arasındaki bağlantılar burada görünecek. Bunun için veri kaynağı henüz yok.',
  'platzhalter.produktzyklus.eyebrow': 'Ürün yönetimi',
  'platzhalter.produktzyklus.beschreibung': 'Ideate · Plan · Deliver',
  'platzhalter.produktzyklus.aktion': 'Not ekle',
  'platzhalter.produktzyklus.leer.titel': 'Ürün özeti',
  'platzhalter.produktzyklus.leer.text': 'Henüz kayıtlı bulgu veya karar yok.',
  'platzhalter.roadmap.eyebrow': 'Ürüne giden yol',
  'platzhalter.roadmap.titel': 'Yol haritası',
  'platzhalter.roadmap.text': 'Yeniden tasarıma kadar yol haritası Geliştirme bölümünde bir kart olarak duruyor.',
  'platzhalter.roadmap.link': 'Yol haritası kartına git',
  'platzhalter.nutzung.eyebrow': 'Anlaşılır biçimde',
  'platzhalter.nutzung.titel': 'Kullanım',
  'platzhalter.nutzung.text': 'Yeniden tasarıma kadar kullanım, ürün özetinde bir kart olarak duruyor.',
  'platzhalter.nutzung.link': 'Kullanıma git',

  'einstellungen.eyebrow': 'Atölyen',
  'einstellungen.titel': 'Ayarlar',
  'einstellungen.beschreibung': 'Çalışma tarzına uyan sakin bir arayüz.',

  'einstellungen.darstellung.titel': 'Görünüm ve hareket',
  'einstellungen.farbschema.gruppe': 'Renk şeması',
  'einstellungen.farbschema.dunkel': 'Koyu',
  'einstellungen.farbschema.hell': 'Açık',
  'einstellungen.farbschema.hinweis': 'Seçimin bu tarayıcıda kaydedilir.',
  'einstellungen.bewegung.titel': 'Yumuşak hareketi etkinleştir',
  'einstellungen.bewegung.beschreibung': 'Jarvis uyanır ve imlece hafifçe tepki verir. Azaltılmış hareket için sistem ayarın önceliklidir.',
  'einstellungen.bewegung.systemvorrang': 'Sistem ayarın şu anda hareketi azaltıyor.',

  'einstellungen.sprache.titel': 'Dil',
  'einstellungen.sprache.feld': 'Arayüz dili',
  'einstellungen.sprache.hinweis': 'Değiştirdikten sonra sayfa yeniden yüklenir. Proje içerikleri, sunucu yanıtları ve girdilerin özgün dillerinde kalır. Henüz dönüştürülmemiş görünümler şimdilik Almanca kalır.',
  'einstellungen.sprache.fehler': 'Dil bu tarayıcıda kaydedilemedi (depolama engelli, ör. gizli pencere).',

  'einstellungen.gestaltung.titel': 'Gümüş gravür ve gök mekaniği',
  'einstellungen.gestaltung.text': 'Mat arduvaz mavisi. Sıcak fildişi tonları. Sessiz bir vurgu olarak yeşim. Geniş boşluklar ve tipografik hiyerarşi.',
  'einstellungen.gestaltung.prinzip': 'Tasarım ilkesi',
  'einstellungen.gestaltung.prinzip.zeile1': 'Önce özü.',
  'einstellungen.gestaltung.prinzip.zeile2': 'Ayrıntılar ilgi hâlinde.',
  'einstellungen.gestaltung.prinzip.zeile3': 'Her karar bilinçli.',

  'sprache.de': 'Deutsch',
  'sprache.en': 'English',
  'sprache.tr': 'Türkçe',
  'sprache.ru': 'Русский',
}
