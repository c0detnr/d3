# Komuta merkezi 01

2026-10-29. Kül Vadisi üs hedefi için kapalı, takviyeli askerî komuta sığınağı. Eğimli beton kaide, alçak zırhlı ana salon, arkaya kaydırılmış dar komuta katı ve dar gözetleme pencereleri. Ön cephede kapalı zırhlı çift kanatlı kapı ve iki eğimli payanda; çatıda kafes anten direği, uydu çanağı, havalandırma ve klima kutuları. Direk ve sarı şeritler uzaktan hedef olarak okunur.

- [Blender kaynak](command_center_01.blend) · [GLB](command_center_01.glb)
- [Ön görünüm](previews/front.png) · [Arka görünüm](previews/rear.png) · [Gerçek tankla ölçek](previews/comparison.png)
- [Model sayımları](model_stats.json) · [GLB yeniden aktarım kontrolü](validation.json)

## Model sözleşmesi

Metre ölçeği, Blender Z yukarı, ön cephe (kapı) −Y. `CommandCenter01Root` zeminde, ayak izi merkezinde. GLB standart Y yukarı aktarımını kullanır. Görünür ölçü **29 × 23,05 m**, yükseklik **14,55 m** (direk dahil; salon çatısı 7,5 m, komuta katı çatısı 11,1 m). Geçici 30 × 24 m komuta hacmine sığar; son harita ölçüsü ve yerleşim kabulü değildir.

1.580 görünür üçgen, 8 mesh, 8 ortak mat PBR malzeme (roughness ≥ 0,6). Haricî doku yok. Bu proje için özgün üretim; dış model/doku kullanılmadı, proje kaynak hakları geçerlidir.

5 ayrı `collision_only=true` mesh / 108 üçgen: `COL_Plinth` (0,8 m), `COL_Hall` (7,5 m), `COL_Tier` (11,1 m), `COL_ButtressL/R` (7 m). Binaya girilmez; kapı kapalı ve sabittir, iç mekân, animasyon ve yıkım yok. Direk, çanak, havalandırma, çatı üniteleri, nervürler, kapı ayrıntıları, ışık direkleri ve yakıt tankında çarpışma yok. Çarpışma parçaları oyunda gizlenip statik Havok gövdesi olmalı (`loadFactoryBuilding`).

Önizleme kamerası, ışıkları, zemini ve karşılaştırma tankı yalnız render sırasında eklenir; `.blend` kaydedilmez, GLB'ye girmez.

## Üretim ve doğrulama

Blender MCP araçları bu oturuma bağlı olmadığı ve açık bir köprü bulunmadığı için, son landmark varlıklarındaki gibi Blender 5.2 CLI arka planda kullanıldı. Ortak yardımcılar: [landmark_common.py](../../../scripts/blender/landmark_common.py).

- Üretim: `blender -b --factory-startup -P scripts/blender/build_command_center.py` → `.blend`, `.glb`, `model_stats.json`.
- Önizleme: `blender -b assets/environment/command_center_01/command_center_01.blend -P scripts/blender/render_command_center.py -- front|rear|comparison`; Cycles CPU, 4 iş parçacığı, 16 örnek, 1100 × 750.
- GLB kontrolü: `blender -b --factory-startup -P scripts/blender/validate_command_center.py` boş sahnede yeniden içe aktarır; metre/zemin/merkez, sınırlar, üçgen/malzeme, 5 collider ve yükseklikleri, kamera/ışık/tank ve dış doku bulunmaması geçti.

Haritaya bağlama (`kulVadisiLayout.ts` `command` kutusunun yerine), Havok/mermi kontrolü, yakın sürüş/kamera ve performans kabulü açık.
