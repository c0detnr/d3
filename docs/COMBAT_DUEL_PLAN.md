# İlk tank düellosu — çatışma, silah ve hasar planı

**Durum:** Ürün kapsamı kullanıcıyla kararlaştırıldı; aşağıdaki teknik uygulama sırası öneridir. Uygulama başlamadı. Bu görev yalnız planlamadır.

## 1. Hedef ve kesin kapsam

Mevcut test haritasında oyuncunun seçtiği tank ile diğer modelden tek hareketli AI tank savaşır. İki model de oyuncu/rakip rolünü alabilmelidir. Yeni harita, multiplayer veya backend gerekmez.

Kullanıcının onayladığı ilk sürüm:

- Her tank **100 can** ile başlar. Top isabeti **25 hasar** verir; dört geçerli isabet imha eder.
- Her iki topun dolumu **5 saniyedir**; başlangıçta hazırdır. Dolum sırasında basılan ateş kuyruğa alınmaz.
- Mühimmat sınırsızdır. Tek top mermisi türü vardır; mevcut görünür uçuş ve düşüş korunur.
- İsabet açısı, uzaklık ve ön/yan/arka yüzey hasarı değiştirmez. Delme, sekme, zırh ve bölgesel modül hasarı bu ilk sürümde kullanılmaz.
- **MG tanklara hasar vermez.** Mevcut ilk tank MG kontrolleri korunur; ikinci tanka MG eklemek bu işin şartı değildir.
- Rakip görüş varsa takip eder, uygun mesafede yavaşlayıp nişan alır ve ateş eder. Siper/kuşatma yoktur; basit engelden kurtulma vardır.
- AI engelin arkasından oyuncuyu görmez veya vurmaz; anında kusursuz nişan almaz.
- Kendi canın sürekli, rakibin canı yalnız görüşündeyken görünür. Mevcut top dolum göstergesi korunur.
- Serbest sürüş korunur. **Düelloya başla** iki tankı başlangıca yerleştirir; sonuçtan serbest sürüşe dönülebilir.
- İmha düelloyu bitirir: **Kazandın / Kaybettin / Berabere → Yeniden dene**. Aynı fizik adımında iki tank da imha olursa beraberedir.
- Aktif düelloda R/kurtarma bütün düelloyu yeniden başlatır; tek taraflı kurtarma/can yenileme yoktur.
- İmhada kısa patlama/duman efekti olur, tank devre dışı kalır ve model yerinde kalır. Parçalanma/kule fırlaması yoktur.
- Yeniden dene iki tankın pozunu, hızlarını, canını, silahlarını, AI durumunu ve uçan mermileri sıfırlar.

Bunlar ilk denge değerleridir; gerçek tank özelliklerini temsil etmez. Savaş değerleri eşit olsa da modellerin mevcut sürüş özellikleri korunur.

## 2. Mevcut temel ve önkoşul

Top, MG, gerçek namlu başlangıcı, yerçekimli mermi, süpürülmüş isabet, efekt/ses ve 5 s dolum mevcut. Son top akışı hasarsız deneme atışıdır; eski `ArmorModel.ts` kodunun varlığı zırh sisteminin aktif olduğu anlamına gelmez.

Çalışma ağacında ikinci model seçimi vardır; mevcut sahne aynı anda yalnız tek oynanabilir tank kurar. İki tankı aynı sahnede çalıştırmak ayrı uygulama adımıdır. İkinci tank üretiminin açık test/oynanabilirlik kabulü tamamlanmış varsayılmaz; o çalışmayla dosya sahipliği uzlaştırılmadan ortak araç dosyaları değiştirilmemelidir.

[ROADMAP](ROADMAP.md) içindeki M1/M2 açık kabul maddeleri korunur. Düello planı sürüş teslimini savaşa bağlamaz. Bu basit can sürümü, uzun vadeli M3 zırh/modül hasarı tesliminin tamamı değildir.

## 3. Önerilen teknik yaklaşım

### İki tank, tek dünya

`src/mapPreview.ts` içindeki oyuncuya özgü kurulum iki araç örneğini destekleyecek kadar ayrılır. Her tank kendi `TankVehicle`, `TankVisual`, `TurretController`, `WeaponSystem` ve can durumuna sahip olur. Kamera ve insan girdisi yalnız oyuncuya bağlı kalır.

Mevcut sürüş/top sınıfları yeniden kullanılır; AI tankı kopya sürüş koduyla veya konum ışınlamasıyla hareket ettirilmez. İki araç da aynı Havok dünyasında, aynı sabit 60 Hz adımda ilerler. Her iki aracın kuvvetleri uygulanır, dünya **bir kez** adımlanır, ardından pozlar ve silah/isabet sonuçları güncellenir. Can ve fizik React/Zustand üzerinden kare kare taşınmaz.

Başlangıç için iki tankın sığdığı, zemini ve aradaki görüş hattı doğrulanmış açık bir düello alanı seçilir; kesin koordinatlar uygulamada ölçülür. Haritanın tamamında kusursuz yol bulma vaat edilmez.

### Hasar ve isabet

Can/hasar kuralları küçük, sahneden bağımsız bir modelde tutulur; başlangıç canı ve hasar ortak tanımdan gelir. Fizik gövdesi → tank kimliği eşlemesi ile vurulan araç bulunur. Oyuncu ve AI aynı hasar yolunu kullanır.

Her merminin atıcısı bellidir. Sorgu yalnız **kendi atıcısını** dışlar; tüm tankları dışlamaz. Mermi namludan çıkar, önceki→yeni konum arasında ilk fizik engelinde sonlanır. Her mermi en fazla bir kez hasar verir. Arazi/kaya/ağaç veya cansız test hedefi üzerinden arkadaki tanka hasar aktarılmaz. MG isabeti efekt üretebilir ama can modeline ulaşmaz.

İlk sürümde gövde ve kule için sade, hareketi izleyen hasar hacimleri yeterlidir; dekoratif anten/namlu/palet baklası düzeyinde tam geometri isabeti hedeflenmez. Görsel kule ile yalnız sürüş gövdesinin çarpışma sınırları arasındaki fark gerçek GLB'lerle test edilir. Bu hacimler ilave dinamik süspansiyon cisimleri oluşturmaz.

Eski zırh/modül kodu bu hasar yoluna bağlanmaz; ilgisiz silme/refactor yapılmaz. Mermi menzili/ömrü ve mevcut efekt havuz sınırları korunur.

### Basit, hilesiz AI

Başlangıç durumu görünürlük kontrolüdür: görüş yokken oyuncunun güncel gizli konumu izlenmez. Hedef görünürse takip/mesafe koruma; görüş kaybolursa son görülen konuma yönelme ve sonra durup arama önerilir.

Görüş ve ateş hattı fizik engelleriyle sorgulanır; yalnızca kamera görünürlüğüne güvenilmez. Taret gerçek hız/yükseliş sınırlarıyla hedefe yetişir. AI, yerçekimli mevcut mermiye göre sınırlı nişan düzeltmesi yapar; hedef doğrultusu yerine **gerçek namlu yönü**, dolum ve açık ateş hattı atış iznini belirler.

Tepki süresi, nişan toleransı ve çatışma mesafesi ortak AI ayarlarında tutulur; kesin sayılar oynanış denemesinde ayarlanır. İlk ölçüm için yaklaşık 0,8 s tepki ve 40–70 m çatışma mesafesi önerilir; bunlar kullanıcı onaylı denge değerleri değildir.

Engelde ilerleyemediği belirli süre gözlenirse kısa geri/dönüş manevrası dener; deneme sayısı sınırlıdır. Başarısız olunca ışınlanmaz veya engelden geçmez; durup tekrar görüş arar. Navmesh ve kapsamlı orman yol bulma bu teslimde yoktur.

### Sonuç ve kaynak yaşamı

Can sıfıra sıkıştırılır; imha olayı bir kez üretilir. Aynı sabit adımdaki iki tarafın geçerli isabetleri birlikte sonuçlandırılır; ikisi de sıfır cansa berabere olur. İlk işlenen ölüm diğer tarafın o adımdaki isabetini iptal etmez. İmha edilen tank yeni sürüş/nişan/ateş komutu almaz. Sonuç kesinleşince yeni hasar/atış işlenmez; geç gelen mermi sonuç ekranını değiştirmez.

Kısa imha efekti görseldir; ek parça fiziği kurulmaz. Aktif düelloda R/kurtarma, yeniden dene ile aynı bütüncül sıfırlama yolunu kullanır. Serbest sürüşte mevcut kurtarma davranışı korunur. Serbest sürüşe dönünce rakibin AI/atış/hasar işlemleri kapanır ve düellodan kalan mermiler temizlenir.

Odak kaybı/gizli sekmede iki taraf da durur, birikmiş ateş komutu temizlenir. Sıfırlama/durum geçişi eski mermileri ve efektleri bırakmaz. Sahne kapanırken iki aracın fizik, görsel, silah, efekt ve dinleyicileri temizlenir. Yükleme hatası görünürdür; eksik rakiple sessizce düello başlamaz.

Mevcut Android/dokunmatik akış bozulmamalıdır; sonuç/yeniden dene dokunulabilir olmalıdır. Yeni APK üretimi veya fiziksel telefon performans kabulü bu belge görevi değildir.

## 4. Uygulama sırası ve adım kabulü

### C1 — İki tankı aynı sahneye yerleştir

İnsan seçimi korunur, diğer model ikinci araç olur; henüz AI ateşi yoktur.

**Kabul:** İki model zemine doğru oturur, fizik gövdeleri çarpışır; oyuncu kamerası yalnız seçilen tankı takip eder. İki model de oyuncu rolünde denenir. Sıfırlama/temizleme iki araçta da çalışır.

### C2 — Top isabetini cana bağla

Önce duran rakiple hasarı doğrula. Bu bir ara test adımıdır; nihai teslim hareketli AI'dır.

**Kabul:** 100→75→50→25→0; tek mermi tek hasar; MG/engel isabeti sıfır tank hasarı; iki atıcı da kendini vurmaz. Gövde/kule ve hareketli hedef sorguları denenir.

### C3 — AI sürüşü, görüşü ve karşı ateş

Takip, mesafe, sınırlı nişan, dolum, engel kurtarma ve görüş kaybını bağla.

**Kabul:** Rakip hareket eder, fizik sınırlarıyla döner ve topuyla oyuncuya hasar verebilir. Engelden ateş geçirmez; oyuncu gizlenince güncel gizli konuma kusursuz takip yapmaz. Son görülen konum ve takılma senaryoları tekrarlanabilir testlerle denenir.

### C4 — Can göstergeleri, sonuç ve yeniden dene

Can, görünür rakip bilgisi, sonuç ve temiz tekrar döngüsünü ekle.

**Kabul:** Kazanma, kaybetme ve aynı-adım beraberlik ayrı ayrı görülür. Sonuçtan sonra hasar değişmez. Art arda en az beş yeniden denemede can/poz/dolum/AI/mermi doğru sıfırlanır; R/kurtarma da aynı sonucu verir. Serbest sürüş→düello→serbest sürüş geçişinde rakip saldırısı veya eski mermi kalmaz. Masaüstü ve dokunmatik düğmeler çalışır; kısa imha efekti bir kez oynar.

### C5 — Regresyon ve oynanış kabulü

**Otomatik:** Can alt/üst sınırı, imha olayının tekliği, atıcı kimliği, gövde/kule eşlemesi, ilk engel, hareketli hedef, görüş kaybı, dolum/nişan kapısı, takılma sınırı, iki taraflı reset/dispose. Aynı girdilerle 30/60/120 render FPS sonuçlarını karşılaştır; AI rastlantısı varsa sabit tohum kullan.

**Mevcut komutlar:** `npm test`, `npm run combat:test`, `npm run drive:test`, `npm run tank:test`, `npm run turret:test`, `npm run mg:test`, `npm run touch:test`, `npm run map:check`, `npm run map:build`. Yeni hasar/AI kontrolleri uygulamada eklendikten sonra gerçek komut adları belgelenir; şu anda çalışır gibi sunulmaz.

**Tarayıcı/insan:** Her iki tankla en az bir kazanma ve kaybetme, tepe/kaya arkasında saklanma, yakın engel, hareketli hedef, odak kaybı, on dakikalık çatışma ve tekrarlar. Kamera, AI adaleti, nişan okunabilirliği ve ses dengesi insan tarafından değerlendirilir.

**Performans:** İki tank/AI/efekt ile cihaz, tarayıcı/WebView, çözünürlük ve kalite ayarı belirtilerek ölçülür. Şu anda FPS sonucu veya mobil performans sözü yoktur.

## 5. Ertelenenler ve açık kararlar

Zırh/delme/sekme, palet/motor/taret hasarı, iç mürettebat, mühimmat patlaması, HE/alan hasarı, sınırlı stok, MG ısınması, taktik siper/kuşatma, navmesh, yeni harita, multiplayer ve ayrıntılı parçalanan enkaz sonraya bırakılır.

Açık ayarlar: AI tepki süresi, nişan toleransı, çatışma mesafesi ve başlangıç koordinatları uygulama denemesinde ayarlanacak. AI kayıp görüş davranışı ve sade hasar hacimleri teknik tasarım önerisidir; nihai plan onayında kullanıcıya gösterilir. Bu görev uygulama izni vermez; planın kaydedilmesi uygulamanın başladığı anlamına gelmez.

## 6. Bu belge görevinin doğrulama durumu

Kaynak ve mevcut tasarım belgeleri incelendi. Oyun kodu veya modeller değiştirilmedi; oyun testleri ve tarayıcı düellosu çalıştırılmadı. Mevcut kullanıcı değişiklikleri bu teslimin dışında tutulur.
