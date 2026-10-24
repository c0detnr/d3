# Doğrulama planı

## 2026-10-23 — Ana adres 404 düzeltmesi

- Neden: kökte `index.html` yoktu; `/` 404, `/map-preview.html` 200 dönüyordu.
- Ana sayfa haritaya yönlendirildi; `npm start` eklendi. Harita derlemesi ana sayfayı da içeriyor.
- `npm start -- --port 5174` çalıştı; `http://localhost:5174/`, `/map-preview.html` ve `/src/mapPreview.ts` HTTP 200 döndü.
- `npm run map:build` TypeScript kontrolüyle birlikte geçti; mevcut büyük paket uyarısı sürüyor. Bu kontrolde tarayıcı görsel incelemesi yapılmadı.

Çalışan bağımsız dünya önizlemesi mevcut. Aşağıdaki senaryoların sonuçları tarihli kayıtlarda ayrıca belirtilir; sürüş ve savaş henüz uygulanmadı.

## Kontrol katmanları

- Statik kontrol ve üretim derlemesi: proje kurulduğunda gerçek komutlarla kaydedilecek.
- Otomatik kontrol: giriş dönüşümü, açı sınırları, mermi ilerletme ve hasar hesaplaması gibi belirgin sonuçlu davranışlar.
- Tarayıcı kontrolü: yükleme, kamera, klavye/fare, odak kaybı, fizik ve varlık görünümü.
- İnsan değerlendirmesi: ağırlık, erişilebilirlik, ses/görsel tepki ve sürüş keyfi. Otomatik test bunların yerini tutmaz.

## Temel senaryolar

| Senaryo | Beklenen gözlem | Aşama |
|---|---|---|
| Sahneyi aç, yeniden boyutlandır, yeniden başlat | Doğru görüntü; çoğalan döngü/dinleyici yok | M1 |
| Kamera ile tank çevresini incele | Takip ve mesafe okunaklı; belirgin duvar/zemin kesişmesi yok | M1–M2 |
| Düz yolda hızlan, frenle, geri git | Tutarlı ve ayarlanabilir ivme; ani hız sıçraması yok | M2 |
| Yerinde ve hareket hâlinde iki yöne dön | Palet farkı ile yön değişimi; görsel palet hareketi uyumlu | M2 |
| Tepe, yan eğim, hendek ve taşlı yol | İnandırıcı tutuş ve süspansiyon; sürekli patlayan/zıplayan fizik yok | M2 |
| Aynı komutları 30/60/120 render FPS sınırlarında dene | Simülasyon sonucunda büyük kare hızı bağımlılığı yok | M2 |
| Tuş basılıyken sekmeden ayrıl, geri dön | Takılı girdi ve büyük zaman sıçraması yok | M2 |
| On dakika sür, sahneyi tekrar aç | Kontrol sorunu, sürekli büyüyen kaynak kullanımı veya kritik hata yok | M2 |
| Yakın engel arkasından ateş et | Kamera hedefi görse bile mermi ilk engelde durur | M3 |
| Yakın ve uzak hedefe ateş et | Uçuş süresi ve düşüş okunur; hızlı mermi hedefi atlamaz | M3 |
| Aynı zırha farklı açılardan ateş et | Modelin tanımlı kurallarına uygun ve açıklanabilir sonuç | M3 |
| Palet, motor ve kule modülünü hasarla | İlgili işlev etkilenir; sıfırlama başlangıç durumunu geri getirir | M3 |

## Performans hedefi — öneri

Başlangıç hedefi, belirlenecek referans masaüstü cihazda 1920×1080 çözünürlükte yaklaşık 60 FPS'tir. Bu henüz doğrulanmış destek sözü değildir. Referans cihaz ve kalite profili seçilmeden kesin minimum sistem gereksinimi yazılmaz.

Ölçümlerde cihaz/GPU, işletim sistemi, tarayıcı sürümü, render backend, çözünürlük, piksel oranı, kalite ayarı, sahne ve ölçüm süresi belirtilir. Ortalama yanında yavaş kareler ve takılmalar da incelenir. Önce ölçülür; sonra gölge, efekt, geometri ve fizik bütçeleri ayarlanır.

## Sonuç kayıt şablonu

- Tarih / kilometre taşı / sürüm veya commit:
- Cihaz, tarayıcı ve görüntü ayarları:
- Yapılan senaryo ve adımlar:
- Beklenen / gözlenen sonuç:
- Ölçüm veya ekran görüntüsü:
- Durum: geçti / başarısız / denenmedi:
- Açık sorun ve sonraki eylem:

## 2026-10-23 — Bağımsız basit harita

- `npm run map:check`: geçti.
- `npm run map:test`: geçti; NullEngine + gerçek Havok WASM. Başlangıç zemini 0 m, rampa tepesi 2 m, her iki yaklaşımın orta noktası 1 m; tümsek ve 1.2 m sınır çarpışmaları kontrol edildi. Üç kur/temizle çevriminde harita mesh ve fizik gövdesi kalmadı.
- `npm run map:build`: geçti. Büyük ana paket uyarısı var; henüz indirme/çalışma performansı ölçülmedi.
- Tarayıcı: IAB mevcut değil; Chrome bağlantısı iki denemede `Unable to load browser request-header policy` hatası verdi. Görsel kalite, kamera etkileşimi ve yeniden boyutlandırma denenmedi.
- Geçici tank sabit bir ölçek göstergesi; sürüş ve Blender varlığının entegrasyonu doğrulanmadı. FPS sonucu yok.

## 2026-10-23 — GLB dünya entegrasyonu

- `npm run tank:test`: gerçek GLB + Babylon NullEngine; 14.512 görünür üçgen, 12 tekerlek, kule/namlu hiyerarşisi, gizli COL_Hull, 4,16 × 9,235 m yatay boyut, 0 m palet tabanı, dünya +Z namlu yönü ve üç kur/temizle çevrimi geçti. Babylon materyal parçalarını ayrı mesh olarak yükler; kaynak mesh sayısıyla runtime mesh sayısı aynı değildir.
- `npm run map:test` ve `npm run map:build`: geçti. Derleme büyük paket uyarısı sürüyor; GLB 962,32 kB olarak yerel derleme varlığına dahil edildi.
- Chrome içinde gerçek model, materyaller, başlangıç/alan kamera düğmeleri ve fare tekerleğiyle yakınlaşma görüldü. [Ekran görüntüsü](../assets/tanks/iron_dust_01/previews/in_world.png). Zemin ışığı fazla parlak; görsel yön ayarı açık.
- Tank sabit görseldir; dinamik gövde, sürüş ve süspansiyon uygulanmadı. Takip kamerası, yeniden boyutlandırma, kamera kesişmesi ve performans ölçümü bu adımda doğrulanmadı. FPS iddiası yok.

## 2026-10-23 — Doğal arazi ve orman

- `npm run map:test`: geçti. Gerçek Havok ile paletlerin altındaki düz başlangıç, doğal yükseklik farkı, üçgen içi noktalarda görünür/fizik yüzey eşleşmesi, uzak arazi devamlılığı, patika ve tank çevresinin ağaçlardan açık olması, yakın ağaç gövdesine yatay isabet kontrol edildi. Aynı tohum aynı yerleşimi üretiyor; üç kur/temizle çevriminde mesh, materyal, kaplama ve fizik gövdesi kalmadı.
- `npm run tank:test`: geçti; GLB ölçeği, +Z yönü, hiyerarşi, gizli çarpışma ve kaynak temizliği korundu.
- `npm run map:build`: TypeScript dahil geçti. Önceden mevcut büyük paket uyarısı sürüyor; performans sonucu değildir.
- Chrome, 1255 × 549 CSS piksel mevcut görünüm: tank, arazi renkleri, orman silüeti, ot/kayalar, patika ve sis görüldü. Alanı göster / Başlangıca dön düğmeleri çalıştı. [Başlangıç ekranı](previews/forest-clearing.png).
- İlk arazi üçgen yönü ters bulundu; düzeltildi ve yukarı bakan normal otomatik kontrole eklendi. İlk testte üçgen örnekleme indeksi yanlış hizalıydı; üçgen başlangıcına hizalandı, son kontrol geçti.
- FPS ölçülmedi. Kamera kesişmesi, hareketli takip, yeniden boyutlandırma, sürüş ve süspansiyon bu görevde doğrulanmadı. Uzak orman yalnızca görsel; son oynanabilir alan sınırı açık.

## 2026-10-23 — İlk sürüş prototipi

- **Geçti:** `npm test` (4 test), `npm run drive:test` (gerçek Havok + GLB), `npm run map:test`, `npm run tank:test`, `npm run map:build`. Üretim derlemesinde büyük paket uyarısı sürüyor.
- Otomatik senaryolar: zeminde kararlı poz ve 12 temas, havada sıfır çekiş, ileri/fren/geri, güçlü frenle duruş, simetrik yerinde/hareketli dönüş, yuvarlanma direnci, motor hız sınırında hızın kesilmemesi, iki yönlü rampa, yan eğim, gövde engeli, alçak tümsekler ve sıfırlama/kaynak temizliği.
- 30/60/120 render FPS altında aynı 720 fizik adımı sonunda konum ve hız birebir eşleşti. Makinece okunabilir kayıt: [driving-results.json](driving-results.json).
- **Tarayıcıda gözlendi:** model yükleme, takip ve fareyle serbest bakış. Başlangıçtaki hedef güncellemesinin kamera açısını bozması düzeltildi.
- **Tamamlanmadı:** 600 saniyelik otomatik gözlem başlatıldı, ancak nihai kayıt alınmadı. İlk 180 saniyede sayısal hata görülmedi; bu süre 10 dakika kabulü değildir. Nihai FPS sonucu verilmedi.
- **Son tarayıcı kabulü bekliyor:** engel yakınında kamera, tekerlek/palet yönleri, odak kaybı, gizli sekmeden dönüş, R ile sıfırlama, sürüş hissi ve insan tarafından 10 dakika serbest sürüş. Ses ve toz uygulanmadı.
- Geçici palet çözümü: mevcut birleşik geometri üzerinde taraf hareketine göre kaydırılan prosedürel bant deseni. Kaynak model ve Blender dosyaları değişmedi; dış varlık eklenmedi.

## 2026-10-23 — Taret prototipi

- `npm run turret:test` geçti: gerçek GLB namlu yönünün dünya hedefine yakınsaması; gövde matrisinin korunması; 35°/s yatay ve 15°/s düşey hız sınırları; −8°/+20° sınırlar; ±π kısa yön geçişi; eğimli/dönmüş gövde; görsel interpolasyonun simülasyonu değiştirmemesi; 30/60/120 FPS aynı sonuç; üç kur/temizle çevrimi.
- `npm test`, `npm run tank:test`, `npm run drive:test`, `npm run map:test` geçti. `npm run map:build` geçti; mevcut büyük paket uyarısı sürüyor. Node NullEngine kontrollerinin localStorage uyarısı tarayıcı hatası değildir.
- Chrome yerel harita önizlemesinde fareyle yeni hedef, taretin hedefe yetişmesi, C ile serbest bakışta hedefin korunması ve takibe dönüş görüldü. Genel görünüşte nişan işaretleri gizlendi; R ile tank/taret sıfırlaması ve takip görünüşü doğrulandı. Tarayıcı warn/error kaydı boş.
- [Görsel kanıt: gövdeden farklı yönde taret ve serbest bakış](previews/turret-free-look.png). Görsel kalite kontrolüdür; FPS veya performans ölçümü yapılmadı.
- Alt basılı tutma için dinleyici uygulandı; tarayıcı otomasyonunda serbest bakış C üzerinden kontrol edildi. Her iki mod odak/görünürlük kaybında temizlenir; yeni taret davranışı için uzun insan sürüşü yapılmadı.
- Açık: nişancı görüşü, tam namlu/gövde/çevre kesişme kontrolü, balistik düşüş, geri tepme, atış ve hasar. Yakın engel işareti namlu ağzından 800 m boyunca gerçek fizik sorgusudur; 12 m içinde turuncu olur. M1/M2/M3 kabulü tamamlandı sayılmaz.

## 2026-10-23 — Palet temas / hızlı sürüş / dönüş tozu

- `npm run effects:test` geçti: duruş, yüksüz temas, hava, hızla artan üretim, geri sürüş yayılımı, yanal dönüş, dünya uzayı, 30/60/120 render FPS eşitliği, 36.000 sabit adımda (10 dakika simülasyon) 320 parçacık havuz sınırı. Gerçek GLB/Havok ile yerinde dönüş ve havada gaz; üç sprite/kaplama temizleme çevrimi.
- Regresyonlar geçti: `npm test`, `npm run turret:test`, `npm run tank:test`, `npm run drive:test`, `npm run map:test`, `npm run map:build`. Mevcut büyük paket uyarısı devam ediyor.
- Chrome 154/Linux, Intel RPL-P / ANGLE WebGL 2, 1256×493 render, DPR 1,5, 2048 PCF gölgeler: kısa otomatik sürüşte temas/dönüş tozu ve hızlanınca uzayan iz görüldü. Toz kutusu kapatılınca mevcut toz temizlendi. Konsolda warn/error kaydı boş. [Görsel kanıt](previews/track-dust.png).
- Gözlem penceresinde yaklaşık 1 saniyelik kare aralıkları da görüldü; bu kısa ve değişken koşullu kayıt performans karşılaştırması olarak kullanılmadı. Efekt açık/kapalı aynı rota ölçümü, uzun tarayıcı kabulü ve insan sürüş hissi değerlendirmesi açık. M1/M2 tamamlandı sayılmadı.

## 2026-10-24 — Ses S1

- `npm run audio:test` geçti: rölanti/duruş, ileri/geri palet hızı, yerinde dönüş, hava durumu, düşük hız seviyesi, aşırı ve geçersiz girdi sınırları, model sıfırlama; sahte audio arka ucuyla AudioContext'in ilk kullanıcı girdisine kadar oluşturulmaması, ses düzeyi sınırları, sessizde askıya alma/devam, düğüm bırakma ve bağlam kapatma.
- `npm run map:check` ve `npm run map:build` geçti; mevcut büyük paket uyarısı sürüyor.
- Chromium 720p, yerel Vite: `w` tuşundan sonra `#audio-status` metni `Ses: motor, palet, rüzgâr` oldu; sayfa hatası yok, yalnızca favicon 404'ü ve WebGL sürücü uyarıları görüldü. Bu, AudioContext kurulum yolunu doğrular; sesin duyulduğunu veya dengesini doğrulamaz.
- Dinleme, hoparlör/kulaklık karşılaştırması, ses açık/kapalı performans ölçümü ve uzun sürüş kabulü yapılmadı. M2 tamamlandı sayılmadı.

## 2026-10-24 — Palet sesi yumuşatma

- Kullanıcı geri bildirimi: palet sesi çok rahatsız edici.
- Değişiklik: kare dalga genlik modülasyonu sinüse çevrildi, sürekli alçak tokmak osilatörü kaldırıldı, palet kazancı yaklaşık yarıya indirildi, bant merkezi ve üst hız sınırı düşürüldü, sürünme hızının altında ses susturuldu.
- `npm run audio:test`, `npm run map:check` ve `npm run map:build` geçti.
- Yeni palet sesi dinlenmedi; kullanıcı dinlemesi ve gerekirse ikinci tur ayar açık.

## 2026-10-24 — M3.1 ateş ve balistik çekirdeği

- `npm run combat:test` geçti: gerçek GLB namlu pozu, ateş/dolum kapısı, sınırlı görsel geri tepme, sıfırlama ve üç kaynak temizleme çevrimi; yerçekimi düşüşü, ince plaka üzerinden tünellemenin önlenmesi, ilk engelde durma, zırh açısı ve mesafe eğrisi, 70° sekme eşiği, gövde/kule ön-yan kalınlık eşlemesi ve üç hedef yerleşimi.
- Regresyonlar geçti: `npm test`, `npm run map:test`, `npm run tank:test`, `npm run turret:test`, `npm run effects:test`, `npm run drive:test`, `npm run audio:test`, `npm run map:check`, `npm run map:build`. Mevcut büyük paket uyarısı sürüyor.
- `npm run typecheck` çalıştırılamadı: depoda kök `tsconfig.json` yok ve script TypeScript 7.0.2'nin kullanım metnini döndürüyor. Bu, bu değişiklikten önce de mevcut bir kurulum eksikliğidir; harita kodu `map:check` ile kontrol edildi.
- Tarayıcıda atış, sağ tık nişancı görüşü, HUD, namlu alevi/tracer/isabet efektleri, R sıfırlaması ve performans ölçülmedi. Otomatik testler oyun hissi veya görsel kabul yerine geçmez.
- Hasar, hedef yıkılması, modül hasarı, HE, düşman AI, oyuncu hasarı ve savaş sesi bu adımda yok; M1/M2/M3 kabulü tamamlanmadı.

## 2026-10-24 — Kaotik gökyüzü prototipi

- Kullanıcı isteği: gökyüzünü kaotik bir atmosferle değiştir. Düz gradyan ve akşam ışığı yerine prosedürel fırtına shader'ı, sürüklenen bulut katmanları, sıcak toprak ufku, yoğunlaştırılmış sis ve ara ara şimşek çakması eklendi.
- `npm run map:check` ve `npm run map:build` geçti. Mevcut büyük paket uyarısı sürüyor. Gökyüzü shader'ı derleme sırasında değil, tarayıcı çiziminde derlendi; aşağıdaki tarayıcı kontrolünde shader/derleme hatası görülmedi.
- Chromium 152.0.7977.82, Linux, headless, 1280 × 720 görünüm, WebGL2: sahne yüklendi, tank/arazi/HUD göründü; sayfa hatası kaydedilmedi. Yalnızca favicon 404'ü ve otomatik ekran görüntüsü kaynaklı WebGL ReadPixels performans uyarıları görüldü. [Görsel kanıt](previews/chaotic-sky.png).
- Bu görsel kontrol statik bir kare üzerinden yapıldı. Bulut hareketi ve şimşek çakmasının zamanlaması ayrı ayrı doğrulanmadı; şimşek anı ekran görüntüsüne alınmadı. FPS, GPU süresi ve ses açık/kapalı karşılaştırması ölçülmedi.
- Açık: kullanıcı görsel kabulü, şimşek sıklığı/parlaklığı, bulut örtüsü, sis yoğunluğu ve tank/arazi okunabilirliğinin farklı kamera açılarında değerlendirilmesi. Bu prototip M1 görsel kabulünü tamamlamaz.

## 2026-10-24 — Gerçekçi arazi yüzeyi

- `npm run map:check` ve `npm run map:build` geçti; mevcut büyük paket uyarısı sürüyor.
- `npm run map:test` geçti: gerçek Havok ile görsel/fizik yüzey eşleşmesi, başlangıç düzlüğü, orman/patika yerleşimi ve deterministik kurulum korundu. Üç kur/temizle çevriminden sonra harita mesh, materyal, kaplama ve fizik gövdesi kalmadı; yeni albedo, normal ve detay kaplamaları da temizleniyor.
- Chromium headless (SwiftShader), 1280 × 720, yerel Vite: varsayılan takip görünümü ve orman zemini yakın görünümünde toprak taneleri, taşlar, ince çatlaklar, kuru bitki artıkları ve mikro rölyef görüldü. Düz üçgen gölgeleri yerine düzgün zemin normalleri okundu. Konsolda uygulama hatası görülmedi.
- [Görsel kanıt](previews/terrain-surface.png). Bu, yazılım renderer ile alınmış görsel kalite kontrolüdür; FPS veya performans ölçümü değildir. İnsan görsel kabulü, doku ölçek/yoğunluk ayarı, farklı zemin türleri ve gerçek GPU performansı açık.

### 2026-10-24 — Gövde ve namlu geri tepmesi düzeltmesi

Namlu, termal kılıf, siyah namlu ucu ve namlu ağzı referansı birlikte geri çekilir. Atış darbesi 16000 N·s ile namlu yükseliş pivotundan uygulanır; mevcut fiziksel süspansiyon öne/arkaya veya yana salınımı sönümler. `node --experimental-strip-types scripts/check-cannon-recoil.ts` gerçek GLB/Havok ile üç namlu yönü, parça bağlılığı, sıfırlama, darbe yönü, süspansiyon salınımı, üç saniyede durulma ve 30/60/120 FPS eşitliğini kontrol eder. M1/M2/M3 son kabulü açık kalır.

## 2026-10-24 — MG02 entegrasyonu

- `npm run mg:test`: gerçek tank/MG02 GLB ile montaj, ileri yön, sağ/yukarı fare yönü, açı sınırları, eğimli gövde ve kule takibi; recoil sırasında sabit POV, 30/60/120 FPS'de 10 saniyede 100 atış; yakın ince engelde süpürülmüş isabet ve üç kur/temizle çevrimi geçti. Ayrı girdi testi basılı ateş, bırakma, mod temizliği, Esc/blur/gizli sekme ve dispose senaryolarını doğruladı.
- `npm run turret:test`, combat input kontrolü, `npm run map:check` ve `npm run map:build` geçti. İlk test çalışmasında Node strip-only parametre property reddi düzeltildi. Aynı çalışma alanında süren ayrı ana top recoil değişikliği nedeniyle ilk tam combat koşusu eski 0.42 m anlık recoil beklentisinde durdu; MG testleri bundan bağımsız geçti. Ayrı recoil işi testlerini güncelledikten sonra tam `npm run combat:test` yeniden çalıştırıldı ve geçti. Commit için ayrılan, diğer devam eden değişiklikleri içermeyen snapshot da map:check, mg:test, combat:test ve turret:test kontrollerinden geçti.
- Derlenmiş sürüm Chromium/headless SwiftShader, 1440×900: 2 ile gerçek namlu görünen POV, fareyle nişan, basılı sol tuşta 0→4 atış sayacı, WASD sürüş (2 km/sa), 1 ile normal tank dönüşü gözlendi; pageerror yok. Bu bir performans veya insan sürüş hissi kabulü değildir. [POV kanıtı](previews/machine-gun-pov.png).
