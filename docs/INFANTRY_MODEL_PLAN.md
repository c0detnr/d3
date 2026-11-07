# UA Infantry 01 — Ukraynalı piyade modeli planı

Tarih: 2026-11-06. Durum: **F0–F6 tamamlandı; model teslim edildi, kullanıcının görsel kabulü bekleniyor.** Kullanıcı ara onay noktalarını beklemeden işin bitirilmesini istedi. Açık sorular için varsayılanlar kullanıldı: yüz görünür ve gözlüklü, yelek zeytin yeşili. Sonuç, ölçüler ve kontroller: [varlık notu](../assets/characters/ua_infantry_01/README.md). Teslim 16.806 üçgen; aşağıdaki 10–15 bin önerisinin biraz üstünde. v2'de gövdeye kumaş kıvrımı normal map'i ve köşe rengine ortam gölgesi eklendi; üçgen sayısı değişmedi, malzeme sayısı 8 oldu. v3'te omuzlar, kollar ve yelek ayrıntıları geliştirildi; toplam 18.690 üçgen. v4'te kullanıcı onayıyla gövde, kafa ve eller CC0 anatomik taban modele geçirildi (Blender Studio Human Base Meshes); toplam 16.428 üçgen. Plandaki "dış model kullanılmaz" ilkesinin yerini bu karar aldı.

## Amaç ve kapsam

Oyuncunun ileride TPS modunda yöneteceği, modern Ukraynalı bir piyade askerinin 3D modelini üretmek. Model IRON DUST 02'nin yanında ölçek, renk ve detay yoğunluğu bakımından doğal görünmeli: gerçekçi oranlar, Industrial Low Poly dil, mat PBR.

**Bu teslimin kapsamı yalnız modeldir.** İskelet, skinning, animasyon, silah, TPS kontrolü, kamera, çarpışma/fizik, hasar ve düşman piyade sonraki adımlardır. Model ise bunlara hazır üretilir (deformasyon döngüleri, A-poz, ayrık ekipman, ölçülü pivotlar). Mevcut tank, kabin, MG ve çevre dosyalarına dokunulmaz.

## Görsel tarif

| Bölüm | Üretim tarifi |
|---|---|
| Boy ve oran | Yaklaşık 1,80 m (botlarla), kask tepesi ~1,85 m; gerçekçi yetişkin oranı, hafif geniş omuz. Tank tavanının (~2,8–3 m) yaklaşık üçte ikisi. |
| Üniforma | MM-14 piksel kamuflaj gömlek ve pantolon; kollar ve paçalar hafif bol, dizlikler. |
| Kask | Modern yüksek kesim balistik kask, kamuflaj kılıf, ön gece görüşü bağlantı plakası, yan raylar ve kulak üstü kulaklık. |
| Yüz | Low-poly ama gerçekçi oranlı yüz, kısa sakal tonu; balistik gözlük. |
| Yelek | Zeytin yeşili plaka taşıyıcı; önde 3 şarjör cebi, idari cep, yanda telsiz cebi, arkada ilk yardım (IFAK) cebi. |
| Kemer ve alt beden | Taktik kemer, uyluk/bel cebi, dizlikler, coyote taktik bot. |
| Eldiven | Koyu taktik eldiven; beş ayrı parmak (silah tutuşu için). |
| Kimlik | Omuzda Ukrayna bayrağı yaması, diğer omuzda sadeleştirilmiş tryzub yaması; kol ve bacakta sarı tanıma bandı. |
| Malzeme | Kamuflaj, ekipman (zeytin/coyote), deri, koyu (bot, eldiven, kayış), yama atlası, gözlük camı. Toplam 5–7 malzeme; seyrek aşınma ve alt kısımlarda toz. |

**Bütçe önerisi — performans garantisi değil:** Görünür geometri 10.000–15.000 üçgen (TPS kamerası yakın olduğu için tanktan düşük ama detaylı). MM-14 dokusu kendi betiğimizle piksel bloklarından üretilir; 1024 px yeterli. Dış model, dış doku veya marka kullanılmaz. Gerçek ürün adları (kask, kulaklık, yelek markaları) taklit edilmez; genel form esinlenmedir.

Renk adayları: kamuflaj tonları MM-14'e yakın açık haki / zeytin / kahve / koyu yeşil; ekipman `#404B42` ve `#828575`'e yakın; bot ve eldiven `#34383B`; toz `#D5C7AB`. Oyun paletiyle uyum için oyunda yan yana bakılarak ayarlanır.

## Parça ve hazırlık sözleşmesi

```text
SoldierRoot              (origin: iki ayağın ortası, zemin seviyesi)
├── Body                 (tek skinlenebilir mesh: üniforma, eller, boyun)
├── Head                 (yüz, kulak; ileride Body'ye birleşebilir)
├── Helmet
│   ├── HelmetCover
│   ├── Headset
│   └── Goggles
├── PlateCarrier
│   └── Pouches
├── Belt
├── KneePads
├── Boots
└── Patches              (bayrak, tryzub, tanıma bantları)
```

- Metre ölçeği; Blender ileri −Y / yukarı +Z, GLB ileri +Z / yukarı +Y (tanklarla aynı).
- **A-poz:** kollar yaklaşık 45° aşağıda, bacaklar hafif açık; ileride Rigify veya standart insansı iskelete uygun.
- Deformasyon döngüleri: omuz, dirsek (3), bilek, kalça, diz (3), ayak bileği, boyun ve parmak eklemleri.
- Simetrik modelleme (mirror), dışa aktarımdan önce uygulanır. Dönüşümler uygulanmış, normal yönleri doğru.
- Ekipman ayrı mesh kalır; ileride sert parçalar (kask, yelek, cepler) tek kemiğe, yumuşak parçalar gövdeye bağlanır.
- Benzersiz İngilizce düğüm adları ve `asset_node_id`. Oyuncu çarpışması ileride kodda kapsül olacağı için mesh çarpışma üretilmez; önerilen kapsül (yarıçap ~0,3 m, yükseklik ~1,8 m) README'ye yazılır.

## Dosya düzeni

```text
assets/characters/ua_infantry_01/
├── ua_infantry_01.blend
├── ua_infantry_01.glb
├── textures/            (kodla üretilen MM-14 ve yama atlası)
├── previews/            (ön, yan, arka, 3/4, tankın yanında)
├── model_stats.json
├── validation.json
└── README.md            (kaynak, lisans, ölçüler, kontroller)
scripts/blender/build_ua_infantry_01.py
```

## Blender MCP çalışma yöntemi

1. `get_addon_status` ve `get_scene_info` ile bağlantıyı ve açık sahneyi oku. Açık sahneyi silme, üzerine kaydetme; askeri ayrı sahnede ve ayrı `.blend` dosyasında üret.
2. Ölçek referansı için IRON DUST 02 GLB'sini bağlantı/içe aktarma ile yanına koy; teslim dosyasına dahil etme.
3. Üretimi `execute_blender_code` ile aşamalı yap; her aşamadan sonra `look` ile görsel incele. Tek dev çağrıya bütün üretimi yığma.
4. Üretim betiğini `scripts/blender/` altında tut; yeniden çalıştırma yalnız asker nesnelerini hedeflesin.

## Aşamalar ve kabul koşulları

| Aşama | İş | Kabul |
|---|---|---|
| F0 — Oran taslağı | 1,80 m kaba manken + kask/yelek hacimleri, tankın yanında | **Kullanıcı onayı:** boy, oran ve siluet |
| F1 — Gövde | Üniforma gövdesi, kollar, bacaklar, eller (5 parmak), botlar; deformasyon döngüleri | A-poz, simetri, döngüler yerinde; görsel inceleme |
| F2 — Kafa ve kask | Yüz, kulak, boyun; kask, kılıf, kulaklık, gözlük | Yüz yakın planda insan gibi okunur; kask kafaya oturur |
| F3 — Ekipman | Plaka taşıyıcı, cepler, kemer, dizlikler, yamalar, tanıma bantları | Siluet kalabalıklaşmaz; parçalar gövdeye gömülmez |
| F4 — Malzeme | UV açma, MM-14 dokusu, yama atlası, seyrek aşınma/toz | Oyun ışığına yakın render'da kamuflaj okunur, oyuncak gibi durmaz |
| F5 — Teslim | GLB dışa aktarımı, yeniden içe aktarma, ölçüm, önizlemeler, README | Boy 1,78–1,86 m, üçgen ve malzeme sayısı bütçede, eksen/origin doğru, kayıp doku yok |
| F6 — Oyunda bakış | GLB'yi geçici olarak oyun sahnesinde tankın yanına koy | **Kullanıcı görsel kabulü** gerçek oyun ışığında; geçici kod teslimde kalmaz |

Her aşama sonunda önizleme kullanıcıya gösterilir; F0 ve F6 onay noktalarıdır.

## Sonraki adımlar (bu teslimin dışında)

1. İskelet + skinning (Rigify veya standart insansı iskelet), deformasyon testi.
2. Temel animasyonlar: bekleme, yürüme, koşma, çömelme, nişan.
3. Silah modeli (ayrı varlık; tür açık soru).
4. TPS kontrolcüsü: Havok karakter kapsülü, omuz üstü kamera, tanka binme/inme.
5. Düşman piyade ve hasar — kullanıcı istediğinde.

## Açık sorular

- Yüz görünür + balistik gözlük mü, yoksa balaklava/yüz örtüsü mü? (Öneri: görünür yüz, gözlük; F0'da karar.)
- Yelek rengi zeytin mi coyote mi? (Öneri: zeytin, tank paletiyle uyum.)
- Kartal Bölüğü ve görev hikâyesi Ukraynalı kimlikle nasıl ilişkilenecek? Model teslimi bunu belirlemez.
