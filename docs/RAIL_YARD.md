# Kül Vadisi — terk edilmiş tren sahası

2026-10-29 tarihinde kullanıcı sağ uzantı için terk edilmiş tren sahasını, bakım deposunu ve devrilmiş yükleme vincini seçip uygulamayı onayladı. Önceki doğu taş ocağı teması bu bölümde tren sahasıyla değiştirildi; ana doğu yolu korunur.

## Yerleşim

- x=244…344, z=−80…80: 100 × 160 m saha; ortak görsel/fizik yüzeyi −4 m'de düzlenir, dış kenar 14 m'de araziye karışır.
- Ana yoldan gelen 48 m uzunluğunda giriş rampası; ortasında 14 m genişliğinde düz geçiş bandı.
- x=260/284/308: üç paralel yük hattı. Fabrikanın doğu kenarından ilk hatta dekoratif ray bağlantısı.
- Yedi 16 m yük vagonu: dört kapalı, üç açık; biri raydan hafif çıkmış. Yan kapılar, nervürler, şasiler, tekerlekler ve kuplörler mevcut.
- Doğuda 14 × 22 m kapalı bakım deposu: eğimli çatı, sürgülü kapı, üst pencereler ve sundurma.
- Kuzeydoğuda devrilmiş yükleme vinci: eğik kabin, kafes bom ve yerde kanca.
- z=−5…5 enine geçişi ve vagonlar arasındaki uzun yollar açık. Kayalar/ağaçlar saha çevresinde en az 10 m payla dışarı alınır.

Kaynaklar: `src/game/world/kulRailYardLayout.ts` ve `createKulRailYard.ts`. Bu proje için özgün prosedürel low-poly geometri; dış model/doku veya yeni bağımlılık yok. Ayrı Blender/GLB teslimi değildir. Raylar ve küçük ayrıntılar dekoratiftir; vagonlar, depo ve vinç statik sert siperdir. Tren hareketi, iç mekân ve yapı yıkımı yok.

Geometri sekiz mat materyal grubunda birleştirilir: 8 çizim mesh'i, 15.392 üçgen ve 25 basit statik çarpışma gövdesi. Bunlar nesne sayılarıdır; GPU/FPS ölçümü değildir. Açık vagonların tepesinde görünmez tavan yok. Sahne kapanışında geometri, materyaller ve fizik gövdeleri temizlenir.

## Kullanım ve doğrulama

Kül Vadisi'nde harita menüsündeki **Tren sahasına bak** düğmesi alanı gösterir. Taktik krokiye raylar, vagonlar ve depo işlendi.

`node --experimental-strip-types scripts/check-kul-rail-yard.ts`: Havok ile sert siper/mermi davranışı, açık vagon boşluğu, yol açıklığı ve iki kur/kapat çevrimi. `node --experimental-strip-types scripts/check-kul-vadisi.ts`: tüm haritada gerçek GLB/Havok ile iki tankın giriş rampası ve iki uzun vagon koridorunu her iki yönde sürmesi (12 yeni sürüş), mevcut rotalar ve arazi/fizik eşleşmesi. `--export` seçeneği görsel inceleme için geometriyi `/tmp/d3-rail-yard-geometry.json` dosyasına çıkarır.

[Genel görünüm](previews/rail-yard-overview.png) ve [vinç/yakın görünüm](previews/rail-yard-crane.png), oyunda üretilen gerçek mesh'lerin Blender 5.2 Cycles ile çevrimdışı render'ıdır. Oyunun ışık/sis/gölge sonucu veya tarayıcı ekran görüntüsü değildir. Tarayıcı erişim sunucusu kullanılamadığından etkileşimli kamera/sürüş hissi, GPU performansı ve insan görsel kabulü açık; K2/M1/M2/M3 tamamlandı sayılmaz.
