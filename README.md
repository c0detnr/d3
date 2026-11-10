# IRON DUST

**Çalışma adı • Web 3D Tank Combat**

Modern kurgusal tankları, mekanik derinliği ve erişilebilir kontrolleri özgün bir sinematik low-poly dünyada birleştiren masaüstü tarayıcı oyunu.

Temel ilke: **Grafikler sade olacak; tank onlarca tonluk zırhlı bir araç gibi hareket edecek.** Birebir simülasyon yerine eğlence ve gerçekçilik arasında bilinçli bir denge hedeflenir.

## Güncel durum

**Sürüm: 0.1.0** · Git etiketi: `v0.1.0` · [Sürüm kapsamı ve nasıl sürümlenir?](docs/VERSIONING.md)

Uygulama geliştirmeye geçildi. Doğal arazi, ileride sıklaşan orman ve bağımsız harita önizlemesi mevcut. İlk sürüş prototipi mevcut; son tarayıcı kabulü ve sürüş hissi değerlendirmesi açık. İki özgün tankın Blender kaynakları ve GLB dosyaları `assets/tanks/` altında; önizlemede tank seçimi yapılabilir. `?duel=1` iki tankı aynı fizik dünyasında açan hasar testidir; kolay mod rakibi görüşte yaklaşır ve ateş eder.

İlk teslim tek tankla küçük bir haritada serbest sürüş olacak. M3.1 çekirdeği uygulandı: gerçek namlu ağzından AP atışı, süpürülmüş isabet, mesafe/açıya bağlı delme, sekme, üç sabit zırhlı hedef, nişancı görüşü ve görsel geri bildirim. Yerel iki tank düellosuna hasar, modül arızaları, HUD ve kolay mod rakip AI eklendi; HE ve genel oynanış kabulü açık.

İlk özgün tank Blender MCP ile üretildi: [Blender kaynağı](assets/tanks/iron_dust_01/iron_dust_01.blend) · [GLB](assets/tanks/iron_dust_01/iron_dust_01.glb) · [önizlemeler ve doğrulama](assets/tanks/iron_dust_01/README.md). Görünür geometri 14.512 üçgen; Babylon entegrasyonu ve ilk dinamik sürüş prototipi mevcut.

İlk kabin iç gövdesi ve ana konsol Blender MCP ile üretildi: [kaynak, GLB ve iki önizleme](assets/cockpit/iron_dust_cockpit_01/README.md). 16.732 üçgen; oyun entegrasyonu ve dış tank hacmine montaj doğrulaması açık.

## Hasar geri bildirimi

`map-preview.html?duel=1` kolay mod yerel tank düellosunu açar: diğer tank görüşte yaklaşır, gecikmeli nişan alır ve topuyla karşılık verir. İki taraf 100 canla başlar; top isabeti 25 hasar verir. LAN düellosunda iki oyuncu da gerçek bölgesel hasar alır: metal darbe efektleri ve sesleri, hasar yönü, araç şeması, palet/motor/kule arızası, duman ve imha yangını mevcuttur. `npm run damage:test` bölge ve hasar kurallarını kontrol eder. [Kapsam ve kontroller](docs/DAMAGE_FEEDBACK.md).

## Belge haritası

Özel GitHub deposu: [c0detnr/d3](https://github.com/c0detnr/d3). Ana dal `main` olarak kullanılır. Kaynak kod, belgeler, paket kilidi ve teslim edilen tank varlıkları izlenir; bağımlılıklar, derleme çıktıları ve yerel yedekler `.gitignore` ile dışarıda tutulur.

| Belge | İçerik |
|---|---|
| [AGENTS.md](AGENTS.md) | Projede çalışan ajanların kuralları |
| [Oyun tasarımı](docs/GAME_DESIGN.md) | Kimlik, oyuncu deneyimi ve kapsam |
| [Kül Vadisi harita ve model planı](docs/MAP_AND_MODEL_PLAN.md) | Onaylı 5’e 5 üs saldırısı, üç koridor, savunma zinciri ve Blender çevre planı; henüz uygulanmadı |
| [Görsel yön](docs/ART_DIRECTION.md) | Palet, ışık, tank, çevre ve varlık standardı |
| [Hasar ve isabet geri bildirimi](docs/DAMAGE_FEEDBACK.md) | Yerel hedef ve LAN hasarı, modüller, HUD, duman/yangın ve ses |
| [Sis mühimmatı ve loot](docs/SMOKE_SUPPLY.md) | Özgün envanter ikonu, Blender sandığı, F ile toplama, G ile sis perdesi; tarayıcı kabulü açık |
| [Top atışı geri bildirimi](docs/SHOT_FEEDBACK.md) | Yeni namlu hareketi, küçük kamera sarsıntısı, gaz/toz ve stereo top sesi; insan kabulü açık |
| [Hareket efektleri planı](docs/MOVEMENT_EFFECTS.md) | Palet/hız/dönüş tozu uygulaması; fren/iniş ve sonraki efektlerin planı |
| [Kamera, nişan ve atış yenileme planı](docs/AIM_AND_FIRE_REWORK.md) | Sağ tuşla sağ yan yakın kamera, bağımsız serbest bakış ve görünür balistik; henüz uygulanmadı |
| [Ses sistemi planı](docs/SOUND_DESIGN.md) | Prosedürel motor/palet/rüzgâr sesleri, savaş sesleri, mimari ve doğrulama |
| [Tank modelleme standardı](docs/TANK_ASSET.md) | Blender parça hiyerarşisi, hareket hazırlığı, üçgen hedefi ve teslim önerisi |
| [Oynanabilir ikinci tank planı](docs/SECOND_TANK_BLENDER_PLAN.md) | Kum beji tankın kaynak/GLB teslimi ve otomatik oyun kontrolleri mevcut; insan oynanabilirlik kabulü açık |
| [Makineli tüfek Blender planı](docs/MACHINE_GUN_ASSET_PLAN.md) | POV kameralı ikinci silahın yerleşimi, hareket grupları, modelleme sırası ve teslim kontrolleri |
| [Ukraynalı piyade modeli planı](docs/INFANTRY_MODEL_PLAN.md) | TPS piyadesinin modeli teslim edildi (Blender + GLB, 16,8 bin üçgen); iskelet/animasyon/silah sonraki adım, görsel kabul açık |
| [İçerik stüdyosu](docs/CONTENT_STUDIO.md) | `npm run studio`: canlı çekim, kare kare 1080×1920 MP4 render, Reels kameraları |
| [Teknik mimari](docs/ARCHITECTURE.md) | Seçilen yığın, sistem sınırları ve fizik yaklaşımı |
| [İlk tank düellosu planı](docs/COMBAT_DUEL_PLAN.md) | Yerel hasar, kolay mod AI ve LAN hasar entegrasyonu; son oynanış kabulü açık |
| [Yol haritası](docs/ROADMAP.md) | M1 dünya → M2 sürüş → M3 savaş |
| [Doğrulama](docs/VALIDATION.md) | Kabul senaryoları ve performans ölçümü |
| [Kararlar](docs/DECISIONS.md) | Kesin kararlar, öneriler ve açık konular |

Başlangıç belgeleri görevinin kaydı: [task_plan.md](task_plan.md), [findings.md](findings.md), [progress.md](progress.md).

## Planlanan teknoloji

TypeScript · Babylon.js · Havok Physics · React · Tailwind CSS · Zustand · Vite. Model üretimi: Blender → glTF/GLB.

Kurulu paket sürümleri `package.json` ve kilit dosyasında sabittir. Genel oyun komutları altyapı çalışması kapsamında; aşağıdaki komutlar bağımsız harita önizlemesine aittir.

## İçerik stüdyosu

`npm run studio` dikey (9:16) stüdyo modunu açar. Tankı sür, `K` ile çekim kaydet, `3`–`9` ile kamera değiştir, sonra panelden MP4 render al. Kareler 1080 × 1920 (isteğe bağlı 2× süper örnekleme) olarak tek tek çizilir ve `ffmpeg` ile `studio-out/renders/` altına yazılır. `ffmpeg` gerekir. Ayrıntılar ve sınırlar: [docs/CONTENT_STUDIO.md](docs/CONTENT_STUDIO.md).

## Doğal arazi önizlemesi

`npm start` veya `npm run dev` ile başlatılır. Terminalde yazan yerel adresi tarayıcıda aç; ana sayfa test haritasına yönlendirir. Varsayılan port 5173 doluysa Vite bir sonraki boş portu kullanır. `npm run map:dev` doğrudan harita sayfasını açar.

Harita sayfasındaki tank seçimi veya `?tank=02` ikinci tankı açar. `?duel=1` kolay mod yerel düelloyu açar; rakip görüşte yaklaşır, nişan alır ve karşı ateş eder. İki tank da 100 canla başlar; her top isabeti 25 hasar verir.

320 × 320 m ayrıntılı arazi çevresinde ufka devam eden seyrek geometrili tepeler bulunur. Düz ve açık başlangıç alanından kıvrılan toprak patika ormana ilerler; çamlar, geniş yapraklı ağaçlar, kayalar ve kuru ot kümeleri çevreyi oluşturur. Akşam ışığı yerine kaotik fırtına atmosferi kullanılır: sürüklenen ve çalkalanan prosedürel bulut katmanları, sıcak ufuk parıltısı, ara ara uzak şimşek çakmaları, gölgeler ve uzaklık sisi. Gökyüzü kaynağı `src/game/world/SkyAtmosphere.ts`; bulutlar ve şimşek aydınlatması GPU shader'ında üretilir. Arazi, kayalar ve yakın ağaç gövdeleri statik Havok çarpışmasına sahiptir; uzaktaki orman görsel arka plandır. Arazi yüzeyi kodla üretilen albedo, normal ve ince detay dokularıyla kaplanır; 22 m'de bir dikişsiz tekrarlanan doku toprak rengi kümeleri, taş taneleri, ince çatlaklar ve kuru yaprak/dal artıkları içerir. Metre esaslıdır; farklı zemin tutuşları ve oynanabilir alan sınırları henüz uygulanmadı.

W ileri, S fren ve durduktan 0,25 saniye sonra geri; A/D palet farkıyla dönüş, sol Shift güçlü fren, R tankı başlangıca döndürür. Oyuna tıklayınca fare kilitlenir; fare bakışı yönlendirir, taret ve namlu kamera ışınının hedefini kendi dönüş hızı ve açı sınırlarıyla sürekli takip eder. Q/E ve Space taret komutu vermez. Tekerlek üçüncü şahısta kamera mesafesini, sağ tık basılıyken nişancı görüşünün zoom seviyesini ayarlar. Sol tık ateşler. Esc fare kilidini bırakır ve taret takibini durdurur; `0` serbest uçuşta da takip kapalıdır. Dokunmatik nişan kontrolleri korunur. **Alanı göster** genel görünüşe geçer; **Başlangıca dön** tankı ve hızları sıfırlar.

- `npm test`: sabit zaman adımı, birikim sınırı, fren önceliği ve geri geçişi kontrolleri.
- `npm run effects:test`: toz temas/yük/hava kapıları, hız/geri/dönüş, 30/60/120 FPS eşitliği, 10 dakika simülasyon havuz sınırı ve gerçek Havok ile kaynak temizliği.
- `npm run audio:test`: motor/palet/rüzgâr eşleme sınırları, palet hızı/yön/dönüş, hava, model sıfırlama, ses grafiği kur/kapat ve kaynak temizliği.
- `npm run drive:test`: gerçek Havok ile süspansiyon, ileri/fren/geri, dönüş, 30/60/120 FPS eşitliği, rampa, tümsek, engel ve sıfırlama; sonuç `docs/driving-results.json`.
- `npm run tank:test`: gerçek GLB ile ölçek, zemin hizası, hiyerarşi, gizli çarpışma geometrisi ve kaynak temizliği.
- `npm run turret:test`: gerçek GLB üzerinde taret/namlu takibi, hız ve açı sınırları, eğimli gövde, interpolasyon ve kaynak temizliği.
- `npm run combat:test`: gerçek GLB namlu ağzı, dolum/geri tepme, mermi düşüşü ve süpürülmüş isabet, zırh açısı/mesafe delmesi, sekme ve sabit hedefler.
- `npm run map:check`: harita TypeScript kontrolü.
- `npm run map:test`: gerçek Havok ile arazi/görsel yüzey eşleşmesi, başlangıç açıklığı, orman/patika yerleşimi, ağaç çarpışması ve kaynak temizleme kontrolü.
- `npm run world:render:test`: Kül Vadisi doğa modellerinde ortak çizim kaynakları, statik instance ve iki kur/kapat çevriminde kaynak temizliği; GPU/FPS ölçümü değildir.
- `npm run map:build`: `dist-map/` altında dağıtılabilir harita önizlemesi.

Harita kodla, tank Blender MCP ile bu projede üretildi. Palet tozu için CC0 lisanslı [Brackeys VFX Bundle](assets/vfx/brackeys/README.md) dokusu kullanılır. Havok bildirimi `public/licenses/HAVOK.txt` içinde ve derleme çıktısında korunur.

Son görünüm: [Gerçekçi arazi yüzeyi](docs/previews/terrain-surface.png). Önceki görünümler: [Kaotik fırtına gökyüzü](docs/previews/chaotic-sky.png), [Orman eşiği](docs/previews/forest-clearing.png). Çevre geometrisi ve zemin yüzey dokuları bu proje için kodla üretildi; dış model veya kaplama eklenmedi.

Sürüş ayarları `src/game/vehicle/VehicleDefinition.ts` içinde SI birimleriyle tutulur. Palet geometrisi korunur; yürüyen bant deseni geçici prosedürel görseldir. Palet temas, hızlı sürüş ve dönüş tozu mevcut; paneldeki **Toz efektleri** kutusuyla kapatılabilir. Motor, iki palet ve rüzgâr sesleri prosedürel Web Audio ile çalışıyor; paneldeki **Ses** kutusu ve düzey kaydırıcısıyla denetlenir. Ses yalnızca ilk kullanıcı etkileşiminde açılır; sekme gizlenince askıya alınır. S2 süspansiyon/fren/taret ve S3 savaş sesleri henüz yok; insan dinlemesi ve M2 kabulü açık. Geliştirme sunucusunda `/map-preview.html?driveTest`, isteğe bağlı 10 dakika otomatik gözlem aracını açar; bu insan sürüş hissi değerlendirmesinin yerini tutmaz.

## Taret ve ateş prototipi (M3.1)

Harita önizlemesinde fareyi sürükleyerek taret hedefini değiştir. Taret 35°/s hızla yetişir; namlu −8°…+20° arasında 15°/s hareket eder. Bunlar ilk oyun ayarlarıdır. Alt basılıyken sürükle veya C ile serbest bakışı aç/kapat: kamera dönerken son nişan hedefi korunur. R tankla birlikte tareti, silahı ve hedefleri sıfırlar.

Merkez artısı hedef yönünü, halka namlunun gerçek doğrultusunu gösterir. Turuncu halka 12 m içindeki fizik engelini belirtir. Nişan sırasında kamera kendiliğinden gövdenin arkasına dönmez. Genel görünüş yeni hedef vermez.

Sol tık tek 120 mm AP mermisi ateşler; 6,5 saniyelik dolum süresi HUD'da görünür. Mermi gerçek namlu ağzından çıkar, yerçekimiyle düşer ve her sabit adımda önceki→yeni konum arasında ışın sorgusu yaptığı için ince hedefleri atlamaz. Patikadaki üç sabit zırhlı hedefte gövde/kule ve ön/yan/üst yüzey kalınlıkları ayrıdır; sonuç mesafe ve geliş açısına göre `DELDİ`, `SEKTİ`, `DELMEDİ` veya `ENGEL` olarak raporlanır. 70° üzeri geliş açısı sekmedir. Mermi başına fizik gövdesi yoktur; hasar, modül hasarı ve hedef yıkılması bu adımda yoktur. Namlu alevi, tracer, isabet kıvılcımı ve duman görsel-only'dir; savaş sesi eklenmedi.

`npm run turret:test` gerçek GLB üzerinde dönüş/yükseliş, hedef takibi, eğimli gövde, interpolasyon, kare hızından bağımsızlık ve kaynak temizliğini kontrol eder. `npm run combat:test` dolum/geri tepme, balistik düşüş, tünelleme yokluğu, açı/mesafe delmesi, sekme ve hedef bölgelerini doğrular. Nişancı görüşü ve görsel efektlerin tarayıcı kabulü ile performans ölçümü açık; M1/M2 son kabulü sürüyor.

## Makineli tüfek (MG 02)

**2**: tüfek POV kamerası, **fare**: nişan, **sol tuş basılı**: seri ateş, **1**: normal tank moduna dönüş. WASD ile sürüş POV sırasında devam eder. MG 02 kuleye bağlıdır; kuleye göre yatay ±60°, yükseliş −10°…+45° ile sınırlıdır. Namlu halkası gerçek namlu doğrultusunu ve yakın engeli gösterir. Mod değişimi, Esc, odak kaybı ve sıfırlama ateşi keser.

`npm run mg:test`: gerçek GLB montajı/eksenleri, kamera/geri tepme ayrımı, açı sınırları, 30/60/120 FPS seri ateş eşitliği, yakın engel ve kaynak temizliği. Deneme ayarları 600 atım/dakika, 320 m/s; kısa tracer, küçük namlu alevi ve prosedürel ateş sesi vardır. Hasar, mühimmat sınırı ve ısınma uygulanmadı. [Oyun içi POV](docs/previews/machine-gun-pov.png).

## Android APK ve dokunmatik kontrol

Android APK desteği 2026-11-05 tarihinde kaldırıldı; Android projesi ve APK derleme komutu artık yoktur. Tarayıcıdaki dokunmatik kontroller (`TouchControls`) korunur. `npm run touch:test` çoklu dokunma ve girdi temizliğini kontrol eder. [Kaldırılma notu ve kontroller](docs/ANDROID.md).

## Taktik oyun arayüzü

İnce pusula, ayrı bakış/namlu işaretleri, dolum geri sayımı, gövde/kule yönü ve km/sa hızı, ana top/MG seçimi ana sahne ve LAN görünümünde mevcut. [HUD davranışı, gerçek oyun görüntüsü ve kontroller](docs/TACTICAL_HUD.md). Fiziksel telefon ve insan görsel kabulü açık.

## Masaüstü fare kilidi

Oyun alanına veya **OYUNA GİR** düğmesine tıkla: imleç gizlenir ve oyun alanına kilitlenir. Fareyi sürüklemeden kamerayı yönlendirebilirsin. İlk giriş tıklaması ateş etmez. **Esc** fareyi serbest bırakır; yeniden tıklayarak devam edebilirsin. Kilit kaybında sürüş, nişan ve ateş girdileri temizlenir. Ana oyun ve LAN sayfasında geçerlidir; dokunmatik kontroller değişmez. `combat:test` fare kilidi ve odak kontrollerini de çalıştırır.

Haritada `0` ile serbest uçuş kamerasına geçip önceki görüşe dönebilirsin. `W/A/S/D` hareket, `Q/E` alçal/yüksel, `Shift` hızlan; fare bakışı yönlendirir. Serbest kamerada tank sürüşü ve silah girdileri kapatılır. Kamera kontrolü: `node --experimental-strip-types scripts/check-free-camera.ts`.

## Kül Vadisi — ilk kaba harita

`/map-preview.html?map=kul` iki üs, üç koridor ve iki dere bağlantısını gerçek tankla açar. Sağdaki harita seçimiyle sürüş test sahasına dönülebilir; kuşbakışı ve A/B başlangıç seçimi mevcut. Yapılar geçici sert siper hacimleridir. [Ölçüler, sürüş sonuçları ve açık kabul](docs/KUL_VADISI_BLOCKOUT.md). Yeni harita kontrolü: `node --experimental-strip-types scripts/check-kul-vadisi.ts`.

Kül Vadisi merkez fabrikasında gerçek Blender hangarı ve atölyesi yer alır; sağdaki **Fabrikaya bak** düğmesi ikisini yakından gösterir. Kapalı binalar statik sert siperdir. [Yerleşim, kontroller ve oyun görüntüsü](docs/KUL_VADISI_BLOCKOUT.md#b1--hangar-ve-atölye-entegrasyonu).

Kül Vadisi merkezinde açık arazi siperleri, beton/kaya mevzileri ve seyrek çevre ayrıntıları mevcut. **Savaş alanına bak** düğmesi merkezi gösterir. [Yerleşim ve sonraki asset planı](docs/CENTER_BATTLEFIELD.md).

Kül Vadisi batı sırtında hazır ağaç grupları, doğudaki taş ocağında iri kayalar ve dere kıyılarında bitki/çakıl kümeleri bulunur. [Doğa yerleşimi ve doğrulama](docs/CENTER_BATTLEFIELD.md#2026-10-28--hazır-doğa-setiyle-harita-zenginleştirme).

İlk özgün [hasarlı beton mevzi](assets/environment/concrete_emplacement_01/README.md) Blender MCP ile üretildi; GLB/çarpışma doğrulandı, oyun yerleşimi henüz yapılmadı.

Kül Vadisi sağ/doğu uzantısında terk edilmiş tren sahası yer alır: üç ray, yedi yük vagonu, bakım deposu ve devrilmiş vinç. **Tren sahasına bak** düğmesi alanı gösterir. [Yerleşim, kaynaklar ve doğrulama](docs/RAIL_YARD.md).


## 5’e 5 takım düellosu

`map-preview.html?map=kul&duel=5v5`: sen + 4 dost AI, karşıda 5 düşman AI. İki takım kendi üssünde doğar; koridor rotaları, görüşe bağlı hedef/atış, dost ateşi koruması, yaşayan araç sayısı, sonuç ve R ile tüm maçı sıfırlama mevcut. Görev menüsünden **5’e 5 · Takım düellosu** seçilebilir. [Kurallar, AI ve doğrulama sınırları](docs/TEAM_DUEL.md).

### itch.io oyun kabuğu

`npm run build:itch` menülü tek oyunculu girişini göreli yollarla `dist/` içine üretir. **ZIP'in kökünde `index.html` olacak şekilde `dist/` içeriğini** paketle; itch.io projesinde HTML oyun ve masaüstü klavye/fare olarak yükle. LAN sayfası ve APK bu girişe dahil değildir. `npm run map:dev` ile `/` oyun menüsü, `/map-preview.html` geliştirici önizlemesidir. Mevcut LAN komutları `dist-map/` kullanmayı sürdürür.

Görev seçimi beş görevi gösterir; yalnız Çaylak Günü açılır. Bu teslim oyun kabuğudur: brifingdeki amaçlar henüz görev mantığına bağlı değildir. Ayarlar (TR/EN, hassasiyet, ters Y, ana ses, grafik) ve en iyi yıldızlar `iron-dust.player.v1` anahtarında saklanır; engelli/bozuk kayıt oyunu durdurmaz. Düşük kalite gölge ve palet tozunu kapatır, kozmetik parçacıkları azaltır, çözünürlük ölçeğini düşürür; oynanışa etki eden sis görünürlüğü korunur. Orta/yüksek kalite gölge, kozmetik parçacık bütçesi ve çözünürlükte ayrılır.

Esc ve fare kilidinin bırakılması simülasyonu/girdiyi durdurur; Devam kullanıcı tıklamasıyla fare kilidini geri ister. Yeniden başlatma ve görevlere dönüş önce mevcut sahneyi, motoru, ses grafiğini ve dinleyicileri kapatır. Gelecek görev sistemi `useShellStore.getState().finishMission({ missionId, victory, seconds, shots, hits, stars })` çağrısıyla sonuç ekranına geçer. En iyi yıldız korunur; 2–5 bu sürümde kayıt verisinden bağımsız kilitli kalır.

`npm run shell:test` sözlük anahtar eşitliği, sürümlü kayıt/bozuk kayıt/erişim hatası ve sonuç ilerlemesini kontrol eder. Alt dizin tarayıcı kontrolü için `dist/` klasörünü bir statik sunucunun `/game/` altına koy; `SHELL_URL=http://127.0.0.1:18760/game/ node --experimental-strip-types scripts/check-shell-browser.ts` çalıştır. Ekran görüntüleri ve rapor `artifacts/ui/` altına yazılır (yerel, Git tarafından yok sayılır). Yazı tipi Barlow Condensed, Jeremy Tribby, SIL OFL 1.1; lisans `public/licenses/BARLOW.txt` ile pakete girer.

## Çaylak Günü — ilk görev

Ana menü → Görevler → Çaylak Günü → Brifing → Başla. Doğal arazide üç ışıklı kontrol noktası sırayla açılır; ardından üç **farklı** zırh hedefini vur ve pusudaki iki kolay keşif tankını yok et. Üstte amaç, hedef yönü/mesafesi ve alt köşede TR/EN yazılan telsiz konuşmaları bulunur. Telsiz oyunu durdurmaz; amaç onayı kısa animasyon ve ana ses düzeyine bağlı tonla verilir.

Zafer/yenilgi ekranı süre, isabet oranı ve toplam alınan hasarı gösterir. Yıldızlar: bitir / **6 dakikadan kısa** / **50 hasardan az**. Başarılı koşunun istatistikleri ve en yüksek yıldız kaydedilir; 2. görev **Açıldı · Yakında** olur, başlatılamaz. R tankı kurtarır; görev süresini, amaçları ve toplam alınan hasarı silmez. Yeniden başlat/Tekrar bütün görev sahnesini yeniden kurar.

- `npm run mission:test`: olay tabanlı durum geçişleri, sıralı kontrol noktaları, ayrı hedefler, terminal durum kilidi, yenilgi, süre amacı, yıldız sınırları, kayıt ve kilit açma. `npm test` içine dahildir.
- `node --experimental-strip-types scripts/check-mission-browser.ts`: çalışan geliştirme sunucusunda menü/brifing → amaçlar → zafer, yenilgi/Tekrar, beş tam yeniden başlatma, TR/EN ve kayıt yenilemesi. Varsayılan `http://127.0.0.1:18762/`; `MISSION_URL` ile değişir. Ekran görüntüleri ve rapor `artifacts/mission1/` altında.
- `node --experimental-strip-types scripts/check-mission-build-browser.ts`: `dist/` çıktısı `http://127.0.0.1:18763/game/` altında sunulurken üretim menü/brifing/HUD, alt dizin varlıkları ve DEV kancasının yokluğunu doğrular. Rapor `artifacts/mission1/production-check.json`.
- Test kancası `window.__missionTest` yalnız Vite **DEV** modunda açılır; dağıtım paketinde bulunmaz. `advance()` gerçek checkpoint mesafesi/hedef gövdesi/düşman hasarı yollarını kullanır; insan oynayışının yerine geçmez.

`src/game/mission/MissionDirector.ts` render/fizikten bağımsız görev çekirdeğidir: veri tanımlı checkpoint / N farklı hedef isabeti / N düşman imhası / süre adımları, brifing → aktif → zafer/yenilgi. `rookieDay.ts` ilk görevin verisi; `RookieMission.ts` mevcut ArmorRange, DuelTank ve EasyDuelAI adaptörüdür. Sonraki dört görevin içeriği henüz uygulanmadı. **İnsan oynanış, öğreticinin anlaşılabilirliği, telsiz/ses ve AI dengesi kabulü açık.**

## Geçici Cloudflare paylaşımı

`npm run map:build` sonrasında `python3 scripts/share-server.py` statik derlemeyi `127.0.0.1:18743` adresinde sunar. Paylaşımın kök adresi Kül Vadisi büyük savaş haritasını ve Leopard esintili IRON DUST 02'yi (`/map-preview.html?map=kul&tank=02`) açar; URL'de açıkça verilen seçimler korunur. Mevcut görev menüsü kaynakları değişmez.

Yerel sunucu `cloudflared tunnel --url http://127.0.0.1:18743 --protocol http2 --no-autoupdate` ile ücretsiz geçici bağlantıya açılır. Bu kalıcı hosting değildir; bilgisayar, internet, sunucu ve tünel açık kalmalıdır. Bu oturumun süreçleri `iron-dust-share-web.service` ve `iron-dust-share-tunnel.service` kullanıcı birimleridir. Durdurmak için `systemctl --user stop iron-dust-share-tunnel iron-dust-share-web` kullanılır. Statik yayın LAN sunucusunu içermez.
