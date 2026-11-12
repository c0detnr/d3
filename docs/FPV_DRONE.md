# FPV drone — ilk oynanabilir prototip

## Kesin kullanıcı kararları

Tankın üzerinden kalkış, yalnız drone kamerasından uçuş, fare destekli ASSIST ve manuel ACRO kontrolü. Kalkıştan sonra tanka erken dönüş yok. Tank geride durur ve hasar almaya devam eder. Tank imha edilse bile son uçuş sürer; drone da kaybedilince görev yenilgisi işlenir. Batarya veya uçuş süresi sınırı yoktur.

## Kontroller

- `B`: Kalkış öncesinde ASSIST / ACRO seçimi. Ekrandaki mod düğmesi de kullanılabilir.
- `V`: Kalkış. Ekrandaki FPV düğmesi de kullanılabilir.
- ASSIST: Fare bakış/yön; WASD hareket; Space yükselme, Ctrl alçalma; Q/E dönüş. WASD bırakılınca yatay fren otomatik uygulanır; yükselme/alçalma bırakılınca dikey hız da frenlenir. Tam hızdan yaklaşık 0,53 saniye / 1,95 metrede durur, ardından havada sabit kalır. Yükselirken veya bakış yönü değişirken de yatay fren çalışır; ayrı fren tuşu gerekmez.
- ACRO: W/S gövdeyi öne/arkaya yatırma; A/D yana yuvarlanma; Q/E dönüş; Space/Ctrl gaz artırma/azaltma. Gaz bırakılınca son değerde kalır; otomatik dengeleme ve irtifa tutma yoktur.
- Uçuş sırasında R, silah değiştirme, tank sürüş/ateş/sis ve serbest kamera kapalıdır. Esc uçuşu sonlandırmaz; görev kabuğunda duraklatır, bağımsız önizlemede fare kilidini bırakır.

## Ekran ve ses

Beyaz ölçüm yazıları, yapay ufuk, küçük merkez işareti, yer hızı, yerden irtifa, tank mesafesi, gaz yüzdesi, uçuş süresi ve mod. Batarya voltajı gaz yüküyle düşüp toparlanır; yüzde de kozmetiktir, enerji hesabı veya uçuş sınırı üretmez. `SÜRESİZ UÇUŞ` bunu açıklar. LQ, Kül Vadisi jammer alanlarından hesaplanan sinyal kalitesini 100–0 gösterir; tank mesafesi tek başına bağlantıyı kesmez. Bu bir gerçek RF yayılım simülasyonu değildir. Hafif tarama çizgileri ve gaza bağlı prosedürel pervane sesi vardır.

## Uygulama sınırları

- `src/game/drone/FpvFlight.ts`: metre/saniye/radyan, ortak 60 Hz sabit adım. ACRO, quaternion üzerinden gövde açısal hızları ve yerçekimine karşı yerel itki kullanır.
- `FpvDrone.ts`: kamera, giriş, geçici özgün low-poly dört pervaneli model, Havok tetikleyici gövde, hareket boyunca süpürülmüş çarpışma, ses ve kaynak temizliği.
- `FpvHud.ts` / `fpv.css`: sahnenin gerçek konum/hız/açı verileriyle OSD; React üzerinden yüksek frekanslı veri taşınmaz.
- Tank top mermileri drone tetikleyicisine çarparsa drone imha olur. Mevcut tank AI hedef seçimi değiştirilmedi; drone avlayan özel AI yoktur.
- İlk denge değeri: doğrudan çarpışma mevcut 25 HP tank hasarını kullanır; gerçek mühimmat modeli veya alan hasarı yoktur. Dost tanklar 5v5 takım kuralıyla korunur.
- Drone bitince tank sağlamsa kontrol geri döner ve yeniden kalkılabilir. Mühimmat sayısı/bekleme süresi eklenmedi. Bunlar yeni onaylı kararlar değil, prototip sınırlarıdır.
- 5v5 sonuç değerlendirmesi uçuş bitene kadar ertelenir; görev sisteminde tank ölümüne bağlı yenilgi ertelenir. Son çarpışma görev hedefini tamamlıyorsa mevcut zafer kuralı geçerlidir.
- Studio kayıt/yeniden oynatma ve ayrı LAN sayfası FPV kapsamına dahil değildir. Gamepad bu teslimde yoktur.
- Model kodla üretilmiş proje içi geçici varlıktır; harici model/doku/lisans bağımlılığı eklenmedi. Mevcut Blender kaynakları değiştirilmedi.

## Doğrulama

- `node --experimental-strip-types scripts/check-fpv.ts`: bir saatlik sınırsız uçuş, 30/60/120 FPS eşitliği, ASSIST tam hızdan 0,6 saniyede / 2,5 metreden kısa yatay duruş, yükselirken frenleme, dikey fren ve 10 saniye sürüklenmeden konum tutma; ACRO yatış/itki/yerçekimi, tekrarlı kalkış/bitiş korumaları.
- `node --experimental-strip-types scripts/check-fpv-browser.ts`: çalışan Vite sunucusu üzerinde gerçek kamera ve giriş, kontrol kilitleri, son uçuş ve çarpışma sonrası görev sonucu. Varsayılan URL `http://127.0.0.1:18765/`; `FPV_URL` ile değiştirilebilir. Kanıtlar git dışında `artifacts/fpv/` içine yazılır.
- `npm run map:build`, `npm run mission:test`.
- İnsan tarafından uçuş hissi, ses dengesi ve hasar dengesi kabulü ayrı tutulur.


## Kül Vadisi — jammer test kuleleri

- Üç özgün, kodla üretilmiş **geçici low-poly varlık**: kafes direk, üst anten/çanak ve yanıp sönen kırmızı emissive ışık. Harici varlık veya lisans bağımlılığı yoktur. Direkler, taban ve antenler statik Havok çarpışmasına sahiptir; tankı engeller ve mevcut drone süpürme sorgularına yakalanır. Tank kontrolü/sinyali etkilenmez.
- `src/game/world/jammerLayout.ts`: tüm yerleşimler ve etki parametreleri metre cinsindedir. `(x, z)` konumları `(-100, -140)`, `(125, 30)`, `(-115, 155)`; anten yüksekliği yerden 15 m. İki başlangıç noktası etki alanlarının dışındadır. Kuleler yalnız Kül Vadisi'nde kurulur.
- `signalQuality(dronePos, jammers)` dünya koordinatlarındaki anten merkezine **3B mesafeyi** kullanır. 120 m ve dışında kalite 1; 35 m ve içinde 0; arada doğrusal geçiş. Birden fazla alanda en düşük kalite geçerlidir. Arazi/görüş engeli RF hesabına katılmaz; minimap halkası dış yarıçapın yatay izdüşümüdür.
- Minimap: amber kule simgesi ve yarı saydam 120 m etki halkası. OSD: gerçek LQ, kaliteyle sönen dört çubuk, amber `JAMMING`, %35 altında `SİNYAL ZAYIF`, sıfırda kırmızı `SİNYAL KAYBI`; TR/EN karşılıkları ve önceki tüm sabit Türkçe FPV metinleri i18n dosyalarındadır.
- Video: yalnız bozulmada çalışan 320×180 canvas alıcısı, en fazla 20 Hz; kar/gürültü, satır yırtılması, RGB kanal kayması ve düşük sinyalde 0,12–0,30 s kısa kare donmaları. Sıfır kalitede sahne görüntüsü yerine tam ekran kar görünür. OSD okunabilir kalır. Yüksek çözünürlüklü CPU piksel okuması yapılmaz; gerçek cihaz FPS ölçümü yapılmadı.
- Ses: mevcut ses ana çıkışına bağlı prosedürel beyaz gürültü; kalite düştükçe cızırtı artar, pervane sesi kesilir. Sıfır kalitede drone kanalında yalnız statik kalır; tank/dünya ses ayarları korunur.
- Mekanik: kalite pozitifken ASSIST/ACRO girdileri tam çalışır. Kalite sıfırda **kesintisiz 0,5 s** kalınca aynı 60 Hz sabit adımda kontrol kalıcı kopar: fare/tuşlar yok sayılır, itki sıfırlanır, drone yerçekimiyle düşer. Kısa kesintiler birikmez. Alan dışına sürüklenmek kontrolü geri getirmez; sonraki kalkış alıcıyı sıfırlar. Zemin/nesne çarpışması mevcut drone kaybı, tank dönüşü ve son uçuş görev kurallarını çalıştırır.
- Sahne kapanışında kule Havok gövdeleri/mesh/malzemeleri/yanıp sönme gözlemcisi, video canvas/gözlemcisi ve yeni ses kaynağı/gain bağlantıları temizlenir. Ek dinleyici, post-process veya gerçek zamanlı nokta ışığı eklenmedi.

### Jammer doğrulaması

- `node --experimental-strip-types scripts/check-jammer.ts`: dış/iç sınırlar, monotonluk, çakışan alanlar, yükseklik, güvenli doğuşlar, ASSIST/ACRO'da 0,5 s kopma, tuş/fare etkisizliği, yerçekimiyle düşme, pozitif kalitede tam kontrol, kısa kesinti sıfırlama, yeniden kalkış, 30/60/120 FPS eşitliği; gerçek Havok anten/taban çarpışması ve iki kur/kapat çevriminde mesh/malzeme/gövde/gözlemci temizliği geçti.
- `npm run map:build`, `npm run mission:test`, `node --experimental-strip-types scripts/check-fpv.ts`, `node --experimental-strip-types scripts/check-minimap.ts` geçti. Derlemenin mevcut büyük paket uyarısı sürüyor.
- **Bu jammer tesliminde tarayıcı/görsel kontrolü yapılmadı.** Oyun içi kule görünürlüğü/yerleşim, minimap/OSD kadrajı, video bozulması ve sesin insan kabulü açık; gerçek GPU/FPS sonucu verilmez. Mevcut görev testleri ve sabit adım kontrolleri, uçtan uca tarayıcı kabulünün yerini tutmaz.
