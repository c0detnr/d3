# UA Infantry 01

Durum: **v4 (2026-11-07): gövde, kafa ve eller CC0 anatomik taban modele geçirildi.** v2 kumaş kıvrımı normal map'i ve ortam gölgesini, v3 yelek ayrıntılarını ekledi. Kullanıcının görsel kabulü bekleniyor. Statik v4 dosyaları iskeletsizdir. Ayrı v5 rig ve animasyon çıktısı aşağıdaki bölümde; silah ve oyun entegrasyonu yok. Plan: [INFANTRY_MODEL_PLAN.md](../../../docs/INFANTRY_MODEL_PLAN.md).

Modern Ukraynalı piyade. Üzerinde MM-14 esinli piksel kamuflaj üniforma, kılıflı yüksek kesim kask, kulaklık ve mikrofon, balistik gözlük ve zeytin yeşili plaka taşıyıcı var. Plaka taşıyıcıda üçlü şarjör cebi, idari cep, telsiz ve anten, ilk yardım cebi bulunuyor. Ayrıca taktik kemer, kargo cepleri, dizlikler, coyote bot ve beş parmaklı eldiven var. Kimlik işaretleri: sol omuzda bayrak, sağ omuzda kalkan üzerinde tryzub, göğüste küçük bayrak, kol ve dizlerin üstünde sarı tanıma bandı.

## Kaynak ve lisans

Model, Blender 5.2.2 içinde Blender MCP ile [scripts/blender/build_ua_infantry_01.py](../../../scripts/blender/build_ua_infantry_01.py) betiğinden üretildi.

- **Gövde, kafa ve eller (v4):** Blender Studio *Human Base Meshes* v1.4.1 paketindeki `GEO-body_male_realistic` modelinden geliyor. Lisans CC0; paketin README'si "All provided assets are public domain under the CC0 license" diyor. Kaynak blender.org/download/demo, indirme tarihi 2026-11-07. Paketten yalnız multires seviye 0 kafesi ve göz konumları alındı: [source/hbm_body_male_realistic_l0.blend](source/hbm_body_male_realistic_l0.blend) (594 KB). Lisans kaydı: [public/licenses/BLENDER-HUMAN-BASE-MESHES.txt](../../../public/licenses/BLENDER-HUMAN-BASE-MESHES.txt).
- **Taban modelde yapılan değişiklikler:** 1,77 m'ye ölçeklendi ve iki kademe seyreltildi (un-subdivide). Ayaklar silindi. Üniforma bölgesi yumuşatılıp kumaş payı kadar dışa şişirildi. Bölgelere ten, eldiven ve üniforma malzemeleri atandı.
- **Bunun dışındaki her şey özgün:** kıyafet ayrıntıları, ekipman, kask, bot ve bütün dokular. Dokular betikte numpy ile üretiliyor. Bayrak ve tryzub, Ukrayna devlet simgelerinin sadeleştirilmiş çizimleridir. Kask, kulaklık ve yelek gerçek ürünlerin kopyası değildir; genel modern form örnek alındı.

Yeniden üretmek için Blender'da şu satırı çalıştırın:

```python
exec(open("/home/mami/Projects/d3/scripts/blender/build_ua_infantry_01.py").read(), {"UA_RUN": "export", "__name__": "ua"})
```

Bu komut modeli kurar, GLB'yi dışa aktarır, yeniden okuyup doğrular, ardından `model_stats.json`, `validation.json` ve `.blend` dosyalarını yazar.

## Ölçüler ve bütçe

| Ölçü | Değer |
|---|---|
| Boy (bot tabanı → kask tepesi) | 1,817 m (çıplak boy 1,77 m) |
| Kol açıklığı (A-poz, kollar yataydan ~67° aşağı) | 0,92 m |
| Görünür üçgen | 16.428 |
| Malzeme | 8: `UA_Uniform` (gövde), `UA_Camo`, `UA_Gear`, `UA_Dark`, `UA_Boot`, `UA_Skin`, `UA_Lens`, `UA_Insignia` |
| Doku | 5 PNG, GLB içine gömülü: MM-14 512², üniforma normal map'i 1024², cordura 256², yüz 256², nişan atlası 64² |
| Köşe rengi | `COLOR_0`: bake edilmiş ortam gölgesi, her parçada |
| GLB boyutu | 2,02 MB |

Üçgen sayısı plandaki 10–15 bin önerisinin biraz üstünde. En büyük paylar gövdeye (5.018; kafa ve eller dahil) ve yeleğe (3.816) ait. Gövde, taban modelin eklem halkalarını koruyan dörtgen topolojisinde. Değer tankın (27.988) altında. Bu bir modelleme bütçesidir; performans ölçümü yapılmadı.

## Parça sözleşmesi

```text
SoldierRoot  (origin: iki ayağın ortası, zemin seviyesi)
├── Body            tek skinlenebilir mesh (CC0 taban model): kafa ve boyun UA_Skin, eller UA_Dark (eldiven), gövde/kollar/bacaklar UA_Uniform
├── Helmet          kabuk, raylar, gece görüşü plakası, cırt bantları, denge cebi, çene kayışları
├── Headset · Glasses (gözlük + göz küreleri)
├── PlateCarrier    plakalar, yan kuşak, MOLLE, omuz askıları, cepler, telsiz ve anten
├── Belt · UniformDetails (yaka, kol ve kargo cepleri) · KneePads · Boots
└── Insignia        bayrak, tryzub, tanıma bantları
```

- Blender'da ileri −Y, yukarı +Z. GLB'de ileri +Z, yukarı +Y (tanklarla aynı). Oyunda tankla aynı yöne bakar.
- Her düğümde `asset_node_id` (`ua_infantry_01/<ad>`) alanı var. Kökte ayrıca `asset_version`, `height_m` ve `suggested_capsule` alanları bulunuyor.
- Çarpışma mesh'i üretilmedi. Oyuncu için kodda kapsül önerisi: yarıçap ~0,30 m, yükseklik ~1,80 m.
- Kamuflaj ve ekipman yüzlerinde 0,42 m'de bir tekrarlanan küp izdüşümü UV kullanıldı. Yüzde küresel UV, nişanlarda atlas hücresi UV'si var.

## v2 — Kumaş kıvrımları ve ortam gölgesi

- **Kıvrımlar:** Gövdeye ikinci bir UV katmanı (`UVMap_Detail`) eklendi; adalar 1024² dokuya sıkıştırıldı. Gövdenin iki kat alt bölünmüş kopyasına kıvrımlar işlendi: dirsek içinde ve diz arkasında daha güçlü toplanma, bilekte ve bot üstünde bolluk, kasıkta çapraz kıvrımlar, kemer üstünde gömlek toplanması, kol ve pantolon dikişleri. Bu kopyadan tanjant normal map'i bake edildi. glTF'te `normalTexture.texCoord = 1`. Üçgen sayısı değişmedi.
- **Ortam gölgesi (AO):** Cycles ile 0,12 m mesafede, yalnız askerin kendi parçaları hesaba katılarak her parçanın köşe rengine bake edildi. Değerler 0,42–1,0 aralığına sıkıştırıldı. glTF `COLOR_0` taban rengini çarptığı için yeleğin altı, cep kenarları ve kask içi oyunda koyulaşıyor.
- Blender'ın malzeme önizlemesinde AO görünmez, çünkü köşe rengi malzemeye bağlanmadı; etkisi oyunda görünür.
- Bilinen küçük kusur: normal map'te ışın kaçırmasından kalan ~%0,2 hatalı piksel, büyük kısmı ada kenarlarında.

## v3 — Üst vücut ve kollar

- **Omuz ve gövde:** Omuz eklemi dışa ve yukarı alındı (x 0,185 → 0,198 m). Boyun ile omuz arasına trapez düğümü eklendi; üst göğüs ve sırt genişledi.
- **Kollar:** Deltoid başı, pazu ve ön kol kası için ek iskelet istasyonları eklendi. Kollar artık omuzda dolgun, dirsekte dar, ön kolda hafif kaslı; boru görünümü kalktı.
- **Üniforma:** Dirseklere yastıklı dirsek pedleri eklendi.
- **Yelek:** Ön ve arka plakaya kenar biyesi eklendi; omuz pedleri kalınlaştırıldı. Ayrıca kuşakla ön plakanın birleşiminde tokalar, ön üstte iki MOLLE şeridi ve sol omuz askısında turnike var. Şarjör cepleri ağzı açık yapıldı: lastik bant ve görünen şarjör uçları.
- Kıvrım haritası yeni gövdeye göre yeniden bake edildi. Doğrulamadaki üçgen eşiği 18 binden 20 bine çıkarıldı.

## v4 — Anatomik taban model

Kullanıcı kolların gerçekçi olmadığını söyledi; haklıydı. Skin-modifier'la üretilen gövde boru şekilli uzuvlardan oluşan bir manken gibiydi. Gövde, kafa ve eller CC0 anatomik taban modelle değiştirildi.

- **Eklem noktaları:** Modelden ölçülüp betiğe yazıldı (`SHOULDER`, `ELBOW`, `WRIST`, `HIP`, `KNEE`, `ANKLE`). Kollar taban modelin A-pozunda, yataydan ~67° aşağıda. Cepler, yamalar, dizlikler ve botlar bu noktalara göre yeniden yerleşti.
- **Kafa ekipmanı:** Kafa merkezi ve yarıçapları gerçek kafadan ölçülüyor (`fit_head`). Kask, kafanın kesim çizgisi üstündeki her noktası içeride kalacak şekilde ölçekleniyor; bu sürümde %6,3 büyüdü. Gözlük lensi yüzün göz bandındaki en dış noktalarından yumuşatılarak, kulaklık ile çene kayışları ise gerçek kafaya ışın atılarak oturtuluyor.
- **Bot ve pantolon:** Botlar yuvarlatıldı ve alçaltıldı, bot ağzına yastık eklendi. Pantolon bot ağzının üstüne bolca dökülüyor.
- Eski analitik kafa, skin-modifier gövde ve ayrı eldiven parçaları kaldırıldı.

## Doğrulama

`validation.json` (2026-11-07, v4): GLB yeniden içe aktarıldı ve 10 kontrolün hepsi geçti:

- boy 1,78–1,86 m arasında
- ayaklar zeminde
- yüz −Y yönüne bakıyor
- üçgen sayısı 20 binin altında
- 8 malzeme var
- 5 doku gömülü
- bütün düğümlerde kimlik alanı var
- kök düğüm `SoldierRoot`
- üniforma normal map'i ikinci UV'yi kullanıyor
- her parçada AO köşe rengi (`COLOR_0`) var

Oyun içi kontrol: GLB, geliştirme sunucusunda geçici bir kodla IRON DUST 02'nin yanına yüklendi. Görüntü headless Chromium ile alındı (SwiftShader WebGL, 1280×720, varsayılan kalite). Ölçek, zemine oturma, yön, gölge ve kamuflajın okunması incelendi. Geçici kod geri alındı. v2, v3 ve v4 aynı yöntemle önden ve arkadan yeniden incelendi. Performans ölçülmedi.

## Önizlemeler

- [previews/final_views.png](previews/final_views.png): ön, sağ, arka ve 3/4 görünüm
- [previews/final_head_closeup.png](previews/final_head_closeup.png): kafa, kask, kulaklık ve gözlük
- [previews/final_with_iron_dust_02_close.png](previews/final_with_iron_dust_02_close.png) ve [geniş görünüm](previews/final_with_iron_dust_02_wide.png): tankın yanında
- [previews/ingame_babylon_next_to_tank.png](previews/ingame_babylon_next_to_tank.png): oyun ışığında, Babylon.js
- v4: [vücut](previews/v4_body_views.png), [kafa yakın plan](previews/v4_head_closeup.png), [oyunda önden ve arkadan](previews/ingame_v4_front_back.png)
- v3: [üst vücut](previews/v3_upper_body_views.png), [yelek yakın plan](previews/v3_plate_carrier_closeup.png), [oyunda önden ve arkadan](previews/ingame_v3_front_back.png)
- v2: [oyunda önden ve arkadan](previews/ingame_v2_front_back.png), [oyunda tam kare](previews/ingame_v2_full.png), [Blender EEVEE](previews/v2_eevee_front_back.png)
- F0 oran taslağı: [previews/f0_blockout_views.png](previews/f0_blockout_views.png)

## Açık konular

- Kullanıcının görsel kabulü.
- Sıradaki adımlar: v5 görsel kabulü, silah, TPS kontrolcüsü ve oyun entegrasyonu.
- Yüz taban modelden geldiği için gerçekçi. Ten dokusu (sakal, kaş, dudak) yine betikle üretiliyor ve yakın planda basit kalıyor.
- v1–v3 önizlemeleri eski skin-modifier gövdeyi gösteriyor.
- Kamuflaj UV'sinde küp izdüşümü dikişleri yakından fark edilebilir.

## Rig ve animasyon (v5)

Ayrı çıktı: [ua_infantry_01_rigged.glb](ua_infantry_01_rigged.glb). Statik v4 `.blend` ve `.glb` korunur; rig bellekte kurulur. Metre ölçeği, ayak ortasında zemin kökeni, glTF +Z ileri / +Y yukarı ve mevcut sekiz malzeme korunur. Kollar kalkınca açığa çıkan yelek yan kayışları yalnız rigged çıktıda gövdeye daraltılır.

- **33 kemik:** `Root`, `Hips`, `Spine` / `Spine1` / `Spine2`, `Neck`, `Head`; iki taraflı `Clavicle`, `UpperArm`, `Forearm`, `Hand`, `Thigh`, `Shin`, `Foot`; sağ elde temel `Thumb.R` / `Fingers.R` yanında iki eklemli `Index`, `Middle`, `Ring`, `Little`, `GripThumb` zincirleri. Ek parmak kemikleri otomatik ağırlıktan sonra eklenir; diğer kliplerde nötrdür.
- Gövde otomatik ısı ağırlıklarıyla skinlenir; kafa ekipmanıyla uyum için üst kafa ağırlıkları sabitlenir. Kask/kulaklık/gözlük kafaya, yelek göğse, kemer kalçaya; diğer ekipman bağlı bileşenler halinde ilgili uzva rigid skin ile bağlanır.
- **30 fps klipler:** `Idle_Alert` 4 sn (121 kare), `Idle_Smoke` 6 sn (181 kare), `Death_Fall` 1,4 sn (43 kare). İki idle klibinin ilk ve son pozu aynıdır. Smoke elini kaldırır, 2,2–3,8 saniyelerde ağzında tutar ve indirir; Death son karede yerde kalır. Death bir prosedürel düşüş animasyonudur; ragdoll değildir.
- **Smoke tutuşu:** avuç yüze dönük; ön kol dönüşü bilekle paylaştırılır. İşaret/orta hafif bükük, yüzük/serçe kıvrık ve başparmak içerdedir. Sigara yuvası pozlanmış iki parmak yüzeyinin arasından ölçülür; el ağza ulaşırken yalnız filtre ucu ölçülen dudak noktasına gelir. Doğrulama 181 karenin tamamında sigaranın ele göre kaymasını, tutma aralığında dudak temasını; ayrıca bilek sınırlarını ve parmak yakınlığını denetler.
- **`Cigarette`:** sağ ele ağırlıklı, 8 cm beyaz sigara ve turuncu emissive uç; iki yeni malzeme. GLB görünürlük animasyonu içermez: oyun yalnız `Idle_Smoke` oynarken bu düğümü göstermelidir. Oyun koduna entegrasyon yapılmadı.

Depo kökünde, Blender 5.2.2 ile:

```bash
blender -b --factory-startup --python scripts/blender/rig_ua_infantry_01.py
```

Betik GLB'yi yeniden import eder; klip adları, kemikler, `Cigarette`, döngü eşleşmesi, hareket, yerde bitiş, 3 MB sınırı ve kaynak dosyaların SHA-256 eşitliğini kontrol eder. Sonuç terminale ve [rig_validation.json](rig_validation.json) dosyasına yazılır. Yaklaşık çıktı boyutu 2,54 MB'dir.

Workbench ile her klipten üç kare `previews/rig_<klip>_<kare>.png` olarak ve [sigara yakın planı](previews/rig_smoke_closeup.png) render edilir. Önizleme zemini/kamerası GLB'ye aktarılmaz. Önizlemeler deformasyon kontrolü içindir; Workbench kamuflaj dokularını göstermez. Tarayıcı/oyun oynatma kabulü bu teslimin dışında kalır.
