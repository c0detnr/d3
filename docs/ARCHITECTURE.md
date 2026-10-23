# Teknik mimari — uygulama planı

Bu belge henüz uygulanmamış bir tasarımdır. Paket sürümleri ve API uyumluluğu kurulum öncesinde resmi kaynaklardan doğrulanacak.

## Seçilen yığın

| Araç | Sorumluluk |
|---|---|
| TypeScript | Oyun ve UI kodu |
| Babylon.js | Sahne, render, kamera, materyal, animasyon ve efektler |
| Havok Physics | Rijit gövde, temas ve fizik sorguları |
| React + Tailwind CSS | Başlangıç ekranı, HUD, duraklatma ve ayarlar |
| Zustand | Düşük frekanslı UI durumu |
| Vite | Geliştirme ve üretim derlemesi |
| Blender + glTF/GLB | Model üretimi ve aktarım |

## Önerilen modül sınırları

Kodlamaya geçildiğinde ihtiyaç oldukça oluşturulacak; bu dizinler henüz mevcut değil.

| Konum | Sorumluluk |
|---|---|
| src/game/core/ | Başlatma, oyun döngüsü, sahne yaşam döngüsü |
| src/game/world/ | Arazi, zemin yüzeyleri, ışık ve çevre |
| src/game/input/ | Klavye/fare girdisini oyun komutlarına dönüştürme |
| src/game/vehicle/ | Araç tanımı, gövde, sürüş, süspansiyon, kule |
| src/game/camera/ | Takip ve nişancı kameraları |
| src/game/combat/ | Mermi, isabet ve hasar — M3 |
| src/game/effects/ | Toz, atış ve ses |
| src/ui/ | React ekranları ve HUD |
| src/state/ | UI durumu |
| public/assets/ | Dağıtılabilir modeller, sesler ve kaplamalar |
| assets-source/ | Kaynak varlıklar; dağıtım paketine doğrudan alınmaz |

## Veri akışı ve döngü

Girdi → araç komutları → sabit adımlı fizik → fizik durumundan görsel güncelleme → kamera/render.

- Önerilen fizik başlangıç adımı 1/60 saniye; ölçümle doğrulanacak. Biriken süre ve adım sayısı sınırlandırılmalı.
- Render kare hızından bağımsız simülasyon; gerektiğinde fizik pozları arasında görsel interpolasyon.
- Sekme arka plana gidince simülasyon durur veya süre birikimi sıfırlanır; dönüşte büyük zaman sıçraması uygulanmaz.
- React sahneyi her karede yeniden oluşturmaz. Konum, hız ve temas verileri oyun katmanında tutulur.
- HUD telemetrisi sınırlı sıklıkta UI'a aktarılır; UI ayarları tanımlı bir arayüzle oyuna iletilir.

## Tank fiziği yaklaşımı

1. Basit çarpışma şekilli dinamik bir gövde.
2. Her iki palet boyunca birden fazla temas/süspansiyon noktası.
3. Yay-sönümleme kuvvetleri ve temas düzleminde çekiş/yana kayma tepkisi.
4. Palet başına tahrik ve fren kuvveti; sınırlı motor gücü ve zemin tutuşu.
5. Tekerlek ve palet görselleri hesaplanan harekete göre canlandırılır.

Her palet baklası fizik cismi olmayacak. Ray/sweep temas seçimi, temas sayısı ve sürtünme modeli prototip kararlarıdır. Havok tek başına hazır tank sürüş modeli olarak kabul edilmez; araç denetleyicisi ayrıca tasarlanır.

Başlangıç konvansiyonu: metre, saniye, kilogram; iç açılar radyan. Araç tanımında kütle, boyutlar, ağırlık merkezi, motor/fren, süspansiyon ve kule sınırları merkezi tutulur. Kütle ve kuvvet değerleri birlikte ayarlanır.

## Kamera ve kule

Kamera hedefi, kule hedefi ve namlunun gerçek yönü ayrı veriler olur. Üçüncü şahıs kamera çevre çarpışmalarıyla görüşü korur. Atışın başlangıcı kamera değil namlu ağzıdır. Nişancı görüşü de aynı fiziksel silah durumunu kullanır.

## M3 mermi ve hasar

Mermi konumu sabit zaman adımıyla ilerletilir. Hızlı merminin hedefin içinden atlamasını önlemek için önceki ve yeni konum arasında süpürülmüş isabet sorgusu kullanılır. İlk engel dikkate alınır.

Vuruş noktası, yüzey normali, mermi yönü ve zırh bölgesi temel sonuç girdileridir. Basitleştirilmiş açı/delme modeli ve modül eşlemesi kodlama öncesinde tanımlanacak. Gelişmiş zırh malzemesi simülasyonu MVP zorunluluğu değildir.

## Teknik riskler

- Havok WASM yükleme/dağıtım koşulları ve lisans: kurulum öncesi doğrulanacak.
- Süspansiyon kararlılığı: yüksek detaylı modelden önce basit gövdeyle denenecek.
- Arazi kenarları ve yüksek hız: temas kaybı ve çarpışma kaçırma test edilecek.
- React/sahne yaşam döngüsü: çift başlatma ve kaynak sızıntısı kontrol edilecek.
- Tarayıcı/GPU farklılıkları: render backend ve destek listesi ilk teknik denemede seçilecek.
- Birden fazla fizik dünyası, gereksiz paket veya erken optimizasyon eklenmeyecek.
