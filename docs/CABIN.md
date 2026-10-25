### 1. Kabin iç gövdesi ve ana konsol

Blender MCP kullanarak IRON DUST adlı masaüstü tank oyunu için yüksek kaliteli bir tank iç kabini modelle. Yalnızca Blender varlığını hazırla; oyun kodu yazma.

Önce mevcut sahneyi incele. Kullanıcıya ait nesneleri silme veya değiştirme. Çalışmayı ayrı bir ID_Cockpit koleksiyonunda yap. Mevcut tank modeli varsa kabinin boyutlarını ve yerleşimini ona uyarla.

TASARIM
Modern, kurgusal, Industrial Low Poly bir tank kabini. Özgün ve işlevsel görünmeli. Koyu boyalı metal, kauçuk birleşimler, kontrollü aşınma ve az miktarda açık renk teknik panel kullan. Oyuncak görünümü, yoğun neon, dekoratif bilimkurgu şekilleri ve gerçek tank tasarımı kopyaları kullanma.

Sürücü koltuğu MODELLEME. Dışarıya açılan pencere veya zırhlı cam MODELLEME. Kullanıcı dışarıyı önündeki büyük monitörden izleyecek.

ORTAK KOORDİNAT DÜZENİ
Metre kullan. Blender eksenleri: +Y ileri, +X sağ, +Z yukarı.
İlk yerleşim için göz referansı: (0, 0, 1.35).
Yaklaşık kullanılabilir iç alan: 2.6 metre genişlik, 2.8 metre uzunluk, 2.2 metre yükseklik.
Göz konumunu yalnızca bir Empty ile belirt: ID_EyeReference.
Bütün parçalar bu ortak düzene göre hazırlanacak.

MODELLENECEKLER
- Kameranın çevresini saran iç zırh panelleri, tavan ve zemin.
- Anlamlı panel katmanları, taşıyıcı kaburgalar ve güçlü birleşim detayları.
- Önde geniş, hafif eğimli bir monitörü taşıyan ana konsol.
- Monitör için yaklaşık 0.95 × 0.52 metre görünür alan; merkezini yaklaşık (0, 0.95, 1.42) konumuna yerleştir ve göz referansına yönelt.
- Ekran çerçevesi, gövdesi ve sağlam bağlantıları.
- Sol ve sağ kumanda kollarının sonradan takılabileceği konsol yüzeyleri.
- Sağ tarafta top mekanizması ve doldurucu için açık çalışma alanı.

Ekran yüzeyini ayrı bir nesne ve ayrı bir material slot olarak hazırla: ID_MainDisplay_Surface. Üzerine arayüz, yazı veya sahte kamera görüntüsü işleme; görüntü oyun motorundan gelecek.

Sağdaki mekanizma için yaklaşık x=0.55..1.25, y=0.20..1.65, z=0.65..1.65 bölgesini dolu konsol geometrisiyle kapatma. Yerleşimi göz referansından kontrol et.

KALİTE VE TESLİM
Kaliteyi iyi oranlar, siluet, kontrollü bevel ve düzgün yüzey normalleriyle sağla. Çok küçük vidaları, kabloları, düğmeleri ve ızgaraları tek tek modelleme; bunlar kodla eklenecek.
Gerçek kalınlığı olan paneller oluştur. Görünmeyen dış yüzeyleri gereksiz detaylandırma.
PBR malzemeler glTF ile uyumlu olsun; bake edilmemiş prosedürel shader bağımlılığı bırakma.
Nesne adları İngilizce ve ID_ önekli olsun.
Yalnızca ilgili koleksiyonu cockpit.blend ve cockpit.glb olarak proje içindeki uygun varlık klasörüne kaydet; mevcut dosyaların üzerine yazma.
Önden sürüş görünümü ve sağ mekanizma alanını gösteren iki önizleme hazırla. Sonuçta dosya yollarını, üçgen sayısını ve varsa eksik işleri belirt.

### 2. İki kumanda kolu

Blender MCP kullanarak IRON DUST tank kabini için iki yüksek kaliteli modern sürüş kumandası modelle. Oyun kodu yazma.

Önce sahneyi ve varsa kabin modelini incele. Mevcut nesneleri değiştirme. ID_DriveControls adlı ayrı koleksiyonda çalış.

GÖRSEL DİL
Modern, kurgusal Industrial Low Poly. Koyu metal taban, kauçuk tutamaklar, sınırlı açık renk işaretler. Gerçek tank direksiyonu veya klasik uzun palet kolları yapma.
Koltuğun iki yanında kullanılabilecek kısa, güçlü ve ergonomik iki kumanda tasarla. Sol ve sağ bir aileye ait görünsün; küçük işlevsel farklılıkları olabilir.
Kaliteyi tutamak biçimi, parmak boşlukları, bağlantılar ve mafsal tasarımıyla oluştur.

KOORDİNATLAR
Metre kullan; +Y ileri, +X sağ, +Z yukarı.
Göz referansı (0, 0, 1.35).
Kumanda mafsalları için başlangıç konumları:
Sol: (-0.46, 0.28, 0.82)
Sağ: (0.46, 0.28, 0.82)
Her kumandanın tabandan toplam yüksekliği yaklaşık 0.28 metre.
Mevcut kabin varsa yerleşimi ona uyarla.

YAPI
Her kumandada sabit taban, hareketli mafsal ve tutamak ayrı nesneler olsun.
Sol ve sağ için birer root Empty oluştur.
Hareketli kolun pivotunu gerçek mafsal merkezine yerleştir. İleri ve geri eğilmesi mümkün olsun.
Nötr konumu temiz bırak. Geometriyi nötr durumda teslim et.
Düğmelerin takılacağı yüzeyleri tasarla; küçük düğmeleri, yazıları ve gösterge ışıklarını modelleme.

KALİTE VE TESLİM
Yakın görüşte iyi görünen bevel ve normaller kullan. Silueti bozmayan yerlerde gereksiz geometri oluşturma.
glTF uyumlu PBR malzemeler kullan.
Hiyerarşiyi ID_LeftControl_Root ve ID_RightControl_Root altında açık adlarla kur.
Yalnızca ilgili koleksiyonu drive-controls.blend ve drive-controls.glb olarak kaydet; mevcut dosyaların üzerine yazma.
İki kumandanın birlikte görünümünü ve bir tutamağın yakın planını hazırla.
Dosya yollarını, üçgen sayısını ve oyun içinde hangi nesnelerin hangi eksende döndürüleceğini belirt.

### 3. Topun iç mekanizması

Blender MCP kullanarak IRON DUST için tankın kabinden görünen top arka mekanizmasını modelle. Bu, kurgu bir oyun varlığıdır; görsel olarak anlaşılır bir ateşleme ve kovan çıkarma animasyonuna hazırlanmalıdır. Oyun kodu yazma.

Önce mevcut sahneyi incele. Kullanıcı nesnelerini koru. ID_GunMechanism adlı ayrı koleksiyonda çalış.

GÖRSEL DİL
Modern Industrial Low Poly. Ağır metal kütleler, güçlü taşıyıcılar, işlenmiş metal raylar ve koyu koruyucu kapaklar.
Mekanizma oyuncunun sağında, yakından izlenebilen ana görsel unsur olacak.
Gerçek bir silahın üretim ayrıntılarını kopyalamak yerine özgün, görsel olarak tutarlı bir kurgu mekanizması tasarla.

KOORDİNATLAR VE BAĞLANTILAR
Metre; +Y ileri, +X sağ, +Z yukarı.
Oyuncunun göz referansı (0, 0, 1.35).
Topun ekseni +Y yönünde olsun.
Başlangıç top ekseni: x=0.90, z=1.22.
Mühimmatın arkadan ileri sürüleceği yükleme referansı yaklaşık (0.90, 0.65, 1.22).
Bu noktaya ID_AmmoLoadSocket adlı Empty koy.
Tam dış namluyu modelleme; kabinde görünen arka mekanizma ve kısa bağlantı bölümü yeterli.

AYRI HAREKETLİ PARÇALAR
- Sabit taşıyıcı gövde.
- +Y/-Y boyunca kayabilecek geri tepme grubu.
- Açılıp kapanabilecek sürgü.
- Kovan çıkarma hareketini görsel olarak anlatan parça.
- Sağdan veya aşağıdan kovan çıkışına izin veren açıklık.

Doldurucu için arkada erişilebilir bir yükleme yolu bırak.
Kovanın kabinin sağına ve aşağıdaki toplama haznesine yönlenebileceği bir çıkış tasarla.
ID_CasingEjectSocket adlı Empty ile çıkış noktasını ve yönünü belirt.
Hareketli parçaların origin ve hiyerarşileri animasyona uygun olsun.
Mekanizma hareket ederken sabit gövdenin içinden geçmesin.

KALİTE VE TESLİM
Yakın planda okunabilir siluet, gerçek parça kalınlıkları ve kontrollü yüzey detayları oluştur.
Minik vida, kablo ve yazılarla uğraşma.
glTF uyumlu PBR malzemeler kullan.
Yükleme, sürgü açılması ve geri tepme pozlarını Blender içinde geçici olarak kontrol et; nihai dışa aktarımı temiz nötr pozda yap.
Yalnızca ilgili koleksiyonu gun-mechanism.blend ve gun-mechanism.glb olarak kaydet; mevcut dosyaların üzerine yazma.
Oyuncunun gözünden bir önizleme ve mekanizmanın açık durumunu gösteren bir önizleme hazırla.
Dosya yollarını, hareketli nesneleri, hareket eksenlerini ve kullandığın hareket sınırlarını belirt.

### 4. Otomatik doldurucu

Blender MCP kullanarak IRON DUST tank kabini için yüksek kaliteli, çalışması görsel olarak anlaşılabilen bir otomatik mühimmat doldurucu modelle. Oyun kodu yazma.

Önce varsa cockpit ve gun-mechanism varlıklarını incele. Özellikle ID_AmmoLoadSocket konumunu esas al. Mevcut nesneleri değiştirme. ID_Autoloader adlı ayrı koleksiyonda çalış.

GÖRSEL DİL
Modern, kurgusal Industrial Low Poly.
Oyuncu sağa baktığında mühimmatın taşınmasını ve topa sürülmesini görebilmeli.
Ağır ve endüstriyel bir mekanizma tasarla. Gereksiz robot kolları ve süs parçaları ekleme.
Ana hareketler açıkta görülsün; taşıyıcı yapı sağlam ve inandırıcı olsun.

KOORDİNATLAR
Metre; +Y ileri, +X sağ, +Z yukarı.
Oyuncu gözü (0, 0, 1.35).
Varsayılan yükleme noktası (0.90, 0.65, 1.22); mühimmat topa +Y yönünde ilerler.
Mevcut top modelindeki socket farklıysa onu esas al.

YAPI
- Az sayıda mühimmat yuvası içeren kompakt bir besleme rafı.
- Bir mühimmatı yükleme eksenine taşıyan hareketli yatak.
- Yatağın hareket ettiği taşıyıcı veya ray.
- Mühimmatı +Y yönünde topa süren ayrı itici.
- Sabit taşıyıcı iskelet ve gerekli büyük koruyucu paneller.

Görsel hareket sırası:
1. Taşıma yatağı raftan bir mühimmat alır.
2. Yatak topun yükleme eksenine hizalanır.
3. İtici mühimmatı topa sürer.
4. İtici ve taşıma yatağı başlangıç konumuna döner.

Bu sırayı gerçekleştirebilecek basit bir mekanik düzen seç.
Bütün hareketli parçaları ayrı nesneler yap; origin ve parent ilişkilerini doğru kur.
Mühimmatın taşınacağı yere ID_AmmoCarrierSocket adlı Empty ekle.
Son mühimmat modeli ayrı hazırlanacak. Boyut kontrolü için yaklaşık 0.78 metre uzunluk ve 0.12 metre azami çapta geçici bir mühimmat kullan; geçici nesneyi açıkça adlandır ve final GLB'ye dahil etme.

KALİTE VE TESLİM
Topun geri tepme alanını, kovan çıkışını ve oyuncunun ana ekran görüşünü engelleme.
Hareketin ara konumlarında parça çakışmalarını kontrol et.
Ayrıntıyı ana eklemler, yatak ve itici üzerinde yoğunlaştır. Küçük kablo, vida ve ışıkları modelleme.
glTF uyumlu PBR malzemeler kullan.
Yalnızca ilgili koleksiyonu autoloader.blend ve autoloader.glb olarak kaydet; mevcut dosyaların üzerine yazma.
Başlangıç ve yükleme konumlarını gösteren önizlemeler hazırla.
Dosya yollarını, hareketli nesneleri, hareket sırasını ve eksenlerini belirt.

### 5. Mühimmat ve boş kovan

Blender MCP kullanarak IRON DUST için bir dolu tank mühimmatı ve ona ait boş kovan modelle. Yakın planda doldurma ve kovan atma sahnelerinde kullanılacaklar. Oyun kodu yazma.

Önce varsa top mekanizması ve doldurucu modellerini incele. Mühimmat boyutunu onların yuvasına uyarla. Mevcut nesneleri değiştirme. ID_Ammunition adlı ayrı koleksiyonda çalış.

GÖRSEL DİL
Modern, kurgusal Industrial Low Poly.
Dolu mühimmat: koyu metal mermi bölümü ve kontrollü pirinç/çelik tonlarında kovan.
Boş kovan: dolu mühimmatla aynı taban ve gövde ölçülerine sahip, ağzı açık ve içi görülebilir.
Yoğun süsleme, gerçek marka veya gerçek mühimmat işaretleri kullanma.
Kaliteyi siluet, metal yüzeyler, taban detayı ve kovan ağzının kalınlığıyla sağla.
