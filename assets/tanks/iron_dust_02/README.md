# IRON DUST 02 — ikinci tank varlığı

2026-10-26 ilk teslim · 2026-11-04 v2 gerçekçi yeniden tasarım. Bu proje için Blender ile üretilmiş özgün, kum beji Industrial Low Poly tank. Leopard 2A6 yalnızca tasarım esinidir; oyun modeli veya marka varlığı kullanılmadı.

![Üç çeyrek görünüm](previews/three_quarter.png)

## v2'de değişenler

- Yürüyen aksam: her yanda 7 çift yol tekeri (kauçuk bant, diskli göbek), 4 palet taşıyıcı makara, dişli arka çark, ön gergi tekeri. Palet; bakla, kılavuz dişi ve uç bağlantılarıyla modellendi, üst kısmı makaralar arasında sarkar.
- Gövde: eğimli ön plaka ve uzun glasi, sağda sürücü kapağı ve periskopları, far korumaları, motor güvertesinde giriş ve egzoz ızgaraları, arka ızgaralar.
- Etekler: önde üç kalın zırh modülü; arkada ince plakalar ve kauçuk alt şerit.
- Kule: yüksek ve dik yanlı gövde, ok ucu biçimli ek zırh, düz top kalkanı, sağ önde nişancı dürbünü, komutan periskobu, görüş bloklu komutan kapağı, yan kutular, sis atıcılar, arka sepet ve yükler.
- Top: uzun namlu, kaplama bantları, tahliye silindiri ve namlu ağzı sensörü.
- Malzeme: boyalı yüzeyler metalik değil; 9 malzeme (`ID02_Canvas` yeni).

## Teslim

- [Düzenlenebilir Blender kaynağı](iron_dust_02.blend) ve [oyun GLB'si](iron_dust_02.glb). Üretim betiği: [`scripts/blender/build_second_tank_v2.py`](../../../scripts/blender/build_second_tank_v2.py) (Blender MCP üzerinden `STAGE='rebuild'`, ardından `STAGE='export'`). v1 betiği `build_second_tank.py` tarihçe için duruyor.
- [Ön](previews/front.png), [yan](previews/side.png), [arka](previews/rear.png), [üst](previews/top.png), [detay](previews/detail.png) ve [ilk tankla karşılaştırma](previews/comparison.png).
- [Model sayımı](model_stats.json), [kaynak ve GLB hareket doğrulaması](validation.json), [Havok sürüş sonucu](driving-results.json).

Görünür geometri 27.988 üçgen, çarpışma kutusu 12 üçgendir. Fizik sözleşmesi v1 ile aynıdır: tekerlek merkezleri (x ±1,55, y −2,52…2,52, z 0,63 m), `TurretPivot`, `GunPitchPivot`, `GunRecoilRoot`, `MuzzlePoint` ve `COL_Hull` konumları ve GLB özel alanları değişmedi. Görünür yol tekeri yarıçapı 0,418 m; palet alt kenarı yükseldiği için oyunun hesapladığı temas yarıçapı yaklaşık 0,52 m'dir.

Blender 5.2.2 ile kaynak ve GLB yeniden içe aktarımı 525'er hareket pozunda kontrol edildi. −8°…+20° namlu aralığında çakışma yok, tekerlek–etek çakışması yok, tüm parçalar kapalı mesh. `npm run tank:test`, `npm run turret:test`, `npm run drive:test` ve `scripts/check-duel-tanks.ts` geçti. Tarayıcıda görsel ve sürüş hissi kabulü açık. Bu kontroller performans ölçümü değildir.

Geometri ve materyaller bu proje için üretildi; üçüncü taraf varlık lisansı gerektiren içerik yok. Projenin yayın lisansı ayrıca belirlenir.
