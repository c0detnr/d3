# Askerî bakım hangarı 01

2026-10-28 — Kül Vadisi B1 başlangıç varlığı. Kullanıcı seçimi: kapalı, hâlâ kullanılan askerî bakım tesisi. İçinden geçilmez; çevresinden dolaşılarak siper ve görüş engeli olarak kullanılmak üzere tasarlandı. Oyun entegrasyonu henüz yapılmadı.

## Dosyalar

- [Blender kaynak](maintenance_hangar_01.blend)
- [GLB](maintenance_hangar_01.glb)
- [Ön/yan görünüm ve gerçek tankla ölçek](previews/front.png)
- [Arka/yan görünüm](previews/rear.png)
- [Kaba hacim](previews/blockout.png)
- [Model sayımları](model_stats.json), [yeniden içe aktarım kontrolü](validation.json)

## Model sözleşmesi

- Metre ölçeği. Blender Z yukarı, ön cephe −Y; GLB standart Y yukarı dönüşümü kullanır. `MaintenanceHangarRoot` ana bina ayak izinin merkezinde, zemin seviyesinde.
- Ana hacim 32 × 22 m; yan servis kanadı 6,8 × 16 m. Ayrıntılar dahil toplam sınır yaklaşık 39,32 × 23,43 × 11,74 m. Ölçüler ilk taslaktır, harita yerleşimi kabulü değildir.
- Kapı görsel açıklığı yaklaşık 10,16 × 6,65 m; kapalı ve hareketsizdir. İç mekân, açılan kapı, onarım veya yıkılma mekanikleri yok.
- 4.809 görünür üçgen; 11 görünür mesh, 10 ortak mat malzeme. Ana hacmin iki malzeme yüzeyi dahil 12 görünür glTF primitive. Dış doku bağımlılığı yok; yazılar mesh olarak aktarılır.
- `COL_Main`, `COL_Service`, `COL_Plinth`: toplam 52 üçgen; `collision_only=true`. GLB içindeki çarpışma geometrisi çalışma zamanında gizlenmeli ve statik fiziğe dönüştürülmelidir. GLB kendiliğinden Havok fiziği veya mermi engelleme davranışı sağlamaz. Lamba/kapı kolu/çatı ayrıntıları için ayrı çarpışma yok.
- `MH01_Preview` yalnız Blender ışık, kamera ve zemini içerir; GLB'ye girmez. Önizleme tankı IRON DUST 02'dir, render sonunda sahneden kaldırılır ve hangar çıktısına girmez.

## Üretim ve doğrulama

Ayrı görünür Blender 5.2.1 sürecinde, yerel Blender MCP köprüsü ve resmî `blender-mcp` stdio sunucusu üzerinden `execute_blender_code` ile üretildi. Kullanıcının mevcut Blender penceresine ve tank/silah kaynaklarına dokunulmadı.

Üretim dosyaları: [model aşamaları](../../../scripts/blender/build_maintenance_hangar.py), [önizleme](../../../scripts/blender/render_maintenance_hangar.py), [GLB kontrolü](../../../scripts/blender/validate_maintenance_hangar.py). Üretim betiği yalnız ayrılmış `IRON_DUST_MAINTENANCE_HANGAR_01` sahnesinde çalışır; sırasıyla `STAGE='blockout'`, `'detail'`, `'export'` ile MCP'ye gönderilir. Render için `VIEW='blockout'`, `'front'`, `'rear'` kullanılır.

GLB ayrı geçici Blender sahnesine yeniden içe aktarıldı: üçgen/malzeme sayımı, sonlu koordinatlar, birim ölçek, zemin hizası, özgün sınırların korunması, çarpışma işaretleri ve kamera/ışık/dış doku bulunmaması kontrolü geçti. Gerçek tankla önizlemeler incelendi. İlk ayrıntılı render denemesinde ayrı süreç exit 137 ile kapandı; kaydedilen kaynak yeniden açılıp render 4 CPU iş parçacığıyla sınırlandı.

Babylon.js görünümü, Havok/mermi çarpışması, kamera, sürüş ve performans kontrolü yapılmadı. K0/K1 yerleşimi, K2 oynanabilir fabrika kesiti ve genel M1/M2/M3 kabulü açık.

## Kaynak ve haklar

Bu proje için özgün Blender geometrisi ve düz PBR malzemeler üretildi; dış model, doku veya üçüncü taraf font dosyası dağıtılmadı. Yazı Blender'ın yerleşik Bfont görünümünden mesh'e çevrildi. Ayrı bir üçüncü taraf varlık lisansı atanmadı; proje kaynaklarının hakları geçerlidir. Önizleme tankı mevcut proje varlığıdır.
