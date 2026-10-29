# Sis mühimmatı varlığı

IRON DUST için özgün Industrial Low Poly sandık ve sis kapsülü. Dış model, doku veya ikon kullanılmadı; lisans gerektiren üçüncü taraf varlık içermez.

- `smoke_supply_01.blend`: metre ölçekli kaynak, stüdyo kamera/ışıkları.
- `smoke_supply_01.glb`: 1594 üçgenlik sandık, kapağı ve içindeki üç tüp.
- `smoke_capsule_01.glb`: oyunda fırlatılan ayrı kapsül; aynı materyaller.
- `inventory.svg`: özgün, ölçeklenebilir iki tüplü envanter ikonu.
- `preview.png`: Blender Cycles önizlemesi.
- `model-info.json`: üretim bilgisi.

Üretim: `blender --background --python scripts/blender/build_smoke_supply.py` (depo kökünde). Betik açık Blender oturumundan çalıştırılmayı reddeder. Oyun varlıklarını üretirken kaynak dosyayı yeniden yazar; önce mevcut kaynak değişikliklerini koruyun.

[Mekanik, kontroller ve doğrulama](../../../docs/SMOKE_SUPPLY.md).
