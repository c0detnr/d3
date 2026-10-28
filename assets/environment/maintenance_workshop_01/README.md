# Küçük askerî bakım atölyesi 01

2026-10-28 — Kül Vadisi B1 atölyesi. Mevcut kapalı bakım hangarını tamamlayan alçak beton tesis: kapalı panelli servis kapısı, personel girişi, dar üst pencereler, yan sundurma ve iki çatı aspiratörü. Kül Vadisi merkezine entegre edildi; aşağıdaki güncel entegrasyon kaydına bak.

## Dosyalar

- [Blender kaynak](maintenance_workshop_01.blend) · [GLB](maintenance_workshop_01.glb)
- [Ön/yan görünüm ve gerçek tankla ölçek](previews/front.png) · [Arka/yan görünüm](previews/rear.png) · [Kaba hacim](previews/blockout.png)
- [Model sayımları](model_stats.json) · [GLB yeniden aktarım kontrolü](validation.json)

## Model sözleşmesi

- Metre ölçeği; Blender Z yukarı, ön cephe −Y. GLB standart Y yukarı dönüşümünü kullanır. `MaintenanceWorkshopRoot` ana hacim merkezinde, zeminde.
- Ana bina 18 × 12 × 5,1 m; sundurma ve ayrıntılarla sınırlar yaklaşık 23 × 13,585 × 6,71 m. Son harita ölçüsü ve yerleşim kabulü değildir.
- Servis kapısının görsel yüzeyi 7,25 × 4,16 m. Kapalı ve sabittir; binaya girilmez. Sundurma tank geçidi olarak tasarlanmadı; yan servis alanıdır. İç mekân, kapı animasyonu, onarım ve yıkım yok.
- 3.641 görünür üçgen, 10 mesh ve 10 ortak mat PBR malzeme. Yazılar mesh, pencere yüzeyleri opak koyu camdır. Haricî doku yok.
- `COL_Main`, `COL_Foundation`, `COL_CanopyRoof`, iki `COL_CanopyPost` ve `COL_RoofEquipment`: 6 mesh, 72 üçgen, `collision_only=true`. Çatı ekipmanı için kaba birleşik kutu kullanılır. Küçük cephe çıkıntıları ve lambalar ayrı çarpışma almaz.
- Oyun yükleyicisi `collision_only` mesh'lerini gizleyip statik fizik/mermi sorgusuna bağlamalı. GLB tek başına Havok davranışı sağlamaz.
- `MW01_Preview` yalnız Blender kamera/ışık/zemin düzenidir; GLB içinde yoktur. Gerçek IRON DUST 02 tankı yalnız render sırasında eklenir, çıktıdan ve kaynak sahneden kaldırılır.

## Üretim ve kontroller

Ayrı görünür Blender 5.2.1 sürecinde, yerel köprü ve resmî `blender-mcp` stdio sunucusuyla üretildi. Varsayılan canlı MCP özet çağrısı yanıt vermediği için mevcut Blender pencerelerine dokunmadan 9880 portunda bağımsız köprü kullanıldı. Gerçek MCP özet, modelleme, render ve yeniden aktarım çağrıları başarılı oldu. Hangar/tank kaynakları değiştirilmedi.

- [Üretim betiği](../../../scripts/blender/build_maintenance_workshop.py): yalnız `IRON_DUST_MAINTENANCE_WORKSHOP_01` sahnesinde, sırasıyla `STAGE='blockout'`, `'detail'`, `'export'`. Kod MCP `execute_blender_code` çağrısına gönderilir. Ayrı boş Blender dosyası gerekir.
- [Önizleme betiği](../../../scripts/blender/render_maintenance_workshop.py): `VIEW='blockout'`, `'front'`, `'rear'`; 4 CPU iş parçacığı, Cycles 16 örnek, 1400 × 950.
- [GLB kontrolü](../../../scripts/blender/validate_maintenance_workshop.py): ayrı geçici sahneye aktarım; üçgen/materyal sayısı, sonlu koordinatlar, birim ölçek, zemin/sınır eşleşmesi, çarpışma metadata ve kamera/ışık/dış doku bulunmaması geçti. GLB indeksleri ayrıca doğrudan sayıldı: 3.641 + 72 üçgen.

Babylon/Havok/mermi entegrasyonu, oyun içi kamera, sürüş ve performans kontrolü yapılmadı. K2 oynanabilir fabrika kesiti ve genel M1/M2/M3 kabulü açık.

## Kaynak ve haklar

Bu proje için özgün Blender geometrisi ve düz PBR malzemeler üretildi. Dış model veya doku kullanılmadı; yazılar Blender yerleşik Bfont'tan mesh'e çevrildi. Proje kaynaklarının hakları geçerlidir. Önizleme tankı mevcut proje varlığıdır.

## Oyun entegrasyonu — 2026-10-28

Kül Vadisi merkez fabrikaya GLB metre ölçeği korunarak yerleştirildi; alt arazi düzleştirildi. `collision_only` geometrisi gizlenip statik Havok fiziğine bağlandı. Gerçek GLB ile zemin/ölçek, mermi engelleme, yan açıklık ve kaynak temizliği kontrolleri; iki tankla mevcut rota sürüşleri ve `map:build` geçti. Chrome görünümü incelendi. Önceki bağımsız varlık tesliminin açık entegrasyon maddeleri bu kayıtla güncellendi; insan yakın sürüş/kamera kabulü ve performans ölçümü açık. [Ayrıntılar ve görüntü](../../../docs/KUL_VADISI_BLOCKOUT.md#b1--hangar-ve-atölye-entegrasyonu).
