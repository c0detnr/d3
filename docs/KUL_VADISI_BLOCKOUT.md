# Kül Vadisi — K0 + K1 ilk uygulama

2026-10-28. İlk kaba yerleşim; son harita veya 5'e 5 denge kabulü değildir.

## Açılış

`npm run dev` sonrasında `/map-preview.html?map=kul` açılır. Sağdaki harita seçimi mevcut sürüş sahasıyla geçiş yapar. **Haritaya bak** bütün alanı gösterir; **Tanka dön** sürüş kamerasını açar. A/B bağlantıları iki başlangıcı seçer; `tank=02` ikinci tankla kullanılabilir. R seçili üsse döndürür.

## K0 — ilk ölçüler ve davranış

Bütün yerleşim metre esaslıdır. Kuzey harita koordinatında −Z, doğu +X; A kuzeyde, B güneyde. Oynanabilir taslak 720 × 720 m; arazi ağı 3 m aralıklı. Ana yollar ve yan bağlantılar 18 m genişliğinde. Üs avlusundan her iki yana çıkış var. Bunlar ilk uygulama değerleridir; son ölçü kararı değildir.

Batı sırtı yaklaşık +15 m, ocak yaklaşık −12 m ana yükseklik profiline sahiptir; dere ve arazi dalgaları buna eklenir. Görsel yüzey ile Havok aynı üçgen ağını kullanır. Yolları kesen rastgele siper/dekor yoktur; yerleşim sabittir.

| Tank | Görünür en × yükseklik × namlu dahil boy | Fizik gövdesi en × yükseklik × boy | Yerinde 180° dönüş |
|---|---|---|---|
| 01 | 4.16 × 3.76 × 9.23 m | 2.90 × 1.25 × 6.30 m | 4.53 s |
| 02 | 4.16 × 4.11 × 10.98 m | 3.06 × 1.08 × 7.15 m | 6.48 s |

Ölçüler gerçek GLB'den; dönüş gerçek Havok simülasyonundan alınmıştır. 18 m yol iki görünür tank genişliği ve manevra payı içerir; beş araçlı avlu kabulü henüz yapılmadı.

- Bütün geçici bina/set hacimleri tankı ve mermiyi durduran statik sert siperdir. Hedeflerin canı, ateşi, hasar sırası ve maç sonucu bağlı değildir.
- Doğma hangarları ayrı hacimlerdir; önündeki başlangıç açıklığı gerçek başlangıçtır. Geçici hangar kutusunun içinden geçilmez; kapı/iç mekân kabulü yoktur.
- Üs hangarı 36 × 24 × 10 m, fabrika hangarı 36 × 54 × 13 m; dış savunma 24 × 21 × 9 m, iç savunma 30 × 24 × 11 m, komuta 30 × 24 × 14 m. Bütün bina ölçüleri geçicidir. Kullanıcı Blender hangar ölçülerinin henüz belli olmadığını bildirdi; bu teslim Blender dosyalarını değiştirmez veya entegre etmez.
- Doğa paketi K4 işidir; yaprak, ağaç gövdesi ve bitki mermi davranışı bu teslimde uygulanmadı. Bina olmayan alanlar şimdilik yalnız arazidir.
- Kenarlarda yükselen arazi ve görünmez sınır çarpışması var; son sınır görseli açık.

## K1 — teslim

İki üs, üç ana koridor, iki kuru dere bağlantısı, altı dış savunma, iki iç savunma, iki komuta merkezi, iki doğma hangarı ve üç fabrika hacmi mevcut. Ana tanım `src/game/world/kulVadisiLayout.ts`; yükseklik, yollar, kroki ve yapılar buradan beslenir. `createKulVadisi.ts` yalnız bu haritanın kaynaklarını kurar ve temizler. Mevcut test sahası ayrı kalır.

## Fizik ile ölçülen yolculuklar

Aşağıdaki **orta hatta erişim**, tankın orta çizginin 15 m yakınına gelmesidir; düşmanla ilk temas değildir. Süreler mesafeden hesaplanmadı: gerçek GLB/Havok üzerinde 60 Hz simülasyonda sürüldü. Otomatik kontrolcü virajlarda yavaşlar ve yaklaşık 7 m/s hızla sınırlıdır; insanın en hızlı turu veya maç süresi hedefi sayılmaz. Tam rota, karşı üs başlangıcının 10 m yakınına ulaşmayı içerir; ters yön ölçümü savunmaya geri dönüş için de kaba referanstır.

| Tank / koridor | A → orta hat | B → orta hat | A → B tam rota | B → A tam rota |
|---|---:|---:|---:|---:|
| 01 / Batı | 63.6 s | 63.6 s | 129.2 s | 129.1 s |
| 01 / Merkez | 58.4 s | 58.4 s | 119.0 s | 119.1 s |
| 01 / Doğu | 63.3 s | 63.3 s | 128.7 s | 128.8 s |
| 02 / Batı | 65.2 s | 65.2 s | 132.6 s | 132.6 s |
| 02 / Merkez | 59.8 s | 59.9 s | 122.2 s | 122.3 s |
| 02 / Doğu | 64.6 s | 64.6 s | 131.7 s | 131.7 s |

İki dere bağlantısı da iki tankla, iki yönde sürüldü; yaklaşık 61 saniye. Ham sonuç: [kul-vadisi-results.json](kul-vadisi-results.json). Bu sayılar rota erişimini doğrular; 5'e 5 taktik dengeyi doğrulamaz.

## Kontroller ve açık kabul

`node --experimental-strip-types scripts/check-kul-vadisi.ts`: gerçek görsel/fizik üçgen eşleşmesi, düz başlangıç açıklığı, tank genişliğiyle yol/yapı açıklığı, yol eğimleri, üç koridordaki orta konumlardan iki doğma çıkışına engellenmiş görüş, iki tankın bütün rotalarda iki yönlü sürüşü, dönüş ve iki kur/temizle çevrimi geçti.

Mevcut `npm run map:test`, `npm run drive:test`, `npm run map:build` geçti. Derlemenin mevcut büyük paket uyarısı sürüyor. Tarayıcı gözlemleri aşağıda kaydedilir; insan sürüş hissi, yüksek konumlardan bütün olası görüşler, beş araçlı manevra, FPS bütçesi ve 5'e 5 denge açık.

Chrome görsel kontrolü: 1255 × 493 sayfa görünümünde tankın başlangıç yerleşimi ve kuşbakışı üç koridor görüldü. Sis kuşbakışında azaltılır; uzak araziyi gökyüzü küresi kesmesin diye bu haritada aynı atmosferin çapı 2800 m olarak kullanılır. [Kuşbakışı kayıt](previews/kul-vadisi-blockout.jpg). Bu gözlem FPS ölçümü veya insan sürüş kabulü değildir.

Paralel Blender çalışmasında [bakım hangarı varlık teslimi](../assets/environment/maintenance_hangar_01/README.md) oluştu. Yukarıdaki geçici hangar hacimleri bu modelin ölçüsü olarak okunmamalı; gerçek modelle yerleşim K2 entegrasyonunda ele alınacak.

B üssü bağlantısı açıldı; kamera yönü 180° olarak gözlendi. Tarayıcı otomasyonunda fare kilidi alınamadığından kısa klavye sürüşü doğrulanamadı; sürülebilirlik kanıtı yukarıdaki gerçek fizik testidir.

## B1 — hangar ve atölye entegrasyonu

2026-10-28: `factory-hangar` (x −54, z 0) ve `factory-workshop` (x 60, z −45) geçici kutuları gerçek Blender GLB'leriyle değiştirildi. Kaynak metre ölçeği korundu; görünür sınırların merkezi yerleşim noktasına hizalandı. Yerleşim zarfları sırasıyla 40 × 24 m ve 23 × 14 m; bina tabanları düzleştirildi, çevrelerine 6 m arazi geçişi verildi. Diğer yapı hacimleri geçicidir.

Hangarın üç, atölyenin altı `collision_only` mesh'i görünmez statik Havok şekilleridir; tank, kamera ve mermi fizik sorgularına dahildir. Malzeme geri bildirimi metal; ayrıntılı yüzeye göre malzeme ayrımı yapılmadı. Kapılar kapalıdır; iç mekân/onarım/maç mantığı eklenmedi. GLB'ler Vite dağıtımına alınır, sahne kapanırken görsel ve fizik kaynakları temizlenir.

Sağ panelde **Fabrikaya bak** iki modeli birlikte gösterir; **Tanka dön** mevcut üs tankına döner. [Gerçek oyun görünümü](previews/kul-vadisi-factory.png): Chrome, 1255 × 493 görüntü; görsel gözlem, FPS ölçümü değildir. Tarayıcı hata/uyarı kaydı boştu. Otomasyon fare kilidi alamadığından elle sürüş/kamera hissi kabulü yapılamadı.

`node --experimental-strip-types scripts/check-kul-vadisi.ts` gerçek iki GLB ile zemin/ölçek, gizli çarpışma, mermi engelleme, yan açıklıklar, iki tankın bütün mevcut rotalarda iki yönlü sürüşü ve iki kur/temizle çevrimini geçti. `npm run map:build` geçti; mevcut büyük paket uyarısı sürüyor. Ham sürüş kaydı güncellendi; rota süreleri değişmedi. B2 savunma modeli, beton/doğa seti, insan yakın sürüş kabulü ve performans ölçümü olmadan K2 tamamlandı sayılmaz.
