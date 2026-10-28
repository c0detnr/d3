# Kül Vadisi — açık merkez savaş alanı

2026-10-28. Kullanıcı açık arazi, siper, geçiş ve çevre ayrıntılarını uygulamayı istedi. Loot kapsam dışı.

## Yerleşim

Merkez yaklaşık 230 × 310 m'lik açık arazi kesitidir; haritanın tamamı 720 × 720 m taslağını korur. Hangar batı kenarında (−135, −36), atölye doğu kenarında (132, −48), geçici depo (138, 66). Kapalı binalar orta alanı daraltmaz; kaynak modeller değiştirilmedi.

- Dört geniş/alçak toprak sırtı: 2.7–2.8 m yükseklik, 26–28 m yatay yarıçap. Dört sığ çöküntü: 1.2–1.6 m derinlik. Metre değerleri ilk oynanış ayarıdır.
- Şaşırtmalı altı beton siper grubu: 10–15 m genişlik, 2.3–2.7 m yükseklik. Yüksekliği farklı tanklar için gövde saklama ve köşeden çıkma seçenekleri; iki ucundan dolaşılabilir.
- Altı çift kaya kümesi: toplam 12 statik kaya, 4–6 m ana kaya genişliği. Üçgen çarpışma görünen kaya yüzeyini takip eder.
- 18 m ana yol ve iki kuru dere bağlantısı açık kalır. Düz merkez koridoruna ek olarak iki tarafta arazi üzerinden ilerlenebilir. Siperler kesintisiz duvar veya güvenli tünel oluşturmaz.
- Seyrek hazır ot/çalı, küçük beton kırıkları, paslı metal parçaları ve kırık çift palet izleri. Bitkiler ve küçük ayrıntılar tankı/mermiyi durdurmaz. Palet izleri arazi yüksekliğine oturur; fizik gövdesi yoktur.

Arazi ve siper tabanları aynı yükseklik tanımından üretilir; Havok ve görünen arazi aynı üçgen ağı kullanır. Yollara yakın arazi kabartmaları yumuşatılır. Sabit yerleşim korunur; her açılışta dekor değişmez.

Tanımlar: `kulBattlefieldLayout.ts`; çevre ve kaynak temizliği: `createKulBattlefield.ts`; arazi: `kulVadisiLayout.ts`. Kayalar/bitkiler [seçili Quaternius varlıkları](../assets/environment/quaternius_nature/README.md), binalar mevcut Blender GLB'leridir. Beton/metal/izler Babylon.js içinde üretilir. Yeni bağımlılık yok.

## Sonraki asset üretim planı

Mevcut varlıklar ilk oynanabilir kesit için yeterli. Aşağıdaki modeller görünüm çeşitliliği için öneridir; bu görevde üretilmedi ve oynanışın ön koşulu değil.

| Öncelik | Varlık | Amaç ve teslim |
|---|---|---|
| 1 | Modüler hasarlı beton mevzi seti | Mevcut sade betonların yerine 4/8/12 m düz bölüm, kırık uç ve kısa kanat. Mat beton, ayrı basit çarpışma; görünür çatlak boşluğu ile fizik tutarlı. Mevcut 2.3–2.7 m yüksekliğe uysun. |
| 2 | Özgün hareketsiz zırhlı araç enkazı | İki açık geçiş kenarında 6–9 m ölçek referansı ve farklı siper silüeti. Başka oyundan model alınmaz; karmaşık yıkım/fizik yok. GLB ve sade çarpışma. Yerleşim sonra denenir. |
| 3 | Kum torbası ve gömülü beton mevzi varyantı | Toprak sırtı kenarlarını belirginleştirme; tek tek torba fiziği yok. Tank gövdesiyle yükseklik karşılaştırması sonrası üretilir. |

Her özgün model için ayrı `.blend`, `.glb`, önizleme, metre/eksen/çarpışma kaydı; Babylon içinde gerçek tankla ölçek, dolaşma, mermi ve kamera kontrolü. Önce 1 numaralı setin tek parçası denenir. Yeni bitki/kaya üretimi gerekmiyor.

## Doğrulama

- `node --experimental-strip-types scripts/check-kul-vadisi.ts`: gerçek GLB/Havok ile ana koridorlar, dere bağlantıları ve merkezde x=−35/+35 m geçişleri iki tankla iki yönde tamamlandı. Görsel/fizik eşleşmesi, yol açıklığı/eğim, doğma görüşü, beton/kaya mermi engellemesi, siper yan açıklıkları ve iki kur/temizle çevrimi geçti. [Ham sonuç](kul-vadisi-results.json).
- `npm run map:test`, `npm run drive:test`, `npm run map:build`: geçti. Derlemenin mevcut büyük paket uyarısı sürüyor.
- Chrome 1570 × 617 görünümünde **Savaş alanına bak** ile merkez incelendi: kenardaki binalar, açık yol, beton/kaya siperleri ve arazi dalgaları görüldü. Sonrasında tarayıcı bağlantısı kapandı; ayrı ekran görüntüsü dosyası kaydedilemedi. Bu kontrol tank yüksekliğinden insan sürüş/kamera kabulü değildir.

FPS ölçümü, siper başına taktik denge ve 5'e 5 maç kontrolü yapılmadı. Genel K2 ve M1/M2/M3 kabulü bu kesitle tamamlanmış sayılmaz.

## 2026-10-28 — Hazır doğa setiyle harita zenginleştirme

Batı sırtında çam/geniş yapraklı/kuru ağaçlar, doğudaki taş ocağında iri kayalar ve seyrek kuru ağaçlar, iki dere kıyısında alçak bitki ve çakıllar eklendi. Mevcut merkez siperleri, binalar, yollar ve arazi yüksekliği korunur. Son sabit yerleşim: 76 ağaç, 20 ek taş ocağı kayası ve 358 ek bitki/çakıl. Kayalar sert siperdir; ağaçlarda yalnız yaklaşık gövde çarpışması vardır. Bitki ve çakıllar dekoratif; yıkılma yoktur.

Sekiz yeni GLB, özgün geometri ve en çok 512 px dokularla yaklaşık 4 MB tutar. Yaprak alfa maskesi korunur. Kaynak ve tekrar üretim: [Quaternius teslimi](../assets/environment/quaternius_nature/README.md).

`check-kul-vadisi.ts`: gerçek modellerle ağaç gövdesi isabeti/yol açıklığı, iki tankla bütün ana yollar, dere bağlantıları ve iki merkez geçişinin iki yönde sürüşü, iki kur/temizle çevrimi geçti. `npm run map:build` geçti; mevcut büyük JavaScript paket uyarısı sürüyor. Chrome 1255 × 549 görünümünde genel harita ve merkez incelendi; [merkez görüntüsü](previews/kul-nature-center.png). FPS ölçümü, tank yüksekliğinden insan sürüş hissi ve genel K2/M1/M2/M3 kabulü açık.
