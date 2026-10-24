# Silah ve taret geliştirme planı

Tarih: 2026-10-24. Durum: **plan; uygulamaya başlanmadı.** Kullanıcının isteği silah ve taret sistemini geliştirmek için plan yapmak. **Kullanıcı önceliği: nişan ve atış hissi; taret, stabilizasyon ve geri tepme.** Aşağıdaki teknik davranışlar ayrıca belirtilmedikçe öneridir.

## Hedef ve mevcut temel

Oyuncu hedefi hemen gösterebilmeli; taret ve namlu fiziksel hız sınırlarıyla bu hedefe yetişmeli. Oyuncu nereye baktığını, topun nereye baktığını ve neden ateş edemediğini anlayabilmeli. Hareket hâlinde atış mümkün olmalı; engebeler ve mekanik sınırlar okunabilir kalmalı.

Kaynak incelemesinde bulunan mevcut temel:

| Sistem | Uygulanmış davranış | Geliştirme ihtiyacı |
|---|---|---|
| Taret | 360° dönüş, 35°/s; dünya hedefini gövdeden bağımsız takip; 60 Hz ve render interpolasyonu | Stabilizasyon sınırlarını ölçmek, ani yön değişimlerini değerlendirmek |
| Namlu | −8°…+20°, 15°/s; ayrı yükseliş pivotu | Gövde ve çevreyle kesişme kuralları |
| Nişan | Kamera hedefi ve gerçek namlu halkası ayrı; Alt/C serbest bakış | Nişancı görüşünde de hedef/namlu farkının açık gösterimi |
| Nişancı görüşü | Sağ tık basılı tutma; hedefe bakan kamera | Görüşün namlu yetişmeden hedefe dönmesi ve yakın engellerde kamera konumu |
| Top | Tek 120 mm AP, 900 m/s, 6,5 s dolum; görsel geri tepme | Ateş isteği, engel ve hazır olma durumlarının tutarlılığı |
| Balistik/zırh | Yerçekimi; süpürülmüş ışın; açı/mesafe delmesi ve sekme; üç sabit hedef | Yakın engel boşluğu, tarayıcı kabulü; sonraki aşamada hasar |
| Geri bildirim | Alev, tracer, isabet ve duman; sonuç metni | Taret/top sesleri, okunabilir dolum ve atış hissi |

Bunlar prototip değerleridir. Bu plan yeni kalibre, mühimmat veya gerçek araç doğruluğu taahhüdü getirmez. M1/M2 kabulü hâlâ açıktır; tam M3 teslimi M2 değerlendirmesine bağlıdır. Sürüş teslimi silah geliştirmesinin bitmesini beklemez.

## Önerilen geliştirme sırası

### W1 — Nişan doğruluğu ve yakın engeller: ilk teslim

- Nişancı görüşünü gerçek top yönüne bağla; istenen hedefi ayrı göster. Görüş geçişinde son hedef korunsun; taret yetişene kadar aradaki fark görülebilsin.
- Kamera–hedef, namlu–hedef ve namlu dibinden ağzına kadar olan engelleri ayrı değerlendir. Kamera hedefi görebilse de mermi ilk fiziksel engeli dikkate alsın.
- `WeaponSystem.fire()` şu anda mermiyi namlu ağzından 0,35 m ileride başlatıyor. Bu aralığın sorgulanmadan atlanmasını gider; atış sorgusu güncel sabit adım pozundan alınsın.
- Önerilen davranış: namlu bir engelin içine girmişse ateş engellensin ve dolum başlamasın; namlunun önündeki engelde ise ateş gerçekleşip mermi o engele çarpsın. Hedefle hizalanmamış olmak tek başına ateşi engellemesin.
- Gövdeyi vurmamak için kullanılan tüm araç gövdesini yok sayma filtresine ek olarak, kendi gövdesiyle namlu kesişmesini ayrı kontrol et. İlk çözüm kinematik sorgu olsun; ayrı taret fiziği ekleme.
- Hazır, doluyor, yakın engel ve açı sınırı durumlarını nişancı/üçüncü şahıs görünümünde tutarlı göster. Dolum sırasında tıklama geleceğe ateş kuyruğu bırakmasın; odak kaybı ateş isteğini temizlesin.

**Kabul:** Kamera engelin üstünden bakarken atış engelin içinden geçmez. Namlu ağzına 0–35 cm mesafedeki ince plaka atlanmaz. Namlu engelin içindeyken mermi ve dolum oluşmaz. Nişancı görüşü taret yetişmeden yanlış hizalanma izlenimi vermez. Sağ tık bırakma, Alt/C, R ve odak kaybı durumları takılı kalmaz.

### W2 — Taret hareketi ve stabilizasyon

- Mevcut dünya hedefi takibini başlangıç olarak kullan; stabilizasyon zaten kısmen bu davranıştan geliyor. Önce gövde dönüşü, fren, yan eğim ve tümsekte nişan hatasını ölç.
- Mekanik yaw/pitch hızları ve yükseliş sınırları geçerli kalsın. Gerekli görülürse sınırlı açısal ivme ile başlama/durma tepkisini merkezi araç tanımına ekle; girdi gecikmesi ekleme.
- Öneri: varsayılan stabilizasyon açık; gövde hareketini mekanik yetişme sınırları içinde telafi etsin. İlk sürümde kullanıcıya ek mod/tuş gerektirmesin. Yetişemeyen namlu gerçek sapmayı göstersin.
- Hız ve engebeye bağlı etki önce fiziksel takip hatasıyla değerlendirilsin. Rastgele saçılma, otomatik hedef kilidi ve balistik otomatik düzeltme ilk teslimde eklenmesin.

**Kabul:** Gövde dönerken sabit dünya hedefine dönmeye devam eder; ±180° geçişinde uzun yönden dönmez. Eğimde açı/hız sınırları aşılmaz, NaN oluşmaz. Aynı zamanlanmış hedef/gövde girdisi 30/60/120 render FPS altında eşdeğer sabit adım sonucu verir; render interpolasyonu nişanda belirgin sıçrama üretmez.

### W3 — Atış hissi ve ses

- Mevcut geri tepmeyi kullan; hızlı geri hareket ve kontrollü dönüşü görsel olarak değerlendir. Görsel geri tepme balistik yönü yapay biçimde değiştirmesin.
- Dolum ilerlemesi ve hazır bildirimi okunaklı olsun; tek tık bir atış üretsin. Kamera sarsıntısı küçük ve sınırlı olsun; nişan komutunu değiştirmesin.
- [Ses planındaki](SOUND_DESIGN.md) S2 taret servosu ve S3 top/geri tepme/isabet seslerini mevcut Web Audio altyapısına bağla. Taret sesi gerçek açısal harekete, top sesi gerçekleşen atışa bağlı olsun; reddedilen atış ses/efekt üretmesin.
- Atış ve isabet görsellerini mevcut efektler üzerinden ayarla; ses ve görsel olayları aynı gerçekleşmiş atış/isabetten türet. Yeni genel olay altyapısı gerekmez.

**Kabul:** Ses/efekt bir atış için bir kez oluşur; dolumda veya engellenmiş atışta oluşmaz. Ses kapatma, sekme gizleme, R ve sahne kapanışı temiz çalışır. İnsan dinlemesi ve hareketli atış değerlendirmesi kaydedilir.

### W4 — Ayrı sonraki kapsam: temel hasar ve modüller

Bu aşama önceki M3.1 için alınan **ilk aşamada hasar yok** kararından sonraki bir genişleme önerisidir; ilk silah/taret iyileştirmesinin kabul koşulu değildir.

- Önce sabit test hedefinde delinen bölgeye bağlı basit dayanıklılık ve devre dışı kalma; sekme/delmeme yapısal hasar vermesin.
- Ardından palet, motor ve taret mekanizması için sağlam → hasarlı → devre dışı durumları; etkiler merkezi tanımda tutulsun. Palet ilgili tarafın çekişini, motor toplam tahriki, taret mekanizması dönüş/yükselişi etkilesin.
- Sabit hedefler sürüş kaybını gösteremediği için oyuncu aracına hasar uygulayan geliştirme senaryosu kullan; düşman AI gerekmesin. Kendi atışı kendi gövdesine otomatik hasar vermesin.
- Hasar etkisi fizik/taret kontrolünde işlensin; UI yalnız sonucu göstersin. R tüm hasar ve silah durumunu sıfırlasın.
- Mürettebat, iç parçacık/şarapnel simülasyonu, HE, mühimmat patlaması, onarım ve AI ayrı kapsam olarak kalsın.

**Kabul:** Aynı isabet aynı sonucu verir; palet/motor/taret hasarı ilgili işlevde ölçülebilir kayıp üretir. Sağlam araca dönünce sürüş değerleri geri gelir. Sabit hedef ve araç hasarı ayrı senaryolarla doğrulanır.

## Mevcut kodda çalışma alanları

| Alan | Dosyalar |
|---|---|
| Hedef ve kamera | `src/game/aim/AimSystem.ts`, `src/game/combat/GunnerSight.ts`, `src/game/camera/FollowCamera.ts` |
| Taret ve ayarlar | `src/game/vehicle/TurretController.ts`, `src/game/vehicle/VehicleDefinition.ts` |
| Atış ve mermi | `src/game/combat/WeaponSystem.ts`, `WeaponDefinition.ts`, `ProjectileSystem.ts` |
| Zırh ve test hedefi | `src/game/combat/ArmorModel.ts`, `ArmorTarget.ts` |
| Efekt/ses ve bağlama | `src/game/combat/CombatEffects.ts`, `src/game/audio/`, `src/mapPreview.ts` |

Fizik ve silah hesabı sabit 60 Hz; görsel interpolasyon render aşamasında kalır. Konum/nişan verisi React/Zustand üzerinden taşınmaz. SI birimleri ve iç açılarda radyan kullanılır. Yeni paket veya Blender/GLB değişikliği mevcut ihtiyaç için öngörülmüyor.

## Doğrulama ve teslim

- W1–W2: `turret:test` ve `combat:test` içine yakın engel, nişan ayrımı, atış kapıları ve zamanlanmış hareket senaryoları ekle. Kamera/girdi davranışını tarayıcıda kontrol et.
- W3: `audio:test` ile gerçek hareket/atış olayları, eşzamanlı ses sınırı, reset ve kaynak temizliği; tarayıcıda dinleme ve görsel kabul.
- W4: uygulandığında delme→hasar eşlemesi ve modüllerin gerçek araç/taret kontrolüne etkisini otomatik doğrula; yalnız durum alanını test etmek yetmez.
- Her uygulama adımında `npm run map:check` ve `npm run map:build`; sürüşe dokunulursa `npm test` ve `npm run drive:test`, rig/model bağlantısına dokunulursa `npm run tank:test` çalıştır.
- Tam M3 kabulünden önce on dakikalık sürüş/nişan/atış oturumu; efekt/ses açık-kapalı karşılaştırması. Cihaz/GPU, tarayıcı, çözünürlük, kalite ve ölçüm süresi kaydedilsin. Yaklaşık 60 FPS hedefi referans cihaz seçilmeden garanti sayılmasın.
- Her tamamlanan adımda ilgili doğrulama kanıtı, ROADMAP durumu, diff incelemesi, commit ve push. Otomatik kontrol insan değerlendirmesinin yerini tutmaz.

## Açık tercihler

Kullanıcının seçtiği öncelik doğrultusunda önerilen sıra **W1 → W2 → W3**. **W4** sonraki kapsam önerisidir; bu planın ilk teslimlerine dahil değildir. Taret ivmesi, stabilizasyon gücü, nişancı zoom/hassasiyeti, kamera sarsıntısı ve hasar değerleri prototip değerlendirmesiyle netleşecek; bu belgede kesinleştirilmedi.
