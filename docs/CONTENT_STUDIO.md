# İçerik stüdyosu — Reels için dikey video

Oyun dünyasını ve tankları kullanarak Instagram Reels / TikTok / Shorts için **1080 × 1920 (9:16) MP4** üretir. Oyun kodu ve oyun modları değişmez; stüdyo, harita önizlemesinin `?studio=1` parametresiyle açılan ayrı bir moddur.

## Nasıl çalışır?

1. **Çekim (canlı):** Tankı normal şekilde sürersin. Her sabit fizik adımında (1/60 s) sürüş komutu, taret dönüşü/yükselişi, otomatik hizalama yönü ve top atışı kaydedilir. Kamera değişiklikleri adım numarasıyla "kurgu" olarak, oyun sesi ise WebM/Opus dosyası olarak saklanır.
2. **Render (çevrimdışı, kare kare):** Sahne sıfırlanır ve çekim aynı girdilerle tekrar oynatılır. Her kare tam simüle zamanla ilerler (`1 / (fps × ağır çekim)` s), 1080 × 1920 ya da 2160 × 3840 çözünürlükte çizilir ve ham RGBA olarak yerel geliştirme sunucusuna gönderilir. Sunucu kareleri doğrudan `ffmpeg`'e aktarır. Bilgisayar ne kadar yavaş olursa olsun video takılmaz; render yalnızca daha uzun sürer.
3. **Çıktı:** H.264 High, `yuv420p`, CRF 15, `preset slow`, `+faststart`. Normal hızda çekim sesi AAC 256 kb/s olarak eklenir.

Babylon parçacıkları ve animasyonları render sırasında motorun kare süresini okur. Bu yüzden render boyunca `engine.getDeltaTime()` simüle kare süresine sabitlenir ve ağır çekim parçacıkları da yavaşlatır.

## Kullanım

```bash
npm run studio
```

`ffmpeg` sistemde kurulu olmalıdır. Komut `map-preview.html?studio=1` sayfasını açar. Diğer parametreler de eklenebilir (ör. `&tank=02`, `&map=kul`). Çekimler yalnızca kaydedildikleri sahne parametreleriyle render edilir.

### Çekim sahası (`map=set`)

İçerik için ayrı, açık bir eğitim alanı: `map-preview.html?studio=1&map=set&tank=02&weather=sunset`. Şeritlerde aksesuar yoktur; yan (9 m), geçiş (5 m) ve yörünge (11 m) kameraları sahneye girmez. `weather` Kül Vadisi ile aynı ön ayarları kullanır (`storm`, `dawn`, `noon`, `sunset`, `night`).

| `spawn=` | Yer | Kullanım |
|---|---|---|
| `runway` (varsayılan) | 370 m düz pist, bariyerler ve 50 m direkleri | Hız, geçiş, takip, drone |
| `whoops` | Dalgalı tümsek şeridi (12 m aralık, 0,5 m) | Süspansiyon, stabilizasyon, namlu kamerası |
| `ridge` | 7 m yüksek sırt | Gökyüzüne karşı siluet, alçak kamera |
| `pad` | 30 m yarıçaplı beton alan | Yörünge, vinç, döner tanıtım |
| `range` | Pistin ucunda doğuya bakan atış noktası | Kurgusal hedef gövdelerine atış |

Kod: `src/game/world/filmSetLayout.ts` (yükseklik ve yerleşim), `src/game/world/createFilmSet.ts` (yüzey, aksesuar, çarpışma). Tüm aksesuarlar özgün, prosedürel low-poly geometridir; dış varlık yoktur.

### Otomatik çekim (`scripts/reel`)

Canlı sürüş gerekmeden, okunabilir sürüş parçalarından çekim üretip başsız Chromium'da render alır. Önce stüdyo sunucusunu başlat: `npx vite --config vite.map.config.ts --host 127.0.0.1 --port 5199`. Ardından:

```bash
node --experimental-strip-types scripts/reel/render-shots.ts <bolum.json> [çekimId…] [--draft] [--native]
node --experimental-strip-types scripts/reel/contact-sheet.ts <çıktı.png> <video.mp4>
node --experimental-strip-types scripts/reel/compose.ts <bolum.edit.json>   # kurgu: kesim + yazı katmanı + müzik
```

Bölüm dosyası: `{ "id", "scene": "map=set&tank=02&weather=sunset", "shots": [{ "id", "camera", "scene": "spawn=whoops", "slow", "drive": [{ "seconds", "throttle", "steer", "turn", "elevation", "fire": [s], "hold": [x,y,z] }] }] }`. `--draft` 30 fps ve doğrudan 1080p verir; varsayılan 60 fps ve 2× süper örneklemedir. `--native` 60 fps'i süper örnekleme olmadan doğrudan 1080p verir.

| Tuş | İş |
|---|---|
| Tıkla | Fareyi kilitle ve sürmeye başla (oyun kontrolleri aynı) |
| `3`–`9` | Takip · Alçak · Yan · Ön · Yörünge · Drone · Namlu kamerası |
| `Y` | Geçiş: tankın önüne sabit kamera kurulur, tank yanından geçince yeni noktaya kesilir |
| `U` | Vertigo (dolly zoom): kamera uzaklaşırken lens daralır, tank aynı boyda kalır |
| `I` | Palet: zemin seviyesinden palete bakan alçak açı |
| `O` | Vinç: arkadan alçakta başlayıp 8 s'de yükselen çekim |
| `P` | Kuşbakışı: tepeden aşağı |
| `L` | Karşı namlu: namlunun önünden kuleye bakan açı |
| `C` | Oyun kamerası |
| `[` / `]` | Lensi daralt / genişlet (dikey FOV) |
| `K` | Çekimi başlat / bitir (başlatınca tank başlangıca döner) |
| `H` | Paneli gizle |
| `Esc` | Render sırasında iptal |

Paneldeki **Render** bölümünde çekim, kamera ("Çekimdeki kurgu" ya da tek kamera), 60/30 fps, 2× süper örnekleme ya da doğrudan 1080p ve 0,5× / 0,25× ağır çekim seçilir. Aynı çekim farklı kameralarla birçok kez render edilip kurguda birleştirilebilir.

**Reels güvenli alanı** katmanı, Instagram arayüzünün üst bar, alt açıklama ve sağ düğme sütunu bölgelerini yaklaşık olarak gösterir. Bu katman yalnızca ekranda görünür, videoya girmez.

## Dosyalar

| Yol | İçerik |
|---|---|
| `studio-out/takes/<id>.json` | Adım girdileri ve kamera kurgusu (sürüm 1) |
| `studio-out/takes/<id>.webm` | Çekim sesi (ses açıksa) |
| `studio-out/renders/*.mp4` | Render çıktıları; ad = çekim-kamera-fps-[slow]-zaman |

`studio-out/` sürüm kontrolüne girmez.

Kod konumları:

- `src/game/studio/Studio.ts`: kayıt, tekrar oynatma, render döngüsü ve panel
- `src/game/studio/StudioCamera.ts`: kamera ön ayarları
- `scripts/studio-plugin.ts`: Vite geliştirme sunucusu uç noktaları ve ffmpeg

## Sınırlar

- **Tekrar oynatma belirlenimciliği varsayılır, doğrulanmadı.** Havok, sıfırlamadan sonra aynı girdilerle büyük ölçüde aynı yolu izler. Uzun çekimlerde küçük sapmalar olabilir. Şimşek zamanlaması `Math.random` kullandığı için her render'da farklıdır.
- MG ateşi, MG kamerası, sis perdesi, sandık toplama ve serbest kamera hareketi çekime kaydedilmez. Render'da yalnızca sürüş, taret ve top tekrar oynar.
- Tek ffmpeg geçişinde 10 kesilmiş girdi + boru ile yazı katmanı ffmpeg 8'de kilitlendi; `compose.ts` bu yüzden aşamalı çalışır.
- Başsız otomatik render'da aynı tarayıcı oturumunda 4. render iki kez donarak takıldı (2026-11-05, Intel iGPU, ANGLE/Vulkan). Neden bulunmadı; geçici çözüm olarak çekimleri ayrı çağrılarla render et.
- Çekim sırasında `R` ile sıfırlamak çekimi bitirir. En uzun çekim 180 s'dir.
- Ağır çekim render'larında ses yoktur (çekim sesi gerçek zamanlıdır).
- Ses ve görüntü eşlemesi, canlı çekimde FPS düşüp fizik adımı atlanırsa kayabilir.
- Stüdyo API'si yalnızca `vite` geliştirme sunucusunda (`npm run studio` veya `map:dev`) vardır; `dist-map` derlemesinde yoktur.

## Doğrulama — çekim sahası, 2026-11-04

- `npm run map:check` ve `npm run map:build` geçti (mevcut büyük paket uyarısı sürüyor).
- Linux, Chromium headless, ANGLE/Vulkan, Intel RPL-P iGPU: `map=set&tank=02` oyun modunda açıldı; sayfa hatası yok.
- `render-shots.ts --draft` ile dört sentetik çekim render edildi (30 fps, 1080×1920): pist/drone 10 s (19 s render), tümsek/yan 10 s (19 s), sırt/alçak 12 s (27 s), atış/yörünge 6 s (12 s). Kontak sayfalarında pist tozu, tümsekte gövde salınımı, sırtta gün batımı silueti ve atış noktasında doğru yön görüldü.
- İnsan sürüşü, harita içinde serbest dolaşma ve kalite modunda (60 fps, 2×) render bu turda denenmedi.

## Doğrulama — 2026-11-04

Chrome ve Linux üzerinde, gerçek oyun sayfasıyla:

- 240 adımlık (4 s) sentetik çekim API ile yüklendi: ileri sürüş, 2. saniyeden sonra dönüş, top atışı, Takip → Alçak kesmesi.
- "Çekimdeki kurgu", 30 fps, doğrudan 1080p: 121 kare, yaklaşık 13 s render, `h264 1080×1920 30/1 yuv420p`.
- Takip kamerası, 60 fps, 2× süper örnekleme: 241 kare, yaklaşık 1 dk render.
- İki render'dan alınan karelerde dikey kadraj, kamera kesmesi ve iki tekrar oynatmada aynı dönüş görüldü.
- Ses içeren canlı çekim ve fareyle sürüş henüz insan tarafından denenmedi.

## Sonraki adımlar (öneri)

- Ses dahil canlı çekim kabulü: ses ve görüntü eşlemesini kontrol et.
- MG, sis ve kamera ayarlarını çekime eklemek.
- Anahtar karelerle serbest kamera yolu.
- Şimşek için tohumlu rastgelelik: aynı render'ın aynı şimşekleri vermesi.
- Hazır sahne senaryoları (fırtınada tepe çıkışı, düello). Çekim sahası ve otomatik çekim yöneticisi eklendi; bilgi videosu kurgusu (yazı katmanı, ses) açık.
