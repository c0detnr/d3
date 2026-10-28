# Geliştirme yol haritası

Durum: **M1 devam ediyor: doğal arazi, orman çevresi ve gerçek tankın bağımsız önizlemesi mevcut. M2 ilk sürüş prototipi uygulandı; son kabul açık. M3.1 ateş ve balistik çekirdeği uygulandı; hasar, modül hasarı ve tarayıcı kabulü açık.**

## İkinci oynanabilir tank — otomatik kontroller geçti

Leopard 2A6 esintili, kum beji ikinci tank için [B0–B9 planı](SECOND_TANK_BLENDER_PLAN.md) hazırlandı. Özgün Blender kaynağı ve GLB üretildi; 14 temas noktası, palet UV'si, kule, geri tepme ve tank seçimi entegre edildi. `tank:test`, `turret:test`, `drive:test` ve `map:build` geçti. Tarayıcıda insan sürüş/nişan/atış kabulü açık. Hız, zırh ve hasar dengesi bu teslimin koşulu değildir; M1/M2/M3 genel kabul durumları değişmez.

## İlk AI tank düellosu — C1 test modu mevcut

[Çatışma ve hasar planı](COMBAT_DUEL_PLAN.md): C1'de seçilen tank ve diğer model aynı Havok dünyasında tek sabit adımla çalışır; rakip park hâlindedir. Serbest sürüş ve `?duel=1` test modu ayrıdır. Gerçek GLB/Havok kontrolünde iki rol, çarpışma, sıfırlama, kaynak temizliği, harita başlangıcı ve 30/60/120 FPS eşitliği geçti. C2 can/hasar, C3 AI, C4 oyun döngüsü ve C5 son kabul açık. Uzun vadeli M3 ve M1/M2 kabul durumları değişmez.

## Uygulamaya geçiş hazırlığı

- Kullanıcı kodlamaya başlamayı istediğinde mevcut aşama kaydını güncelle.
- Paket sürümlerini, Babylon/Havok entegrasyonunu ve dağıtım koşullarını resmi kaynaklardan doğrula.
- Referans test cihazını ve ilk tarayıcıyı kaydet.
- Vite/TypeScript temelini ve gerçek çalıştırma komutlarını oluştur.
- İlk çizim ve fizik yükleme denemesini tamamla; uyumluluk sorununu detay üretmeden çöz.

## M1 — Temel 3D dünya

**Durum:** Devam ediyor. Doğal arazi, orman çevresi ve statik çarpışmalar hazır; gerçek tank GLB entegrasyonu ve tarayıcıda model görünümü doğrulandı. Takip kamerası, kamera kesişme incelemesi ve performans kaydı bekliyor.

Küçük arazi, gökyüzü, akşam ışığı, üçüncü şahıs kamera ve basit tank modeli.

Kabul koşulları:

- Sahne tarayıcıda açılır, yeniden boyutlandırmaya uyum sağlar; yükleme hatası kullanıcıya görünür.
- Tank ve arazi aynı ölçektedir; kule/namlu pivotları daha sonraki hareket için uygundur.
- Kamera hedefi takip eder; yakınlaşma ve çevreyle kesişme davranışı incelenir.
- Seçilen palet ve ışıkla temel görsel yön okunur.
- Referans cihazda başlangıç performans ölçümü kaydedilir.

## M2 — Sürüş fiziği / ilk sürüş teslimi

**Durum:** Devam ediyor. Tek dinamik gövde, 12 ışın süspansiyonu, palet kuvvetleri, girdi, görsel interpolasyon ve takip kamerası uygulandı. Gerçek Havok otomatik kontrolleri geçti. Son tarayıcı kabulü, on dakika gözlem sonucu, sürüş hissi ve ses açık; palet/hız/dönüş tozu uygulandı. **Bağımlılık:** M1.

WASD, palet bazlı dönüş, hızlanma/frenleme, geri sürüş, eğim, süspansiyon, temel ses ve toz. Üçüncü şahıs kamera sürüşle birlikte ayarlanır.

[Hareket efektleri](MOVEMENT_EFFECTS.md) içindeki palet temas, hızlı sürüş ve dönüş tozu uygulandı; fren pufu bekliyor. P1 temel temas/dönüş/fren tozu → P2 yüzey parçaları ve iniş pufu → isteğe bağlı P3 egzoz sırası önerilir. Bu belge teslimi M2'yi tamamlamaz. S1 ses çekirdeği, motor, iki palet ve rüzgâr uygulandı; S2 süspansiyon/fren/taret sesleri bekliyor. İnsan dinlemesi ve ses açık/kapalı performans kaydı açık. [Ses sistemi planı](SOUND_DESIGN.md).

Kabul koşulları:

- Düz zeminde ileri, fren, geri ve iki yöne dönüş çalışır.
- Yerinde dönüş ile hareketli dönüşün tepkileri tutarlıdır.
- Tank tepede, yan eğimde ve engebede sürekli titreme veya zemine batma göstermez.
- Süspansiyon görselleri gövde hareketiyle uyumludur.
- Sekme odağı kaybedilince tuş takılı kalmaz; dönüşte simülasyon sıçramaz.
- Farklı render hızlarında aynı girdinin benzer fizik sonucu verdiği kontrol edilir.
- On dakikalık serbest sürüş yapılır; kontrol, kamera ve ağırlık hissi hakkındaki gözlemler kaydedilir.

Bu teslimde savaş mekanikleri zorunlu değildir. Kullanıcı tek başına haritada tank sürebilir.

## M3 — Savaş sistemi / vertical slice

**Durum:** M3.1 ateş ve balistik çekirdeği uygulandı: tek 120 mm AP, gerçek namlu ağzı, dolum/geri tepme, yerçekimli süpürülmüş mermi, açı/mesafe delmesi, sekme, üç sabit zırhlı hedef, sağ tık nişancı görüşü ve görsel-only efektler. Otomatik kontroller geçti; tarayıcı kabulü, hasar, modül hasarı, HE ve düşman AI açık. **Bağımlılık:** Tam savaş teslimi için M2 sürüş değerlendirmesi.

Hareketli kule ve namlu, nişancı görüşü, top ateşi, mermi fiziği, isabet, temel zırh ve modül hasarı. İlk test için sabit hedefler önerilir.

Kabul koşulları:

- Kule/namlu sınırları ve dönüş hızları uygulanır; hedef ve gerçek nişan yönü ayırt edilir.
- Mermi namludan çıkar; yakın engel, uçuş süresi ve uzak mesafe düşüşü doğru geri bildirim verir.
- Yüksek hızlı mermi sabit ince hedefi sorgu hatası nedeniyle atlamaz.
- Aynı mühimmatla açı ve zırh bölgesi değiştiğinde anlaşılır sonuçlar oluşur.
- Palet, motor ve kule hasarı ilgili hareket kabiliyetini etkiler; sıfırlama tekrar denemeye izin verir.
- Ateş ve isabet efektleri çalışırken sürüş performansı yeniden ölçülür.

## Kapsam kontrolü

Multiplayer, mağaza, geniş araç listesi, dev haritalar ve kapsamlı yapı yıkımı planın dışında. M3 için düşman AI zorunlu değil. Her aşama sonunda ancak tespit edilen ihtiyaçlar sonraki plana alınır.

### 2026-10-23 — Basit test alanı kanıtı

`npm run map:check`, `npm run map:test`, `npm run map:build` geçti. Gerçek Havok ile başlangıç zemini, iki rampa eğimi, tepe, tümsek, sınır ve üç kur/temizle çevrimi kontrol edildi. Tarayıcı bağlantı aracı hata verdiği için görsel inceleme yapılamadı. M1 tamamlandı sayılmaz; sürüş teslimi değildir.

### 2026-10-23 — İlk tank varlığı kanıtı

Blender MCP ile kaynak ve GLB üretildi. GLB'den sayılan 14.512 görünür üçgen ve 12 çarpışma üçgeni; ayrı hareket grupları ve 12 yol tekerleği. Kaynakta ve yeniden içe aktarımda kule/namlu/tekerlek pivotları, ebeveynlik, materyal yuvaları ve konumlar kontrol edildi. Üç açı render incelendi. [Dosyalar ve kanıt](../assets/tanks/iron_dust_01/README.md). M1 tarayıcı ve motor entegrasyonu kabulü bu varlık kontrolüyle tamamlanmış sayılmaz.

### 2026-10-23 — Gerçek tank entegrasyonu

Geçici maket yerine IRON DUST 01 GLB yüklendi; palet tabanı zeminle hizalandı, COL_Hull gizlendi. `npm run tank:test`, `npm run map:test`, `npm run map:build` geçti. Chrome içinde model görünümü, yakınlaşma ve kamera düğmeleri kontrol edildi. Tank sabit; M2 başlamadı. M1 takip/kesişme ve performans maddeleri açık.

### 2026-10-23 — Doğal arazi ve orman

Düz test pisti doğal yükseltiler, toprak patika, kayalar ve ileride sıklaşan ormanla değiştirildi. Tankın başlangıç çevresi açık/düz tutuldu; gökyüzü, sıcak ışık, gölge ve uzaklık sisi eklendi. `map:test`, `tank:test` ve `map:build` geçti. Chrome içinde başlangıç ve genel görünüm düğmeleri incelendi; [görsel kanıt](previews/forest-clearing.png). M1 takip/kesişme ve referans performans maddeleri açık; M2 başlamadı.

### 2026-10-23 — İlk sürüş prototipi Git teslimi

`npm test`, `npm run drive:test`, `npm run map:test`, `npm run tank:test` ve `npm run map:build` ile kontrol edilir. Ayrıntılı otomatik sonuç [driving-results.json](driving-results.json) içinde. Tarayıcıda takip ve serbest bakış gözlendi; 600 saniyelik gözlemin nihai kaydı alınmadı. Kamera engel kesişmesi, odak/gizli sekme, tekerlek yönleri ve sürüş hissinin son tarayıcı kabulü yeni sohbette devam edecek. M1/M2 tamamlandı olarak işaretlenmedi.

### 2026-10-23 — Taret kontrol prototipi

Kullanıcının açık isteğiyle mevcut sürüş prototipine bağımsız taret/namlu takibi eklendi. M3'ün ilk taret alt adımı mevcut; savaş vertical slice başlamış/tamamlanmış teslim kabul edilmez. M1/M2 açık kabul maddeleri ve geliştirme önceliği korunur.

- Sabit 60 Hz adımda dönüş/yükseliş sınırları; render interpolasyonu; dünya hedefinin gövde dönüşünden ayrılması.
- Kamera hedefi ve gerçek namlu doğrultusu, serbest bakış, yakın engel ve açı sınırı göstergeleri.
- `npm run turret:test`: gerçek GLB ile nişan yakınsaması, gövde bağımsızlığı, hız/sınırlar, açı geçişi, eğimli gövde, interpolasyon, 30/60/120 FPS ve üç kaynak temizleme çevrimi geçti.
- Nişancı görüşü, tam namlu kesişme çözümü ve atış sonraki adımlar; sürüş teslimini bekletmez.


### 2026-10-23 — Palet, hız ve dönüş tozu

Sabit adımlı sınırlı dünya uzayı toz havuzu ve panelde aç/kapat kontrolü eklendi. Mevcut süspansiyon temasları kullanılır; Blender/GLB ve sürüş kuvvetleri korunur. `effects:test`, `npm test`, `turret:test`, `tank:test`, `drive:test`, `map:test`, `map:build` geçti. Tarayıcıda kısa görsel kontrol yapıldı; uzun kabul ve karşılaştırmalı performans kaydı açık. M1/M2 tamamlandı sayılmadı.

### 2026-10-24 — Ses S1: motor, palet ve rüzgâr

Prosedürel Web Audio çekirdeği, limiter, motor/palet/rüzgâr sentezi ve panelde Ses aç/kapat ile düzey kaydırıcısı eklendi. `npm run audio:test` eşleme sınırlarını, palet hız/yön/dönüşünü, hava durumunu, model sıfırlamayı, ses grafiği kur/kapat ve kaynak temizliğini geçti. Chromium'da ilk tuş etkileşimi sesi açtı; DOM durumu `Ses: motor, palet, rüzgâr` oldu, sayfa hatası görülmedi (yalnızca favicon 404). Ses dinlenmedi, düzey dengesi ve ses açık/kapalı performans ölçülmedi. M2 tamamlanmadı.

### 2026-10-24 — M3.1 ateş ve balistik çekirdeği

Tek 120 mm AP mermisi, gerçek namlu ağzı, 6,5 s dolum, görsel geri tepme, yerçekimli süpürülmüş mermi, mesafeyle azalan delme, geliş açısına göre etkin zırh ve 70° sekme eşiği eklendi. Patikaya üç sabit zırhlı hedef yerleştirildi; sonuç `DELDİ` / `SEKTİ` / `DELMEDİ` / `ENGEL` olarak HUD'a yazılır. Sağ tık basılı tutunca nişancı görüşü açılır; namlu alevi, tracer, isabet kıvılcımı ve duman görsel-only'dir. Hasar, hedef yıkılması, modül hasarı, HE, düşman AI, oyuncu hasarı ve savaş sesi kapsam dışıdır.

`npm run combat:test` gerçek GLB namlu pozu, dolum kapısı, sınırlı geri tepme, sıfırlama ve üç kaynak temizleme çevrimini; yerçekimi düşüşünü, ince plaka tünellemesinin önlenmesini, ilk engelde durmayı, zırh açısı/mesafe eğrisini, sekme eşiğini ve hedef yüzey eşlemesini geçti. `npm test`, `map:test`, `tank:test`, `turret:test`, `effects:test`, `drive:test`, `audio:test`, `map:check` ve `map:build` geçti; mevcut büyük paket uyarısı sürüyor. Tarayıcıda atış, nişancı görüşü, HUD ve efektler ile performans ölçümü yapılmadı. M2/M3 kabulü tamamlanmadı.

### 2026-10-24 — Kaotik gökyüzü

Düz gradyan gökyüzü, prosedürel fırtına shader'ıyla değiştirildi: sürüklenen/çalkalanan bulut katmanları, sıcak toprak ufku, düşük açılı sıcak güneş, yoğunlaştırılmış sis ve ara ara şimşek çakması. Gökyüzü, sis rengi ve şimşek aydınlatması `src/game/world/SkyAtmosphere.ts` içinde; sahne kapanışında gökyüzü kaynağı temizlenir. `npm run map:check` ve `npm run map:build` geçti. Chromium 152 headless, 1280 × 720, WebGL2'de sahne hatasız açıldı; [görsel kanıt](previews/chaotic-sky.png). İnsan görsel kabulü, şimşek sıklığı/okunabilirlik ayarı ve performans kaydı açık; M1 kabul maddeleri bu değişiklikle tamamlanmış sayılmaz.

### 2026-10-24 — Kamera, nişan ve atış yenileme planı

**Durum:** Plan hazır; uygulama başlamadı. [Ayrıntılı plan ve kabul senaryoları](AIM_AND_FIRE_REWORK.md).

Sıra: A1 kamera/girdi → A2 nişangâh/tek atış/dolum → A3 görünür balistik → A4 geri tepme/yüzey/ses → A5 doğrulama ve teslim. Mevcut M3.1 davranışını yeniler; hasar, delme/sekme tasarımı ve tank imhası bu işte yok. M1/M2 açık kabul maddeleri korunur; sürüş teslimi bu yenilemeye bağlanmaz. Bu tarihte yalnız belge hazırlandı, oyun testleri veya tarayıcı kabulü yapılmadı.

### 2026-10-24 — Nişan yenileme A1

Kamera ve girdi uygulandı: normal serbest bakış, sağ tuşta sağ yan yakın kamera, bırakınca yerel taret açısı tutma. `map:check`, `turret:test`, `combat:test` geçti; tarayıcı kabulü bekliyor. M1/M2/M3 son kabulü açık.

### 2026-10-24 — Nişan yenileme A2–A3

5 s dolum, tek basış atış, gerçek namlu ucundan hasarsız deneme mermisi, 180 m/s uçuş, kısa tracer, 900 m / 8 s sınırı uygulandı. Oyun akışı zırh çözümünü çağırmaz; eski zırh kodu/testleri korunur. `combat:test` ve `map:check` geçti; tarayıcıda uçuş okunabilirliği açık.

### 2026-10-24 — Nişan yenileme A4

Namlu dumanı, gövdeye küçük sabit adımlı darbe, niyet açısını değiştirmeyen kamera darbesi, toprak/beton/metal görsel tepkileri ve mevcut AudioSystem üzerinden sınırlı prosedürel atış/dolum/isabet sesleri uygulandı. `combat:test`, `audio:test`, `map:build` geçti. Beton tepkisi test düzeninde kontrol edildi; dünyaya yeni yapı eklenmedi. İnsan dinlemesi ve atış hissi kabulü açık.

### 2026-10-24 — MG 02 Blender varlığı

Kullanıcı isteğiyle mevcut makineli dosyasına dokunmadan sıfırdan `iron_dust_mg_02` üretildi. 2.396 üçgen; ayrı yaw/yükseliş/geri tepme ve kamera/namlu referansları. GLB yeniden aktarımı ve 897 örnek duruşta tankla yüzey açıklığı doğrulandı; önizlemeler hazır. [Blender teslimi ve açık kontroller](../assets/weapons/iron_dust_mg_02/README.md). Dinamik kapak açılma doğrulaması ve oyun entegrasyonu açık; M1/M2/M3 kabulü tamamlanmadı.

### 2026-10-24 — Yakın kamera taret yönü düzeltmesi

Sağ tuşla yakın kamera gerçek namlu yönüne en kısa açıdan yumuşak döner; sağ omuz konumu taret yönünü izler. Bırakınca bağımsız serbest bakış geri gelir. `node --experimental-strip-types scripts/check-camera-turret-zoom.ts` gerçek GLB/Havok üzerinde yana/arkaya dönük taret, yükseliş, yakınken dönüş, bakışa geri dönüş, engel ve üç temizleme çevrimini geçti. `map:build` geçti; mevcut büyük paket uyarısı sürüyor. Tarayıcı kontrolünün sonucu görev ilerleme kaydında; M1/M2/M3 son kabulü açık.

### 2026-10-24 — MG02 oyun entegrasyonu kanıtı

MG02 gerçek GLB ile kuleye monte edildi. 2/1 POV/tank seçimi, sınırlı fare nişanı, sürerken sol tuşla otomatik atış, tracer/namlu alevi/ses ve kaynak temizliği uygulandı. `npm run mg:test`, taret/giriş kontrolleri ve `npm run map:build` geçti. Derlenmiş Chromium'da POV, seri ateş sayacı, sürüş ve tank moduna dönüş görüldü; sayfa hatası yok. Hasar/ısınma/mühimmat stokları açık, genel M1/M2/M3 kabulü tamamlanmış sayılmaz.

### 2026-10-24 — Gövde ve namlu geri tepmesi düzeltmesi

Namlu, termal kılıf, siyah namlu ucu ve namlu ağzı referansı birlikte geri çekilir. Atış darbesi 16000 N·s ile namlu yükseliş pivotundan uygulanır; mevcut fiziksel süspansiyon öne/arkaya veya yana salınımı sönümler. `node --experimental-strip-types scripts/check-cannon-recoil.ts` gerçek GLB/Havok ile üç namlu yönü, parça bağlılığı, sıfırlama, darbe yönü, süspansiyon salınımı, üç saniyede durulma ve 30/60/120 FPS eşitliğini kontrol eder. M1/M2/M3 son kabulü açık kalır.

### 2026-10-24 — Top atışı hissi yenilemesi

Kullanıcı onayıyla hızlı geri çekilen/sekmesiz dönen namlu, yönlü gövde darbesi, küçük sönümlü kamera sarsıntısı, ayrı parlama/gaz dokuları, kısa namlu ışığı, zemine bağlı basınç tozu ve üç varyasyonlu stereo prosedürel top sesi uygulandı. [Ayarlar ve sınırlar](SHOT_FEEDBACK.md). `combat:test`, `audio:test`, `map:build`, kamera regresyonu, `drive:test`, `effects:test` ve `npm test` geçti. Yakın/normal atış tarayıcıda incelendi; insan dinlemesi ve son atış hissi kabulü açık. M1/M2/M3 tamamlandı sayılmaz.


### 2026-10-24 — Yumuşak taret ve namlu hareketi

Taret için 0,08 s hız tepkisi; namlu için 0,10 s hedefe yaklaşım ve sönümlenen hız eklendi. 35°/s, 15°/s ve −8°…+20° sınırları korunur. Sabit adımda hızlanma/durma, yön değişimi, küçük açı ayarı, sıfırlama, hedefi aşmama ve 30/60/120 FPS eşitliği gerçek GLB üzerinde kontrol edildi. `turret:test`, `combat:test`, `mg:test`, `npm test` ve `map:build` geçti; mevcut büyük paket uyarısı sürüyor. Chromium headless 1280 × 720 içinde Q/E, tekerlek ve yakın kamera denendi; sayfa hatası yok. İnsan hareket hissi kabulü açık; M1/M2/M3 tamamlanmadı.

## Android ve mobil ek teslim — 2026-10-24

Kullanıcı isteğiyle masaüstü kapsamına Android APK ve mobil tarayıcı eklendi. Sol geliştirici paneli kaldırıldı; çoklu dokunmatik sürüş/nişan/ateş ve yardımcı kontroller uygulandı. Yerel HTTPS WebView ile çevrimdışı APK üretildi, imza doğrulandı ve Android emülatöründe açıldı. `touch:test`, çekirdek/savaş/MG kontrolleri ve web derlemesi geçti. Fiziksel telefon performansı, uzun sürüş ve insan hissi kabulü açık; M1/M2/M3 tamamlanmış sayılmaz. [Android teslimi](ANDROID.md).

### 2026-10-24 — Kabin iç gövdesi ve ana konsol v01

CABIN bölüm 1 Blender MCP ile üretildi: [kaynak, GLB ve önizlemeler](../assets/cockpit/iron_dust_cockpit_01/README.md). Kalın zırh kabuğu, konsol, ayrı 0,95 × 0,52 m ekran ve boş kumanda montaj yüzeyleri; 16.732 üçgen. Sağ mekanizma hacmi açıklığı, beş ekran görüş ışını, GLB sayımı ve yeniden içe aktarım kontrol edildi. Oyun kodu değişmedi; dış tank içine montaj, tarayıcı görünümü ve kullanıcı görsel kabulü açık. M1/M2/M3 tamamlandı sayılmaz.

### 2026-10-27 — 0.1.0 sürüm kaydı

Mevcut geliştirme durumu `v0.1.0` etiketi için belgelendi. `npm test`, `map:build`, `lan:check` ve `lan:test` geçti; büyük paket uyarısı sürüyor. [Sürüm kapsamı ve tekrar uygulanabilir adımlar](VERSIONING.md). Yeni tarayıcı/telefon kabulü veya APK derlemesi yapılmadı; M1/M2/M3 kabul durumları korunur.

### 2026-10-27 — Taktik HUD

Kullanıcının onayladığı konsept ana oyun ve mevcut LAN görünümüne uygulandı: pusula, gerçek gövde/kule yönü ve hız, ayrı bakış/namlu işaretleri, dolum ve silah seçimi. HUD hesap kontrolü, `map:build`, `lan:check`, `touch:test`, `combat:test`, `lan:test` geçti. Chrome'da iki tank, atış/dolum, MG seçimi, dar ekran ve LAN görünümü incelendi. [Kanıt ve sınırlar](TACTICAL_HUD.md). Fiziksel telefon/insan kabulü açık; M1/M2/M3 genel durumu değişmez.

### 2026-10-27 — Masaüstü fare kilidi

Ana oyun ve LAN sayfasına tıklamayla Pointer Lock, Esc ile çıkış ve yeniden giriş eklendi. İlk tık ateş etmez; kilit/odak kaybında girdiler temizlenir. `check-pointer-lock.ts`, `combat:test`, `touch:test`, `npm test`, `lan:check` ve `map:build` geçti. Chrome'da ana oyun giriş/Esc/yeniden giriş gözlendi; LAN iki oyunculu insan denemesi yapılmadı. M1/M2/M3 genel kabulü değişmez.


### 2026-10-28 — Brackeys VFX paketi

Brackeys VFX Bundle v1 indirildi; kaynak varlıklar ve CC0 lisansı `assets/vfx/brackeys/` altında. Palet/hız/dönüş tozu `smoke_01_a.png` dokusuna geçirildi; alfa harmanlama ve sahne sisi kullanılıyor. Sabit adım, temas davranışı ve havuz bütçesi değişmedi. Kullanılmayan paket görselleri web derlemesine taşınmıyor. Dağıtım lisans kaydı `public/licenses/BRACKEYS-VFX.txt`.

`effects:test` ve `map:build` geçti; seçilen PNG derleme çıktısında 74,79 KB. Chrome'da sahne ve kısa otomatik sürüş açıldı; otomasyon fare kilidi alamadı. Uzun süreli performans/insan görsel kabulü yapılmadı; M1/M2/M3 kabul durumu korunur.

### 2026-10-28 — B1 kapalı askerî bakım hangarı

Kullanıcının seçtiği kapalı askerî bakım tesisi ayrı Blender MCP sahnesinde üretildi: 32 × 22 m ana hacim, alçak servis kanadı, kapalı sürgülü kapı ve kademeli çatı. [Kaynak, GLB, önizlemeler ve kontroller](../assets/environment/maintenance_hangar_01/README.md). 4.809 görünür üçgen, 10 malzeme ve 52 üçgenlik üç ayrı çarpışma mesh'i. GLB yeniden içe aktarımında ölçek/zemin/sınırlar, üçgen sayımı, çarpışma işaretleri ve doku bağımsızlığı doğrulandı; gerçek IRON DUST 02 ile Blender önizlemeleri incelendi. Oyun kodu değişmedi; Babylon/Havok/mermi entegrasyonu, harita yerleşimi ve performans kabulü açık. K0/K1/K2 ve genel M1/M2/M3 bu varlık teslimiyle tamamlanmaz.


### 2026-10-28 — Brackeys savaş efektleri

Ortak CombatEffects içinde top/MG parlaması, namlu gazı, yüzey/basınç tozu, metal kıvılcımı, hasarlı tank alevi ve tek seferlik 25 kare imha paketin görsellerine bağlandı. Yerel/LAN çağrıları ve hasar/atış kuralları korunur. [Dosya eşlemesi ve PNG dönüşümü](../assets/vfx/brackeys/README.md).

`check-combat.ts`, `mg:test`, `lan:check`, `map:build` geçti. Atlas başlangıç/orta/son kare, render tekrarında ilerlememe, bitince gizlenme, MG/hasar doku yönlendirmesi, havuz sınırı ve üç temizlik çevrimi doğrulandı. Chrome'da geçici kontrol sahnesinde başlangıç/orta kare incelendi; hata günlüğü boş. [Görsel kanıt](previews/brackeys-combat.png). Geçici kontrol sayfası kaldırıldı. Gerçek maçta uzun performans ve insan kabulü açık; M1/M2/M3 tamamlandı sayılmaz.

### 2026-10-28 — Serbest uçuş kamerası

Harita önizlemesinde `0` (veya numpad 0) önceki görüşten serbest uçuşa geçer, tekrar basınca önceki tank/genel görüşe döner. WASD bakışa göre hareket, Q/E alçalma/yükselme, Shift hızlı uçuş; hızlar 25/100 m/s. Uçuş sırasında sürüş frenlenir, silah ve kule girdileri kapatılır; dünya simülasyonu devam eder. Odak/fare kilidi kaybında uçuş tuşları temizlenir.

`node --experimental-strip-types scripts/check-free-camera.ts` geçiş/tekrar, konum/geri dönüş, sürüş/savaş girdi kapıları, 30/60/120 FPS eşitliği, hız, fare, odak kaybı ve kaynak temizliğini geçti. `map:build` geçti (mevcut büyük paket uyarısı). Chrome içinde Kül Vadisi açıldı; otomasyon Pointer Lock alamadığı için etkileşimli uçuş ve insan hissi kabulü açık. M1/M2/M3 genel kabulü değişmez.

### 2026-10-28 — Kül Vadisi K0 + K1 ilk kaba yerleşim

Ayrı seçilen 720 × 720 m taslak, 18 m yollar, iki üs, üç koridor, iki dere bağlantısı ve geçici fabrika/savunma hacimleri uygulandı. Altı dış savunma, iki iç savunma ve iki komuta merkezi işaretli; doğma hangarları ayrı. Gerçek GLB ölçüsü, iki tankla bütün yolların iki yönlü Havok sürüşü, orta hatta erişim, tam rota ve dönüş süreleri kaydedildi. [Teslim, ölçüler, kontroller ve sınırlar](KUL_VADISI_BLOCKOUT.md).

`check-kul-vadisi.ts`, `map:test`, `drive:test`, `check-camera.ts` ve `map:build` geçti; büyük paket uyarısı mevcut. K0 ölçü/sert siper taslağı ve K1 sürülebilir iskelet teslim edildi. İnsan sürüş/görüş kabulü, beş araçlı avlu ve gerçek maç dengesi açık; K1 nihai kabulü ve M1/M2/M3 kapatılmadı. Blender hangarı, doğa varlıkları ve hedef mekanikleri bu haritaya henüz entegre edilmedi.

### 2026-10-28 — B1 küçük bakım atölyesi

Hangarı tamamlayan beton ağırlıklı 18 × 12 m kapalı atölye Blender MCP ile bağımsız varlık olarak üretildi: panelli servis kapısı, üst pencereler, yan sundurma ve çatı havalandırması. [Kaynak, GLB, tankla önizlemeler ve doğrulama](../assets/environment/maintenance_workshop_01/README.md). 3.641 görünür üçgen, 10 malzeme; ayrı 6 çarpışma mesh'i / 72 üçgen. Blender GLB yeniden aktarımı ve doğrudan GLB indeks sayımı geçti; ölçek/zemin/sınır ve dış doku bağımsızlığı doğrulandı. Oyun entegrasyonu ve performans kontrolü yapılmadı; K2 ve genel M1/M2/M3 kabulü açık.
