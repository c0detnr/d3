# Yıkık çiftlik evi 01

2026-10-28. Kül Vadisi merkezi için tek katlı, çatısı çökmüş taş çiftlik evi kalıntısı. Sıcak gri kireç taşı, açık kırık yüzeyler, soluk köşe taşları, yanmış ahşap kirişler ve dağınık kiremit parçaları. Kuzeydoğu köşesinde ayakta kalan 4 m duvar ve 6 m baca uzaktan yön bulmayı sağlar; duvarlar güneybatıya doğru 1.2 m'ye iner ve köşe yıkıntı yığınıyla kapanır.

- [Blender kaynak](farmhouse_ruin_01.blend) · [GLB](farmhouse_ruin_01.glb)
- [Ön görünüm](previews/front.png) · [Arka/baca](previews/rear.png) · [Gerçek tankla ölçek](previews/comparison.png)
- [Model sayımları](model_stats.json) · [GLB yeniden aktarım kontrolü](validation.json)

## Model sözleşmesi

Metre ölçeği, Blender Z yukarı, ön cephe (kapı) −Y. `FarmhouseRuin01Root` başlangıç noktası zeminde, görünür ayak izinin merkezinde. GLB standart Y yukarı aktarımını kullanır. Görünür ölçü **11.61 × 8.74 m**, baca dahil yükseklik **6.09 m**; duvar parçalarının tepeleri 2.0–4.0 m, kırık profillerin en alçak noktaları 1.2 m (tank gövdesi siperi).

1.206 görünür üçgen, 9 görünür mesh, 8 ortak mat PBR malzeme. Haricî doku yok. Bu proje için özgün üretim; dış model/doku kullanılmadı, proje kaynak hakları geçerlidir.

20 ayrı `collision_only=true` mesh / 464 üçgen: taban, 12 kırık duvar parçası (görünür kırık silüetin aynısı), baca gövdesi/üstü, iç dolgu kutusu, iç/köşe/kapı yıkıntı tümsekleri. Pencere ve kapı boşlukları 1.2 m'dir; iç alan 0.75 m dolgu + yıkıntı tümseğiyle doludur, tank içeri giremez veya sıkışamaz. Kiriş, kiremit, köşe taşı ve küçük taşlarda çarpışma yok. Çarpışma parçaları oyunda gizlenir ve statik Havok gövdesi olur (`loadFactoryBuilding`).

Önizleme kamerası, ışıkları, zemini ve karşılaştırma tankı (`assets/tanks/iron_dust_01/iron_dust_01.glb`) yalnız render sırasında eklenir; `.blend` kaydedilmez, GLB'ye girmez. İç mekân, animasyon ve fiziksel yıkım yok.

## Üretim ve doğrulama

Kullanıcının açık Blender pencerelerine dokunmadan Blender 5.2 CLI arka planda kullanıldı. Ortak yardımcılar: [landmark_common.py](../../../scripts/blender/landmark_common.py).

- Üretim: `blender -b --factory-startup -P scripts/blender/build_farmhouse_ruin.py` → `.blend`, `.glb`, `model_stats.json`.
- Önizleme: `blender -b assets/environment/farmhouse_ruin_01/farmhouse_ruin_01.blend -P scripts/blender/render_farmhouse_ruin.py -- front|rear|comparison`; Cycles CPU, 4 iş parçacığı, 16 örnek, 1100 × 750.
- GLB kontrolü: `blender -b --factory-startup -P scripts/blender/validate_farmhouse_ruin.py` boş sahnede yeniden içe aktarır; metre/zemin/merkez, sınırlar, üçgen/malzeme, 20 collider, duvar/baca collider yükseklikleri, iç dolgu, kamera/ışık/tank ve dış doku bulunmaması geçti.
- `node --experimental-strip-types scripts/check-kul-landmarks.ts`: gerçek GLB ile Babylon/Havok'ta gizli statik collider, alçak/yüksek duvar ve baca mermi ışınları, dolu iç alan, görünmez tavan olmaması, layout ayak izi ve kaynak temizliği geçti.

Haritaya bağlama (`createKulLandmarks`), tankla yakın sürüş/kamera ve performans kabulü açık.
