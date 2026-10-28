# Kül Vadisi — Harita ve Blender model planı

İlk konsept: 2026-10-24. Son güncelleme: 2026-10-28.

**Durum:** 5’e 5 üs saldırısı için harita planı onaylandı ve belgelendi. Bu haritanın uygulaması, Blender çevre üretimi ve 5’e 5 maç sistemi bu görevde başlatılmadı.

## Kesin kararlar ve önceki planla ilişki

2026-10-28 konuşmasında kullanıcı aşağıdaki harita düzenini uygun buldu:

- İki takım, takım başına beş oyuncu; kuzey ve güneyde karşılıklı ana üsler.
- Üç ana yaklaşım: batıda ormanlık sırt, merkezde fabrika alanı, doğuda taş ocağı.
- Koridorlar arasında cephe değiştirmeye izin veren yan geçitler ve kuru dere bağlantıları.
- Her koridorda, her takım için bir büyük dış savunma binası; her üs girişinde üç yaklaşımın bağlandığı ortak iç savunma.
- Düşmanın bir koridorunu yararak ortak iç savunmayı aşmak ve komuta merkezini yok etmek kazanmak için yeterli. Diğer iki koridorun savunmalarını yıkmak zorunlu değil.
- Komuta merkezi ana hedef; korunaklı doğma hangarları bundan ayrı. Hangar çıkışları komuta merkezine saldıran düşmanın doğrudan atış hattında olmayacak.
- Üslerden üç cepheye dağılabilen, tek kapıda sıkışmayı önleyen çıkışlar.

Önceki plandaki **6’ya 6 ve merkezde tek ele geçirme alanı** önerilerinin yerini bu düzen alır. Yaklaşık 800 × 800 m ve ilk temasa 30–45 saniye önerileri son ölçü veya kabul koşulu değildir; tank hızı ve yol düzeniyle yeniden değerlendirilecek.

Bu belge gelecek çok oyunculu haritanın tasarımını tanımlar. Mevcut sürüş/savaş prototiplerinin veya LAN düellosunun 5’e 5 maç sistemini sağladığı anlamına gelmez. Açık M1/M2/M3 kabul maddeleri bu belgeyle kapanmaz.

## Kuşbakışı yerleşim

Aşağıdaki şema bağlantıları gösterir; ölçekli arazi veya bina yerleşim çizimi değildir.

```text
                     KUZEY ÜSSÜ — TAKIM A
                  Korunaklı doğma hangarları
                  Komuta merkezi (ayrı hedef)
                       Sevk avlusu
                     A iç savunması
                    /       |       \
            A batı dış   A orta dış   A doğu dış
              savunma      savunma      savunma
                 |            |            |
            ORMANLIK       FABRİKA        TAŞ
              SIRT          ALANI        OCAĞI
                 |── yan geçit ──|── yan geçit ──|
                 |            |            |
            B batı dış   B orta dış   B doğu dış
              savunma      savunma      savunma
                    \       |       /
                     B iç savunması
                       Sevk avlusu
                  Komuta merkezi (ayrı hedef)
                  Korunaklı doğma hangarları
                     GÜNEY ÜSSÜ — TAKIM B
```

Şemadaki hangar ve komuta merkezi sıralaması işlevsel katmanları anlatır. Gerçek yerleşimde yana kaydırılmış binalar, toprak setler ve kırılan yollar doğma alanına düz atış hattı oluşmasını önlemeli. Yan geçitlerin sayısı ve tam konumu henüz belirlenmedi.

### Önceki görsel referans

![Kül Vadisi ilk kuşbakışı konsepti](previews/kul-vadisi-map-plan.png)

2026-10-24 tarihli görsel bu proje için imagegen ile üretildi ve kullanıcı tarafından seçildi; dış oyundan varlık alınmadı. Orman, sanayi ve taş ocağı kimliği için referanstır. Yeni üsler ve savunma zinciri bu eski görselde gösterilmiş kabul edilmez. Görseldeki kontur rakamları, yol genişlikleri ve bina ölçüleri üretim verisi değildir.

## Bölge kimliği ve çatışma düzeni

Ormanlık tepeler arasında, eski taş ocağına ve yük demiryoluna hizmet veren sanayi vadisi. Industrial Low Poly dilinde mat zeytin yeşili, tozlu toprak, grafit kaya ve paslı metal kullanılır. Fırtınalı atmosfer görüş okunabilirliğini bozmamalı.

| Bölge | Yerleşim | Oyun işlevi |
|---|---|---|
| Batı — ormanlık sırt | Büyük kayalar, kırılan yollar, alçak sırtlar ve ağaç kümeleri | Gövde saklama, konum değiştirerek ilerleme ve yan saldırı. Atış noktalarının dolaşılabilir arka/yan yaklaşımı olmalı. |
| Merkez — fabrika alanı | Bakım hangarları, atölyeler, avlular ve yük vagonları | Üsler arasındaki en kısa yaklaşım; yakın çatışma ve yoğun baskı. Yapılar uzun düz atış hattını bölmeli. |
| Doğu — taş ocağı | Sürülebilen basamaklar, servis yolları, kaya ve yükleme alanları | Daha uzun görüşler, yükselti kullanımı ve riskli açık alan geçişleri. Tek bir basamak bütün bölgeye hükmetmemeli. |
| Yan bağlantılar — kuru dere ve servis geçitleri | Ana yollar arasında kısmen gizli hareket | Takviye, kuşatma ve geri çekilme. Çıkışları açıkta veya karşı konumdan görülebilir; bedelsiz güvenli kestirme olmamalı. |
| Kuzey/güney — ana üsler | Ayrı doğma hangarları, sevk avlusu, komuta merkezi ve savunma girişi | Cepheye dağılım, son savunma ve maçın nihai hedefi. |

Oyuncular belirli bir koridora veya sabit role atanmış sayılmaz. Beş oyuncunun üç yola nasıl dağılacağı takım kararıdır; tank sınıfları veya zorunlu 2–1–2 dağılımı bu planın kararı değildir.

## Ana üs düzeni

Her üs aşağıdaki işlevleri taşımalı:

1. **Doğma hangarları:** Üssün arkasında korunaklı tank çıkışları. Görünüş olarak büyük zırhlı birlik tesisinin parçası; tek dar boğaza bağlı değiller. Doğma sıklığı, koruma ve kapı davranışı henüz kararlaştırılmadı.
2. **Sevk avlusu:** Hangarlardan çıkan araçların farklı cephelere dağılabildiği geniş manevra alanı. Beş tank birbirini zorunlu olarak bloke etmemeli.
3. **Komuta merkezi:** Büyük, kolay tanınan beton ana hedef; hangarların önünde ve yana kaydırılmış. İmhası maçı bitirir. Görsel hasar aşamaları ve can değerleri açık.
4. **Ortak iç savunma:** Üç koridorun üs yaklaşımında bağlandığı son savunma. Dış savunması kırılan bir yoldan bunun aşılması, komuta merkezine saldırı yolunu açar.
5. **Çıkış siperleri:** Beton duvarlar ve toprak setler düz görüşü keser; doğan oyuncunun en az alternatif bir hareket seçeneği olmalı.

Dağa gömülü üs veya açık tank fabrikası görünümü henüz seçilmedi. Bu iki görsel seçenekten biri kesin kullanıcı kararı gibi modellenmeyecek.

## Savunma binaları ve ilerleme

İlk düzende takım başına üç dış savunma binası, bir ortak iç savunma ve bir komuta merkezi vardır. Koridor savunması küçük, tek başına duran bir top yerine **büyük beton savunma yapısı** olarak okunmalı; top bunun üstünde veya önünde yer alabilir.

Örnek kazanma yolu:

**Batı koridorundaki düşman dış savunmasını yık → üs girişindeki ortak iç savunmayı aş → komuta merkezini yok et.**

Orta ve doğu dış savunmaları ayakta kalsa da maç kazanılabilir. Bu, savunan takımın diğer cephelerden geri dönmesini ve saldıran takımın yan güvenliğini düşünmesini gerektirir.

### Henüz kesinleşmeyen savunma mekanikleri

- Topun otomatik hedef seçimi, dönüş hızı, menzil, ateş hazırlığı, dolum ve hasarı.
- Önden güçlü, yandan zayıf zırh; dikkat çekip yandan vurma davranışı önceki konuşmada önerildi, sayısal sistem onaylanmadı.
- Hedefe erişim ile hasar kilidinin ilişkisi: sıradaki yapıya erken veya yandan ateş etmenin engellenip engellenmeyeceği ayrıca kararlaştırılacak. Haritanın görüş ve erişim düzeni savunma sırasını desteklemeli.
- Yıkılan yapının enkaz olarak siper oluşturması öneridir; geçişi kalıcı kapatacak fiziksel yıkım taahhüdü değildir.

## Diğer yapılar

| Yapı | Yerleşim ve amaç | Durum |
|---|---|---|
| Büyük hangar ve atölyeler | Fabrikada görüşü bölmek, çevresinden dolaşmak ve alternatif yaklaşım oluşturmak | Harita düzeninin parçası; içinden geçilebilir hangar seçimi ve ölçüleri açık |
| Depo ve vagonlar | Avluda siper, yön bulma ve atış hattını bölme | Çevre yerleşimi; kesin adetler açık |
| Konveyör ve yükleme haznesi | Taş ocağının silüeti ve bölge kimliği | Çevre önerisi; üretim sırası aşağıda |
| İleri bakım/onarım hangarı | Cepheye yakın onarım ve bunun kaybıyla geri çekilme ihtiyacı | Oynanış önerisi; onarım sistemi ve yıkılma etkisi onaylanmadı |

Her bina yıkılabilir hedef olmayacak. Sert siper, yalnız görsel dekor ve maç hedefi ayrımı yerleşimde okunmalı. Düzenli çıkan dost konvoyları da önceki konuşmanın önerisidir; bu harita onayıyla uygulanacak mekanik sayılmaz.

## Denge ve oynanış ilkeleri

- Üç yol birbirinden kopuk olmayacak; cephe değiştirmek zaman, açık alan geçişi veya avantajlı konumu bırakma bedeli taşımalı.
- Merkez kısa yol olsa da kesintisiz üsler arası atış hattı vermemeli.
- Hiçbir tepe üç koridoru, bir üssün bütün çıkışlarını veya tüm hedefleri birlikte kontrol etmemeli.
- İki takımın ilk temas, koridora erişim ve savunmaya dönüş olanakları dengelenmeli. Aynı görünen iki yarı şart değil; erişim avantajları karşılaştırılmalı.
- Doğma çıkışlarına uzaktan doğrudan ateş engellenmeli. Kuşatmada savunan takımın çıkış ve karşı saldırı seçeneği olmalı.
- Kaya, beton ve toprak set gerçek siper olarak okunmalı; ağaç yapraklarının görüş örtmesi mermiyi durdurmasıyla karıştırılmamalı.
- Yol ve avlularda tankların karşılaşma, geri çekilme ve dönüş payı bulunmalı; ayrıntılı dekor hareketi istemeden tıkamamalı.
- Yapı sayısı cephe ilerlemesini görünür kılmalı; maç sürekli hareketsiz binalara ateş etmekten oluşmamalı.

## Arazi ile Blender varlıklarının ayrımı

Harita tek bir dev Blender modeli olarak üretilmeyecek. Tekrar kullanılabilen çevre parçaları oluşturulacak.

**Arazi çalışması:** Toprak tepeler, taş ocağının sürülebilen basamakları, kuru dere yatağı, yollar ve başlangıç setleri. Önce tankın geçebileceği yüzeyler ve eğimler kurulacak; teknik üretim yöntemi uygulama öncesinde seçilecek.

**Blender çalışması:** Yapılar, beton siper parçaları, kayalar ve ocak duvarları, ağaçlar, demiryolu ve sanayi donanımları. Bunlar araziyi tamamlayacak; geçilebilir yüzeylerde boşluk, basamak veya görünmez engel yaratmayacak.

## Blender model envanteri

| Grup | Üretilecek modeller | İşlev / öncelik |
|---|---|---|
| Bakım tesisi | Büyük bakım hangarı, küçük atölye, idari bina | Merkezde görüş ve çatışma düzeni; ilk paket |
| Beton siperler | Düz duvar, köşe, kırık duvar, beton bariyer; daha sonra kapı direkleri | Tekrar kullanılabilen sert siper; ilk paket |
| Kayalar | Üç farklı büyük kaya, uzun kaya sırtı, modüler ocak duvarı | Araziyi ve görüşü bölme; ilk paket |
| Bitki örtüsü | İki çam çeşidi, bir geniş yapraklı ağaç; daha sonra kütük | Bölge kimliği ve görüşü kısmen örtme; ilk paket |
| Taş ocağı donanımı | Taş yığınları, yükleme haznesi, konveyör | Ocak kimliği ve yön bulma; sonraki paket |
| Demiryolu | Düz ve kavisli ray, hat sonu tamponu, yük vagonu | Tesisin işlevini anlatma ve görüşü bölme; sonraki paket |
| Ana üs ve hedefler | Doğma hangarları, komuta merkezi, dış savunma binası, ortak iç savunma, üs çıkış duvarları | Yeni 5’e 5 planının gerekli yapıları; önce basit hacimlerle yerleşim, sonra modelleme |
| Başlangıç dekoru | Kum torbası setleri, küçük servis barakası | Üs kimliği; sonraki paket |
| Küçük dekor | Varil grubu, paletli yük, hurda metal, tabela, elektrik direği | Ölçek ve terk edilmişlik; son aşama |

### İlk paket — 15 temel model önerisi

| Adet | Modeller |
|---|---|
| 3 | Bakım hangarı, atölye, idari bina |
| 4 | Düz beton duvar, beton köşe, kırık duvar, beton bariyer |
| 5 | Üç büyük kaya biçimi, uzun kaya sırtı, ocak duvarı |
| 3 | İki çam çeşidi, bir geniş yapraklı ağaç |

Bu liste 2026-10-24 çevre seti önerisidir; yeni üs ve savunma hedeflerinin tamamını kapsamaz. Onaylı 5’e 5 yerleşimin basit hacim çalışması, dekoratif üretimden önce gelir.

Bunlar 15 benzersiz temel varlıktır; haritada yerleştirilecek nesne sayısı değildir. Tekrarlar ve yerleşim varyasyonlarıyla kullanılacak. Konveyör, vagon ve küçük dekorlar ana yollarla siperler oturduktan sonra üretilecek.

## Üretim sırası

1. Basit hacimlerle harita yerleşimini, yaklaşım ve yan geçişleri doğrula.
2. Büyük kayaları ve beton siper setini üret.
3. Hangar, atölye ve idari binayı üret.
4. Ağaç çeşitlerini ekle; görüş okunabilirliğini koru.
5. Taş ocağı donanımı ve demiryolu setini üret.
6. Başlangıç dekorları ve küçük ayrıntılarla tamamla.

Bu sıra plan önerisidir; şu anda üretim başlatılmadı. Tekrarlı parçalar tasarlanırken görsel çeşitlilik kadar oynanış işlevi gözetilecek.

## Model teslim ve entegrasyon kuralları

- Mevcut tankla aynı metre ölçeği; kapı, geçit, dönüş ve siper ölçülerini gerçek tankla kontrol et.
- Tutarlı İngilizce dosya/nesne adları, doğru dönüş merkezleri ve yerleştirmeye uygun başlangıç noktaları kullan.
- Industrial Low Poly dilini, mat malzemeleri ve güçlü silüetleri koru.
- Blender `.blend` kaynağı ile oyun için `.glb` çıktısını sakla.
- Görünür geometriden ayrı, basit çarpışma geometrisi hazırla; sert siper ile görsel dekor davranışını açıkça tanımla.
- Modüler duvar ve ocak parçalarının birleşimlerini kontrol et; tankın takılacağı görünmez kenarlar bırakma.
- Her varlığın kaynağını, lisansını, geçici durumunu ve teslim kontrollerini kaydet. Mevcut tank/silah dosyalarını koru.
- Çevre üçgen, materyal ve doku bütçelerini referans cihazdaki ölçümle belirle; henüz kesin bütçe yok.
- Kapsamlı fiziksel bina yıkımı bu planın kapsamında değil.

## Açık kararlar

- Son harita ölçüsü, yol genişlikleri, yükseltiler ve bölgeler arası mesafeler.
- Maç süresi hedefi, yeniden doğma olup olmayacağı, bekleme süresi ve üs koruma yöntemi.
- Savunma binalarının can/ateş değerleri, hedef önceliği ve yapıların hasar alma koşulları.
- Komuta merkezinin hasara açılma kuralı; aynı anda iki merkezin imhasında sonuç.
- Onarım hangarları, konvoylar ve bunların maçtaki görevleri.
- Üslerin son mimarisi, hangar içleri ve kapı davranışı.
- Harita sınırları, küçük dekor çarpışmaları ve mermi engelleme özellikleri.
- Referans cihaz, çevre üçgen/materyal bütçesi ve ağ uygulama kapsamı.

## Uygulama öncesi ve sonrası kabul kontrolleri

Önce yollar, siperler, üsler ve hedef binaları basit hacimlerle yerleştirilecek. Ayrıntılı Blender üretimi bu yerleşim sınanmadan başlamamalı.

- İki taraftan her koridora ilk temas, yan geçiş ve üs savunmasına dönüş sürelerini gerçek tankla ölç.
- Kapıları, dönüşleri, eğimleri, geri çekilmeyi ve avluda birden fazla tankın hareketini sürerek kontrol et.
- Merkezden veya yüksek konumlardan doğma hangarlarına doğrudan atış hattı bulunmadığını incele.
- Her baskın konuma alternatif yaklaşım olduğunu; yan geçitlerin de karşı oyun sunduğunu kontrol et.
- Bir koridorun dış savunması ve ortak iç savunma aşıldığında, diğer dış savunmalar ayaktayken komuta merkezine ulaşılıp maç kazanılabildiğini doğrula.
- Maç kuralları uygulanınca yapıların hedef/hasar sırası ve kazanma durumunu anlamlı otomatik kontrollerle doğrula.
- 5’e 5 oturumda bütün takımın tek yola yığılması, cephe değiştirme ve üs kuşatması senaryolarını oyna; sonuçlara göre mesafe ve siperleri ayarla.
- Kamera kesişmeleri, görüş okunabilirliği ve performansı cihaz/tarayıcı/çözünürlük/kalite bilgisiyle kaydet.

**Bu belge güncellemesinde:** Karar/öneri ayrımı, belge bağlantıları ve değişiklik farkı kontrol edildi. Oyun testi, yeni harita üretimi, Blender teslimi veya 5’e 5 denge testi yapılmadı. Harita onayı ve belge teslimi, uygulama veya oynanış kabulü değildir.
