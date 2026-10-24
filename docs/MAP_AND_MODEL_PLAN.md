# Kül Vadisi — Harita ve Blender model planı

Tarih: 2026-10-24. Durum: Harita konsepti kullanıcı tarafından seçildi; uygulama ve modelleme başlamadı.

## Kararlar, öneriler ve kapsam

- **Kullanıcı kararı:** Kuşbakışı Kül Vadisi taslağı kullanılacak. Ormanlık sırt, merkezde bakım tesisi, taş ocağı, kuru dere bağlantıları ve karşılıklı takım başlangıçları haritanın temel düzenidir.
- **Başlangıç önerileri:** 6'ya 6 takım, yaklaşık 800 × 800 m oynanabilir alan, merkezde tek ele geçirme bölgesi ve ilk karşılaşmaya 30–45 saniyede erişim. Bu değerler kesinleşmedi; sürüş ve oynanış denemeleriyle ayarlanacak.
- **Model planı:** Aşağıdaki üretim listesi konuşmada önerilen başlangıç planıdır; modellerin üretildiği veya tek tek onaylandığı anlamına gelmez.
- **Bu görevin kapsamı:** Planın ve seçilen görselin kaydı. Kodlama, Blender üretimi ve ağ altyapısı bu kayıtla başlatılmaz.
- **Mevcut MVP ile ilişki:** Çok oyunculu için gelecek harita planıdır. Mevcut tek oyunculu MVP, dünya → sürüş → savaş sırası ve açık M1/M2/M3 kabul maddeleri korunur. Çok oyunculu uygulamasının zamanı ve teknik kapsamı ayrıca planlanacak.

## Kuşbakışı referans

![Kül Vadisi kuşbakışı harita taslağı](previews/kul-vadisi-map-plan.png)

Görsel bu proje için imagegen ile üretildi ve kullanıcı tarafından harita yönü olarak seçildi. Dış oyundan harita veya model alınmadı. Görsel, ölçülmüş arazi veya doğrudan üretime hazır teknik çizim değildir. Kontur rakamları, yol genişlikleri, bina ölçüleri ve eğimler kesin veri olarak kullanılmayacak.

## Haritanın kimliği ve yerleşimi

Ormanlık tepeler arasında, eskiden taş ocağına ve yük demiryoluna hizmet veren terk edilmiş sanayi vadisi. Görsel dil: özgün Industrial Low Poly; mat zeytin yeşilleri, tozlu toprak, grafit kaya, paslı metal ve mevcut fırtınalı atmosfer. Sis ve efektler savaş alanının okunmasını engellememeli.

| Bölge | Yerleşim ve oyun işlevi |
|---|---|
| Kuzey — Takım A | Toprak setlerle korunan başlangıç; birden fazla, kırılarak çıkan yaklaşım yolu |
| Güney — Takım B | Kuzeyle dengeli erişim ve korunma; görünümün birebir aynalanması zorunlu değil |
| Merkez — bakım tesisi | Hangarlar, atölyeler, avlular ve demiryolu; yakın çatışma, alternatif giriş ve geri çekilme yolları |
| Batı — ormanlık sırt | Kaya siperleri ve gövdeyi gizleyen tepe konumları; yandan baskına açık atış noktaları |
| Doğu — taş ocağı | Kademeli arazi, servis yolu, uzun görüşler ve riskli yan yaklaşım |
| Ara bağlantılar — kuru dere | Bölgeler arasında kısmen gizli hareket; çıkışlarda risk |

### Oynanış ilkeleri

- Üç ana yaklaşım birbirinden kopuk koridorlar olmayacak; yan bağlantılar cephe değiştirmeye izin verecek.
- Bölge değiştirmenin açık alan geçmek veya avantajlı konumu bırakmak gibi bir bedeli olacak.
- Tek bir tepe bütün haritayı kontrol etmeyecek.
- Başlangıç alanları rakibin doğrudan görüşüne açılmayacak; çıkışlar tek dar boğaza mahkûm olmayacak.
- İki takımın hedefe erişimi, siperleri ve yükselti avantajları dengelenecek.
- Kaya, beton ve toprak set gerçek siper olarak okunacak; ağaç yapraklarının görüşü örtmesi mermiyi durdurmasıyla karıştırılmayacak.
- Merkezde baştan sona kesintisiz atış hattı yerine yapılarla bölünen çatışma alanları kurulacak.

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
| Başlangıç bölgesi | Kum torbası setleri, küçük servis barakası | Başlangıç kimliği; sonraki paket |
| Küçük dekor | Varil grubu, paletli yük, hurda metal, tabela, elektrik direği | Ölçek ve terk edilmişlik; son aşama |

### İlk paket — 15 temel model önerisi

| Adet | Modeller |
|---|---|
| 3 | Bakım hangarı, atölye, idari bina |
| 4 | Düz beton duvar, beton köşe, kırık duvar, beton bariyer |
| 5 | Üç büyük kaya biçimi, uzun kaya sırtı, ocak duvarı |
| 3 | İki çam çeşidi, bir geniş yapraklı ağaç |

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

## Açık kararlar ve doğrulama

- Oyuncu sayısı, harita ölçüsü, maç süresi ve oyun modu kesinleştirilecek.
- Ele geçirme alanının boyutu, yeniden doğma kuralları ve başlangıç koruması ayrıca tasarlanacak.
- Yol genişlikleri, eğimler ve geçitler gerçek tankla sürülerek kontrol edilecek.
- İki taraftan ilk temas ve hedefe varış süreleri ölçülecek; 30–45 saniye yalnız başlangıç hedefidir.
- Atış hatları, yan saldırılar ve baskın konumlar iki takım açısından incelenecek; görsel denge oynanış kanıtı sayılmayacak.
- Ağaçların, küçük dekorların ve sanayi parçalarının çarpışma/mermi davranışı tanımlanacak.
- Kamera kesişmeleri, görüş okunabilirliği ve tarayıcı performansı sınanacak; cihaz, tarayıcı, çözünürlük ve kalite kaydedilecek.

Bu belge için oyun testi, Blender teslim kontrolü veya çok oyunculu denge testi yapılmadı. Kayıt, konuşmada seçilen harita yönünü ve önerilen üretim planını saklar.
