# Geliştirme yol haritası

Durum: **M1 devam ediyor: doğal arazi, orman çevresi ve gerçek tankın bağımsız önizlemesi mevcut. M2 ilk sürüş prototipi uygulandı; son kabul açık. M3.1 ateş ve balistik çekirdeği uygulandı; hasar, modül hasarı ve tarayıcı kabulü açık.**

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
