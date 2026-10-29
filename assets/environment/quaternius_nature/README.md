# Kül Vadisi — seçili doğa varlıkları

Kaynak: kullanıcı tarafından sağlanan `Stylized Nature MegaKit[Standard]/glTF/`, Quaternius. Lisans: CC0 1.0; yerel özgün metin `LICENSE.txt`.

`Rock_Medium_1`, `Rock_Medium_2`, `Bush_Common`, `Grass_Wispy_Short` ilk merkez kesitinde kullanılır. glTF JSON, özgün bin ve PNG bağımlılıkları tek GLB içinde paketlendi; geometri değiştirilmedi. Kaynak paket korunur. Oyun örneklerinde yatay boyuta göre metre ölçeği uygulanır; kayalar 4–6 m, küçük eşleri bunun %60'ı, çalı 2.4 m ve ot 1.5 m genişliktedir. Çalı/ot oyun içinde ortak mat, kuru zeytin rengi materyal kullanır; kaynak kaplamaları GLB'de korunur. Kayaların özgün kaplaması kullanılır.

12 kaya yerleşimi ortak geometri/materyal kullanır ve statik sert siperdir. Bitkiler görsel örtüdür; tankı/mermiyi durdurmaz. Seyrek küçük beton ve metal parçaları kodla üretilir. Kaynaklar sahne kapanışında temizlenir.

Bu klasör bütün doğa paketinin entegrasyonu değildir; son insan görsel kabulü ve cihaz performans ölçümü açıktır.

## 2026-10-28 — Sırt, taş ocağı ve dere çevresi

Sekiz model daha eklendi: `Pine_5`, `Pine_2`, `DeadTree_2`, `CommonTree_3`, `Rock_Medium_3`, `Pebble_Square_2`, `Grass_Common_Short`, `Fern_1`. Kaynak geometri korunur; bu sekiz GLB'nin dokuları alfa dahil en çok 512 × 512 piksele küçültüldü. Toplam yaklaşık 4 MB. Tekrar üretim (Python 3 ve ImageMagick):

```sh
python scripts/pack-nature-assets.py 'Stylized Nature MegaKit[Standard]/glTF'
```

Kaynak paketin `glTF/` dizini gerekir. Paket ve CC0 kaydı değişmedi. Yeni bitki/ağaç modelleri özgün alfa maskeli materyallerini korur; canlı yeşil tonlar ortak materyal üzerinden soluk zeytine çekilir. Materyaller ve geometri kopyalar arasında paylaşılır.

Batı sırtında çoğunluğu çam olan ağaçlar, doğuda taş ocağı kayaları ve kuru ağaçlar, dere kıyılarında ot/çalı/çakıl bulunur. Ağaçlar 9–17 m boyunda; basit sekiz yüzlü gövde çarpışması kullanır, dallar ve yapraklar mermiyi/tankı durdurmaz. Gövde çarpışması yaklaşık hacimdir; kırılma/yıkılma yoktur. Yeni kaya boyları 4–8 m ve sert siperdir. Bitkiler ve çakıllar fizik içermez. İnsan sürüş ve FPS kabulü açıktır.

## 2026-10-28 — Merkez çalılık siperleri

İki model daha eklendi: `Bush_Common_Flowers` (357 172 bayt) ve `Grass_Common_Tall` (49 144 bayt). Aynı paketleme kuralı: geometri korunur, dokular en çok 512 × 512 piksel. Önceki on iki GLB yeniden üretilmedi. Paketleme betiği artık model adlarını argüman olarak alır; ad verilmezse ikinci teslimin sekiz modeli üretilir:

```sh
python scripts/pack-nature-assets.py 'Stylized Nature MegaKit[Standard]/glTF' Bush_Common_Flowers Grass_Common_Tall
```

`createKulFieldProps.ts` bu iki modeli merkezdeki dört çalılık/çit sırasında (2.1–2.4 m çalı, 1.5–1.8 m uzun ot) kullanır. Kopyalar kaynak primitive başına tek mesh'te birleştirilir; renkler ortak soluk zeytin çarpanıyla bastırılır. Fizik yoktur, isPickable kapalıdır: görüşü keser, tankı/mermiyi durdurmaz.
