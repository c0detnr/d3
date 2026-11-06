# UA Infantry 01

Durum: **Model teslim edildi (F0–F6).** Kullanıcının görsel kabulü bekleniyor. Bu teslimde iskelet, skinning, animasyon, silah ve oyun entegrasyonu yok. Plan: [INFANTRY_MODEL_PLAN.md](../../../docs/INFANTRY_MODEL_PLAN.md).

Modern Ukraynalı piyade. Üzerinde MM-14 esinli piksel kamuflaj üniforma, kılıflı yüksek kesim kask, kulaklık ve mikrofon, balistik gözlük ve zeytin yeşili plaka taşıyıcı var. Plaka taşıyıcıda üçlü şarjör cebi, idari cep, telsiz ve anten, ilk yardım cebi bulunuyor. Ayrıca taktik kemer, kargo cepleri, dizlikler, coyote bot ve beş parmaklı eldiven var. Kimlik işaretleri: sol omuzda bayrak, sağ omuzda kalkan üzerinde tryzub, göğüste küçük bayrak, kol ve dizlerin üstünde sarı tanıma bandı.

## Kaynak ve lisans

Model, Blender 5.2.2 içinde Blender MCP ile [scripts/blender/build_ua_infantry_01.py](../../../scripts/blender/build_ua_infantry_01.py) betiğinden üretildi. Bu proje için özgün çalışmadır. Dış model, doku, fotoğraf veya marka kullanılmadı. Dört doku da betikte numpy ile üretilir. Bayrak ve tryzub, Ukrayna devlet simgelerinin sadeleştirilmiş çizimleridir. Kask, kulaklık ve yelek gerçek ürünlerin kopyası değildir; genel modern form örnek alındı.

Yeniden üretmek için Blender'da şu satırı çalıştırın:

```python
exec(open("/home/mami/Projects/d3/scripts/blender/build_ua_infantry_01.py").read(), {"UA_RUN": "export", "__name__": "ua"})
```

Bu komut modeli kurar, GLB'yi dışa aktarır, yeniden okuyup doğrular, ardından `model_stats.json`, `validation.json` ve `.blend` dosyalarını yazar.

## Ölçüler ve bütçe

| Ölçü | Değer |
|---|---|
| Boy (bot tabanı → kask tepesi) | 1,813 m |
| Kol açıklığı (A-poz, kollar yataydan 45° aşağı) | 1,29 m |
| Görünür üçgen | 16.806 |
| Malzeme | 7: `UA_Camo`, `UA_Gear`, `UA_Dark`, `UA_Boot`, `UA_Skin`, `UA_Lens`, `UA_Insignia` |
| Doku | 4 PNG, GLB içine gömülü: MM-14 512², cordura 256², yüz 256², nişan atlası 64² |
| GLB boyutu | 1,06 MB |

Üçgen sayısı plandaki 10–15 bin önerisinin biraz üstünde. En büyük pay 5.776 üçgenle gövdeye ait; bu yoğunluk ileride iskelet bağlarken eklemlerde kenar halkası sağlıyor. Değer tankın (27.988) altında. Bu bir modelleme bütçesidir; performans ölçümü yapılmadı.

## Parça sözleşmesi

```text
SoldierRoot  (origin: iki ayağın ortası, zemin seviyesi)
├── Body            tek skinlenebilir mesh: gövde, kollar, bacaklar, boyun (skin modifier + subdivision; eklemlerde 3 halka)
├── Head            yüz ve kafa, analitik biçim + sadeleştirme; tamamen kafa kemiğine bağlanacak
├── Gloves          ayrı parmaklı eldivenler (başparmak + 4 parmak, her biri 3 boğum)
├── Helmet          kabuk, raylar, gece görüşü plakası, cırt bantları, denge cebi, çene kayışları
├── Headset · Glasses
├── PlateCarrier    plakalar, yan kuşak, MOLLE, omuz askıları, cepler, telsiz ve anten
├── Belt · UniformDetails (yaka, kol ve kargo cepleri) · KneePads · Boots
└── Insignia        bayrak, tryzub, tanıma bantları
```

- Blender'da ileri −Y, yukarı +Z. GLB'de ileri +Z, yukarı +Y (tanklarla aynı). Oyunda tankla aynı yöne bakar.
- Her düğümde `asset_node_id` (`ua_infantry_01/<ad>`) alanı var. Kökte ayrıca `asset_version`, `height_m` ve `suggested_capsule` alanları bulunuyor.
- Çarpışma mesh'i üretilmedi. Oyuncu için kodda kapsül önerisi: yarıçap ~0,30 m, yükseklik ~1,80 m.
- Kamuflaj ve ekipman yüzlerinde 0,42 m'de bir tekrarlanan küp izdüşümü UV kullanıldı. Yüzde küresel UV, nişanlarda atlas hücresi UV'si var.

## Doğrulama

`validation.json` (2026-11-06): GLB yeniden içe aktarıldı ve 8 kontrolün hepsi geçti:

- boy 1,78–1,86 m arasında
- ayaklar zeminde
- yüz −Y yönüne bakıyor
- üçgen sayısı 18 binin altında
- 7 malzeme var
- 4 doku gömülü
- bütün düğümlerde kimlik alanı var
- kök düğüm `SoldierRoot`

Oyun içi kontrol: GLB, geliştirme sunucusunda geçici bir kodla IRON DUST 02'nin yanına yüklendi. Görüntü headless Chromium ile alındı (SwiftShader WebGL, 1280×720, varsayılan kalite). Ölçek, zemine oturma, yön, gölge ve kamuflajın okunması incelendi. Geçici kod geri alındı. Performans ölçülmedi.

## Önizlemeler

- [previews/final_views.png](previews/final_views.png): ön, sağ, arka ve 3/4 görünüm
- [previews/final_head_closeup.png](previews/final_head_closeup.png): kafa, kask, kulaklık ve gözlük
- [previews/final_with_iron_dust_02_close.png](previews/final_with_iron_dust_02_close.png) ve [geniş görünüm](previews/final_with_iron_dust_02_wide.png): tankın yanında
- [previews/ingame_babylon_next_to_tank.png](previews/ingame_babylon_next_to_tank.png): oyun ışığında, Babylon.js
- F0 oran taslağı: [previews/f0_blockout_views.png](previews/f0_blockout_views.png)

## Açık konular

- Kullanıcının görsel kabulü.
- Sıradaki adımlar: iskelet ve skinning, animasyonlar, silah, TPS kontrolcüsü.
- Yüz yakın planda stilize kalıyor; ağız ve göz detayı dokuya bağlı ve göz gözlüğün arkasında.
- Kamuflaj UV'sinde küp izdüşümü dikişleri yakından fark edilebilir.
