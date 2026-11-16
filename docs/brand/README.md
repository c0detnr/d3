# ASHFIELD — arayüz marka varlıkları

Kaynak taslaklar korunmuştur. Bu teslim yalnızca yeni dosyalardan oluşur; oyun arayüzüne bağlama ve mevcut CSS/TSX/HTML değişiklikleri bu teslimde yoktur.

## Dosyalar

| Çıktı | Kaynak | Boyut / işlem |
| --- | --- | --- |
| `public/brand/ashfield-wordmark.png` | `logo-concepts/01c-stencil-clean.png` | 1200 × 312, RGBA; siyah zemin kaldırıldı, dış boşluk kırpıldı |
| `public/brand/ashfield-wordmark.webp` | Aynı PNG | 1200 × 312, kayıpsız WebP ve alfa |
| `public/brand/ashfield-icon.png` | `logo-concepts/01d-stencil-icon.png` | 512 × 512, RGBA; rozet dışındaki beyaz köşeler kaldırıldı |
| `public/favicon.png` | Aynı rozet | 32 × 32; küçük grunge noktaları için 5 × 5 medyan süzgeci |
| `public/apple-touch-icon.png` | Aynı rozet | 180 × 180; 3 × 3 medyan süzgeci, saydam köşeler |

Wordmark beyaz/kehribar olduğu için koyu arayüz yüzeyleri içindir. Rozetin içindeki haki zemin korunur; yalnız dış köşeler saydamdır. Logoların kaynak çizimi ve stencil kesikleri yeniden çizilmedi. 180 px dosyanın Apple tarafından cihazda maskelenmesi ayrıca sınanmadı.

## Yeniden üretme

Depo kökünden, ImageMagick 7 ve WebP desteği ile:

```bash
bash docs/brand/prepare-assets.sh
magick identify public/brand/ashfield-*.png public/brand/ashfield-wordmark.webp public/favicon.png public/apple-touch-icon.png
```

Betik siyah zemindeki düşük parlaklıklı gürültüyü eşikler, RGB'yi alfa kapsamına bölerek siyah matte etkisini kaldırır, ardından kırpar ve Lanczos ile küçültür. Rozetin yalnız dört köşe bölgesinde beyaz matte kapsamı hesaplanır ve kenar rengi beyazdan arındırılır. Böylece A harfinin içindeki kirli gri saydamlaşmaz. Küçük ikonların medyan süzgeci küçültmeden önce uygulanır.

Fontun değiştirilmemiş kaynak dosyalarını indirme komutları:

```bash
curl -fL https://raw.githubusercontent.com/google/fonts/main/ofl/blackopsone/BlackOpsOne-Regular.ttf -o src/game/ui/fonts/BlackOpsOne-Regular.ttf
curl -fL https://raw.githubusercontent.com/google/fonts/main/ofl/blackopsone/OFL.txt -o src/game/ui/fonts/BlackOpsOne-OFL.txt
```

İndirme adresleri hareketli `main` dalını gösterir; bu teslimin font SHA-256 değeri `282a825b5f294377387e3969f765408157dbea8da0f5d0aae68c6bc704b145b3`, lisans SHA-256 değeri `f67ca4a200424868ee8fcd5464d7b35ac1cbf7723f6bfdbd19a8524689fab9a8`.

## Ölçülmüş palet

Kaynaklar dokulu ve tek renk değil; aşağıdakiler belirtilen iç piksellerden doğrudan alınan sRGB örnekleridir (koordinat başlangıcı sol üst, 0 tabanlı). Bir tasarım standardı olarak onaylanmış düz renkler değildir.

| Rol | Hex | Kaynak / piksel (x, y) |
| --- | --- | --- |
| Zemin | `#000000` | 01c / (100, 100) |
| Harf | `#FEFDFE` | 01c / (800, 300) |
| Kehribar vurgu | `#F2A006` | 01c / (1085, 145) |
| Haki | `#3B421F` | 01d / (100, 600) |
| Kirli gri | `#B6B4AF` | 01d / (570, 250) |

Ölçüm örneği:

```bash
magick docs/brand/logo-concepts/01c-stencil-clean.png -format '%[pixel:p{1085,145}]\n' info:
```

## Başlık fontu

`src/game/ui/fonts/BlackOpsOne-Regular.ttf`: **Black Ops One Regular**, ağırlık 400. Kalın askeri stencil karakteri için seçildi; taslaktaki özel ASHFIELD harflerinin birebir fontu değildir. Başlıklarda kullanılabilir; mevcut Barlow Condensed ve onun `OFL.txt` dosyası korunmuştur. Font CSS'e bağlanmadı.

Kaynak: [Google Fonts resmî deposu / Black Ops One](https://github.com/google/fonts/tree/main/ofl/blackopsone). Lisans: **SIL Open Font License 1.1**; ticari kullanım, gömme ve lisansla birlikte yeniden dağıtım serbesttir. Font tek başına satılamaz; değiştirilmiş dağıtımlarda OFL'nin adlandırma koşulları geçerlidir. Tam metin: `src/game/ui/fonts/BlackOpsOne-OFL.txt`. Bu lisans yalnız fontu kapsar; mevcut logo taslaklarının hak durumuna yeni bir lisans atamaz.

## Doğrulama

- Üretim betiği çalıştırıldı; tüm çıktılar 8 bit sRGB ve alfa kanallı.
- 1200 px wordmark, 256 px rozet gösterimi, gerçek 180 px ikon ve gerçek 32 px favicon; `#141819` koyu zemin ve dama deseni üzerinde görsel olarak incelendi. Saydamlık, stencil aralıkları, şevron ve kırpma kontrol edildi; görünür siyah/beyaz hale gözlenmedi.
- 512/180/32 ikonların dört köşesinde alfa sıfır, merkezinde tam opaklık kontrol edildi. PNG/WebP alfaları ve görünür RGB değerleri karşılaştırıldı.
- `fc-scan` fontu “Black Ops One / Regular” olarak tanıdı. Uygulama entegrasyonu, tarayıcıda font yükleme ve gerçek cihaz favicon davranışı bu dosya tesliminin dışında kaldı.
