# Hikaye ve görev planı — "Kül Vadisi Çaylakları"

İlk sürüm: 2026-11-05. **Durum:** Plan onaylandı (ton, dil, taret kontrolü ve 1. görev içeriği kullanıcıyla netleşti). 1. görev uygulandı; otomatik/tarayıcı doğrulaması mevcut, insan oynanış kabulü açık. 2–5 henüz uygulanmadı.

## Kesin kararlar (2026-11-05, kullanıcı)

- Ton: hafif ve eğlenceli; esprili telsiz konuşmaları, arcade havası. Kan ve dram yok.
- Dil: Türkçe + İngilizce, ana menüden seçilir; tüm oyuncu metinleri tek sözlükten gelir.
- Taret: fare bakışını kendi dönüş hızıyla takip eder, namlu hedefe yükselir/iner; tekerlek yakınlaştırma. Q/E taret dönüşü kaldırılır.
- 1. görev: eğitim + kısa çatışma, mevcut doğal arazide.
- Dağıtım: itch.io HTML5 (masaüstü tarayıcı, klavye + fare, tek oyuncu). LAN ve Android mevcut haliyle kalır, itch.io paketine girmez.

## Görev 1 teslim kararı (bu görev kapsamı)

- **Görev 1 kapsamında kesinleşti:** İlerleme tarayıcıda (`localStorage`) saklanır; görev bitince sonraki açılır. 2. görev kartı açılır, içerik Yakında kalır.
- **Görev 1 kapsamında kesinleşti:** 3 yıldız: bitir / 360 saniyeden kısa / 50 hasardan az. Yıldızlar gösterimdir; sonraki kartı görevi bitirmek açar.

## Öneriler (onay bekler)

- 5. görevdeki komuta merkezi tek kapsamlı Blender varlığı; diğer basit nesneler (bayrak, yakıt tankı, köprü, işaret direkleri) kodla üretilir.

## Dünya ve karakterler

Kurgusal **Kül Vadisi**'nde iki taraf var: oyuncunun bağlı olduğu, imkânsızlıktan her şeyi bantla tamir eden **Kartal Bölüğü** ve parlak tanklarıyla gösteriş meraklısı **Gri Pençe Birliği**.

| Karakter | Rol | Ses tonu |
|---|---|---|
| **Çaylak** | Oyuncu, yeni tank komutanı | Konuşmaz; diğerleri ona laf atar |
| **Rıza Usta** | Tankın şoförü/tamircisi | Huysuz, her şeyi "benim zamanımda" diye anlatır, tanka "Paslı Kız" der |
| **Telsizci Defne** | Karargâh telsizcisi | Hızlı, iğneleyici, görevleri anlatır |
| **Albay Gürültü** | Gri Pençe komutanı | Kendini çok ciddiye alan, telsizden nutuk atan kötü adam |

Diyaloglar ekranın alt köşesinde portre + kısa metin olarak, oyunu durdurmadan akar. Her görevin başında bir brifing kartı, sonunda sonuç ekranı vardır.

## Görevler

| # | Ad (TR / EN) | Harita | Amaç | Yeni öğrenilen | Yeni varlık |
|---|---|---|---|---|---|
| 1 | **Çaylak Günü** / Rookie Day | Doğal arazi | Kontrol noktalarına sür, sabit hedefleri vur, pusuya düşen 2 keşif tankını yok et | Sürüş, fareyle nişan, atış, yakınlaştırma | Kodla: kontrol noktası halkası, görev işaretçisi |
| 2 | **Kayıp Erzak** / Lost Supplies | Doğal arazi, ormanlık bölge | Ormana dağılmış 3 erzak sandığını topla, 2 devriyeyi atlat ya da yok et | F ile toplama, G ile sis perdesi | Mevcut sis sandığı modeli yeniden kullanılır |
| 3 | **Köprü Meselesi** / Bridge Business | Kül Vadisi, kuru dere | Köprü başını 3 dalga boyunca savun (her dalga 2–3 tank) | Siper alma, tamir molası (R) | Kodla: basit köprü, kum torbası siperleri |
| 4 | **Fabrika Baskını** / Factory Raid | Kül Vadisi, fabrika koridoru | 4 yakıt tankını patlat, fabrikadan sağ çık | MG ile hafif hedefler, patlayan nesne | Kodla: yakıt tankları; mevcut fabrika binası |
| 5 | **Albay'ın Hesabı** / The Colonel's Bill | Kül Vadisi, kuzey üs | Savunmayı yar, Albay Gürültü'nün ağır tankını ve komuta merkezini yok et | Patron tankı (daha fazla can, daha güçlü top) | **Blender:** komuta merkezi |

### 1. görev — Çaylak Günü (ayrıntı)

Hikaye: Çaylak ilk gününde Rıza Usta ile "tatbikat"a çıkar. Tatbikatın sonunda Gri Pençe'nin iki keşif tankı yanlışlıkla atış alanına girer ve tatbikat gerçeğe döner.

| Adım | Amaç | Bitiş koşulu | Örnek telsiz |
|---|---|---|---|
| 1 | Brifing | Oyuncu "Başla"ya basar | Defne: "Hoş geldin Çaylak. Paslı Kız'ı çizmeden geri getir yeter." |
| 2 | Sürüş | 3 kontrol noktasından sırayla geç (W/A/S/D) | Rıza: "Gaza yavaş bas, bu tank benden yaşlı." |
| 3 | Nişan ve atış | 3 sabit zırh hedefini vur (fare + sol tık, tekerlek yakınlaştırma) | Rıza: "Fareyle bak, kule gelir. Yavaş gelir ama gelir." |
| 4 | Pusu | 2 kolay AI tankını yok et | Albay Gürültü: "Bu benim atış alanım! ... Neyse, onları ezin." |
| 5 | Sonuç | Zafer ekranı, yıldızlar, sonraki görev açılır | Defne: "Tatbikat başarılı. Sanırım." |

Yenilgi: tank yok olursa "Yeniden dene" / "Görev seçimi". Görevde tamir/sıfırlama için R korunur.

## Arayüz akışı

```text
Açılış ekranı → Ana menü ─┬─ Görevler → Görev seçimi (5 kart, kilitli/açık, yıldız) → Brifing → Oyun
                          ├─ Ayarlar (dil, fare hassasiyeti, ters Y, ses düzeyi, grafik kalitesi)
                          ├─ Kontroller
                          └─ Yapımcılar (varlık kaynakları ve lisanslar)
Oyun içinde Esc → Duraklat (Devam / Yeniden başlat / Ayarlar / Görev seçimi)
Görev sonu → Sonuç ekranı (Zafer/Yenilgi, süre, isabet, yıldızlar, Devam / Tekrar)
```

## Kabul koşulları (her görev için)

- Menüden görev başlar, bitirilir, sonraki açılır; sayfa yenilenince ilerleme kalır.
- Yeniden başlatma ve menüye dönüş sahne kaynaklarını sızdırmaz (art arda 5 deneme sonrası hata yok).
- Tüm metinler TR/EN geçişinde değişir; eksik çeviri anahtarı yok.
- itch.io paketi göreli yollarla açılır (yerel statik sunucuda alt dizinden test edilir).
- Konsolda hata yok; görev durumu geçişleri otomatik kontrolle sınanır.


## 2026-11-05 — Görev 1 uygulaması ve doğrulama

- `MissionDirector`: olay tabanlı, veri tanımlı checkpoint/isabet/imha/süre adımları; brifing, aktif, zafer, yenilgi. Gelecek görevlerin saf kuralları aynı çekirdeğe yeni veriyle bağlanabilir; yeni dünya etkileşimleri kendi adaptörünü gerektirir.
- Kontrol noktaları doğal arazi patikasında z=-22/-4/12 m, 6 m yarıçap; araziyi izleyen ışıklı halka ve direk. Yalnız güncel halka aktiftir. Menzildeki mevcut üç ArmorTarget gövde/kule isabetinden herhangi biri yeterli; üç ayrı hedef gerekir, delme şartı yoktur.
- Pusuda iki gerçek DuelTank, ayrı EasyDuelAI ve mermi havuzları kullanır. Oyuncuya en yakın iki açık patika kesiminde devreye girer, son bilinen pusu noktasına yaklaşırlar. Sis iki rakibin de görüş/ateşini engeller. Oyuncu imhası yenilgidir; iki rakibin imhası zaferdir.
- Amaç HUD'u, dünya hedefi/ekran kenarı oku ve metre, kısa onay animasyonu/ana ses düzeyine bağlı Web Audio tonu; sırayla, yazılarak akan Rıza/Defne/Albay telsizi ve kodla portre rozetleri. Tüm yeni metinler TR/EN sözlüklerinde. Son replik sonuç ekranında da okunur.
- Süre aktif simülasyon süresidir; duraklatma sayılmaz. İsabet oranı top/MG hedef ve tank temasları / atılan mermiler; toplam alınan hasar kurtarmadan sonra da birikir. R amaçları sıfırlamaz; tam yeniden başlatma yeni sahne kurar. Zafer istatistikleri ve en iyi yıldız playerSave'e yazılır.
- Görev 2 kilidi önceki görevin tamamlanmasından türetilir, sayfa yenilemesinde korunur; Yakında kartı başlatılamaz. Diğer dört görevin oyun içeriği eklenmedi.

Doğrulama: `npm test`, `combat:test`, `smoke:test`, `shell:test`, `map:build`, `build:itch`, `lan:check` ve `scripts/check-lane-drones.ts` geçti. Görev durumları `scripts/check-missions.ts` ile sınanır. Sis atıcıları gerçek kule dünya dönüşümüne bağlıdır; gerçek GLB'de kule dönüşü, namlu yönü ve eğimli gövde kontrolü `smoke:test` içindedir. Drone kontrolünün `97 !== 100` hatası görev/sis entegrasyonundan **önce** tekrarlandı: ilk dalga sırasında sis açılmadan 3 hasar alınabiliyordu. Kontrol şimdi sis öncesi canı yakalar, sis sırasında ek hasar olmadığını ve sis kalkınca hasarın döndüğünü doğrular; üretim drone davranışı değiştirilmedi.

Headless Chromium / ANGLE SwiftShader, 1440×817, düşük kalite: menü → görev 1 → brifing → başla; DEV kancalarıyla üç kontrol noktası, üç gerçek hedef gövdesi, iki gerçek AI tankı ve zafer; yenilgi/Tekrar, beş tam sahne yeniden başlatma, İngilizce HUD, kayıt sonrası görev 2 açılması doğrulandı. Sayfa/kaynak/konsol hataları boş. Kanıtlar: `artifacts/mission1/browser-check.json`, `objective-hud.png`, `radio.png`, `enemy-combat.png`, `victory.png`, `defeat.png`, `objective-en.png`. Test kancaları yalnız DEV derlemesindedir. `enemy-combat.png` iki gerçek rakibin görülebildiği DEV inceleme kamerasıyla alınmıştır. Gerçek itch paketi ayrıca `/game/` alt dizininde 1280×577 görünüm alanında açıldı: menü/brifing/görev HUD, göreli GLB/WASM yolları ve DEV kancasının yokluğu sıfır hatayla doğrulandı (`production-check.json`, `production-subdirectory.png`).

**Açık insan kabulü:** Baştan sona klavye/fareyle görev oynayışı, kontrol noktalarının okunması, üç hedefe erişim/nişan öğretimi, telsiz temposu/ses, pusu dengesi, gerçek GPU performansı. Headless kanca testi bu kabulü kapatmaz; LAN/Android gerçek cihaz kabulü de yapılmadı.
