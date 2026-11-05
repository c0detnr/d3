# Reel 01 — "DOSYA 02: LEOPARD 2A6"

Durum: **ilk kurgu hazır (2026-11-05):** `studio-out/reels/leopard-2a6.mp4`, 1080×1920, 60 fps, 33,0 sn, H.264 + AAC (koddan üretilen marş). 10 çekimin tamamı 60 fps ve süper örneklemesiz (`--native`) render edildi. Oyun sesi (motor, palet, atış) henüz yok; telefonda izleme ve yayın onayı bekliyor.

## Konsept

- **Format:** Instagram Reels, 1080×1920, ~33 sn, sessiz izlenebilir (bütün bilgi ekranda yazılı).
- **Ton:** askeri istihbarat dosyası ciddiyeti, araya serpiştirilmiş kuru espri. Komik ses efekti, emoji yağmuru ve "bro" dili yok.
- **Seri kimliği:** her araç bir "DOSYA". Kapanış her bölümde "SIRADAKİ DOSYA?" sorusu. Yeni araç eklenince yalnız bilgi kartı ve çekim dosyası değişir.
- **Yasal çizgi:** oyundaki araç gerçek tankın kopyası değil, Leopard 2A6'dan esinlenen kurgusal **IRON DUST 02**. Bu, kapanışta küçük yazıyla belirtilir. Logo, amblem ve resmi görüntü kullanılmaz.
- **Işık:** `weather=sunset` (turuncu–mor gökyüzü, uzun gölgeler). Bütün çekimler aynı ışıkta, kurgu renk olarak tutarlı.

## Senaryo ve kurgu (zaman çizelgesi)

Süreler kurgudaki süredir; "kaynak" sütunu taslak klipte hangi aralığın kullanılacağını söyler (normal hızda saniye).

| # | Zaman | Çekim (`id`) | Kaynak | Ekrandaki büyük yazı | Küçük yazı / alt not | Ses |
|---|---|---|---|---|---|---|
| 1 | 0,0–2,5 | `s1-hook-front` | 0,5–3,0 | **60 TON.** → **NAMLU KIPIRDAMIYOR.** | — | Motor homurtusu, tümsek gümlemeleri |
| 2 | 2,5–5,5 | `s2-dosya-front` | 0,0–3,0 | **DOSYA 02 // LEOPARD 2A6** | Menşe: Almanya · Sınıf: Ana muharebe tankı · "İNCELENDİ" damgası | Daktilo + damga sesi, müzik girer |
| 3 | 5,5–9,5 | `s3-top-muzzle` (0,5×) | 1,0–5,0 | **120 mm L/55 YİVSİZ TOP** | Namlu, önceki L/44'ten 1,3 m daha uzun | Atış (kare ağır), müzik vuruşu ateşe denk |
| 4 | 9,5–13,0 | `s4-motor-drone` | 2,0–5,5 | **MTU V12 DİZEL — 1.500 PS** | Çift turbo · ~1.100 kW | Motor yükselir |
| 5 | 13,0–16,0 | `s5-hiz-track` | 3,0–6,0 | **YOLDA ~68 km/sa** | Geri viteste bile ~31 km/sa | Palet şakırtısı |
| 6 | 16,0–19,5 | `s6-agirlik-crane` | 2,0–5,5 | **~60 TON · 4 KİŞİ** | Komutan · Nişancı · Doldurucu · Sürücü — "Otomatik doldurucu yok. Doldurucu bir insan." | Müzik kısa düşer |
| 7 | 19,5–22,5 | `s7-stab-chase` | 1,0–4,0 | **1986.** | Bundeswehr bir Leopard 2'nin namlusuna bira bardağı koydu. | Müzik tekrar yükselir |
| 8 | 22,5–25,5 | `s7-stab-barrel` | 2,0–5,0 | **TEK DAMLA DÖKÜLMEDİ.** | Arazide, hareket halinde. (Oyun içi canlandırma) | Tümsekler, sessiz an |
| 9 | 25,5–29,5 | `s8-yayilim-drone` | 1,0–5,0 | **ALMANYA'DAN ŞİLİ'YE, KANADA'DAN ENDONEZYA'YA** | Türkiye: Leopard 2A4 (354 adet) | Müzik tepe noktası |
| 10 | 29,5–33,0 | `s9-kapanis-orbit` | 2,0–5,5 | **DOSYA KAPANDI. SIRADAKİ DOSYA?** | Yorumlara yaz · Oyundaki araç Leopard 2A6'dan esinlenen kurgusal IRON DUST 02'dir. | Müzik tek vuruşla biter |

**Geçişler:** düz kesme. 2→3 ve 6→7 arasında 2 karelik beyaz flaş. 7→8 arasında kamera namluya "girer" gibi kısa bir yakınlaşma.

**Döngü hilesi:** son kare (tank dönerken) ilk kareye (tank kameraya geliyor) benzediği için Reels tekrarında kesinti hissedilmez.

### Açıklama ve etiketler (taslak)

> 60 ton, 1.500 beygir ve bira dökmeyen bir namlu. Dosya 02: Leopard 2A6. Sıradaki dosya hangi tank olsun? 👇
>
> #leopard2 #leopard2a6 #tank #askeri #savunmasanayi #gamedev #indiegame #lowpoly #irondust

## Yazı katmanı (görsel dil)

- **Yazı tipleri (Google Fonts, OFL lisans):** başlıklar `Saira Stencil One`, veri ve küçük yazılar `JetBrains Mono`.
- **Renkler:** kum `#D9C9A3`, haki `#6B6B3A`, sinyal sarısı `#F2B705`, damga kırmızısı `#B3261E`, %60 siyah zemin bandı.
- **Yerleşim:** yazılar ekranın üst ⅓'ü ile alt ⅓'ü arasında, Instagram arayüzüne girmemek için alttan 320 px, sağdan 140 px boş.
- **Hareket:** büyük yazı 6 karede yazıcı efektiyle gelir, küçük yazı 4 kare gecikmeyle kayar. Dosya kartında köşe nişan çizgileri ve sayaç (`REC ● 00:00:03`).

## Bilgi kontrolü

| Bilgi | Kullanılan değer | Durum |
|---|---|---|
| Top | 120 mm Rheinmetall L/55 yivsiz (önceki sürümler L/44) | Doğrulandı ([KNDS](https://knds.com/en/products/systems/leopard/leopard-2-a6), [Defence DB](https://defencedb.com/profile_page.php?item_id=45)) |
| Namlu farkı | 55−44 = 11 kalibre × 120 mm = 1,32 m | Hesap |
| Motor | MTU MB 873 Ka-501, V12 çift turbo dizel, 1.500 PS (~1.100 kW) | Doğrulandı. "Beygir" yerine **PS** yazılacak (1.500 PS ≈ 1.479 hp) |
| Hız | Yolda ~68 km/sa, geri ~31 km/sa | Doğrulandı ([deagel](https://www.deagel.com/Armies/Leopard%202/a000451)). Kaynaklar 66–72 arası veriyor, "~" ile yazılacak |
| Ağırlık | ~60 t (kaynaklarda 59,9–62,3 t) | Doğrulandı, "~" ile |
| Mürettebat | 4 (komutan, nişancı, doldurucu, sürücü) | Doğrulandı |
| Bira bardağı | 1986, Bundeswehr tanıtım filmi, **Leopard 2** (2A6 değil) | Doğrulandı ([Forces News](https://www.forcesnews.com/technology/land-vehicles/when-leopard-2-tank-perfectly-balanced-beer-its-gun), [Task & Purpose](https://taskandpurpose.com/tech-tactics/german-leopard-2-tank-carry-a-beer)) |
| Kullanıcı ülkeler | Kanada, Şili, Endonezya, Singapur, Türkiye ve birçok Avrupa ülkesi | Doğrulandı. Toplam sayı kaynaklarda tutarsız, **sayı yazılmayacak** |
| Türkiye | Leopard 2A4, 298 + 56 = 354 adet | İkincil kaynaklarla tutarlı ([Shephard](https://shephardmedia.com/news/landwarfareintl/turkey-sets-leopard-2a4-upgrade-in-motion-with-no)). Yayın öncesi bir resmi kaynakla teyit önerilir |
| 2A6'nın hizmete giriş yılı | — | Kesin kaynak bulunamadı, **senaryoda kullanılmıyor** |

## Çekim planı

Çekim dosyası: [`scripts/reel/episodes/leopard-2a6.json`](../../scripts/reel/episodes/leopard-2a6.json). Bütün çekimler `map=set&tank=02&weather=sunset` sahnesinde.

| Çekim | Bölge (`spawn`) | Kamera | Sürüş | Taslak denemesi |
|---|---|---|---|---|
| `s1-hook-front` | whoops | front | 9 sn %90 gaz, namlu +Z'ye kilitli | ✓ gövde sallanıyor, namlu kameraya sabit bakıyor |
| `s2-dosya-front` | runway | front | 7 sn tam gaz | ✓ tank kameraya yaklaşıyor; 4. saniyeden sonra çok yakın, kullanılmayacak |
| `s3-top-muzzle` | range | muzzle, 0,5× | 1. saniyede atış | ✓ namlu ağzı alevi net |
| `s4-motor-drone` | runway | drone | 9 sn tam gaz | ✓ pist, toz izi, direkler |
| `s5-hiz-track` | runway | track | 10 sn tam gaz | ✓ alçak palet çekimi, toz |
| `s6-agirlik-crane` | pad | crane | 8 sn kule yavaş döner | ✓ yandan üste yükselen açılış |
| `s7-stab-chase` | whoops | chase, fov 1,1 | 9 sn %90 gaz, namlu kilitli | ✓ arkadan gövde yalpası görünüyor |
| `s7-stab-barrel` | whoops | barrel | 7 sn %90 gaz, namlu kilitli | ✓ namlu kadrajda sabit, ufuk oynuyor |
| `s8-yayilim-drone` | ridge | drone | 12 sn tam gaz | ✓ tepeye tırmanış yukarıdan |
| `s9-kapanis-orbit` | pad | orbit | 8 sn duruyor | ✓ gün batımında tam tur |

**Elenen denemeler:**
- Pistte ve sırtta `low` kamera yalnız tankın arkasını ve tozu gösterdi.
- Pistte `flyby` kamerası geçiş sırasında gövdenin içine girdi.
- Sırtta `front` kamerası tepede tankın içine girdi.
- Tümsek şeridinde `side` kamerası namluyu kadraja almadı.
- Stabilizasyon "kapalı/açık" karşılaştırması aynı görüntüyü verdi, çünkü oyun namluyu zaten sabitliyor.

## Üretim adımları

1. **Kaliteli render** (60 fps, 2× süper örnekleme). Önizleme sunucusu açıkken:
   `node --experimental-strip-types scripts/reel/render-shots.ts scripts/reel/episodes/leopard-2a6.json`
2. **Yazı katmanı:** `scripts/reel/overlay/` altında bir HTML sayfası. Başsız Chromium'da şeffaf arka planla 30 fps kare kare görüntü alınır.
3. **Ses:**
   - Motor, palet ve atış seslerini oyunun kendi ses sisteminden kayıtla almak hedef. Senaryodan üretilen çekimler şu an sessiz; stüdyo yalnız elle kaydedilmiş çekimin `.webm` sesini ekliyor.
   - **Müzik (taslak hazır):** `node --experimental-strip-types scripts/reel/music.ts` → `studio-out/music/leo2a6-march.wav`. Özgün, koddan sentezlenen askeri marş: 120 BPM (her kesim bir vuruşa denk), Re minör, Dm–B♭–C–A. Hazır örnek ya da dış varlık kullanılmadı, lisans sorunu yok. Trampet, davul, bakır nefesli ve yaylı katmanları zaman çizelgesini izler: 2,5'te giriş, 5,5'te atış vuruşu, 16,0–19,5 düşüş, 22,5–25,5 sessiz an ve trampet ruloyla tırmanış, 25,5'te melodili tepe noktası, 32,0'de tek vuruşla kapanış. Ses düzeyi -16 LUFS. Dinleyerek onay bekliyor.
4. **Montaj:** `node --experimental-strip-types scripts/reel/compose.ts scripts/reel/episodes/leopard-2a6.edit.json`. Zaman çizelgesi, kaynak aralıkları ve yazılar `leopard-2a6.edit.json` içinde. Betik her kesimi ayrı klibe çevirir, yazı katmanını (`scripts/reel/overlay/index.html`) başsız Chromium'da yalnız değişen karelerde PNG olarak çeker ve son geçişte müzikle birleştirir. Çıktı `studio-out/reels/leopard-2a6.mp4`, ara dosyalar `studio-out/compose/`. Süre yaklaşık 2 dakika. Yazı tipleri Google Fonts'tan yüklendiği için internet gerekir.
   - s3 kesimi 1,983 sn'den başlar: 2 karelik beyaz flaşın ardından top 5,53 sn'de ateşlenir ve müzikteki 5,5 sn vuruşuna denk gelir.
   - Başlıklar sağdan 72 px boşluk kalacak şekilde otomatik küçülür.
5. **İnceleme:** kare tablosu (`contact-sheet.ts`) ve telefonda bir kez izleme, sonra yayın.

## Açık konular

- **Bira bardağı aksesuarı (önerilir):** stüdyoda namlu ucuna takılan küçük bir bardak modeli eklenirse 7–8. çekimler esprinin kendisi olur. Kod değişikliği gerektirir, onay bekliyor.
- **Sırt silueti:** `ridge` bölgesinde sabit tripod kamerası yok. Gökyüzüne karşı siluet için yeni bir kamera ayarı gerekir; şimdilik drone kullanılıyor.
- **Ses:** senaryodan üretilen çekimlere oyun sesini eklemek için stüdyo tarafında çalışma gerekiyor.
- **Seslendirme:** yalnız yazı mı, yazı + Türkçe seslendirme mi? Plan şu an yalnız yazıyla tasarlandı.
