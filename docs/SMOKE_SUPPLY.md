# Sis mühimmatı — ilk loot itemi

**Durum (2026-10-29):** Özgün envanter ikonu, Blender/GLB sandık ve kapsül, ana sahnede toplama/kullanma ve yerel düello AI görüş engeli uygulandı. Otomatik kontroller geçti. Tarayıcı erişim aracı `The browser access host is unavailable` döndürdüğü için oyun içi görsel kabul, gerçek klavyeyle F/G denemesi ve performans ölçümü açık.

## Kullanım

- Ana oyun/`map-preview.html`, test arazisi ve Kül Vadisi; iki tank seçeneği de desteklenir.
- Başlangıcın yanında üç sabit ikmal sandığı bulunur. İlk sandık başlangıçtan yaklaşık 7 m uzaktadır; envanter boş başlar.
- Sandığa **8 m** yaklaş; arada fiziksel engel yokken **F** ile tanktan inmeden topla. Bir sandık **1 kullanım hakkı** verir. Her sandık bir kez alınır; otomatik yeniden doğmaz.
- **G** tank gövdesinin önüne üç kapsülü yelpaze şeklinde atar. Ana top seçimi ve dolumu etkilenmez. Kullanım hakkı salvo başına bir azalır.
- En fazla **3 kullanım**, kullanımlar arasında **20 saniye** bekleme vardır. Alttaki hücre adet/bekleme durumunu gösterir; düğmeden de kullanılabilir. Toplama düğmesi yakınlıkta görünür.
- **R** sahne sıfırlaması sandıkları geri getirir, envanteri boşaltır ve mevcut sisi kaldırır. Sekme yenilendiğinde envanter saklanmaz.
- F/G yalnız oyun fare odağındayken çalışır; genel görünüş, serbest kamera ve imha durumunda kullanım engellenir. Mobilde ayrı klavye gerektirmeyen hücre/toplama düğmeleri vardır; fiziksel cihaz kabulü yapılmadı.

## Tasarım ve başlangıç ayarları

Kullanıcı tankın önünde perdeyi ve tanktan tuşla toplamayı seçti. Diğer sayısal değerler ilk prototip ayarlarıdır; oyun dengesi onayı değildir.

| Alan | Değer |
|---|---|
| Uçuş | 0,7 s, görsel kavis |
| Yerleşim | Gövdenin 12 m önünde; yan kapsüller merkezden ±6 m |
| Büyüme | 2 s |
| Tam yoğunluk | 15 s |
| Dağılma | 3 s |
| Tam yarıçap | Yatay 6 m; düşey oran 0,7 |
| Fiziksel koruma | Yok; mermiler geçer, hasar vermez |

Çıkış-hedef arasındaki fizik sorgusu kapsülü duvarın arkasına yerleştirmemek için hedefi kısaltır. Kapsüller kozmetik bir kavis izler; ayrı rijit cisim veya uçuş boyunca çarpışma simülasyonu yoktur. Bu nedenle alçak tavan/çıkıntı altında uçuş görseli ayrıca değerlendirilmelidir.

## Görsel varlıklar

- [3D önizleme](../assets/items/smoke_supply_01/preview.png): mat zeytin yeşili sandık, aralık kapak, üç beyaz bantlı tüp ve SMK etiketi.
- [Envanter ikonu](../assets/items/smoke_supply_01/inventory.svg): aynı tüp tasarımını kullanan iki tüplü, şeffaf arka planlı özgün SVG. Küçük boyutta yazıya bağımlı değildir.
- Sandık **1594 üçgen**. [Blender kaynağı](../assets/items/smoke_supply_01/smoke_supply_01.blend), [sandık GLB](../assets/items/smoke_supply_01/smoke_supply_01.glb), [kapsül GLB](../assets/items/smoke_supply_01/smoke_capsule_01.glb).
- Dünyada fiziksel engel değildir ve nişan sorgusuna girmez. Yakınlıkta metinli toplama bildirimi görünür; özel dünya seçim konturu henüz yoktur.
- [Üretim betiği](../scripts/blender/build_smoke_supply.py) yalnız Blender background modunda ayrı dosya üretir. Açık editör sahnesini değiştirmez. Tüm model, materyal ve ikonlar bu proje için üretildi; dış varlık kullanılmadı.

## Oynanış ve çizim sözleşmesi

`SmokeModel` adet, bekleme, zaman ve sis hacimlerini sabit fizik adımında yönetir. `SmokeSupply` GLB yerleşimini, toplamayı ve görsel kapsülleri bağlar. `SmokeInventory` yalnız sunum ve kullanıcı eylemlerini taşır.

`SmokeScreen` dünya derinliğine kadar olan ışın/elipsoit kesişim uzunluğundan görüş perdesi hesaplar. Sisin önündeki yakın nesneler korunur. Kamera içerideyken de etki geçerlidir; iki yönden aynı yoğunluk kullanılır. Kamera geçişinde derinlik haritası ve postprocess yeniden bağlanır; sis yokken kaldırılır.

Yerel `EasyDuelAI` aynı hacim ve optik yoğunluğu kullanır; ışık geçirgenliği %20'nin altına indiğinde doğrudan görüşü kaybeder. Daha önce gördüğü son konuma ilerleme davranışı korunur; görünmeyen oyuncunun güncel konumuna nişan almaz. Bu eşik bir başlangıç ayarıdır. Mermilerin fizik sorgusu sise bağlanmaz.

Bu ilk teslim ana sahneyi ve yerel düelloyu kapsar. LAN sunucusuna sis olayları/envanteri eklenmedi; APK yeniden üretilmedi.

## Doğrulama

- `npm run smoke:test` geçti: kapasite, adet tüketimi, bekleme, çift toplama/mesafe/duvar engeli, büyüme/dağılma, iki yönlü görüş, içeriden bakış, ön/üst nesneler, 30/60/120 FPS sabit adım eşitliği, gerçek GLB ölçeği, sıfırlama, kamera geçişi ve iki kur/kapat çevriminde kaynak temizliği.
- `npm run map:build` ve `npm run combat:test` geçti. Mevcut büyük paket uyarısı sürüyor.
- Gerçek shader `glslangValidator -S frag` ile doğrulandı. Ayrı EGL/GLES2 ekran dışı çiziminde derleme/link ve piksel sonuçları kontrol edildi: ön nesne `[25,51,76]` korunurken arkadaki `[117,126,125]`, içeriden bakış `[85,100,108]`, ters yönden bakış `[117,126,125]` oldu. Bu kontrol oyun tarayıcısındaki son görünüşü kanıtlamaz.
- Blender önizlemesi görsel olarak incelendi; model kadraja sığıyor.
- **Açık:** Tarayıcıda ikon yerleşimi/okunabilirliği, sandık görünürlüğü, gerçek F/G, eğimli arazide kapsül yayılımı, sisin taktik dengesi ve hedef cihazda GPU maliyeti. FPS sonucu verilmedi; M1/M2/M3 genel kabulü kapanmaz.
