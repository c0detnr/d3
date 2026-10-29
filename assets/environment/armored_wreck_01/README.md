# Yanmış zırhlı araç enkazı 01

2026-10-28. Kül Vadisi merkezi için özgün, hareketsiz, yanmış paletli zırhlı araç enkazı. Gerçek bir araçtan veya başka bir oyundan model alınmadı. Kule yuvasından kaymış ve ~26° dönmüş, hafif yatık; namlu kırık ve sarkık. Sol palet kopmuş: tekerlekler açıkta, bir tekerlek eksik, palet baklaları yerde serili ve arkadan dışarı kıvrılıyor, ön ucu zincir dişlisinden sarkıyor. İsli koyu metal, yanık zeytin boya kalıntısı, kül tozu ve iki pas tonu.

- [Blender kaynak](armored_wreck_01.blend) · [GLB](armored_wreck_01.glb)
- [Ön görünüm](previews/front.png) · [Arka/kopuk palet](previews/rear.png) · [Gerçek tankla ölçek](previews/comparison.png)
- [Model sayımları](model_stats.json) · [GLB yeniden aktarım kontrolü](validation.json)

## Model sözleşmesi

Metre ölçeği, Blender Z yukarı, araç önü +X. `ArmoredWreck01Root` başlangıç noktası zeminde, görünür ayak izinin merkezinde. GLB standart Y yukarı aktarımını kullanır. Görünür ölçü **7.34 × 3.71 m**, yükseklik **2.51 m** (gövde güvertesi 1.62 m).

2.074 görünür üçgen, 7 görünür mesh, 6 ortak mat PBR malzeme (metalik 0.1–0.5, pürüzlülük ≥ 0.78). Haricî doku yok. Bu proje için özgün üretim; proje kaynak hakları geçerlidir.

2 ayrı `collision_only=true` mesh / 48 üçgen: zeminden güverteye gövde + yürüyen aksam bloğu (altında sıkışma boşluğu yok) ve kulenin birebir kopyası. Namlu, yere serili palet, düşmüş plakalar ve kırıntılarda çarpışma yok; yerdeki palet 9 cm yüksekliğindedir. Oyunda yüzey `metal` olarak işaretlenir.

Önizleme kamerası, ışıkları, zemini ve karşılaştırma tankı yalnız render sırasında eklenir; `.blend` kaydedilmez, GLB'ye girmez. Animasyon, yanma efekti ve fiziksel yıkım yok.

## Üretim ve doğrulama

Blender 5.2 CLI arka planda; ortak yardımcılar [landmark_common.py](../../../scripts/blender/landmark_common.py).

- Üretim: `blender -b --factory-startup -P scripts/blender/build_armored_wreck.py`.
- Önizleme: `blender -b assets/environment/armored_wreck_01/armored_wreck_01.blend -P scripts/blender/render_armored_wreck.py -- front|rear|comparison`; Cycles CPU, 16 örnek, 1100 × 750.
- GLB kontrolü: `blender -b --factory-startup -P scripts/blender/validate_armored_wreck.py`; metre/zemin/merkez, sınırlar (≤ 7.6 × 3.75 m, 2.2–2.6 m yükseklik), üçgen/malzeme, iki collider, gövde collider'ının zemine inmesi, kamera/ışık/tank ve dış doku bulunmaması geçti.
- `node --experimental-strip-types scripts/check-kul-landmarks.ts`: gövde/yürüyen aksam ve kule mermi ışınları, üstte görünmez çarpışma olmaması, metal yüzey, layout ayak izi ve kaynak temizliği geçti.

Haritaya bağlama, tankla yakın sürüş/kamera ve performans kabulü açık.
