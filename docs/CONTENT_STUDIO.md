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

| Tuş | İş |
|---|---|
| Tıkla | Fareyi kilitle ve sürmeye başla (oyun kontrolleri aynı) |
| `3`–`9` | Takip · Alçak · Yan · Ön · Yörünge · Drone · Namlu kamerası |
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
- Çekim sırasında `R` ile sıfırlamak çekimi bitirir. En uzun çekim 180 s'dir.
- Ağır çekim render'larında ses yoktur (çekim sesi gerçek zamanlıdır).
- Ses ve görüntü eşlemesi, canlı çekimde FPS düşüp fizik adımı atlanırsa kayabilir.
- Stüdyo API'si yalnızca `vite` geliştirme sunucusunda (`npm run studio` veya `map:dev`) vardır; `dist-map` derlemesinde yoktur.

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
- Hazır sahne senaryoları (fırtınada tepe çıkışı, düello).
