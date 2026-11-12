# MINIMAP

Oyun içi kare minimap yerel sürüş ve FPV uçuşuna eklendi. LAN sayfasına eklenmedi. Kabuğun menü, duraklatma ve sonuç ekranlarında gizlidir; geliştirici önizlemesinde sürüş sırasında görünür.

- Kuzey (+Z) sabit yukarıdadır. Harita tankı, FPV uçuşunda drone'u ortalar. Tank gövde oku, ayrı ince kule yön konisi ve drone yön oku gerçek dünya dönüşümlerinden gelir; FPV sırasında tank işareti korunur.
- Seçili haritanın mevcut yükseklik örnekleyicisi başlangıçta bir kez 512×512 ayrı canvas'a işlenir: koyu hillshade, 5 m yükseklik konturları. Kül Vadisi yolları/binaları/landmarkları, film sahası pisti/binaları ve doğal arazinin patikası mevcut yerleşim verilerinden çizilir. Fotoğraf, dış varlık veya bağımlılık eklenmedi.
- Dostlar camgöbeği, görülen düşmanlar kırmızı, MissionHud ile aynı görev hedefi amber gösterilir. Görev hedefi harita dışında kalınca kenarda gösterilir. Takım düellosunda oyuncunun `TeamDuel.canSee` kontrolü, diğer düşmanlarda/FPV'de aynı 180 m sınırı + fizik raycast + oyun sisinin görüş engeli kullanılır. FPV'de gözlem noktası drone'dur. Gizli düşmanın güncel konumu minimape aktarılmaz; son görülen konum kopyası dört saniyede söner. Görüş burada mevcut oyundaki gibi engel/mesafe görüşüdür; yeni kamera görüş açısı kuralı eklenmedi.
- `M` (mevcut atamalar tarandı; boş) veya haritadaki düğme 400 / 800 m görünür alan arasında geçer. Kuzey harfi ve 100 m ölçek çubuğu TR/EN çevirilerindedir.
- Ortak renk/font/nümerik değişkenleri `hudTokens.css` içindedir. Minimap Barlow ve tabular rakamlar kullanır. Masaüstü 220 px, dar/coarse düzeni 140 px; yalnız minimapli oturumlarda silah paneli solda veya üsttedir. Diğer HUD görsel stilleri değiştirilmedi.
- DOM + canvas; React/Zustand yok. Örnekleme, görüş sorguları ve çizim en fazla 20 Hz; sahne kapanışında canvas/DOM/dinleyiciler temizlenir, R kurtarmasında temas belleği silinir.

## Doğrulama — 2026-11-13

- `node --experimental-strip-types scripts/check-minimap.ts` geçti: kuzey/doğu yönü, oyuncuyu ortalama, metre ölçeği, iki yakınlaştırma, dünya konumu değişince aynı dönüşüm, son görülen konumun referans yerine kopya olması, dört saniyede silinmesi ve reset.
- `npm run map:build` geçti; mevcut büyük paket uyarısı sürüyor.
- `npm run mission:test` geçti; Node mevcut localStorage deneysel uyarısını veriyor.
- `git diff --check` geçti.
- Tarayıcı görsel/etkileşim, fiziksel coarse-pointer cihaz ve FPS kontrolü yapılmadı. Özellikle dar ekran ve FPV OSD ile birlikte görünümün insan kabulü açıktır; genel M1/M2/M3 kabulü değişmez.
