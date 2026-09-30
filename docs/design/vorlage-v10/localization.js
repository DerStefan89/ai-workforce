/* Interface language only. Product content and original evidence keep their source language. */
(()=>{
const rows=`
Produktübersicht · Du steuerst. Die Workforce entwickelt.|Product overview · You lead. The Workforce builds.|Ürün özeti · Sen yönetirsin. İş gücü geliştirir.|Обзор продукта · Ты управляешь. Команда ИИ разрабатывает.
Aktueller Meilenstein: Verlässlich arbeiten|Current milestone: reliable delivery|Güncel kilometre taşı: güvenilir çalışma|Текущая веха: надёжная работа
Letzter Worker: Codex · Modell: nicht beobachtet|Last worker: Codex · model: not observed|Son çalışan: Codex · model: gözlemlenmedi|Последний исполнитель: Codex · модель: нет наблюдений
Worker: Claude Code · Modell: nicht beobachtet|Worker: Claude Code · model: not observed|Çalışan: Claude Code · model: gözlemlenmedi|Исполнитель: Claude Code · модель: нет наблюдений
Deine Abnahme / Übergabe|Your acceptance / handover|Senin kabulün / teslim|Твоя приёмка / передача
Veröffentlichung bleibt separat|Release remains separate|Yayın ayrı bir adımdır|Публикация — отдельный этап
Modellherkunft verstehen|Understand model provenance|Model kaynağını anla|Понять происхождение модели
Claude Code und Codex sind Worker, keine Modellnamen. Das tatsächlich beobachtete Modell ist in diesen Beispieldaten nicht enthalten. Im Produkt wird es aus der Laufakte übernommen, zusammen mit Quelle und Zeitpunkt.|Claude Code and Codex are workers, not model names. These sample records do not contain the observed model. The product will read it from the execution record, with source and time.|Claude Code ve Codex çalışanlardır, model adları değildir. Bu örnek veriler gözlemlenen modeli içermez. Ürün bu bilgiyi kaynak ve zamanla birlikte çalışma kaydından alacaktır.|Claude Code и Codex — исполнители, а не названия моделей. В примерах нет наблюдаемой модели. Продукт получит её из записи выполнения вместе с источником и временем.
Planungsentwurf · 6 relative Wochen|Planning draft · 6 relative weeks|Planlama taslağı · 6 göreli hafta|Черновик плана · 6 относительных недель
Hover für Details · Klick zum Öffnen|Hover for details · click to open|Ayrıntılar için üzerine gel · açmak için tıkla|Наведи для подробностей · нажми для открытия
Meilenstein / Eintrag|Milestone / item|Kilometre taşı / öğe|Веха / задача
Die Zeitfenster sind ein editierbarer Beispielplan, keine gemessenen Laufzeiten oder zugesagten Termine. Balkenfüllung = abgeschlossene Arbeitsschritte.|Time windows are an editable sample plan, not measured durations or promised dates. Bar fill = completed workflow steps.|Zaman aralıkları düzenlenebilir örnek plandır; ölçülen süreler veya taahhüt edilen tarihler değildir. Çubuk doluluğu = tamamlanan iş adımları.|Временные окна — редактируемый пример плана, а не измеренная длительность или обещанные сроки. Заполнение полосы = завершённые шаги.
Zeitfenster planen|Plan time window|Zaman aralığını planla|Запланировать период
Zeitfenster ändern|Edit time window|Zaman aralığını değiştir|Изменить период
Zeitraum|Time window|Zaman aralığı|Период
Noch nicht geplant|Not scheduled yet|Henüz planlanmadı|Пока не запланировано
Startwoche|Start week|Başlangıç haftası|Начальная неделя
Endwoche|End week|Bitiş haftası|Конечная неделя
Für wen?|Who is it for?|Kimin için?|Для кого?
Welches Problem lösen wir?|What problem are we solving?|Hangi sorunu çözüyoruz?|Какую проблему решаем?
Woran erkennen wir Erfolg?|How do we recognize success?|Başarıyı nasıl anlarız?|Как определяем успех?
Eintrag und aktueller Ablaufstatus|Item and current workflow status|Öğe ve güncel iş akışı durumu|Задача и текущее состояние процесса
Was soll möglich werden?|What should become possible?|Ne mümkün olmalı?|Что должно стать возможным?
Was funktioniert nicht?|What is not working?|Ne çalışmıyor?|Что не работает?
Was soll die Workforce besser machen?|What should the Workforce improve?|İş gücü neyi iyileştirmeli?|Что должна улучшить команда ИИ?
Nutzen für das Produkt|Value for the product|Ürün için fayda|Польза для продукта
Woran wir ein gutes Ergebnis erkennen|How we recognize a good result|İyi bir sonucu nasıl anlarız|Как определить хороший результат
Deine Produktplanung|Your product planning|Ürün planlaman|Твой план продукта
Einordnung & Quelle|Context & source|Bağlam ve kaynak|Контекст и источник
Geplante Funktion · noch nicht verfügbar|Planned feature · not available yet|Planlanan özellik · henüz kullanılamıyor|Планируемая функция · пока недоступна
Als Nächstes vormerken|Mark as next|Sıradaki olarak işaretle|Отметить следующей
Noch nicht eingeplant|Not scheduled|Henüz planlanmadı|Не запланировано
Planung in der Vorschau · startet keine Entwicklung.|Preview planning · does not start development.|Önizleme planlaması · geliştirmeyi başlatmaz.|План в прототипе · не запускает разработку.
Auf der Roadmap ansehen →|View on roadmap →|Yol haritasında gör →|Смотреть на дорожной карте →
Die genaue Fundstelle wird bei der Analyse ergänzt.|The exact location will be added during analysis.|Kesin konum analiz sırasında eklenecek.|Точное место будет добавлено при анализе.
Fundstelle & Auswirkungen|Location & impact|Konum ve etkiler|Место и последствия
Designprototyp · Beispieldaten · Kein Live-System|Design prototype · sample data · not a live system|Tasarım prototipi · örnek veriler · canlı sistem değil|Дизайн-прототип · примеры данных · не рабочая система
Ansichten & Einstellungen|Views & settings|Görünümler ve ayarlar|Виды и настройки
Dein persönliches Atelier|Your personal atelier|Kişisel atölyen|Твоя личная мастерская
Zum Inhalt|Skip to content|İçeriğe geç|К содержимому
Neues Produkt|New product|Yeni ürün|Новый продукт
Neues Produkt anlegen|Create new product|Yeni ürün oluştur|Создать продукт
Was möchtest du entwickeln?|What would you like to build?|Ne geliştirmek istiyorsun?|Что ты хочешь разработать?
Ein Name und ein erstes Ziel reichen für den Anfang.|A name and an initial goal are enough to start.|Başlamak için bir ad ve ilk hedef yeterli.|Для начала достаточно названия и первой цели.
Produktname|Product name|Ürün adı|Название продукта
Was soll dein Produkt ermöglichen?|What should your product enable?|Ürünün neyi mümkün kılmalı?|Что должен позволять твой продукт?
Zielgruppe ergänzen · optional|Add audience · optional|Hedef kitle ekle · isteğe bağlı|Добавить аудиторию · необязательно
Für wen entwickeln wir?|Who are we building for?|Kimin için geliştiriyoruz?|Для кого мы разрабатываем?
Projektordner · optional|Project folder · optional|Proje klasörü · isteğe bağlı|Папка проекта · необязательно
Vorhandener Projektordner|Existing project folder|Mevcut proje klasörü|Существующая папка проекта
Für die echte Umsetzung wird ein verbundenes Projektverzeichnis benötigt. Die Vorschau erstellt keine Dateien.|Real implementation requires a connected project folder. This preview creates no files.|Gerçek uygulama için bağlı bir proje klasörü gerekir. Önizleme dosya oluşturmaz.|Для реальной разработки нужна подключённая папка проекта. Прототип не создаёт файлы.
Produkt anlegen|Create product|Ürün oluştur|Создать продукт
Designvorschau: Das Produkt bleibt während dieser Sitzung verfügbar.|Design preview: the product remains available during this session.|Tasarım önizlemesi: ürün bu oturum boyunca kullanılabilir.|Прототип: продукт доступен в течение этого сеанса.
Produkt angelegt|Product created|Ürün oluşturuldu|Продукт создан
Du kannst dein Ziel jederzeit bearbeiten. Jetzt beschreiben wir die erste sinnvolle Funktion.|You can edit your goal anytime. Now describe the first useful feature.|Hedefini istediğin zaman düzenleyebilirsin. Şimdi ilk faydalı özelliği tanımla.|Цель можно изменить в любой момент. Теперь опиши первую полезную функцию.
Dein nächster Schritt|Your next step|Sonraki adımın|Твой следующий шаг
Was soll die erste Version können?|What should the first version do?|İlk sürüm ne yapabilmeli?|Что должна уметь первая версия?
Erstes Feature beschreiben|Describe first feature|İlk özelliği tanımla|Описать первую функцию
Erst mit dem Coach klären|Clarify with the Coach first|Önce Coach ile netleştir|Сначала обсудить с Coach
Zur Produktübersicht →|Go to product overview →|Ürün özetine git →|К обзору продукта →
1 · Beschreiben|1 · Describe|1 · Tanımla|1 · Описать
2 · Prüfen|2 · Review|2 · İncele|2 · Проверить
3 · Freigeben|3 · Approve|3 · Onayla|3 · Разрешить
Was soll für Nutzer möglich werden?|What should users be able to do?|Kullanıcılar ne yapabilmeli?|Что смогут делать пользователи?
Jarvis bereitet den Ablauf vor.|Jarvis prepares the workflow.|Jarvis iş akışını hazırlar.|Jarvis подготовит процесс.
Du entscheidest, wann es losgeht.|You decide when work starts.|Çalışmanın ne zaman başlayacağına sen karar verirsin.|Ты решаешь, когда начать работу.
Produkt bearbeiten|Edit product|Ürünü düzenle|Изменить продукт
Problem & Erfolgskriterien|Problem & success criteria|Sorun ve başarı kriterleri|Проблема и критерии успеха
Ändert das Produktbriefing. Bestehende Aufträge und ihre Freigaben bleiben unverändert.|Updates the product brief. Existing tasks and approvals remain unchanged.|Ürün özetini günceller. Mevcut görevler ve onaylar değişmez.|Обновляет описание продукта. Существующие задания и разрешения не меняются.
Beschreibe die erste Funktion.|Describe the first feature.|İlk özelliği tanımla.|Опиши первую функцию.
Es ist noch keine Arbeit geplant. Beginne mit dem Ergebnis, das dein Produkt für Nutzer liefern soll.|No work is planned yet. Start with the outcome your product should deliver for users.|Henüz iş planlanmadı. Ürünün kullanıcılara sağlamasını istediğin sonuçla başla.|Работа пока не запланирована. Начни с результата, который продукт должен дать пользователям.
Mit dem Coach klären|Clarify with the Coach|Coach ile netleştir|Обсудить с Coach
Beschreiben|Describe|Tanımla|Описать
Idee und gewünschtes Ergebnis|Idea and desired outcome|Fikir ve istenen sonuç|Идея и желаемый результат
Ablauf prüfen|Review workflow|İş akışını incele|Проверить процесс
Arbeitsschritte und Zuständigkeiten|Steps and responsibilities|Adımlar ve sorumluluklar|Шаги и ответственность
Freigeben|Approve|Onayla|Разрешить
Bewusster Start der Umsetzung|Deliberate start of implementation|Uygulamayı bilinçli olarak başlat|Осознанный запуск реализации
Planung, Produktzyklus & Workforce ansehen|View planning, product lifecycle & Workforce|Planlamayı, ürün yaşam döngüsünü ve iş gücünü gör|Посмотреть планирование, цикл продукта и команду ИИ
Dein Auftragsentwurf|Your task draft|Görev taslağın|Твой черновик задания
In dieser Sitzung erhalten · noch nicht freigegeben|Kept in this session · not approved yet|Bu oturumda korunur · henüz onaylanmadı|Сохранён в сеансе · ещё не разрешён
Entwurf fortsetzen →|Resume draft →|Taslağa devam et →|Продолжить черновик →
Weiterarbeiten →|Continue work →|Çalışmaya devam et →|Продолжить работу →
Produkt angelegt. Beschreibe jetzt die erste Funktion.|Product created. Describe the first feature now.|Ürün oluşturuldu. Şimdi ilk özelliği tanımla.|Продукт создан. Теперь опиши первую функцию.
Produkt aktualisiert. Bestehende Aufträge bleiben unverändert.|Product updated. Existing tasks remain unchanged.|Ürün güncellendi. Mevcut görevler değişmez.|Продукт обновлён. Существующие задания не изменены.
Technischer Einblick|Technical insight|Teknik görünüm|Технический обзор
Architektur & Code|Architecture & code|Mimari ve kod|Архитектура и код
Architektur|Architecture|Mimari|Архитектура
Datenmodell|Data model|Veri modeli|Модель данных
Code & Änderungen|Code & changes|Kod ve değişiklikler|Код и изменения
Probleme & Fragen|Issues & questions|Sorunlar ve sorular|Проблемы и вопросы
Health & Nachweise|Health & evidence|Sağlık ve kanıtlar|Состояние и подтверждения
Aufbau verstehen, Änderungen nachvollziehen und Risiken prüfen.|Understand structure, trace changes and examine risks.|Yapıyı anla, değişiklikleri izle ve riskleri incele.|Понять устройство, проследить изменения и проверить риски.
Dein Produkt verstehen|Understand your product|Ürününü anla|Понять свой продукт
Was steckt dahinter?|What is behind it?|Arkasında ne var?|Как это устроено?
Architektur, Datenmodell, Code und überprüfbare Befunde.|Architecture, data model, code and verifiable findings.|Mimari, veri modeli, kod ve doğrulanabilir bulgular.|Архитектура, модель данных, код и проверяемые выводы.
Architektur & Daten|Architecture & data|Mimari ve veriler|Архитектура и данные
Konzeptionelles Beispiel für AI Workforce · keine eingelesene Repository-Architektur.|Conceptual AI Workforce example · repository architecture has not been read.|Kavramsal AI Workforce örneği · depo mimarisi okunmadı.|Концептуальный пример AI Workforce · архитектура репозитория не считана.
Architektur noch nicht eingelesen. Verbinde das Repository und lasse den Aufbau analysieren.|Architecture has not been read. Connect the repository for analysis.|Mimari henüz okunmadı. Analiz için depoyu bağla.|Архитектура ещё не считана. Подключи репозиторий для анализа.
Bedienoberfläche|User interface|Kullanıcı arayüzü|Интерфейс
Orchestrierung|Orchestration|Orkestrasyon|Оркестрация
Worker & Werkzeuge|Workers & tools|Çalışanlar ve araçlar|Исполнители и инструменты
Projektwissen & Nachweise|Project knowledge & evidence|Proje bilgisi ve kanıtlar|Знания о проекте и подтверждения
Ausgewählter Baustein|Selected component|Seçilen bileşen|Выбранный компонент
Dazu eine Frage stellen|Ask about this|Bununla ilgili soru sor|Задать вопрос об этом
Problem festhalten|Record issue|Sorunu kaydet|Зафиксировать проблему
Architekturfrage festhalten|Record architecture question|Mimari sorusunu kaydet|Записать вопрос об архитектуре
Konzeptionelles Datenmodell · kein ausgelesenes Datenbankschema. Beziehungen und Felder müssen am echten Repository geprüft werden.|Conceptual data model · not a retrieved database schema. Verify relationships and fields against the repository.|Kavramsal veri modeli · okunmuş veritabanı şeması değildir. İlişkiler ve alanlar depoda doğrulanmalıdır.|Концептуальная модель данных, а не считанная схема БД. Связи и поля нужно проверить по репозиторию.
Frage zum Modell|Ask about the model|Model hakkında sor|Вопрос о модели
Datenmodell noch nicht verfügbar|Data model not available yet|Veri modeli henüz yok|Модель данных пока недоступна
Offene Probleme|Open issues|Açık sorunlar|Открытые проблемы
Noch keine technischen Befunde erfasst. Das ist kein Nachweis für Fehlerfreiheit.|No technical findings recorded yet. This does not prove absence of bugs.|Henüz teknik bulgu kaydedilmedi. Bu, hatasızlığı kanıtlamaz.|Технические замечания пока не зафиксированы. Это не доказывает отсутствие ошибок.
Fragen zum Produkt|Product questions|Ürün soruları|Вопросы о продукте
Frage stellen|Ask question|Soru sor|Задать вопрос
Offen · keine KI-Antwort|Open · no AI answer|Açık · yapay zekâ yanıtı yok|Открыт · нет ответа ИИ
Stelle eine Frage zu Aufbau, Daten, Entscheidungen oder Problemen.|Ask about structure, data, decisions or issues.|Yapı, veriler, kararlar veya sorunlarla ilgili sor.|Задай вопрос об устройстве, данных, решениях или проблемах.
Designvorschau · Einträge und Bewertungen bleiben in dieser Sitzung. Keine Live-Analyse.|Design preview · records and assessments last for this session. No live analysis.|Tasarım önizlemesi · kayıtlar ve değerlendirmeler bu oturumda kalır. Canlı analiz yok.|Прототип · записи и оценки хранятся в сеансе. Нет анализа в реальном времени.
Produkt-Repository|Product repository|Ürün deposu|Репозиторий продукта
Repository hinterlegt|Repository link saved|Depo bağlantısı kaydedildi|Ссылка на репозиторий сохранена
Noch nicht verbunden|Not connected yet|Henüz bağlı değil|Ещё не подключён
Repository öffnen ↗|Open repository ↗|Depoyu aç ↗|Открыть репозиторий ↗
Repository-Link hinterlegen|Set repository link|Depo bağlantısı ekle|Указать ссылку на репозиторий
Gerade bearbeitet|Currently being edited|Şu anda düzenlenen|Сейчас редактируется
Keine aktive Entwicklung in diesem Produkt|No active development in this product|Bu üründe etkin geliştirme yok|В этом продукте нет активной разработки
Dateiänderungen werden noch nicht beobachtet. Eine aktive Rolle ist kein Nachweis dafür, welche Datei sie gerade bearbeitet.|File changes are not observed yet. An active role does not identify the file it is editing.|Dosya değişiklikleri henüz gözlemlenmiyor. Etkin rol hangi dosyanın düzenlendiğini göstermez.|Изменения файлов пока не отслеживаются. Активная роль не показывает, какой файл она редактирует.
Live-Dateiaktivität erscheint erst mit der echten Worker-Anbindung.|Live file activity requires a real worker connection.|Canlı dosya etkinliği gerçek çalışan bağlantısı gerektirir.|Активность файлов появится после подключения исполнителей.
Zuletzt gemeldete Datei · Beispiel F35|Last reported file · F35 example|Son bildirilen dosya · F35 örneği|Последний указанный файл · пример F35
Tatsächlicher Code dieser Designreferenz|Actual code of this design reference|Bu tasarım referansının gerçek kodu|Настоящий код этого прототипа
Oberfläche im Detail|Interface in detail|Arayüz ayrıntıları|Интерфейс в деталях
Diese Dateien gehören zum Designprototyp, nicht zum verbundenen Produkt.|These files belong to the design prototype, not the linked product.|Bu dosyalar bağlı ürüne değil, tasarım prototipine aittir.|Эти файлы относятся к прототипу дизайна, а не к подключённому продукту.
Interaktionen|Interactions|Etkileşimler|Взаимодействия
Gestaltung|Styling|Görsel tasarım|Оформление
Sprachen|Languages|Diller|Языки
Datei herunterladen|Download file|Dosyayı indir|Скачать файл
Wähle eine Datei, um ihren aktuellen Inhalt schreibgeschützt anzusehen.|Select a file to view its current content read-only.|Geçerli içeriğini salt okunur görüntülemek için bir dosya seç.|Выбери файл для просмотра текущего содержимого без редактирования.
Nicht vollständig bewertet|Assessment incomplete|Değerlendirme tamamlanmadı|Оценка неполная
Kritischer Befund|Critical finding|Kritik bulgu|Критическое замечание
Prüffelder erfüllt|Checks satisfied|Kontroller karşılandı|Проверки пройдены
Handlungsbedarf|Action needed|Eylem gerekiyor|Нужны действия
Prüffelder mit Nachweis|Checks with evidence|Kanıtlı kontroller|Проверки с подтверждением
Nicht bewertet|Not assessed|Değerlendirilmedi|Не оценено
Erfüllt|Satisfied|Karşılandı|Выполнено
Eingeschränkt|Partially satisfied|Kısmen karşılandı|Частично выполнено
Nicht erfüllt|Not satisfied|Karşılanmadı|Не выполнено
Bewertung erfassen|Record assessment|Değerlendirme ekle|Записать оценку
Wie entsteht die Bewertung?|How is the score calculated?|Puan nasıl hesaplanır?|Как рассчитывается оценка?
Frage zum Produkt|Product question|Ürün sorusu|Вопрос о продукте
Was möchtest du verstehen?|What would you like to understand?|Neyi anlamak istiyorsun?|Что ты хочешь понять?
Frage vorbereiten|Prepare question|Soruyu hazırla|Подготовить вопрос
Technisches Problem festhalten|Record technical issue|Teknik sorunu kaydet|Зафиксировать техническую проблему
Problem & Auswirkung|Issue & impact|Sorun ve etki|Проблема и последствия
Quelle / betroffener Stand|Source / affected version|Kaynak / etkilenen sürüm|Источник / затронутая версия
Problem speichern|Save issue|Sorunu kaydet|Сохранить проблему
Als Arbeit vorbereiten|Prepare as work item|İş öğesi olarak hazırla|Подготовить задачу
Im Arbeitsvorrat öffnen →|Open in backlog →|İş listesinde aç →|Открыть в списке задач →
Nachweisbasierte Bewertung|Evidence-based assessment|Kanıta dayalı değerlendirme|Оценка на основе подтверждений
Prüfergebnis|Check result|Kontrol sonucu|Результат проверки
Nachweis und Bezugsstand|Evidence and reference version|Kanıt ve referans sürüm|Подтверждение и версия
Manuelle Bewertung. Kein automatischer Test und keine Freigabe.|Manual assessment. Not an automatic test or approval.|Manuel değerlendirme. Otomatik test veya onay değildir.|Ручная оценка. Не автоматическая проверка и не разрешение.
Bewertung speichern|Save assessment|Değerlendirmeyi kaydet|Сохранить оценку
Die richtige Idee finden|Find the right idea|Doğru fikri bul|Найти правильную идею
Die Lösung durchdenken|Think through the solution|Çözümü derinleştir|Продумать решение
Umsetzen und ausliefern|Build and deliver|Geliştir ve teslim et|Реализовать и выпустить
Strategie verstehen|Understand strategy|Stratejiyi anla|Понять стратегию
Markt & Nutzer verstehen|Understand market & users|Pazarı ve kullanıcıları anla|Понять рынок и пользователей
Ideen & Feedback sammeln|Collect ideas & feedback|Fikir ve geri bildirim topla|Собрать идеи и отзывы
Lösungen vertiefen|Develop solutions|Çözümleri derinleştir|Проработать решения
Business- & Umsetzungsplan|Business & delivery plan|İş ve uygulama planı|Бизнес-план и план реализации
Technik vertiefen|Develop technical design|Teknik tasarımı derinleştir|Проработать техническое решение
Testen|Test|Test et|Тестировать
Deployen|Deploy|Dağıt|Развернуть
Wissen, Code und Entscheidungen im Zusammenhang.|Knowledge, code and decisions in context.|Bilgi, kod ve kararlar bir arada.|Знания, код и решения во взаимосвязи.
Wissen hinzufügen|Add knowledge|Bilgi ekle|Добавить знание
Wissen bearbeiten|Edit knowledge|Bilgiyi düzenle|Изменить знание
Knoten durchsuchen …|Search nodes …|Düğümleri ara …|Поиск узлов …
Wissen durchsuchen|Search knowledge|Bilgide ara|Поиск знаний
Alle Typen|All types|Tüm türler|Все типы
Verkleinern|Zoom out|Küçült|Уменьшить
Vergrößern|Zoom in|Büyüt|Увеличить
Zurücksetzen|Reset|Sıfırla|Сбросить
Alle Knoten als Liste|All nodes as a list|Tüm düğümler liste olarak|Все узлы списком
Quelle / Bereich öffnen →|Open source / section →|Kaynağı / bölümü aç →|Открыть источник / раздел →
Bearbeiten|Edit|Düzenle|Изменить
Verknüpfen|Link|Bağla|Связать
Challengen|Challenge|Sorgula|Критически проверить
Verbindungen|Connections|Bağlantılar|Связи
Noch keine Verbindungen.|No connections yet.|Henüz bağlantı yok.|Связей пока нет.
Verbindung entfernen|Remove connection|Bağlantıyı kaldır|Удалить связь
Veranschaulichung · kein automatisch extrahierter Codegraph. Graphify / Oblivion: noch nicht angebunden.|Illustration · not an automatically extracted code graph. Graphify / Oblivion: not connected yet.|Görselleştirme · otomatik çıkarılmış kod grafiği değildir. Graphify / Oblivion: henüz bağlı değil.|Иллюстрация · не автоматически извлечённый граф кода. Graphify / Oblivion пока не подключены.
Projektdokumente erkunden|Explore project documents|Proje belgelerini keşfet|Изучить документы проекта
Inhalt ansehen, als Entwurf bearbeiten und kritisch prüfen lassen.|View content, edit a draft and prepare a critical review.|İçeriği gör, taslak olarak düzenle ve eleştirel incelemeye hazırla.|Просмотреть содержание, изменить черновик и подготовить критическую проверку.
Dokument öffnen →|Open document →|Belgeyi aç →|Открыть документ →
Dokument öffnen & bearbeiten →|Open & edit document →|Belgeyi aç ve düzenle →|Открыть и изменить документ →
Erkunden, bearbeiten und kritisch hinterfragen.|Explore, edit and critically examine.|Keşfet, düzenle ve eleştirel sorgula.|Изучить, изменить и критически проверить.
Dokumentinhalt|Document content|Belge içeriği|Содержимое документа
Quelle / Bezugsstand|Source / reference version|Kaynak / referans sürüm|Источник / версия
Entwurf speichern|Save draft|Taslağı kaydet|Сохранить черновик
Challengen lassen|Request critical review|Eleştirel inceleme iste|Запросить критическую проверку
Prüffragen|Review questions|İnceleme soruları|Вопросы для проверки
Im Brain ansehen →|View in Brain →|Brain'de gör →|Посмотреть в Brain →
Die Frage wird im Coach vorbereitet. Keine automatische Analyse oder Dateiänderung.|The question is prepared in the Coach. No automatic analysis or file change.|Soru Coach'ta hazırlanır. Otomatik analiz veya dosya değişikliği yoktur.|Вопрос подготавливается в Coach. Нет автоматического анализа или изменения файла.
Quelle|Source|Kaynak|Источник
Inhalt|Content|İçerik|Содержание
Typ|Type|Tür|Тип
Bearbeitet den Wissensknoten in der Vorschau, nicht die Quelldatei.|Edits the preview knowledge node, not the source file.|Kaynak dosyayı değil, önizlemedeki bilgi düğümünü düzenler.|Изменяет узел знаний в прототипе, а не исходный файл.
Wissen verbinden|Connect knowledge|Bilgiyi bağla|Связать знания
Verbindung zu|Connect to|Şuna bağla|Связать с
Beziehung|Relationship|İlişki|Отношение
Verbinden|Connect|Bağla|Соединить
Füge zuerst den Dokumentinhalt ein.|Paste the document content first.|Önce belge içeriğini yapıştır.|Сначала вставь содержимое документа.
Dokumententwurf gespeichert. Originaldatei unverändert.|Document draft saved. Original file unchanged.|Belge taslağı kaydedildi. Özgün dosya değişmedi.|Черновик документа сохранён. Исходный файл не изменён.
Produktübersicht|Product overview|Ürün özeti|Обзор продукта
Alle Produkte|All products|Tüm ürünler|Все продукты
Roadmap|Roadmap|Yol haritası|Дорожная карта
Entwicklung|Development|Geliştirme|Разработка
Entscheidungen|Decisions|Kararlar|Решения
Workforce|Workforce|İş gücü|Команда ИИ
Produktzyklus|Product lifecycle|Ürün yaşam döngüsü|Жизненный цикл продукта
Nutzung|Usage|Kullanım|Использование
Einstellungen|Settings|Ayarlar|Настройки
Sprache|Language|Dil|Язык
Projekt|Project|Proje|Проект
Aktives Projekt|Active project|Etkin proje|Текущий проект
DESIGNVORSCHAU|DESIGN PREVIEW|TASARIM ÖNİZLEMESİ|ПРОТОТИП
Bereit, wenn du es bist|Ready when you are|Hazır olduğunda buradayım|Готов, когда ты готов
Bereit für deine Idee|Ready for your idea|Fikrin için hazır|Готов к твоей идее
Wartet auf dich|Waiting for you|Seni bekliyor|Ждёт тебя
Arbeitet für dich|Working for you|Senin için çalışıyor|Работает для тебя
Produktfortschritt|Product progress|Ürün ilerlemesi|Прогресс продукта
abgenommen|accepted|kabul edildi|принято
Abgenommen|Accepted|Kabul edildi|Принято
Erfasste Einträge · keine Aufwandsprognose|Tracked items · not an effort estimate|Kayıtlı öğeler · efor tahmini değildir|Учтённые задачи · не оценка трудозатрат
Erfasste Einträge abgenommen|Tracked items accepted|Kabul edilen kayıtlı öğeler|Принятые учтённые задачи
Entwicklungsstand ansehen →|View delivery status →|Geliştirme durumunu gör →|Смотреть ход разработки →
Aktuelle Rolle|Current role|Güncel rol|Текущая роль
Noch keine Rolle aktiv|No active role yet|Henüz etkin rol yok|Пока нет активной роли
Deine Abnahme|Your acceptance|Senin kabulün|Твоя приёмка
Deine Freigabe|Your approval|Senin onayın|Твоё разрешение
Modell: nicht beobachtet|Model: not observed|Model: gözlemlenmedi|Модель: нет наблюдений
Menschliche Entscheidung · kein Modell aktiv|Human decision · no active model|İnsan kararı · etkin model yok|Решение человека · модель не активна
Keine aktive Ausführung|No active execution|Etkin çalışma yok|Нет активного выполнения
Deployer · Mensch|Deployer · Human|Deployer · İnsan|Deployer · Человек
Stefan · Abnahme und Veröffentlichung|Stefan · acceptance and release|Stefan · kabul ve yayın|Стефан · приёмка и выпуск
Abgenommen heißt noch nicht veröffentlicht.|Accepted does not mean released.|Kabul edilmiş olması yayınlandığı anlamına gelmez.|Принято — ещё не значит опубликовано.
Übergabe planen|Plan handover|Teslimi planla|Запланировать передачу
Noch nicht bereit|Not ready yet|Henüz hazır değil|Пока не готово
Ergebnisse prüfen →|Review results →|Sonuçları incele →|Проверить результаты →
Phasen & Rollen ansehen →|View phases & roles →|Aşamaları ve rolleri gör →|Смотреть этапы и роли →
Produktmanagement|Product management|Ürün yönetimi|Управление продуктом
Von der Vision zur messbaren Wirkung|From vision to measurable impact|Vizyondan ölçülebilir etkiye|От видения к измеримому результату
Strategie · Nutzerwissen · Planung · Entwicklung · Veröffentlichung · Lernen|Strategy · research · planning · delivery · release · learning|Strateji · araştırma · planlama · geliştirme · yayın · öğrenme|Стратегия · исследования · планирование · разработка · выпуск · обучение
Produktzyklus öffnen →|Open product lifecycle →|Ürün yaşam döngüsünü aç →|Открыть цикл продукта →
Strategie|Strategy|Strateji|Стратегия
Nutzer verstehen|Understand users|Kullanıcıları anla|Понять пользователей
Feedback sammeln|Capture feedback|Geri bildirim topla|Собрать отзывы
Lösungen erkunden|Explore solutions|Çözümleri keşfet|Изучить решения
Planen|Plan|Planla|Планирование
Ausrichtung teilen|Share direction|Yönü paylaş|Обсудить направление
Entwickeln|Deliver|Geliştir|Разработка
Dokumentieren|Document|Belgele|Документирование
Veröffentlichen|Launch|Yayınla|Выпуск
Wirkung prüfen|Analyze impact|Etkiyi değerlendir|Оценка результата
Vision, Zielgruppe und messbaren Nutzen klären.|Clarify vision, audience and measurable value.|Vizyonu, hedef kitleyi ve ölçülebilir faydayı netleştir.|Определить видение, аудиторию и измеримую пользу.
Interviews, Beobachtungen und offene Nutzerfragen festhalten.|Capture interviews, observations and open user questions.|Görüşmeleri, gözlemleri ve açık kullanıcı sorularını kaydet.|Фиксировать интервью, наблюдения и вопросы пользователей.
Rückmeldungen mit Quelle und betroffenen Einträgen verbinden.|Connect feedback to sources and affected items.|Geri bildirimi kaynaklara ve ilgili öğelere bağla.|Связать отзывы с источниками и задачами.
Alternativen, Annahmen und Experimente vergleichen.|Compare alternatives, assumptions and experiments.|Alternatifleri, varsayımları ve deneyleri karşılaştır.|Сравнить альтернативы, предположения и эксперименты.
Features priorisieren und Meilensteinen zuordnen.|Prioritize features and assign milestones.|Özellikleri önceliklendir ve kilometre taşlarına ata.|Расставить приоритеты и связать функции с вехами.
Roadmap, Nutzen und nächste Lieferung verständlich vermitteln.|Communicate the roadmap, value and next delivery.|Yol haritasını, faydayı ve sonraki teslimatı açıkla.|Понятно объяснить план, пользу и следующую поставку.
Umsetzung, Review und menschliche Abnahme steuern.|Manage implementation, review and human acceptance.|Uygulamayı, incelemeyi ve insan kabulünü yönet.|Управлять реализацией, проверкой и приёмкой человеком.
Produktwissen, Entscheidungen und Änderungen festhalten.|Document product knowledge, decisions and changes.|Ürün bilgisini, kararları ve değişiklikleri kaydet.|Документировать знания, решения и изменения.
Release vorbereiten und bewusst zur Veröffentlichung freigeben.|Prepare a release and explicitly approve publication.|Sürümü hazırla ve yayını bilinçli olarak onayla.|Подготовить выпуск и явно разрешить публикацию.
Ergebnisse mit Produktzielen und Nutzerfeedback vergleichen.|Compare results with product goals and user feedback.|Sonuçları ürün hedefleri ve kullanıcı geri bildirimiyle karşılaştır.|Сопоставить результаты с целями и отзывами пользователей.
Produktbriefing|Product brief|Ürün özeti|Описание продукта
Nutzerforschung|User research|Kullanıcı araştırması|Исследования пользователей
Feedback|Feedback|Geri bildirim|Отзывы
Lösungsideen|Solution ideas|Çözüm fikirleri|Идеи решений
Produktkommunikation|Product communication|Ürün iletişimi|Коммуникация о продукте
Produktwissen|Product knowledge|Ürün bilgisi|Знания о продукте
Releaseplanung|Release planning|Sürüm planlaması|Планирование выпуска
Wirkungsmessung|Impact measurement|Etki ölçümü|Измерение результата
Notiz hinzufügen|Add note|Not ekle|Добавить заметку
Noch keine Erkenntnisse oder Entscheidungen erfasst.|No insights or decisions captured yet.|Henüz bulgu veya karar kaydedilmedi.|Пока нет зафиксированных выводов или решений.
Sitzungsentwurf · keine Live-Daten oder automatische Veröffentlichung.|Session draft · no live data or automatic publishing.|Oturum taslağı · canlı veri veya otomatik yayın yok.|Черновик сеанса · нет live-данных или автоматической публикации.
Eintrag bearbeiten|Edit item|Öğeyi düzenle|Изменить задачу
Insights ansehen|View insights|İçgörüleri gör|Смотреть выводы
Insights & Erkenntnisse|Insights & evidence|İçgörüler ve bulgular|Выводы и наблюдения
Insight hinzufügen|Add insight|İçgörü ekle|Добавить вывод
Beobachtung · Vorschauzustand|Observation · preview state|Gözlem · önizleme durumu|Наблюдение · состояние прототипа
Quelle: Eintrag und aktueller Ablaufstatus|Source: item and current workflow status|Kaynak: öğe ve güncel iş akışı durumu|Источник: задача и текущее состояние процесса
Offene Frage · keine Diagnose|Open question · not a diagnosis|Açık soru · teşhis değildir|Открытый вопрос · не диагноз
Ursache und Auswirkung klären|Clarify cause and impact|Nedeni ve etkiyi netleştir|Выяснить причину и последствия
Nutzen und Annahmen prüfen|Examine value and assumptions|Faydayı ve varsayımları incele|Проверить пользу и предположения
Wie lässt sich der Fehler reproduzieren? Wer ist betroffen? Welche Nachweise stützen die vermutete Ursache?|How can the bug be reproduced? Who is affected? What evidence supports the suspected cause?|Hata nasıl tekrarlanır? Kim etkileniyor? Şüphelenilen nedeni hangi kanıtlar destekliyor?|Как воспроизвести ошибку? Кто затронут? Чем подтверждается предполагаемая причина?
Welche Nutzer brauchen das? Welches Problem wird gelöst? Woran lässt sich die Verbesserung messen?|Which users need this? What problem is solved? How can improvement be measured?|Hangi kullanıcıların buna ihtiyacı var? Hangi sorun çözülüyor? İyileşme nasıl ölçülür?|Кому это нужно? Какую проблему решает? Как измерить улучшение?
Mit Product Coach besprechen|Discuss with Product Coach|Product Coach ile görüş|Обсудить с Product Coach
Keine automatische KI-Analyse. Erkenntnisse und Quellen werden von dir ergänzt.|No automatic AI analysis. You add insights and sources.|Otomatik yapay zekâ analizi yok. Bulguları ve kaynakları sen eklersin.|Нет автоматического ИИ-анализа. Выводы и источники добавляешь ты.
Titel|Title|Başlık|Название
Beschreibung|Description|Açıklama|Описание
Akzeptanzkriterien|Acceptance criteria|Kabul kriterleri|Критерии приёмки
Änderungsgrund|Reason for change|Değişiklik nedeni|Причина изменения
Änderungen speichern|Save changes|Değişiklikleri kaydet|Сохранить изменения
Änderungsfassung anlegen|Create linked revision|Bağlantılı revizyon oluştur|Создать связанную редакцию
Titel, Beschreibung und Akzeptanzkriterien direkt aktualisieren.|Update title, description and acceptance criteria.|Başlığı, açıklamayı ve kabul kriterlerini güncelle.|Изменить название, описание и критерии приёмки.
Dieser Eintrag wurde bereits gestartet oder geprüft. Deine Änderung wird als neue, verknüpfte Fassung angelegt. Bestehende Arbeit und Freigaben bleiben nachvollziehbar.|This item has already started or been reviewed. Your change creates a linked revision, preserving existing work and approvals.|Bu öğe başlatıldı veya incelendi. Değişiklik bağlantılı yeni bir revizyon oluşturur; mevcut çalışma ve onaylar korunur.|Работа уже начата или проверена. Изменение создаст связанную редакцию, сохранив прежнюю работу и разрешения.
Ursprünglichen Eintrag ansehen →|View original item →|Özgün öğeyi gör →|Посмотреть исходную задачу →
Änderungsverlauf|Change history|Değişiklik geçmişi|История изменений
Einordnung|Type|Tür|Тип
Beobachtung|Observation|Gözlem|Наблюдение
Hypothese|Hypothesis|Hipotez|Гипотеза
Entscheidung|Decision|Karar|Решение
Messwert|Measurement|Ölçüm|Измерение
Erkenntnis|Insight|Bulgu|Вывод
Quelle oder Nachweis|Source or evidence|Kaynak veya kanıt|Источник или подтверждение
Verknüpfter Eintrag|Linked item|Bağlantılı öğe|Связанная задача
Kein Eintrag|No item|Öğe yok|Без задачи
Verknüpften Eintrag öffnen →|Open linked item →|Bağlantılı öğeyi aç →|Открыть связанную задачу →
Produktwissen festhalten|Capture product knowledge|Ürün bilgisini kaydet|Зафиксировать знания о продукте
Sitzungsentwurf · keine automatische KI-Analyse.|Session draft · no automatic AI analysis.|Oturum taslağı · otomatik yapay zekâ analizi yok.|Черновик сеанса · нет автоматического ИИ-анализа.
Speichern|Save|Kaydet|Сохранить
Abbrechen|Cancel|İptal|Отмена
Schließen|Close|Kapat|Закрыть
Dialog schließen|Close dialog|Pencereyi kapat|Закрыть окно
Eintrag erfassen|Add item|Öğe ekle|Добавить задачу
In Arbeit|In progress|Devam ediyor|В работе
Deine Entscheidung|Your decision|Senin kararın|Твоё решение
Geplant|Planned|Planlandı|Запланировано
Aktive Ausführungen|Active executions|Etkin çalışmalar|Активные выполнения
Freigaben & Rückfragen|Approvals & questions|Onaylar ve sorular|Разрешения и вопросы
Fertig aus Produktsicht|Accepted product work|Ürün açısından tamamlandı|Принято с точки зрения продукта
Noch nicht gestartet|Not started yet|Henüz başlamadı|Ещё не начато
Ziel dieser Version|Goal of this version|Bu sürümün hedefi|Цель этой версии
Zielgruppe & Erfolgskriterien|Audience & success criteria|Hedef kitle ve başarı kriterleri|Аудитория и критерии успеха
Ziel schärfen|Refine goal|Hedefi netleştir|Уточнить цель
Deine nächsten Entscheidungen|Your next decisions|Sıradaki kararların|Следующие решения
Alle ansehen →|View all →|Tümünü gör →|Посмотреть всё →
Die Workforce gerade|Workforce right now|İş gücü şu anda|Команда ИИ сейчас
In Umsetzung|Being implemented|Uygulanıyor|В реализации
Wartet auf deinen nächsten Schritt|Waiting for your next step|Sonraki adımını bekliyor|Ждёт твоего следующего шага
Aktuell läuft keine Entwicklung in diesem Projekt.|No development is currently running in this project.|Bu projede şu anda geliştirme çalışmıyor.|В этом проекте сейчас нет активной разработки.
Als Nächstes vorgesehen|Planned next|Sırada planlanan|Следующее по плану
Der Weg zum Produkt|The path to the product|Ürüne giden yol|Путь к продукту
Roadmap öffnen →|Open roadmap →|Yol haritasını aç →|Открыть дорожную карту →
Entwicklungsstand|Delivery status|Geliştirme durumu|Ход разработки
Alle Arbeit ansehen →|View all work →|Tüm işleri gör →|Смотреть все задачи →
Wer macht was – und wofür?|Who is doing what — and why?|Kim ne yapıyor ve neden?|Кто что делает и зачем?
Zuvor|Previously|Önce|Ранее
Jetzt|Now|Şimdi|Сейчас
Danach|Next|Sonra|Далее
Erwarteter Output|Expected output|Beklenen çıktı|Ожидаемый результат
Code Review abgeschlossen|Code review completed|Kod incelemesi tamamlandı|Проверка кода завершена
Kein Modell aktiv|No active model|Etkin model yok|Нет активной модели
Zuletzt umgesetzt|Recently implemented|Son uygulanan|Недавно реализовано
Ergebnis prüfen & abnehmen →|Review & accept result →|Sonucu incele ve kabul et →|Проверить и принять результат →
Arbeitsvorrat priorisieren →|Prioritize backlog →|İş listesini önceliklendir →|Расставить приоритеты →
Features|Features|Özellikler|Функции
Bugs|Bugs|Hatalar|Ошибки
Harness Improvements|Harness improvements|Harness iyileştirmeleri|Улучшения Harness
Priorität|Priority|Öncelik|Приоритет
Meilenstein|Milestone|Kilometre taşı|Веха
Planung speichern|Save planning|Planı kaydet|Сохранить план
Auftrag vorbereiten|Prepare task|Görevi hazırla|Подготовить задание
Vorbereiten|Prepare|Hazırla|Подготовить
Umsetzung vorbereiten|Prepare implementation|Uygulamayı hazırla|Подготовить реализацию
Kanban · Status|Kanban · status|Kanban · durum|Канбан · статус
Kanban · Priorität|Kanban · priority|Kanban · öncelik|Канбан · приоритет
Zeitleiste|Timeline|Zaman çizelgesi|Временная шкала
Alles|All|Tümü|Всё
Ansicht|View|Görünüm|Вид
Braucht dich|Needs you|Sana ihtiyaç var|Нужно твоё участие
Abnahme offen|Acceptance pending|Kabul bekleniyor|Ожидает приёмки
Rückfrage offen|Question pending|Yanıt bekleniyor|Ожидает ответа
Startfreigabe offen|Start approval pending|Başlangıç onayı bekleniyor|Ожидает разрешения на запуск
Frag Jarvis|Ask Jarvis|Jarvis'e sor|Спроси Jarvis
Deine Nachricht …|Your message …|Mesajın …|Твоё сообщение …
Designvorschau · keine KI-Verbindung|Design preview · no AI connection|Tasarım önizlemesi · yapay zekâ bağlantısı yok|Прототип · нет подключения к ИИ
Erkenntnis mit Quelle gespeichert.|Insight and source saved.|Bulgu ve kaynak kaydedildi.|Вывод и источник сохранены.
Änderung gespeichert. Keine Ausführung gestartet.|Change saved. No execution started.|Değişiklik kaydedildi. Çalışma başlatılmadı.|Изменение сохранено. Выполнение не запущено.
Noch keine Wirkungsmessung erfasst.|No impact measurement captured yet.|Henüz etki ölçümü kaydedilmedi.|Измерений результата пока нет.
Abgeschlossene Features belegen noch keinen Nutzernutzen.|Completed features do not yet prove user value.|Tamamlanan özellikler kullanıcı faydasını henüz kanıtlamaz.|Завершённые функции ещё не доказывают пользу для пользователя.
Erfolgskriterium aus dem Produktbriefing|Success criterion from the product brief|Ürün özetindeki başarı kriteri|Критерий успеха из описания продукта
Release prüfen|Review release|Sürümü incele|Проверить выпуск
Abnahme, Dokumentation und Veröffentlichung werden getrennt geprüft.|Acceptance, documentation and release are checked separately.|Kabul, belgeler ve yayın ayrı ayrı kontrol edilir.|Приёмка, документация и выпуск проверяются отдельно.
Akzeptanzkriterien erfüllt?|Acceptance criteria met?|Kabul kriterleri karşılandı mı?|Критерии приёмки выполнены?
Review und Abnahme dokumentiert?|Review and acceptance documented?|İnceleme ve kabul belgelendi mi?|Проверка и приёмка задокументированы?
Releasehinweise und Rückfallplan vorhanden?|Release notes and rollback plan available?|Sürüm notları ve geri dönüş planı var mı?|Есть описание выпуска и план отката?
Priorisieren →|Prioritize →|Önceliklendir →|Расставить приоритеты →
Kanban öffnen →|Open Kanban →|Kanban'ı aç →|Открыть канбан →
Bitte hinterfrage diesen Eintrag:|Please challenge this item:|Lütfen bu öğeyi sorgula:|Пожалуйста, критически оцени эту задачу:
`;
const dictionary=new Map(rows.trim().split('\n').map(r=>{const a=r.split('|');return[a[0],a]})),index={de:0,en:1,tr:2,ru:3};
let language='de';try{language=localStorage.getItem('jarvis-language')||'de';}catch{}if(!(language in index))language='de';
const originals=new WeakMap();
function t(s){if(dictionary.has(s))return dictionary.get(s)[index[language]];const week=s.match(/^Woche (\d+(?:–\d+)?)$/);if(week)return ['Woche ','Week ','Hafta ','Неделя '][index[language]]+week[1];const count=s.match(/^(\d+)\/(\d+) abgenommen$/);if(count)return count[1]+'/'+count[2]+' '+t('abgenommen');return s;}
function translate(){document.documentElement.lang=language;if(!document.createTreeWalker)return;const walker=document.createTreeWalker(document.body,4);let node;while(node=walker.nextNode()){if(node.parentElement?.closest('script,style,textarea,[translate="no"]'))continue;const record=originals.get(node),raw=node.nodeValue,base=record&&raw===record.last?record.base:raw,trim=base.trim();const translated=base.replace(trim,t(trim));if(node.nodeValue!==translated)node.nodeValue=translated;originals.set(node,{base,last:translated});}document.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{for(const a of ['placeholder','aria-label']){if(!el.hasAttribute(a))continue;const key='data-original-'+a;const base=el.getAttribute(key)||el.getAttribute(a);el.setAttribute(key,base);const val=t(base);if(el.getAttribute(a)!==val)el.setAttribute(a,val);}});}
window.JarvisI18n={get language(){return language},t,translate,set(l){if(!(l in index))return;language=l;try{localStorage.setItem('jarvis-language',l)}catch{}translate();}};
if(typeof MutationObserver!=='undefined')new MutationObserver(translate).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
