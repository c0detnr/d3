# Kararlar ve açık konular

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
