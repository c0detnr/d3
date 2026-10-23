# İlk tank — Blender modelleme ve teslim tarifi

## Onaylanan kapsam

Karar sahibi: kullanıcı. Tarih: 2026-10-23. İlk özgün, modern kurgusal tank Industrial Low Poly dilinde hazırlanacak. Model tek mesh hâline birleştirilmeyecek.

```text
TankRoot
├── Hull
│   ├── ArmorPanels
│   ├── EngineDeck
│   └── Exhausts
├── TurretPivot
│   ├── TurretMesh
│   └── GunPitchPivot
│       ├── Barrel
│       └── MuzzlePoint
├── LeftTrack
│   └── RoadWheels_01..06
├── RightTrack
│   └── RoadWheels_01..06
└── CollisionProxies
```

Bu ağaç dönüşümlerin ebeveynlik ilişkisini tanımlar; yalnızca Blender koleksiyonlarında gruplamak yeterli değildir. `RoadWheels_01..06` her tarafta altı ayrı yol tekerleğini ifade eder.

## Hareket sözleşmesi

- `Hull` gövde geometrisini taşır. `TurretPivot`, `Hull` ile aynı kökün altında bulunur; kule gövdenin yönünden bağımsız yönlendirilebilir.
- `TurretPivot` kule dönüş merkezinde olmalıdır. `TurretMesh` ve namlu grubu bu pivotla birlikte döner.
- `GunPitchPivot` namlunun yükseliş merkezinde bulunur; namlu kule dönüşüne ek olarak yukarı-aşağı hareket eder.
- `MuzzlePoint` namlu ucundaki referans noktasıdır ve namluyla birlikte hareket eder. Görünür bir parça olması gerekmez.
- Sol ve sağ paletin animasyonu kendi tarafının hareket hızına bağlı olmalıdır; geri sürüş ve yerinde dönüşte yönleri ayrı yönetilebilmelidir. Tekerlek dönüş merkezleri kendi akslarına yerleştirilir.
- `CollisionProxies`, görünür geometriden ayrı basit çarpışma geometrisini taşır. Her palet baklası ayrı fizik cismi yapılmaz.

Blender modeli bu hareketleri mümkün kılar; oyun içi kontrol ve animasyon sisteminin uygulanması bu model tesliminin parçası değildir. M2 sürüş teslimi, M3 kule ve atış sisteminin bitirilmesine bağlı değildir.

## Görsel bütçe

- İlk tankın tüm görünür parçaları toplamında yaklaşık **12.000–20.000 üçgen** hedeflenir. Sayım, dışa aktarımda oluşan üçgenler üzerinden raporlanır; çarpışma geometrisinin sayımı ayrıca belirtilir.
- Ana zırh mat zeytin yeşili; paletler koyu grafit olacak. Mevcut paletin ana adayları `#404B42` ve `#34383B`; yeni kesin renk değerleri belirlenmedi.
- Aşınma izleri seyrek, vurgu renkleri az sayıda olacak. Formu örten yoğun yüzey gürültüsü kullanılmayacak.
- Fotoğraf dokuları yerine silüet, zırh plakalarının formu ve ışıklandırma öne çıkacak.
- Başka oyunların modelleri, kaplamaları ve marka varlıkları kullanılmayacak.

## Teslim önerisi ve kontrol listesi

Aşağıdakiler model teslim koşullarıdır. İlk tank 2026-10-23 tarihinde Blender MCP ile üretildi; kaynak, GLB, üç açı önizleme ve uygulanan kontroller [teslim notunda](../assets/tanks/iron_dust_01/README.md) kayıtlıdır. Motor entegrasyonu henüz doğrulanmadı.

- Düzenlenebilir `.blend` kaynağı ve hiyerarşiyi koruyan oyun amaçlı `.glb` teslim et.
- Metre esaslı ölçeği, toplam boyutları, modelin ileri yönünü ve dışa aktarım eksen ayarlarını teslim notunda belirt. Kesin boyutlar ve motor eksen eşlemesi hâlâ açıktır.
- Kule dönüşünü, namlu yükselişini ve tekerlek merkezlerini Blender'da ayrı ayrı kontrol et; bu kontrollerin sonucunu kaydet.
- GLB'yi yeniden açarak parça adlarını, ebeveynliği, materyalleri ve pivotları kontrol et. Blender'daki görünüm tek başına motor uyumluluğu kanıtı değildir.
- İki taraftaki tekerleklerin dışa aktarım sonrası benzersiz adlandırma yöntemini teslim notunda belirt; hiyerarşideki iki grupta aynı taban adlarının bulunması motor tarafındaki aramada belirsizlik oluşturmamalı.
- Toplam görünür üçgen sayısını ve çarpışma geometrisi sayımını ayrı raporla; önden, yandan ve üç çeyrek açıdan önizleme sun.
- Varlığın üreticisini, kaynağını, varsa dış varlık lisanslarını ve geçici parçaları kaydet.

## Açık teknik tercihler

- Palet animasyonunun UV kaydırma veya başka bir görsel yöntemle yapılması prototipte seçilecek; fiziksel bakla simülasyonu kullanılmayacak.
- Ayrı geri tepme grubu genel görsel hedefte yer alır; bu hiyerarşide ek bir düğüm henüz kararlaştırılmadı. M3 öncesinde `Barrel` hareketiyle mi yoksa ek pivotla mı çözüleceği belirlenmeli.
- Kule dönüş hızı, namlu açı sınırları ve aracın fizik değerleri bu model tarifiyle kesinleşmez.
