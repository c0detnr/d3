# IRON DUST

**Çalışma adı • Web 3D Tank Combat**

Modern kurgusal tankları, mekanik derinliği ve erişilebilir kontrolleri özgün bir sinematik low-poly dünyada birleştiren masaüstü tarayıcı oyunu.

Temel ilke: **Grafikler sade olacak; tank onlarca tonluk zırhlı bir araç gibi hareket edecek.** Birebir simülasyon yerine eğlence ve gerçekçilik arasında bilinçli bir denge hedeflenir.

## Güncel durum

Uygulama geliştirmeye geçildi. Doğal arazi, ileride sıklaşan orman ve bağımsız harita önizlemesi mevcut. İlk sürüş prototipi mevcut; son tarayıcı kabulü ve sürüş hissi değerlendirmesi açık. Blender tank dosyaları `assets/tanks/iron_dust_01/` altında; önizleme gerçek GLB modelini metre ölçeğinde, zemine hizalı yükler.

İlk teslim tek tankla küçük bir haritada serbest sürüş olacak. Sonraki teslim sabit hedeflerle atış ve temel hasarı ekleyerek savaş mekaniklerini içeren vertical slice oluşturacak. M3.1 çekirdeği uygulandı: gerçek namlu ağzından AP atışı, süpürülmüş isabet, mesafe/açıya bağlı delme, sekme, üç sabit zırhlı hedef, nişancı görüşü ve görsel geri bildirim. Hasar, modül hasarı, HE, düşman AI ve savaş sesleri henüz yok; tarayıcı kabulü açık.

İlk özgün tank Blender MCP ile üretildi: [Blender kaynağı](assets/tanks/iron_dust_01/iron_dust_01.blend) · [GLB](assets/tanks/iron_dust_01/iron_dust_01.glb) · [önizlemeler ve doğrulama](assets/tanks/iron_dust_01/README.md). Görünür geometri 14.512 üçgen; Babylon entegrasyonu ve ilk dinamik sürüş prototipi mevcut.

## Belge haritası

Özel GitHub deposu: [c0detnr/d3](https://github.com/c0detnr/d3). Ana dal `main` olarak kullanılır. Kaynak kod, belgeler, paket kilidi ve teslim edilen tank varlıkları izlenir; bağımlılıklar, derleme çıktıları ve yerel yedekler `.gitignore` ile dışarıda tutulur.

| Belge | İçerik |
|---|---|
| [AGENTS.md](AGENTS.md) | Projede çalışan ajanların kuralları |
| [Oyun tasarımı](docs/GAME_DESIGN.md) | Kimlik, oyuncu deneyimi ve kapsam |
| [Görsel yön](docs/ART_DIRECTION.md) | Palet, ışık, tank, çevre ve varlık standardı |
| [Hareket efektleri planı](docs/MOVEMENT_EFFECTS.md) | Palet/hız/dönüş tozu uygulaması; fren/iniş ve sonraki efektlerin planı |
| [Ses sistemi planı](docs/SOUND_DESIGN.md) | Prosedürel motor/palet/rüzgâr sesleri, savaş sesleri, mimari ve doğrulama |
| [Silah ve taret planı](docs/WEAPON_TURRET_PLAN.md) | Nişan/engel tutarlılığı, stabilizasyon, geri tepme ve ses; sonraki hasar kapsamı |
| [Tank modelleme standardı](docs/TANK_ASSET.md) | Blender parça hiyerarşisi, hareket hazırlığı, üçgen hedefi ve teslim önerisi |
| [Teknik mimari](docs/ARCHITECTURE.md) | Seçilen yığın, sistem sınırları ve fizik yaklaşımı |
| [Yol haritası](docs/ROADMAP.md) | M1 dünya → M2 sürüş → M3 savaş |
| [Doğrulama](docs/VALIDATION.md) | Kabul senaryoları ve performans ölçümü |
| [Kararlar](docs/DECISIONS.md) | Kesin kararlar, öneriler ve açık konular |

Başlangıç belgeleri görevinin kaydı: [task_plan.md](task_plan.md), [findings.md](findings.md), [progress.md](progress.md).

## Planlanan teknoloji

TypeScript · Babylon.js · Havok Physics · React · Tailwind CSS · Zustand · Vite. Model üretimi: Blender → glTF/GLB.

Kurulu paket sürümleri `package.json` ve kilit dosyasında sabittir. Genel oyun komutları altyapı çalışması kapsamında; aşağıdaki komutlar bağımsız harita önizlemesine aittir.

## Doğal arazi önizlemesi

`npm start` veya `npm run dev` ile başlatılır. Terminalde yazan yerel adresi tarayıcıda aç; ana sayfa test haritasına yönlendirir. Varsayılan port 5173 doluysa Vite bir sonraki boş portu kullanır. `npm run map:dev` doğrudan harita sayfasını açar.

320 × 320 m ayrıntılı arazi çevresinde ufka devam eden seyrek geometrili tepeler bulunur. Düz ve açık başlangıç alanından kıvrılan toprak patika ormana ilerler; çamlar, geniş yapraklı ağaçlar, kayalar ve kuru ot kümeleri çevreyi oluşturur. Akşam ışığı yerine kaotik fırtına atmosferi kullanılır: sürüklenen ve çalkalanan prosedürel bulut katmanları, sıcak ufuk parıltısı, ara ara uzak şimşek çakmaları, gölgeler ve uzaklık sisi. Gökyüzü kaynağı `src/game/world/SkyAtmosphere.ts`; bulutlar ve şimşek aydınlatması GPU shader'ında üretilir. Arazi, kayalar ve yakın ağaç gövdeleri statik Havok çarpışmasına sahiptir; uzaktaki orman görsel arka plandır. Arazi yüzeyi kodla üretilen albedo, normal ve ince detay dokularıyla kaplanır; 22 m'de bir dikişsiz tekrarlanan doku toprak rengi kümeleri, taş taneleri, ince çatlaklar ve kuru yaprak/dal artıkları içerir. Metre esaslıdır; farklı zemin tutuşları ve oynanabilir alan sınırları henüz uygulanmadı.

W ileri, S fren ve durduktan 0,25 saniye sonra geri; A/D palet farkıyla dönüş, Space güçlü fren, R tankı başlangıca döndürür. Fareyi sürükleyerek bakışı değiştir, tekerlekle mesafeyi ayarla. Sol tık ateşler; sağ tık basılı tutunca nişancı görüşü açılır ve sağ tık sürüklemesi nişanı yönlendirir. Hareketliyken kamera son fare hareketinden 1,5 saniye sonra arkaya toparlanır. **Alanı göster** genel görünüşe geçer; **Başlangıca dön** tankı ve hızları sıfırlar.

- `npm test`: sabit zaman adımı, birikim sınırı, fren önceliği ve geri geçişi kontrolleri.
- `npm run effects:test`: toz temas/yük/hava kapıları, hız/geri/dönüş, 30/60/120 FPS eşitliği, 10 dakika simülasyon havuz sınırı ve gerçek Havok ile kaynak temizliği.
- `npm run audio:test`: motor/palet/rüzgâr eşleme sınırları, palet hızı/yön/dönüş, hava, model sıfırlama, ses grafiği kur/kapat ve kaynak temizliği.
- `npm run drive:test`: gerçek Havok ile süspansiyon, ileri/fren/geri, dönüş, 30/60/120 FPS eşitliği, rampa, tümsek, engel ve sıfırlama; sonuç `docs/driving-results.json`.
- `npm run tank:test`: gerçek GLB ile ölçek, zemin hizası, hiyerarşi, gizli çarpışma geometrisi ve kaynak temizliği.
- `npm run turret:test`: gerçek GLB üzerinde taret/namlu takibi, hız ve açı sınırları, eğimli gövde, interpolasyon ve kaynak temizliği.
- `npm run combat:test`: gerçek GLB namlu ağzı, dolum/geri tepme, mermi düşüşü ve süpürülmüş isabet, zırh açısı/mesafe delmesi, sekme ve sabit hedefler.
- `npm run map:check`: harita TypeScript kontrolü.
- `npm run map:test`: gerçek Havok ile arazi/görsel yüzey eşleşmesi, başlangıç açıklığı, orman/patika yerleşimi, ağaç çarpışması ve kaynak temizleme kontrolü.
- `npm run map:build`: `dist-map/` altında dağıtılabilir harita önizlemesi.

Harita kodla, tank Blender MCP ile bu projede üretildi; dış görsel varlık kullanılmadı. Havok bildirimi `public/licenses/HAVOK.txt` içinde ve derleme çıktısında korunur.

Son görünüm: [Gerçekçi arazi yüzeyi](docs/previews/terrain-surface.png). Önceki görünümler: [Kaotik fırtına gökyüzü](docs/previews/chaotic-sky.png), [Orman eşiği](docs/previews/forest-clearing.png). Çevre geometrisi ve zemin yüzey dokuları bu proje için kodla üretildi; dış model veya kaplama eklenmedi.

Sürüş ayarları `src/game/vehicle/VehicleDefinition.ts` içinde SI birimleriyle tutulur. Palet geometrisi korunur; yürüyen bant deseni geçici prosedürel görseldir. Palet temas, hızlı sürüş ve dönüş tozu mevcut; paneldeki **Toz efektleri** kutusuyla kapatılabilir. Motor, iki palet ve rüzgâr sesleri prosedürel Web Audio ile çalışıyor; paneldeki **Ses** kutusu ve düzey kaydırıcısıyla denetlenir. Ses yalnızca ilk kullanıcı etkileşiminde açılır; sekme gizlenince askıya alınır. S2 süspansiyon/fren/taret ve S3 savaş sesleri henüz yok; insan dinlemesi ve M2 kabulü açık. Geliştirme sunucusunda `/map-preview.html?driveTest`, isteğe bağlı 10 dakika otomatik gözlem aracını açar; bu insan sürüş hissi değerlendirmesinin yerini tutmaz.

## Taret ve ateş prototipi (M3.1)

Harita önizlemesinde fareyi sürükleyerek taret hedefini değiştir. Taret 35°/s hızla yetişir; namlu −8°…+20° arasında 15°/s hareket eder. Bunlar ilk oyun ayarlarıdır. Alt basılıyken sürükle veya C ile serbest bakışı aç/kapat: kamera dönerken son nişan hedefi korunur. R tankla birlikte tareti, silahı ve hedefleri sıfırlar.

Merkez artısı hedef yönünü, halka namlunun gerçek doğrultusunu gösterir. Turuncu halka 12 m içindeki fizik engelini belirtir. Nişan sırasında kamera kendiliğinden gövdenin arkasına dönmez. Genel görünüş yeni hedef vermez.

Sol tık tek 120 mm AP mermisi ateşler; 6,5 saniyelik dolum süresi HUD'da görünür. Mermi gerçek namlu ağzından çıkar, yerçekimiyle düşer ve her sabit adımda önceki→yeni konum arasında ışın sorgusu yaptığı için ince hedefleri atlamaz. Patikadaki üç sabit zırhlı hedefte gövde/kule ve ön/yan/üst yüzey kalınlıkları ayrıdır; sonuç mesafe ve geliş açısına göre `DELDİ`, `SEKTİ`, `DELMEDİ` veya `ENGEL` olarak raporlanır. 70° üzeri geliş açısı sekmedir. Mermi başına fizik gövdesi yoktur; hasar, modül hasarı ve hedef yıkılması bu adımda yoktur. Namlu alevi, tracer, isabet kıvılcımı ve duman görsel-only'dir; savaş sesi eklenmedi.

`npm run turret:test` gerçek GLB üzerinde dönüş/yükseliş, hedef takibi, eğimli gövde, interpolasyon, kare hızından bağımsızlık ve kaynak temizliğini kontrol eder. `npm run combat:test` dolum/geri tepme, balistik düşüş, tünelleme yokluğu, açı/mesafe delmesi, sekme ve hedef bölgelerini doğrular. Nişancı görüşü ve görsel efektlerin tarayıcı kabulü ile performans ölçümü açık; M1/M2 son kabulü sürüyor.
