# Hasarlı beton mevzi 01

2026-10-28. Kül Vadisi açık merkezi için ilk özgün beton siper. Mevcut atölyeyle aynı sıcak gri/soluk zeytin paleti, açık kırık yüzeyleri, seyrek paslı demir ve grafit bağlantılar. Eğimli ön yüz, üç arka payanda ve kırık üst köşeler; küçük `M-04` mevzi işareti.

- [Blender kaynak](concrete_emplacement_01.blend) · [GLB](concrete_emplacement_01.glb)
- [Ön görünüm](previews/front.png) · [Arka/payandalar](previews/rear.png) · [Gerçek tankla ölçek](previews/comparison.png) · [Kaba hacim](previews/blockout.png)
- [Model sayımları](model_stats.json) · [GLB yeniden aktarım kontrolü](validation.json)

## Model sözleşmesi

Metre ölçeği, Blender Z yukarı, ön cephe −Y. `ConcreteEmplacementRoot` başlangıç noktası zeminde (0,0,0); yatay merkez duvarın merkezidir. GLB standart Y yukarı aktarımını kullanır. Üç beton panel toplam 8 m, taban dahil **8.4 × 3.5 m**. Beton 2.5 m, demir uçları dahil toplam yükseklik yaklaşık **2.672 m**. Tabanın bir bölümü araziye gömülerek yerleştirilebilir; son oyun konumu açık.

1.090 görünür üçgen, 10 görünür Blender mesh, 8 ortak mat PBR malzeme. Haricî doku yok; yazı Blender Bfont'tan mesh'e çevrildi. Bu proje için özgün üretim; dış model/doku kullanılmadı ve proje kaynak hakları geçerlidir.

7 ayrı `collision_only=true` mesh / 164 üçgen: taban, üç hasarlı panel, üç payanda. Kırık köşelerdeki gerçek silüet çarpışmaya da aktarılır; üst boşlukları kapatan kutu kullanılmaz. İnce demir, yüzey aşınması ve küçük kırıntılarda ayrı çarpışma yok. Çarpışma parçaları oyun yüklenirken gizlenmeli ve statik fiziğe bağlanmalı. Üç panel arası ince döküm derzleri ve küçük yüzey lekeleri oynanış deliği değildir.

`CE01_Preview` yalnız kamera, ışık ve zemin içerir; GLB'ye girmez. Tank yalnız karşılaştırma renderında eklenir; kaynakta ve GLB'de bulunmaz. İç mekân, animasyon ve fiziksel yıkım yok. Bu teslim ilk düz parçadır; L biçimli veya farklı uzunlukta set varyantları henüz üretilmedi.

## Üretim ve doğrulama

Varsayılan canlı Blender özet çağrısı yanıt vermediği için kullanıcının mevcut pencerelerine dokunmadan ayrı görünür Blender 5.2 süreci ve 9881 MCP köprüsü açıldı. Gerçek özet, modelleme, aktarım ve render işlemleri resmî `blender-mcp` stdio sunucusu üzerinden yapıldı. `background=false`, `windows=1` doğrulandı. Önceki hangar/atölye kaynakları değiştirilmedi.

- [Üretim](../../../scripts/blender/build_concrete_emplacement.py): yalnız ayrılmış `IRON_DUST_CONCRETE_EMPLACEMENT_01` sahnesinde `STAGE='blockout'`, `'detail'`, `'export'` sırasıyla MCP'den çalıştırılır.
- [Önizleme](../../../scripts/blender/render_concrete_emplacement.py): `VIEW='front'`, `'rear'`, `'comparison'`; Cycles CPU, 4 iş parçacığı, 12 örnek, 1100 × 750. İlk kaba hacim 24 örnek, 1400 × 950.
- [GLB kontrolü](../../../scripts/blender/validate_concrete_emplacement.py): ayrı geçici Blender sahnesinde yeniden içe aktarım; metre/zemin, sınırlar, üçgen/malzeme, çarpışma metadata, sonlu koordinat, kamera/ışık/tank ve dış doku bulunmaması geçti.
- `node --experimental-strip-types scripts/check-concrete-emplacement.ts`: gerçek GLB ile Babylon/Havok içe aktarımı, yedi gizli collider, ana duvar ve kırık köşe mermi ışınları, iki yanda açıklık ve kaynak temizliği geçti.

Oyun haritasına yerleştirme, tankla yakın sürüş/kamera ve gerçek cihaz performansı bu varlık tesliminde yapılmadı. K2 ve genel M1/M2/M3 kabulü kapanmadı.

## Harita entegrasyonu — 2026-10-28

Kül Vadisi merkezindeki altı geçici beton siperin yerine metre ölçeği korunarak yerleştirildi. Kuzey/güney cepheleri karşılıklı; yedi collider gizlenip statik Havok'a bağlandı. Gerçek haritada ana duvar, kırık köşe açıklığı, iki yandan geçiş, iki tankla rota ve kaynak temizliği kontrolleri geçti. [Yerleşim ve oyun görüntüsü](../../../docs/CENTER_BATTLEFIELD.md#2026-10-28--hazır-binalar-ve-beton-mevziler). İnsan yakın sürüş/kamera ve performans kabulü açık.
