# Bulgular

## C1 uygulaması
- Kullanıcı ikinci tankın kaydedilmemiş değişiklikleri üzerine ilerlemeye izin verdi; başka ajan dosya sahipliği engeli kalmadı.
- İki araç aynı Havok dünyasında tek `_step` ile ilerletildi. Rakip C1’de frenli, hasarsız ve ateşsizdir; kamera/girdi oyuncuda kalır.
- Chromium CDP 1280×720 içinde iki model rolü de açıldı: iki `tank-physics`, iki `tank-placement`, `tank-follow` kamera ve doğru oyuncu seçimi doğrulandı; W/R girdi smoke testi, sıfır runtime exception. Görseller /tmp/d3-combat-baseline/c1-01.png ve c1-02.png altında.
- npm run map:check, npm test (4/4), npm run combat:test geçti. Gerçek iki-tank Havok doğrulaması ayrıca hazırlanıyor.
- Mevcut ikinci model varlığı ve ortak araç düzenlemeleri commit dışında olduğundan C1 Git teslimi bu önkoşulla uzlaştırılmalı.
- Gerçek haritada 12 m yandaki rakip eğimli zeminde kaydı. Oyuncudan 6 m yana alınan açık düzlükte her iki model rolü için 7 s kararlı duruş, 3,02 m gövde açıklığı ve açık fizik görüş hattı doğrulandı.

- README, GAME_DESIGN, ROADMAP, DECISIONS, ARCHITECTURE ve VALIDATION incelendi. İndekslenmiş spec aramasında savaş/hasar kaydı bulunmadı; mevcut tasarım belgeleri frontmatter taşımıyor.
- src/mapPreview.ts tek TankVehicle kuruyor; ikinci model URL tank=02 ile seçiliyor. Bu, sahnede iki eşzamanlı tank anlamına gelmiyor.
- Top ve MG isabetleri yalnız efekt/geri bildirim üretiyor. ArmorModel ve ArmorTarget korunmuş, son top akışında delme çözümü kullanılmıyor.
- ProjectileSystem sabit adımlı süpürülmüş sorgu kullanıyor; raycast kapanışı şu anda yalnız oyuncu gövdesini dışlıyor. AI mermileri için atıcı ayrımı gerekiyor.
- Gerçek namlu başlangıcı, 180 m/s, yerçekimi, 5 s dolum, geri tepme ve atış sesi mevcut; bunlar korunacak.
- İkinci tank/sürüş/araç testleri ve kök plan belgelerinde kullanıcıya ait commit dışı çalışmalar var. Bu göreve katılmayacak.
- .planning/.active_plan kullanıcı tarafından değiştirilmiş; bu görev o işaretçiyi değiştirmeden kendi dizinini kullanır.
- docs/VALIDATION.md içindeki eski zırh/modül kabulü uzun vadeli M3 kapsamıdır; basit can düellosu tüm M3 tamamlandı demek değildir.
