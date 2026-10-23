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
