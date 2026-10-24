# Makineli tüfek istasyonu — Blender tasarım planı

Tarih: 2026-10-24

Durum: **Blender varlığı MG 02 olarak sıfırdan teslim edildi; oyun uygulaması ayrı görev.**

2026-10-24 kullanıcı talimatı önceki taslağı düzenleme/korunacak parçaları kullanma önerisinin yerine geçer: mevcut makineli dosyası değiştirilmedi. [Yeni Blender teslimi ve kanıtlar](../assets/weapons/iron_dust_mg_02/README.md).

## Amaç ve kapsam

IRON DUST 01 tankına, Industrial Low Poly görsel dilinde kameralı bir ikinci silah hazırlamak. Blender teslimi; tank üzerinde yerleşimi, hareketli parça hiyerarşisini, POV referansını ve oyun aktarımına uygun varlığı kapsar. Sürüş, silah kontrolü, balistik, hasar, izli mermi efekti ve arayüz uygulaması ayrı oyun görevleridir.

Bu plan M1/M2 kabulünü veya M3 savaş teslimini tamamlandı saymaz. Dünya → sürüş → savaş sırası korunur.

## Kullanıcının kesinleşen tercihleri

- Makineli tüfek kullanılabilen ikinci silah olacak.
- Silahın kamerasından POV görüşü bulunacak.
- Oyuncu bu görüşteyken tankı sürmeye devam edebilecek.
- Silah yalnızca ön tarafı kapsayan sınırlı bir açı içinde dönecek.
- İzli mermi atacak.
- Son talep: Blender MCP ile sıfırdan yeni model hazırla; mevcut makineli tüfek dosyasını düzenleme. Oyun uygulaması bu teslimin dışında.

## Tasarım önerileri — henüz kesin karar değil

| Konu | Başlangıç önerisi |
|---|---|
| Yerleşim | Tankın ileri yönüne göre kule tavanının ön-sağ tarafı |
| Yön referansı | Dönüş sınırının ana kulenin ileri yönüne bağlı olması |
| Yatay hareket | Kuleye göre −60°…+60° |
| Dikey hareket | Yataydan −10°…+45°; çakışma kontrolüne göre daraltılabilir |
| Siluet | Alçak kaide, köşeli silah gövdesi, okunabilir namlu ve kompakt yan kutular |
| Kamera | Namlunun yanında, silahla aynı yöne bakan korumalı optik kutusu |
| POV kadrajı | Ekranın alt kenarında namlunun küçük bir bölümü görünür |
| Materyal | Zeytin yeşili kaide/kutu, koyu grafit mekanizma ve namlu, seyrek aşınma |
| Görünür geometri | Ek silah için yaklaşık 2.000–3.000 üçgen |
| İzli mermi | Her 4 mermiden birinde kısa turuncu-kızıl iz; oyun aşamasında değerlendirilir |

Silahın kesin boyutları ve kaide yüksekliği mevcut tank üzerinde basit hacim denemesiyle belirlenecek. Kamera ve mühimmat kutusunun hangi yanda olacağı POV görünürlüğüne göre seçilecek. Yatay yön referansı, açı değerleri ve izli mermi sıklığı kullanıcı tarafından ayrıca kesinleştirilmedi.

## Mevcut varlıklar ve koruma

- Tank: [Blender kaynağı](../assets/tanks/iron_dust_01/iron_dust_01.blend), [GLB](../assets/tanks/iron_dust_01/iron_dust_01.glb), [teslim sözleşmesi](../assets/tanks/iron_dust_01/README.md).
- Makineli tüfek taslağı: [Blender kaynağı](../assets/weapons/iron_dust_mg_01/iron_dust_mg_01.blend) ve [GLB](../assets/weapons/iron_dust_mg_01/iron_dust_mg_01.glb).
- Mevcut önizlemeler: [tank üzerinde](../assets/weapons/iron_dust_mg_01/previews/mounted_third_person.png), [tank üzerinde POV](../assets/weapons/iron_dust_mg_01/previews/mounted_pov.png).

Dosyaların ve önizlemelerin bulunması, pivotların veya oyun entegrasyonunun doğrulandığı anlamına gelmez. Modellemeye başlamadan önce taslağın gerçek hiyerarşisi ve ölçüleri incelenecek; uygun parçalar korunacak. Tank kaynağı, ana top, optikler, kapaklar ve diğer mevcut çalışmalar silinmeyecek. Düzenlemeden önce yerel yedek alınacak; yedekler commit edilmeyecek.

## Blender parça ve hareket sözleşmesi

Önerilen parça adları ve ebeveynlik:

```text
TurretPivot                         (mevcut ana kule)
└── MGMountRoot                    (kule üzerindeki montaj noktası)
    ├── MGBase                     (sabit kaide)
    └── MGYawPivot                 (sınırlı yatay dönüş)
        ├── MGSupport             (yükseliş bağlantısı)
        └── MGPitchPivot           (silah ve kameranın yükselişi)
            ├── MGReceiver        (silah gövdesi)
            ├── MGAmmoBox         (mühimmat kutusu)
            ├── MGFeed            (kısa besleme bölümü)
            ├── MGCameraHousing   (optik muhafaza)
            ├── MGCameraPoint     (POV konum ve yön referansı)
            ├── MGEjectionPoint   (kovan çıkış referansı)
            └── MGRecoilRoot      (önerilen küçük namlu geri tepmesi)
                ├── MGBarrel
                └── MGMuzzlePoint (atış başlangıcı)
```

- Ayrı silah dosyasının kökü `MGMountRoot` olacak; `TurretPivot` tank üzerinde bağlanacağı ebeveyni gösterir.
- Koleksiyon gruplaması yerine gerçek nesne ebeveynliği kullanılacak. Hareket grupları tek mesh hâline birleştirilmeyecek.
- Yatay pivot kaide dönüş ekseninde, dikey pivot silahın iki yan desteği arasında olacak.
- Kamera namlunun geri tepmesine bağlanmayacak; yatay ve dikey nişan hareketini takip edecek.
- Mühimmat kutusu ile besleme bölümü aynı yükseliş grubunda tutularak ilk teslimde esnek şerit animasyonuna ihtiyaç bırakılmayacak.
- Referans noktaları görünmez Empty nesneleri olacak; konumları ve ileri yönleri GLB'de korunacak.
- Tankın metre ölçeği ve eksen sözleşmesi kullanılacak: Blender ileri −Y, yukarı +Z; mevcut GLB aktarımıyla tutarlılık yeniden içe aktarımda denetlenecek.
- Blender hareket sınırları, oyun içindeki sınır uygulamasının yerine geçmez; açı değerleri teslim notuna yazılacak.

## Modelleme sırası ve kabul koşulları

### 1. Mevcut taslağı inceleme

- [ ] Tank ve silah dosyalarını, hiyerarşiyi, materyalleri, ölçeği ve pivotları incele.
- [ ] Korunacak parçaları ve gerekli revizyonları teslim notuna kaydet.

### 2. Tank üzerinde basit hacim denemesi

- [ ] Kaide, silah, kamera ve mühimmat kutusunu basit hacimlerle yerleştir.
- [ ] Ana topun silueti ve mevcut optiklerin görüş alanı korunuyor.
- [ ] Kaide kapaklara binmiyor; kapak açılma alanı için boşluk bırakılıyor.
- [ ] Önden, yandan ve üç çeyrek görünümde silah tankın oranlarıyla uyumlu.

### 3. Hareket ve açıklık kontrolü

- [ ] Yatay/dikey pivotları kur; önerilen açı aralığının tamamını tarayarak incele.
- [ ] Birleşik uç açılarda ve ara konumlarda kamera, kutu ve namlu tanka çarpmıyor.
- [ ] Ana topun yükseliş hareketiyle kesişme ayrıca kontrol edildi.
- [ ] Ana kule döndüğünde montaj beraber hareket ediyor; gövde ve antenlerle kesişme incelendi.
- [ ] Çakışma varsa önce yerleşimi veya açı sınırını düzelt; gereksiz yüksek kaideyle çözme.

### 4. POV kompozisyonu

- [ ] Kamera referansından 16:9 önizleme oluştur; kullanılan görüş açısını kaydet.
- [ ] Kamera noktası geometri dışında; muhafaza görüntüyü kesmiyor.
- [ ] Namlu yalnızca alt kenarda az yer kaplıyor; merkezde hedef görüşü açık.
- [ ] Sağa/sola ve aşağı/yukarı sınırlarında tank parçalarının görüşe girişi incelendi.
- [ ] Namlu ve kamera arasındaki konum farkı teslim notunda açık; yakın mesafe nişan düzeltmesi oyun görevine bırakıldı.

### 5. Detay ve materyaller

- [ ] Kaide bağlantıları, yan destekler, namlu muhafazası, kutu kapağı ve optik korumasını tamamla.
- [ ] POV'da görünen parçalara öncelik ver; formu örten mikro detaylardan kaçın.
- [ ] Tank paletiyle uyumlu mat PBR materyaller kullan; dış varlık varsa kaynak ve lisansını kaydet.
- [ ] GLB üzerinden görünür üçgenleri say; hedef aşılırsa gerekçeyi kaydet. Bütçe bir performans garantisi değildir.

### 6. Aktarım ve teslim

- [ ] Düzenlenebilir `.blend` ve yalnızca silah hiyerarşisini içeren `.glb` hazırla; stüdyo ışıkları, zemin ve render kameralarını dışarı aktarım dışında tut.
- [ ] GLB'yi temiz sahneye yeniden al; adlar, ebeveynlik, pivotlar, metre ölçeği ve materyalleri doğrula.
- [ ] Referans noktalarının silahla beraber doğru hareket ettiğini kontrol et.
- [ ] Ön, yan, üç çeyrek, mekanizma detayı ve tank üzerinde POV önizlemeleri hazırla.
- [ ] Varlık klasörüne README ekle: boyutlar, montaj dönüşümü, eksenler, açı önerileri, üçgen/materyal sayısı, kaynak/lisans ve açık kontroller.

## Ayrı oyun uygulaması görevi

Blender teslimi sonrasında ikinci silah seçimi, sürüş sırasında POV, sınırlı nişan kontrolü, gerçek namlu ağzından atış, yakın engel kontrolü, izli mermiler ve kaynak temizliği ayrı kapsamda uygulanır. Tuş atamaları, ateş hızı, kalibre, mühimmat/ısınma, hasar ve stabilizasyon bu planla kesinleşmez.

Tarayıcıda silahın doğru yüklendiği, POV'da sürüşün devam ettiği, kamera ile namlu doğrultusunun tutarlılığı ve izli merminin okunabilirliği görülmeden oyun kabulü verilmez. Yapılmamış kontroller teslim edilmiş gibi raporlanmaz.

## Sonraki adım

Blender teslimi hazır. Sonraki ayrı görev oyun entegrasyonudur; ikinci silah seçimi, sürerken POV ve tracer oyun içinde doğrulanacak. Dinamik kapak açılma kontrolü mevcut tankta kapak rig’i bulunmadığından açık; ayrıntılı sınırlar yeni varlığın README dosyasında.

## 2026-10-24 — Sıfırdan Blender teslimi

`iron_dust_mg_02` ayrı kaynak/GLB olarak üretildi. 2.396 üçgen, 10 mesh, 6 materyal ve 17 düğüm. Temiz GLB yeniden aktarımı, kaynak/ithal hareket grupları ve geri tepmeden bağımsız kamera doğrulandı. 897 örnek duruşta tankla yüzey kesişmesi yok; dört montaj noktası tavana oturur. Ön/yan/üç çeyrek/detay, tank üzerinde ve POV sınır renderları hazır. Eski MG 01 ile tank klasörlerindeki 19 dosyanın SHA-256 değerleri değişmedi. Yukarıdaki kontrol listesi ilk planın tarihsel tarifidir; güncel tamamlanan kontroller ve açık kapak/oyun kontrolleri [teslim kaydında](../assets/weapons/iron_dust_mg_02/README.md).
