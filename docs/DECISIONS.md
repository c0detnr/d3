# Kararlar ve açık konular

## 2026-11-13 — Oyuncu kontrollü FPV

- **Kesin karar:** Tank üstünden kalkış; ASSIST ve ACRO; uçuş bitene kadar tanka dönüş yok; tank imha olsa da son saldırı devam eder. Batarya ve süre sınırı yok. FPV OSD içinde kozmetik batarya dahil uçuş göstergeleri bulunur.
- **Prototip tercihi:** B mod, V kalkış; doğrudan çarpışma 25 HP; tank sağlamsa yeniden kalkış. Hasar ve mühimmat ekonomisi kesin tasarım kararı değildir.
- **Açık:** İnsan uçuş hissi/ses/denge kabulü; ayrı drone avcı AI ve gamepad kapsam dışı.
- **Ayrıntı:** [FPV drone](FPV_DRONE.md).

## 2026-10-28 — Kül Vadisi 5’e 5 üs saldırısı

- **Kesin kullanıcı kararları:** İki takımda beşer oyuncu; kuzey/güney ana üsler; ormanlık sırt, merkez fabrika ve taş ocağından oluşan üç koridor; yan geçitler. Koridor başına ve takım başına bir büyük dış savunma, üs girişinde ortak iç savunma; ayrı korunaklı doğma hangarları ve komuta merkezi.
- **Kazanma yolu:** Tek koridorun dış savunmasını kırıp ortak iç savunmayı aşarak komuta merkezini yok etmek yeterli; diğer iki koridoru temizlemek zorunlu değil.
- **Önceki planla ilişki:** 2026-10-24 kaydındaki 6’ya 6 ve merkezde tek ele geçirme alanı önerileri bu tasarım için geçersiz. 800 × 800 m ve 30–45 saniye kesin değerler değil.
- **Açık:** Yeniden doğma/koruma, maç süresi, yapı can/ateş ve hasara açılma kuralları, son ölçüler, üs mimarisi. Onarım hangarı ve konvoy oynanış önerisi olarak kalır.
- **Gerekçe:** Kullanıcı koridor savunmalarını aşarak düşman üssüne ilerlemeyi seçti ve önerilen harita düzenini onayladı.
- **Durum:** Yalnız belge teslimi; 5’e 5 sistem veya harita üretimi başlamadı. M1/M2/M3 kabulü değişmez.
- **Etkilenen belgeler:** [Harita ve model planı](MAP_AND_MODEL_PLAN.md), README belge haritası, bu karar kaydı.

## Kullanıcı tarafından belirlenen kararlar — 2026-10-23

| Konu | Karar |
|---|---|
| Ad | IRON DUST, çalışma adı |
| Platform ve kontrol | Masaüstü web; klavye + fare |
| Tema | Kurgusal modern tanklar |
| Görsel kimlik | Industrial Low Poly; kullanıcı tarafından verilen altı renk |
| İlk tank hiyerarşisi | Tek mesh değil; ayrı gövde, kule ve namlu pivotları, iki palet grubu, her tarafta altı yol tekerleği ve ayrı çarpışma geometrisi; [tam ağaç](TANK_ASSET.md) |
| Tank hareket hazırlığı | Gövdeden bağımsız kule yönü, ayrı namlu yükselişi ve hareket hızına bağlı palet animasyonu |
| İlk tank görsel bütçesi | Yaklaşık 12–20 bin üçgen; mat zeytin yeşili, koyu grafit paletler, seyrek aşınma ve az vurgu rengi; fotoğraf dokuları yerine form ve ışık |
| Deneyim | Mekanik derinlik + erişilebilirlik; birebir simülasyon değil |
| Kamera | Üçüncü şahıs; genel tasarımda nişancı görüşü de var |
| İlk sürüş | Haritada tek başına dolaşma |
| MVP sırası | Temel dünya → sürüş fiziği → savaş sistemi |
| Fizik optimizasyonu | Her palet baklası ayrı fizik cismi olmayacak |
| Teknoloji | TypeScript, Babylon.js, Havok, React, Tailwind, Zustand, Vite; Blender/glTF |
| Kapsam dışı | Multiplayer, mağaza, onlarca araç, dev haritalar, tüm yapıların fiziksel yıkımı |
| Bu görev | Gerekli başlangıç dosyalarını planla ve oluştur; uygulama koduna başlanmadı |

## 2026-10-26 — İlk AI tank düellosu

- **Kesin kullanıcı kararları:** Tek hareketli AI rakip, basit can, yalnız top hasarı; iki tankta eşit 100 can / 25 hasar / 5 s dolum ve sınırsız mühimmat. Ön/yan/arka zırh, açı ve mesafe hasarı değiştirmez. MG hasarsız kalır.
- **Oyun akışı:** Serbest sürüş korunur; ayrı düello düğmesi. AI görünce takip eder, uygun mesafede yavaşlayıp nişan alır/ateş eder; engelin arkasından görmez, anında kusursuz nişan almaz. Kendi canı sürekli, rakip canı görüşte görünür. İmha kazandın/kaybettin, aynı-adım çift imha berabere sonucudur. Kısa efekt ve duran enkaz; yeniden dene veya aktif düelloda R/kurtarma iki tarafı tamamen sıfırlar.
- **Gerekçe:** Kullanıcı önce oynanabilir hareketli düello istedi; zırh/modül derinliği yerine basit can seçti. Eski M3 zırh/modül hedefleri iptal edilmedi; ayrı sonraki kapsam olarak kalır.
- **Teknik öneri / açık ayarlar:** Mevcut fizik/top sınıflarını yeniden kullanma, sade gövde/kule hasar hacimleri, son görülen konuma takip ve sınırlı kurtulma manevrası. AI tepki/mesafe/tolerans değerleri ve başlangıç koordinatları prototiple ayarlanacak; kesin kullanıcı değerleri değildir.
- **Durum:** Yalnız plan; uygulama başlamadı, oyun testleri çalıştırılmadı. M1/M2/M3 kabulü değişmez. [Plan ve kabul senaryoları](COMBAT_DUEL_PLAN.md); README belge haritası ve ROADMAP güncellendi.

**Sonraki uygulama durumu (2026-10-26):** C1 iki tank test modu ve tek Havok adımı uygulandı; gerçek GLB/Havok kontrolleri geçti. Can, hasar, AI ve sonuç akışı henüz uygulanmadı.

## Planlama tercihleri / öneriler

- M2 sonunda sürüş teslimi; M3 sonunda savaş mekaniklerini içeren vertical slice. Önceki sürüş isteği ile son MVP sırasını birlikte koruyan planlama ayrımıdır.
- Tek özgün tank ve küçük test sahasıyla başlamak.
- M3'ü düşman AI yerine sabit hedeflerle doğrulamak.
- İlk fizik prototipinde sabit 60 Hz adım denemek.
- İlk performans hedefini referans cihazda 1080p / yaklaşık 60 FPS olarak denemek.
- Harita ayrıntıları, kontrol tuşları, kaynak dizinleri ve varlık sözleşmesi belge önerileridir; uygulamayla doğrulanacaktır.

## Açık konular

| Konu | Ne zaman kararlaştırılmalı? |
|---|---|
| Paket sürümleri, Havok dağıtım/lisans koşulları | Uygulama kurulumu öncesi |
| Referans cihaz, tarayıcılar ve render backend | İlk teknik deneme |
| İlk tank silüeti, ölçüleri ve fizik değerleri | M1 model taslağı / M2 prototipi |
| Harita boyutu ve zemin türleri | M1 taslağı / M2 sürüş değerlendirmesi |
| Fren, geri sürüş, serbest bakış ve kurtarma kontrolü | M2 kontrol denemesi |
| Nişancı görüşüne geçiş ve stabilizasyon gücü | M3 başlangıcı |
| Mühimmat türü, delme/sekme kuralları, modül hasarı | M3 başlangıcı |
| Diğer varlık, kaplama ve efekt bütçeleri; tank hedefinin performansla doğrulanması | İlk performans ölçümü sonrası |

İlk tank modelleme kararlarının gerekçesi: bağımsız kule/namlu hareketini ve hıza bağlı palet animasyonunu desteklemek, form ve ışık odaklı görsel dili korumak. Etkilenen belgeler: `ART_DIRECTION.md`, `TANK_ASSET.md` ve README belge haritası. Blender teslim kontrolleri teknik öneridir; modelin üretildiği veya doğrulandığı anlamına gelmez.

Yeni karar kaydında tarih, kararın sahibi, gerekçe ve etkilenen belgeler belirtilir. Kullanıcı tercihleriyle teknik deneme sonuçları birbirine karıştırılmaz.

## 2026-10-23 — Hareket efektleri planı

- **Kullanıcı isteği:** Tank hareket ettikçe çıkacak parçacık efektlerini planla.
- **Öneri:** Önce palet teması/hızıyla toz ve dönüş/fren tepkileri; sonra yüzey parçaları ve iniş pufu. Egzoz isteğe bağlı cila. [Ayrıntılı plan](MOVEMENT_EFFECTS.md).
- **Açık:** Görsel kabul, sayısal eşikler, CPU/GPU parçacık tercihi ve referans cihaz bütçesi prototiple doğrulanacak. Bunlar kesin kullanıcı kararları değildir.
- **Durum:** Yalnızca belge; oyun kodu, model ve paketler bu görevde değiştirilmedi. M1/M2 kabulü açık.

## 2026-10-23 — Basit test haritası

- **Kullanıcı kararı:** Şimdilik tankı test edebileceği çok basit bir harita; sanayi dekoru ve büyük harita ertelendi.
- **Uygulanan başlangıç tercihi:** 160 × 160 m düz alan, düz şerit, dönüş alanı, iki yönlü alçak rampa ve küçük tümsekler. Ölçüler sürüş değerlendirmesiyle değişebilir; kullanıcı tarafından kesinleştirilmiş harita boyutu değildir.
- **Açık:** Sürüş fiziği ve gerçek tank entegrasyonu sonraki iş. M1/M2 tamamlandı kabul edilmez.
- Harita kodu `src/game/world/createTestGround.ts`; bağımsız önizleme `map-preview.html`. Mevcut Blender dosyalarına dokunulmadı.

## 2026-10-23 — Blender tank varlığı teslimi

- **Kullanıcı kararı:** `docs/TANK_ASSET.md` temelinde Blender MCP ile uygun tankı modelle.
- **Uygulanan taslak tercihi:** Köşeli alçak kule, modüler yan zırh, uzun namlu, altı yol tekerleği/yan; 4,16 × 9,235 × 3,764 m anten/namlu dahil sınırlar. Ölçüler ve silüet ilk varlık taslağıdır; son fizik değerleri değildir.
- **Doğrulanan sonuç:** 14.512 görünür üçgen, 12 çarpışma üçgeni, 8 materyal; hareket pivotları ve GLB yeniden içe aktarımı kontrol edildi. [Teslim kaydı](../assets/tanks/iron_dust_01/README.md).
- **Açık:** Motor yükleyicisi, çarpışma metadata uygulaması, hareketli palet yöntemi, süspansiyon ve geri tepme animasyonu, runtime performans. Kullanılan geçici çarpışma kutusu son fizik şekli değildir.

## 2026-10-23 — Doğal arazi ve orman

- **Kullanıcı kararı:** Daha gerçekçi görünen ıssız arazi; ileride orman.
- **Uygulanan taslak:** Düz test pistini doğal yükseklikler ve kıvrılan toprak patikayla değiştir; tank çevresini açık tut, +Z yönünde ormanı yoğunlaştır. Ayrıntılı bölge 320 × 320 m, çevresindeki seyrek geometri yalnızca ufuk devamlılığını sağlar. Bu ölçüler kesin oyun haritası boyutu değildir.
- **Teknik tercih:** Aynı mesh üzerinden çizim/çarpışma; tekrar kullanılan ağaç geometrisi, yakın gövdelerde statik çarpışma; uzak ağaçlar görsel arka plan. Blender varlığı korunur.
- **Açık:** Oynanabilir alan sınırı, uzak ağaçlara erişim, sürüşe göre eğim/tutuş ayarı ve referans performans. M1/M2 tamamlandı kabul edilmez.

## 2026-10-23 — Taret prototipi

- **Kullanıcı kararı:** Taret planının uygulanmasına başla. Bu adım bağımsız taret/namlu takibi; sürüş teslimi savaş sistemine bağlanmıyor.
- **Prototip ayarları:** 360° taret, 35°/s yatay hız; −8°…+20° namlu, 15°/s yükseliş hızı. Oyun ayarlarıdır; kesin araç özellikleri değildir. Merkezi `VehicleDefinition` içinde radyan/saniye kullanılır.
- **Uygulanan kontrol:** Fareyi sürükleyerek kamera/nişan hedefi; Alt basılıyken veya C aç/kapat ile serbest bakış. Serbest bakış son dünya hedefini korur. Nişan sırasında otomatik arkaya kamera toparlanması kapalıdır.
- **Uygulanan gösterim:** Merkez artısı hedef yönü, hareketli halka gerçek namlu doğrultusundaki ilk fizik engeli; engel yoksa 800 m referansı. 12 m içindeki engel turuncu uyarı verir. Bu halka mermi düşüşü hesabı değildir.
- **Açık:** Nişancı görüşü, ayarlanabilir stabilizasyon karakteri, namlu/gövde/çevre kesişmelerinin tam çözümü, atış ve geri tepme. Mevcut taret kinematik; ayrı Havok gövdesi eklenmedi. M1/M2 kabul maddeleri sürüyor.


## 2026-10-24 — Ses sistemi planı

- **Kullanıcı isteği:** Ses sistemini planla; sesleri ajanın kendisi halledebilir mi?
- **Öneri (kesin karar değil):** İlk sürüm tamamen prosedürel Web Audio sentezi. Motor, iki palet, rüzgâr, süspansiyon, fren/hava ve taret servo M2; top, geri tepme, mermi ve isabet M3. Dış ses dosyası ve müzik MVP dışında.
- **Gerekçe:** Özgünlük, lisans temizliği, küçük paket ve araç parametrelerinden yönetilebilirlik. Ajan sesleri üretip sayısal olarak doğrulayabilir; estetik dengeyi tarayıcıda insan dinlemesi belirler.
- **Plan:** [Ses sistemi planı](SOUND_DESIGN.md). Mimari `src/game/audio/`, sınırlı ses havuzu, ilk kullanıcı girdisinde AudioContext, sekme gizlenince askıya alma ve kaynak temizliği.
- **Açık:** Prosedürel mi gerçek kayıt katmanı mı; düzey kalıcılığı; ayrı silah/efekt kaydırıcısı; dinleme referansı; reverb miktarı. Bunlar kullanıcı kararı veya prototip ayarı olarak S1–S3'te netleşecek.
- **Durum:** Yalnızca belge; ses kodu, model ve paketler bu görevde değişmedi. M1/M2/M3 kabulü açık.

## 2026-10-24 — Ses S1 uygulaması

- **Kullanıcı kararı:** Ses sistemini planla ve başla. Önerilen prosedürel Web Audio yolu uygulandı.
- **Uygulanan:** `src/game/audio/` altında AudioSystem (AudioContext/limiter), motor, iki palet, rüzgâr, araç ses modeli ve orkestrasyon. İlk kullanıcı girdisinde açma, sekme gizlenince askıya alma, panelde Ses ve düzey denetimi, sahne kapanışında temizlik.
- **Doğrulanan:** `npm run audio:test` geçti; eşleme sınırları, palet hız/yön/dönüş, hava, model sıfırlama, sahte ses arka ucuyla kur/kapat ve kaynak temizliği. `npm run map:check` ve `npm run map:build` geçti. Chromium'da ilk tuşla ses açıldı, sayfa hatası yok.
- **Açık:** İnsan dinlemesi, ses dengesi, ses açık/kapalı performans karşılaştırması, gerçek cihaz çıkışı; S2 süspansiyon/fren/taret ve S3 savaş sesleri. Bunlar kabul edilmiş değildir.
- **Durum:** M2 sürüş teslimi ses katkısıyla sürüyor; M1/M2/M3 kabulü açık. Eşzamanlı savaş çalışması bu commit'e dahil edilmedi.

## 2026-10-23 — İlk üç hareket efekti

- **Kesin kapsam:** Kullanıcı palet temas, hızlı sürüş ve dönüş tozunu istedi; uygulandı.
- **Uygulama tercihi:** Mevcut süspansiyon rayları, sabit adımlı dünya uzayı havuzu ve Babylon sprite renderer; özgün prosedürel kaplama. Fren/iniş/egzoz eklenmedi.
- **Açık:** Referans cihazda efekt açık/kapalı performans karşılaştırması ve son görsel kabul. Sayısal ayarlar prototip değerleridir.

## 2026-10-24 — M3.1 ateş ve balistik çekirdeği

- **Kullanıcı kararları:** Tek 120 mm AP; mesafeyle azalan basit delme; ilk aşamada hasar yok; sağ tık basılı tutunca nişancı görüşü; görsel-only efektler.
- **Uygulanan ayarlar:** 900 m/s namlu hızı, 6,5 s dolum, 220→140 mm delme (0→1000 m), 70° sekme eşiği. Değerler prototip ayarlarıdır; gerçek araç özellikleri değildir.
- **Teknik karar:** Mermi başına Havok gövdesi yok; sabit adımda önceki→yeni konum arasında süpürülmüş ışın sorgusu kullanılır. Geri tepme yalnızca `Barrel`/`MuzzlePoint` görsel kaydırmasıdır; gövde tek rigid body kalır.
- **Zırh kuralı:** Etkin zırh = kalınlık / cos(geliş açısı); gövde/kule ve ön/arka/yan/üst/alt yüzeyler ayrı kalınlıklara sahiptir. Sonuç hasar uygulamaz, yalnız raporlanır.
- **Doğrulanan:** `npm run combat:test` ve mevcut regresyonlar geçti. Tarayıcı kabulü, nişancı görüşü/efekt performansı ve insan değerlendirmesi yapılmadı.
- **Açık:** Hedef HP/yıkılma, modül hasarı, HE, düşman AI, oyuncu hasarı, savaş sesi ve tam namlu kesişme çözümü. M1/M2/M3 kabulü açık.

## 2026-10-24 — Kaotik gökyüzü prototipi

- **Kullanıcı isteği:** Gökyüzü değişsin; kaotik bir atmosfer istendi.
- **Uygulanan prototip tercihi:** Düz gradyan gökyüzü yerine prosedürel fırtına shader'ı; iki hızda sürüklenen bulut katmanları, basamaklandırılmış yoğunluk, sıcak toprak ufku, düşük açılı sıcak güneş, yoğunlaştırılmış sis ve ara ara kısa şimşek çakması. Gökyüzü, sis ve şimşek ışığı tek modülden (`src/game/world/SkyAtmosphere.ts`) yönetilir; dış doku kullanılmadı.
- **Gerekçe:** Mevcut akşam ışığı sakin ve tek düze okunuyordu. Fırtına paleti altı renkli zırh/toprak paletiyle uyumlu kalırken sahneye hareket ve gerilim ekler.
- **Açık:** Bulut örtüsü, şimşek sıklığı, ufuk sıcaklığı, sis yoğunluğu ve oyun okunabilirliği kullanıcı değerlendirmesiyle değişebilir. Şimşek sesi eklenmedi; performans ölçülmedi. Bu bir prototiptir, onaylanmış son görsel yön değildir.

## 2026-10-24 — Arazi yüzey dokuları

- **Kullanıcı isteği:** Arazi dokularını gerçekçi yap.
- **Uygulanan teknik tercih (prototip):** Dış doku kullanmadan, çalışma anında üretilen albedo + normal + ince detay üçlüsü. Albedo büyük toprak kümeleri, taş taneleri, seyrek çatlaklar ve kuru bitki artıkları taşır; normal haritası aynı yükseklik alanından türetilir. 22 m'lik dikişsiz ana tekrar, farklı ölçekli detay katmanıyla kırılır. Arazi düzgün normallerle gölgelenir.
- **Gerekçe:** Önceki tek düze gri tanecik düz bir yüzey gibi okunuyordu; dış kaplama lisansı ve paket maliyeti olmadan malzeme çeşitliliği, mikro rölyef ve tekrar kırma hedeflendi.
- **Açık:** Doku ölçeği, taş/çatlak yoğunluğu, parlaklık, farklı zemin türleri ve performans etkisi insan değerlendirmesi ve ölçümle netleşecek. Bu, onaylanmış son görsel karar değildir.

## 2026-10-24 — Kamera, nişan ve atışın yeniden planlanması

- **Kullanıcı kararları:** Normal fare bakışı taret/namluyu etkilemez. Yalnız sağ tuş basılıyken taretin sağ yanından yakın üçüncü şahıs nişanı ve yatay/dikey silah kontrolü; bırakınca normal kamera ve son silah yönü. Sol tık iki görünümde tek atış; görünür uçuş/düşüş, kısa iz; otomatik balistik çarpma tahmini yok. Hasarlar sonra planlanacak.
- **Kabul edilen başlangıç planı:** Bakış yönünü koruyan yumuşak geçiş; 5 saniye dolum ve atış kuyruğu yok; gerçek namludan çıkan hasarsız deneme mermisi; geri tepme, yüzey isabeti ve ses geri bildirimi.
- **Önceki kayıtla ilişki:** M3.1'in dürbün görünümü, varsayılan kamera-taret takibi, 900 m/s / 6,5 s ayarları ve AP/delme/sekme seçimi tarihsel prototipi anlatır. Yeni tasarımda mühimmat/hasar kararı olarak kullanılmaz; kod henüz değiştirilmedi.
- **Uygulama yorumları / açık ayarlar:** Bırakınca yerel taret ve namlu açılarını tutma; kamera ofseti, hassasiyet, mermi hızı/düşüşü ve görsel/ses dengesi prototipte doğrulanacak.
- **Plan:** [Kamera, nişan ve atış yenileme](AIM_AND_FIRE_REWORK.md). Bu görev yalnız belgedir; M1/M2/M3 kabul durumu değişmedi.

## 2026-10-24 — MG02 oyun kontrolleri

- **Kullanıcı kararı:** 2 makineli tüfek POV; sol tık ateş; 1 normal tank moduna dönüş. Önceki tercih: POV sırasında sürüş ve öne sınırlı yönlendirme.
- **Uygulama tercihi:** Basılı sol tuşla seri ateş; MG02 mevcut kuleye bağlı, ±60° yatay ve −10°…+45° yükseliş. 600 atım/dakika, 320 m/s, 600 m menzil, her mermide kısa tracer ilk deneme ayarlarıdır.
- **Açık:** Son ateş hızı, kalibre, hasar, ısınma, mühimmat sınırı ve iz sıklığı; bu teslimde stok/hasar uygulanmadı.

## 2026-10-24 — Atış hissi yenilemesi

- **Kullanıcı kararı:** Mevcut geri tepme, ses ve duman başarılı kabul edilmez; yeniden tasarlanır. Kamera küçük ölçüde sallanabilir. Uygulama açıkça onaylandı.
- **Uygulanan prototip ayarları:** 65 ms geri hareket + 720 ms sekmesiz dönüş; yönlü 16000 N·s gövde darbesi; nişan niyetini değiştirmeyen kısa kamera hareketi; ayrı gaz/parlama ve zemine bağlı basınç tozu; üç stereo prosedürel top sesi varyasyonu. Balistik ve hasar kapsamı genişletilmedi.
- **Açık:** İnsan dinlemesi ve kullanıcının atış hissi kabulü. Geometriye bağlı yankı simülasyonu yok; ses kaydı eklenmedi. [Ayrıntılar](SHOT_FEEDBACK.md).

## 2026-10-24 — Kül Vadisi harita ve model planı

- **Kullanıcı kararı:** Üretilen kuşbakışı Kül Vadisi harita taslağı kullanılacak; harita ve model planı Markdown olarak kaydedilecek.
- **Gerekçe:** Kullanıcı görsel taslağı beğendi ve bu haritanın kullanılmasını istedi.
- **Öneriler:** 6'ya 6, 800 × 800 m, merkezde tek ele geçirme alanı, 30–45 saniye ilk karşılaşma hedefi ve 15 temel Blender çevre varlığından başlayan üretim sırası. Sayısal değerler ve model listesi kesinleşmiş kullanıcı kararları değildir.
- **Açık:** Son ölçek, oyuncu sayısı, mod/yeniden doğma kuralları, varlık ölçüleri ve bütçeleri, görüş/erişim dengesi.
- **Durum:** Gelecek çok oyunculu harita planı kaydedildi; kodlama, Blender üretimi ve ağ altyapısı başlatılmadı. Mevcut tek oyunculu MVP sırası ve açık kabul maddeleri korunur.
- **Etkilenen belgeler:** [Harita ve Blender model planı](MAP_AND_MODEL_PLAN.md), README belge haritası; seçilen görsel `docs/previews/kul-vadisi-map-plan.png` olarak saklandı.

## 2026-10-24 — Android ve dokunmatik kontrol

**Kesin karar — kullanıcı isteği:** Android APK desteği eklenir; soldaki HTML geliştirici HUD'u masaüstü ve mobilde kalıcı kaldırılır. Mobil için özgün dokunmatik kontroller tasarlanır.

**Uygulama kararı:** Mevcut Babylon/Havok oyununu yerel HTTPS origin üzerinde çalıştıran, varlıkları içinde taşıyan Android WebView kabuğu; yatay tam ekran, çevrimdışı kurulum ve debug imzalı ilk APK. Sürüş/fizik yeniden yazılmaz.

**Açık:** Fiziksel telefon performansı, uzun sürüş/ısınma/pil kabulü ve mağaza yayını için sürüm imzası. [Android notları](ANDROID.md).

## 2026-10-26 — Oynanabilir ikinci tank planı

- **Kullanıcı kararı:** Leopard 2A6 esintili, kum beji ikinci tankın hedefi oyunda sürülüp nişan alınabilmesi ve topunun ateşlenmesidir. Hız ve benzeri teknik ayarlar şu an öncelikli değildir. Mevcut tank korunur, yeni model ayrı varlık olarak ele alınır.
- **Tasarım planı:** Uzun namlu, kama kule zırhı, yedi yol tekeri/yan, ayrı kule/yükseliş/geri tepme grupları; önce oran taslağı değerlendirmesi, ardından detay ve GLB doğrulaması.
- **Öneriler:** Yaklaşık ölçüler, 18–24 bin görünür üçgen, materyal bütçesi ve hareket test aralıkları son oyun değerleri değildir.
- **Teslim sırası:** Model ve GLB → oyun içi tank seçimi ve sürüş → kule/top → tarayıcıda oynanabilirlik kabulü. MG ve kabin bu teslimin şartı değildir.
- **Açık:** Oyun içi ad, fizik/hasar değerleri ve 14 temas noktası ile geri tepme kökünün oyun entegrasyonu. Üretim başlamadı; M1/M2/M3 kabulü değişmedi.
- **Plan:** [Oynanabilir ikinci tank](SECOND_TANK_BLENDER_PLAN.md).

**Sonraki üretim durumu (2026-10-26):** Özgün kaynak ve GLB üretildi; tank seçimi, sürüş, kule ve top otomatik kontrolleri geçti. İnsan tarayıcı kabulü ve araç dengelemesi açık.

## 2026-10-27 — Hasar ve isabet geri bildirimi

- **Kullanıcı kararı:** metal darbe/kıvılcım, delme sonucunun okunması, modül geri bildirimi, kısa kamera darbesi, turuncu/kırmızı hasar yönü, küçük araç durum şeması ve imha sonrası duman/yangın uygulanır.
- **Uygulanan prototip ayarları:** 25 top hasarı ve 100 can korunur. İsabet edilen modül 50 bütünlük kaybeder; ikinci isabetle arızalanır. Bölge sınırları ve ses/efekt yoğunlukları oyun ayarıdır; kullanıcı tarafından son denge olarak onaylanmış değildir.
- **Sınır:** LAN'da zırh açısı top hasarını değiştirmez. Mevcut zırh hedeflerinde delme/sekme geri bildirimi; MG tank üzerinde hasarsız metal darbe üretir. Yerel kolay mod AI ve karşı ateş prototipi mevcut; HE ve fiziksel palet/kule parçalanması eklenmedi.
- **Açık:** insan görsel/işitsel kabulü, modül dengesi ve Android performansı. [Sistem ve doğrulama](DAMAGE_FEEDBACK.md).

## 2026-10-28 — Kül Vadisi uygulama başlangıcı

**Kesin:** Kullanıcı K0 + K1'e başlamayı onayladı. Mevcut test sahası korunarak `map=kul` seçimiyle ayrı harita kuruldu. Blender hangar çalışması korunur; bu adımda geçici yapı hacimleri kullanılır.

**İlk uygulama değerleri, son tasarım kararı değil:** 720 × 720 m, 18 m yol, 3 m arazi ağı ve [belgelenmiş geçici yapı ölçüleri](KUL_VADISI_BLOCKOUT.md). K0'da bütün yapı hacimleri statik sert siperdir; can/ateş/onarım/maç davranışı bağlı değildir.

**Açık:** Son harita/yapı ölçüleri, insan sürüşü ve görüş kabulü, Blender modeliyle yerleşim, beş tankın avlusu, son sınır görseli ve 5'e 5 maç dengesi.

## 2026-10-29 — Dere suyu

**Öneri (onay bekliyor):** İki "Kuru dere" yatağına görsel sığ su şeridi (`createKulWater.ts`). Fizik, sürtünme ve çarpışma değişmez; tanklar suyun içinden geçer. Su yüzeyi yatağın en alçak noktasının 0,35 m üstünde, x = ±150 m arasında, uçlarda daralır. Göletler, sıçrama efekti ve sürtünme sonraya bırakıldı.

**Açık:** Tarayıcıda görsel kabul (su yüksekliği, kıyı kesimleri, batı sırtı ve taş ocağı eğimlerinde görünüm).

## 2026-10-29 — Sağ uzantının tren sahası olması

**Kesin karar:** Kullanıcı sağ uzantı için terk edilmiş yük treni sahasını onayladı ve uygulama istedi. Paslı vagonlar, küçük bakım deposu ve devrilmiş yükleme vinci bölgenin kimliğidir; tankın manevra/geçiş alanları açık kalır. Önceki taş ocağı teması bu bölümde yerini tren sahasına bırakır.

**Uygulama:** [Tren sahası teslimi](RAIL_YARD.md). **Açık:** İnsan görsel/sürüş değerlendirmesi ve taktik denge; otomatik kontroller son oynanış kabulü değildir.

## 2026-10-29 — Sis mühimmatı

**Kesin kullanıcı seçimi:** Hem 2D envanter görünüşü hem dünya loot modeli hem mekanik hazırlanır. Sis tankın önünde perde oluşturur; sandık tanktan inmeden tuşla toplanır.

**Uygulama:** [Sis mühimmatı](SMOKE_SUPPLY.md). F toplama, G kullanım; özgün sandık/ikon, üçlü salvo ve ana sahnede AI görüş engeli.

**İlk deneme değerleri:** 3 kullanım taşıma, sandık başına 1 kullanım, 8 m toplama, 20 s bekleme, 0,7 s uçuş + 2 s büyüme + 15 s yoğun sis + 3 s dağılma. Bunlar onaylanmış oyun dengesi değildir.

**Açık:** Tarayıcı görsel/gerçek girdi kabulü, düşük tavanlarda görsel kapsül kavisinin davranışı, performans ve denge. LAN senkronizasyonu bu teslimde yok.


## 2026-10-29 — 5’e 5 yerel AI düellosu

**Kesin karar:** Kullanıcı onayıyla oyuncu + 4 dost AI ve karşıda 5 düşman AI. Her takım kendi üssünde doğar. Bu, yerel tek oyunculu moddur; LAN/çevrimiçi oyuncu sayısı genişletilmez.

**Uygulama ayarları:** 180 m görüş, üç koridor, 0,85 s tepki, 30–55 m çatışma mesafesi, takım imhasıyla sonuç ve dost hasarı koruması ilk oynanabilir değerlerdir; insan dengeleme kabulü değildir. [Kurallar ve açık kabul](TEAM_DUEL.md). Üs saldırısı/savunma zinciri hedef mekanikleri bu düello teslimine eklenmedi.

## 2026-11-04 — İçerik stüdyosu (Reels)

- **Kesin kullanıcı kararları:** Proje, oyunun yanında tankla Instagram Reels tarzı dikey video üretmek için de kullanılacak. Kalite için kare kare (çevrimdışı) render seçildi. Havok belirlenimciliği ayrıca doğrulanmayacak; hobi projesi olduğu için varsayılarak ilerlenecek.
- **Uygulama kararı:** `?studio=1` ayrı moddur; oyun modları ve M1/M2/M3 kabulü değişmez. Canlı çekim, adım başına girdi olarak kaydedilir; render, aynı girdileri tekrar oynatıp 1080 × 1920 kareleri geliştirme sunucusu üzerinden ffmpeg'e aktarır. Çıktı yerel `studio-out/` klasörüdür, backend eklenmedi.
- **Öneri / açık:** MG, sis ve serbest kamera kaydı; kamera yolları; tohumlu şimşek; hazır sahneler. Ses dahil canlı çekimin insan kabulü açık.
- **Etkilenen belgeler:** [İçerik stüdyosu](CONTENT_STUDIO.md), README.

## 2026-11-04 — İkinci tankın gerçekçi yeniden tasarımı (v2)

- **Kullanıcı isteği:** Leopard tankı daha gerçekçi biçimde yeniden tasarlanacak; iş Blender MCP ile yapılacak.
- **Kabul edilen öneri:** Görünür üçgen tavanı bu tank için yaklaşık 30–35 bine çıkarıldı; teslim 27.988 üçgen. Oranlar ve parça dizilimi Leopard 2A6'ya yakın; birebir kopya, marka veya işaret yok. Kullanıcı öneriyi "Blender MCP kullanarak yapalım" diyerek sürdürdü; açık bir sayı onayı vermedi.
- **Uygulama kararı:** Aynı varlık (`iron_dust_02`) yerinde yenilendi. Tekerlek merkezleri, `TurretPivot`, `GunPitchPivot`, `MuzzlePoint`, `COL_Hull`, düğüm adları ve GLB özel alanları korundu. Yol tekeri yarıçapı 0,475'ten 0,418 m'ye indi; palet alt kenarı yükseldiği için oyundaki temas yarıçapı yaklaşık 0,55'ten 0,52 m'ye düştü. Sürüş testi geçti.
- **Açık:** Oyun içinde görsel kabul ve sürüş hissi. Palet görünümü hâlâ geçici şerit shader'ına bağlı.

## 2026-11-06 — Ukraynalı piyade modeli

- **Kesin kullanıcı kararları:** Oyuna TPS modunda oynanacak 3D bir piyade eklenecek. Asker açıkça Ukraynalı olacak (bayrak, tryzub, MM-14 kamuflaj). Model Blender'da özgün low-poly olarak üretilecek ve tankın yanına yakışacak, gerçekçi görünecek. Önce yalnız model; silah, animasyon ve oynanış sonra. Şimdilik düşman piyade yok.
- **Önceki kararla ilişki:** 2026-10-23 "Tema: kurgusal modern tanklar" kararı ve "piyade MVP dışında" çizgisi bu istekle genişliyor. Kartal Bölüğü / görev hikâyesiyle ilişki açık.
- **Öneri (onay bekler):** 1,80 m boy, 10–15 bin üçgen, 5–7 malzeme, A-poz ve rig'e hazır döngüler, `assets/characters/ua_infantry_01/`. F0 oran taslağı kullanıcı onayına sunulacak.
- **Durum:** Model teslim edildi (F0–F6). Kullanıcı ara onay beklemeden bitirilmesini istedi. Varsayılanlar: yüz görünür ve gözlüklü, yelek zeytin yeşili. 16.806 üçgen ve 7 malzeme; önerilen bütçenin biraz üstünde. v2: kullanıcı modeli geliştirmeye devam etmeyi istedi. Gövdeye kumaş kıvrımı normal map'i (ayrı `UA_Uniform` malzemesi, toplam 8) ve köşe rengine AO eklendi. v3: kullanıcı üst vücut ve kolların geliştirilmesini istedi. Omuz, kol ve yelek ayrıntıları eklendi; 18.690 üçgen, doğrulama eşiği 20 bin. v4 (2026-11-07): kullanıcı kolların gerçekçi olmadığını söyledi. Önerilen CC0 taban modelin indirilmesini açıkça onayladı (Blender Studio Human Base Meshes v1.4.1, ~49 MB). Gövde, kafa ve eller bu modele geçirildi. Bu, varlığın "dış model kullanılmadı" durumunu değiştiriyor: kaynak ve lisans varlık notunda ve `public/licenses/` altında kayıtlı. 16.428 üçgen. Görsel kabul açık. [Plan](INFANTRY_MODEL_PLAN.md), [varlık notu](../assets/characters/ua_infantry_01/README.md).
