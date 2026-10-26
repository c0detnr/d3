# IRON DUST 02 — oynanabilir ikinci tank planı

Tarih: 2026-10-26. Durum: **Plan hazır; modelleme ve oyun entegrasyonu başlamadı.**

## Amaç ve kapsam

Kullanıcının seçtiği Leopard 2A6 esintili, kum beji ikinci ana muharebe tankını üretip mevcut haritada **sürülebilir, nişan alınabilir ve topu ateşlenebilir** hâle getirmek. Uzun namlu, kama biçimli kule önü ve uzun paletli gövde; mevcut Industrial Low Poly dünyayla uyumlu özgün geometri. Başka oyunlardan model veya kaplama alınmaz.

**Öncelik çalışan bir oyun deneyimidir.** Kütle, hız, zırh, hasar veya mühimmat dengesi bu teslimin ön koşulu değildir; ilk oyun denemesinde mevcut tankın geçici sürüş ve top ayarları kullanılabilir. Ayrı araç ayarları ancak oynanabilirlik için gerekli fark ortaya çıkınca belirlenir. Bu belge yapılacak işi kaydeder; henüz tamamlanmış model veya oynanış kanıtı değildir. Standartlar: [tank parça sözleşmesi](TANK_ASSET.md), [görsel yön](ART_DIRECTION.md), [ilk tank teslimi](../assets/tanks/iron_dust_01/README.md). Mevcut ilk tank, kabin ve MG dosyaları korunur. M1/M2/M3 kabul durumu değişmez.

## Görsel tarif

| Bölüm | Üretim tarifi |
|---|---|
| Gövde | Uzun, geniş ve alçak; eğimli burun ve arkada belirgin motor bölümü. |
| Kule | Kule halkasına oturan insanlı kule görünümü; iki kama zırh yanağı ve geniş arka bölüm. Önceki insansız, geriye yerleşmiş kule önerisi kullanılmaz. |
| Top | Uzun namlu, parçalı termal kılıf, okunur bağlantı ve açık namlu ağzı. |
| Yürüyen aksam | Her yanda yedi yol tekeri; ayrı ön yönlendirme ve arka tahrik dişlisi. |
| Yan etek | Üst paleti örten parçalı zırh; alt tekerlekler ve zemin teması görünür. |
| Detay | İki kapak, görüş blokları, optik başlık, antenler; arkada ızgara, egzoz ve çekme bağlantıları. |
| Materyal | Mat kum beji, koyu grafit metal/palet, koyu kauçuk ve sınırlı optik cam. Seyrek aşınma ve alt yüzeylerde toz. |

**Başlangıç önerileri — gerçek Leopard teknik özellikleri veya kesinleşmiş sayısal kararlar değildir:** Gövde yaklaşık 7,5 m, namlu dahil 10,5–11 m uzunluk; yaklaşık 3,8 m genişlik; antenler hariç 2,8–3 m tavan yüksekliği. Ölçüler ilk oran taslağında birlikte değerlendirilir.

Görünür geometri hedefi 18.000–24.000 üçgen, yaklaşık 6–8 ortak PBR materyal. Çarpışma üçgenleri ayrıca sayılır. Ana boya `#BDAB8B`, toz `#D5C7AB`, mekanik `#34383B` başlangıç adaylarıdır. Bunlar modelleme bütçesidir; telefon/tarayıcı performans garantisi değildir.

## Blender MCP çalışma yöntemi

1. `get_blendfile_summary_datablocks` ve gerekirse `get_blendfile_summary_path_info` ile gerçek bağlantıyı, açık dosyayı ve sahneyi oku. Araç listesi bağlantı kanıtı değildir.
2. Açık sahneyi silme veya üzerine kaydetme. Kaydedilmemiş çalışma varsa ayrı yerel kurtarma kopyası al. Yeni tankı ayrı `IRON_DUST_02` sahnesinde ve ayrı kaynak dosyasında tut.
3. Önce amaca uygun MCP araçlarını kullan. Özel geometri/toplu üretim/doğrulama bunlarla karşılanamıyorsa `execute_blender_code`; gerektiğinde imza doğrulamak için `search_api_docs` kullan.
4. Gövde, kule, yürüyen aksam, detay, materyal ve doğrulama ayrı çağrılar olsun. Her aşamadan sonra nesneleri/ölçüleri incele, görüntü al ve yalnız yeni kaynağı kaydet. Tek dev çağrıya bütün üretimi yığma.
5. Gerekli üretim/doğrulama betiklerini `scripts/blender/` altında sakla. Yeniden çalıştırma yalnız yeni tankın nesnelerini hedeflesin; genel sahne temizliği yapılmasın.
6. Viewport/önizleme için `render_viewport_to_path`, `render_thumbnail_to_path` veya uygun render işlemini kullan; çıktıları açarak görsel olarak incele.
7. Yanıt vermeyen mutasyonu körlemesine tekrar etme; önce sahne/dosya durumunu kontrol et. Etkileşimli köprü kullanılamıyorsa yalnız kaydedilmiş yeni tank dosyasında `get_blendfile_summary_datablocks_for_cli` / `execute_blender_code_for_cli` yedek yolunu değerlendir ve kullanılan yöntemi kaydet.

## Parça ve hareket sözleşmesi

Koleksiyonların yanında gerçek nesne ebeveynliği kurulur; model tek mesh yapılmaz:

```text
TankRoot
├── Hull
│   ├── ArmorPanels
│   ├── SideSkirts
│   ├── EngineDeck
│   └── Exhausts
├── TurretPivot
│   ├── TurretMesh
│   ├── TurretArmor
│   ├── Optics
│   ├── Hatches
│   └── GunPitchPivot
│       ├── GunMantlet
│       └── GunRecoilRoot
│           ├── Barrel
│           ├── ThermalSleeve
│           ├── MuzzleShroud
│           └── MuzzlePoint
├── LeftTrack
│   ├── Left_TrackBelt
│   ├── Left_RoadWheel_01..07
│   ├── Left_Idler
│   └── Left_Sprocket
├── RightTrack
│   ├── Right_TrackBelt
│   ├── Right_RoadWheel_01..07
│   ├── Right_Idler
│   └── Right_Sprocket
└── CollisionProxies
    └── COL_Hull
```

- Metre ölçeği; Blender ileri −Y / yukarı +Z, GLB ileri +Z / yukarı +Y. TankRoot yer seviyesinde ve boyuna orta eksende; gerçek palet altı yüksekliği ayrıca ölçülür.
- TurretPivot kule halkasında, GunPitchPivot yükseliş ekseninde, tekerlek origin'leri aks merkezlerindedir. Dönüşüm uygulamak pivotları bozmamalıdır.
- GunRecoilRoot namlu ekseni boyunca hareket eder. Namlu, termal kılıf, uç parçası ve MuzzlePoint birlikte geri teper; sabit top bağlantısı ve optikler bu harekete katılmaz.
- Benzersiz düğüm adları ve `asset_node_id` kullanılır; COL_Hull için `collision_only=true` kaydedilir. MuzzlePoint hem konum hem ileri eksen olarak doğrulanır.
- Palet baklaları fizik cismi yapılmaz. Görsel geometri taraf başına birleştirilebilir; boyuna yönü belgeli UV hazırlanır. Oyun içi dolaşım ayrı entegrasyondur.

## Üretim aşamaları ve kabul koşulları

### B0 — Bağlantı ve güvenli hazırlık

- [ ] Canlı MCP çağrısıyla bağlantı ve açık çalışma doğrulandı.
- [ ] Gerekli kurtarma kopyası alındı; mevcut kaynaklar değiştirilmeden ayrı sahne/koleksiyon hazırlandı.
- [ ] Metre ölçeği ve yeni kaynak yolu ayarlandı; mevcut dosya varsa sürümü korundu.

### B1 — Oran taslağı

- [ ] Yalnız gövde, kule/kama zırh hacimleri, namlu ve palet zarfları oluşturuldu.
- [ ] Ön, yan, üst ve üç çeyrek görüntüler ile boyutlar kaydedildi.
- [ ] İlk tankla aynı ölçekli karşılaştırma hazırlandı; anten dahil yükseklik ile tavan yüksekliği karıştırılmadı.
- [ ] Namlu uzunluğu, kule/gövde oranı ve yerden yükseklik incelendi.
- [ ] Taslak görüntülerde siluet ve mevcut tanktan ayırt edilebilirliği değerlendirildi; gerekli oran düzeltmeleri yapıldı.

### B2 — Ana geometri ve yürüyen aksam

- [ ] Gövde plakaları, kule halkası, kama zırhı, kule arkası ve namlu tamamlandı.
- [ ] 14 yol tekeri, ön/arka dişliler, iki palet ve yan etekler üretildi.
- [ ] Pivotlar kuruldu; sonraki parçalar doğru hareket gruplarına bağlandı.
- [ ] Silindirik parça segmentleri ve görünmeyen geometri bütçeye göre sınırlandı.

### B3 — Detay ve materyaller

- [ ] Kapak, optik, motor ızgarası, egzoz ve çekme bağlantıları tamamlandı.
- [ ] Mat PBR boya ve sınırlı bevel/aşınma uygulandı; siluet gereksiz mikro detayla örtülmedi.
- [ ] Normaller, açık yüzeyler, üst üste geometri ve negatif ölçekler incelendi.
- [ ] Blender materyallerinin GLB'de taşınabilirliği kontrol edildi; gerekirse kaplama üretildi. İlk teslim dış model/kaplama indirmeden hazırlanır; sonradan eklenen dış varlıkların kaynak/lisansı kaydedilir.

### B4 — Hareket ve açıklık kontrolleri

- [ ] Kule tam tur boyunca; namlu önerilen −8°…+20° aralığında, ara ve birleşik açılarda örneklendi. Bunlar model test aralıklarıdır, son oyun değerleri değildir.
- [ ] Namlu/kule ile gövde, motor bölümü, anten ve kapakların kesişmeleri incelendi; sorunlar düzeltildi veya güvenli sınır raporlandı.
- [ ] Önerilen 0–0,35 m geri tepmede namlu/kılıf/uç/MuzzlePoint beraberliği doğrulandı.
- [ ] 14 tekerlek merkezini koruyarak döndü; süspansiyon için etek açıklığı ve sol/sağ yönler kontrol edildi.
- [ ] Test pozları geri alındı. Statik kapak açıklığı, kapak açılma animasyonu doğrulanmış gibi raporlanmadı.

### B5 — GLB aktarımı ve yeniden açma

- [ ] Düzenlenebilir kaynak kaydedildi; yalnız TankRoot hiyerarşisi dışa aktarıldı. Stüdyo zemin/ışık/kameraları ve karşılaştırma tankı GLB dışında kaldı.
- [ ] GLB temiz doğrulama sahnesine alındı; kimlik, ebeveynlik, ölçek, materyaller, boyutlar ve pivotlar kaynakla karşılaştırıldı.
- [ ] B4 hareketleri ithal modelde tekrarlandı. Önerilen 1 mm / 0,1° toleransına göre farklar raporlandı.
- [ ] GLB üzerinden görünür/çarpışma üçgenleri ayrı sayıldı; dış dosya bağımlılığı kontrol edildi.
- [ ] Çarpışma kutusunu tüketicinin metadata üzerinden gizlemesi gerektiği kaydedildi; Blender render gizliliğine güvenilmedi.

### B6 — Görsel kontrol ve teslim

- [ ] Ön, yan, arka, üç çeyrek ve mekanik detay görüntüleri üretilip açılarak incelendi.
- [ ] README: gerçek boyutlar/eksenler, hareket aralıkları, parça sözleşmesi, üçgen/materyal sayısı, üretici/kaynak ve açık kontroller.
- [ ] Kaynak ve GLB, önizlemeler, doğrulama raporu ve varsa betikler ilgili commit'lere alındı; yerel yedekler dışarıda tutuldu. İzlenen dala push doğrulandı.
- [ ] Blender varlığı teslim edildi; oyun içi kabul ayrıca B7–B9 kapsamında izlendi.

## Planlanan teslim

Üretim başladığında `assets/tanks/iron_dust_02/` altında:

- `iron_dust_02.blend`, `iron_dust_02.glb`.
- `README.md`, `model_stats.json`, `validation.json`.
- `previews/front.png`, `side.png`, `rear.png`, `three_quarter.png`, `detail.png`.

Bu dosyalar şu anda üretilmiş değildir. **Varlık teslimi, oynanabilir tank tesliminin ara adımıdır.**

## Oyun entegrasyonu ve oynanabilir teslim

### B7 — Mevcut haritada ikinci tankı aç

- [ ] Oyuncu iki tanktan birini anlaşılır bir seçimle açabilir; ilk tankın varsayılan açılışı ve sıfırlaması çalışır.
- [ ] Yeni GLB yüklenir, paletler zemine oturur, çarpışma geometrisi görünmez. Yükleme hatası ekranda anlaşılır biçimde gösterilir.
- [ ] Yeni gövdeyle ileri, fren, geri, yerinde ve hareketli dönüş; eğim ve engebe denenir. Tekerlek dönüşleri ve palet hareketi sürüş yönüyle uyumludur.
- [ ] Takip ve yakın nişan kameralarında gövde, kule veya namlu görüşü engellemez; sıfırlama ve sahne kapanışı kaynakları temizler.

### B8 — Kule ve topu bağla

- [ ] Kule ve namlu fare/dokunmatik nişan girdisine cevap verir; namlu sınırları görsel çarpışmaya göre geçici olarak ayarlanır.
- [ ] Top gerçek `MuzzlePoint` yönünden tek basışta ateşler; dolum, geri tepme, duman, ses ve isabet geri bildirimi mevcut oyun akışıyla çalışır.
- [ ] Geri tepmede namlu parçaları ve namlu ağzı birlikte hareket eder; mermi yanlış yönden veya gövde içinden doğmaz.
- [ ] MG02 montajı yeni kuleye uyarsa çalışır; uymazsa ikinci tankta seçim sunulmaz ve top/sürüş teslimi bekletilmez. Mobil kontrol en azından sürüş, nişan ve top atışını kapsar.

### B9 — Oyun içi kabul ve teslim

- [ ] Otomatik kontroller yeni GLB için ölçek, pivot, tekerlek/temas eşlemesi, sıfırlama, atış ve ilk tank regresyonunu kapsar. İlgili `tank:test`, `drive:test`, `turret:test`, `combat:test`, `map:build` kontrolleri çalıştırılır; başarısızlıklar düzeltilir.
- [ ] Masaüstü tarayıcıda ikinci tank seçilerek en az kısa bir serbest sürüş, nişan ve hedefe atış denemesi yapılır. Görünüm, kamera, çarpışma ve kontrol gözlemleri kaydedilir.
- [ ] Android dokunmatik akışına ikinci tank eklendiyse Android derlemesi ve gerçek cihaz kabulünün hangisinin yapıldığı ayrı belirtilir.
- [ ] Varlık ve oyun değişiklikleri ilgili commit'lerle izlenen dala gönderilir; açık kusurlar README ve doğrulama kaydında yazılır.

**Oynanabilir kabul:** Oyuncu ikinci tankı açar; haritada ileri/geri sürer ve iki yöne döner; kamerayla takip eder; kuleyi/namluyu yönlendirir; topu ateşleyip isabet geri bildirimini görür; sıfırlayıp yeniden dener. Bunlar tarayıcıda denenmeden tank tamamlandı denmez.

## Entegrasyon riskleri ve açık kararlar

- `src/game/vehicle/tankRig.ts` tam 12 yol tekeri/temas noktası bekler. 14 tekerli model mevcut sürüşe doğrudan takılamaz; temas eşlemesi ve süspansiyon yeni tankla doğrulanır. Yalnız sayım kontrolünü kaldırmak yeterli değildir.
- `TurretController.ts` Barrel/ThermalSleeve/MuzzleShroud/MuzzlePoint kardeşlerini tek tek hareket ettirir. GunRecoilRoot entegrasyonu gerekir; kök ve çocukları aynı anda kaydırarak çift geri tepme uygulanmaz. İlk tankın davranışı korunur.
- `TankVisual.ts` ilk tankın palet adlarına/prosedürel desenine bağlıdır. Yeni palet adı/UV eşlemesi ayrı entegrasyonda ele alınır.
- Oyuncunun tank seçimi şu an yoktur; `src/mapPreview.ts` ilk tank GLB'sini doğrudan yükler. B7 bu seçimi ve yeniden yükleme/temizlik davranışını kapsar.
- Kabin entegrasyonu, özgün MG montajı, hasar sistemi ve tanklar arası denge bu oynanabilir teslimin koşulu değildir.
- Kütle, hız, zırh, hasar, dolum, son namlu sınırları ve oyun içi ad kesinleşmedi. İlk denemede kullanılan değerler geçici olarak belgelenir.

## Bu belge görevinin kontrolü

Mevcut varlık standardı ve gerçek tekerlek/geri tepme/palet kodu incelendi. Canlı Blender bağlantı denemelerinin sonucu `progress.md` içinde tutulur. Model üretimi, render, hareket, GLB veya oyun testi bu belge görevi kapsamında yapılmadı. Sonraki üretim adımı B0, ilk görsel teslim B1 oran taslağı; tamamlanma noktası B9 oyun içi kabuldür.
