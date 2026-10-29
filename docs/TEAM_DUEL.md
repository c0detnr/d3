# 5’e 5 yerel takım düellosu

Kullanıcının onayladığı yapı: **oyuncu + 4 dost AI, karşıda 5 düşman AI**. Her takım kendi üssünde, birbirinden ayrı beş konumda ve çıkışa dönük doğar. Bu mod Kül Vadisi üzerinde çalışır.

Görev menüsündeki **5’e 5 · Takım düellosu** bağlantısını seç veya `map-preview.html?map=kul&duel=5v5` aç. `base=B` karşı üsten başlamayı, `tank=02` ikinci oyuncu tankını seçer. R veya sonuç ekranındaki düğme tüm maçı iki üsten yeniden başlatır. Eski `duel=1` tek rakipli modu korunur.

## Maç kuralları

- Beşer araç, araç başına 100 can, top isabetinde 25 hasar; mevcut modül hasarı korunur. MG can hasarı vermez.
- Dost ateşi hasar vermez; dost araçlar ve enkazlar mermileri fiziksel olarak keser. Dünya/zemin isabeti bir araca hasar yazmaz.
- Bir takımın tüm araçları imha edilince sonuç açıklanır. Aynı sabit adımda iki takım da imha olursa beraberliktir. Sonuçtan sonra hasar ve yeni atış durur.
- Oyuncu imha olduğunda dost AI’lar savaşa devam eder. Maç içinde otomatik yeniden doğma yoktur.
- HUD yaşayan araç sayılarını gösterir. Dost işaretleri mavi, görüşteki düşman işaretleri turuncudur; düşman canı yalnız oyuncunun görüşü açıkken gösterilir.

## AI davranışı

Üç doğrulanmış koridorun yol noktalarını izler; çıkışlar aralıklıdır ve ana kapıya yaklaşırken oyuncunun iki yanından geçilir. Virajlarda ve yol noktasına yaklaşırken frenler; önündeki dost araca genişliğini hesaba katarak mesafe bırakır. İlerleyemezse geri/dönüş kurtarması dener.

180 m içinde görüşü açık, yaşayan düşmanlar arasından yakın hedef seçer; mevcut hedefe öncelik vererek gereksiz hedef değiştirmeyi azaltır. Yeni hedef/görüş kazanımında 0,85 s tepki süresi vardır. Görüş kaybolunca ateşi hemen keser; dört saniye son görülen konumu arar, sonra koridor rotasına döner. Nişan, sınırlı hareket önlemesi ve mevcut mermi hızına göre yerçekimi telafisi kullanır. Namlu hizası, gerçek engel, dolum ve kule hasarı kontrol edilmeden ateş edilmez.

Bunlar rota takibi ve sınırlı kurtarmadır; genel amaçlı navmesh, takım komutları ve taktik siper planlayıcısı yoktur. Enkazların veya insan oyuncunun kapıları tamamen kapatması ilerlemeyi engelleyebilir. Ayarlar ilk oynanış değerleridir; insan maç dengesi kabulü değildir.

## Doğrulama — 2026-10-29

`node --experimental-strip-types scripts/check-team-duel.ts`: gerçek Kül Vadisi, iki gerçek tank modeli ve tek Havok dünyasında on araç. İki üs/yön, doğuş aralığı, oyuncu beklerken dokuz botun çıkışı, gerçek karşılıklı atış/hasar, görüş engeli kancası, dost/dünya isabetleri, beş reset, üç sonuç türü, oyuncu ölümünden sonra devam, sonuç kilidi, 30/60/120 render girdileriyle sabit adımlama ve kaynak temizliği kontrol edilir.

150 saniyelik otomatik A üssü senaryosunda 36 AI atışı gözlendi; insan girişi olmadan bitmiş tam maç dengesi veya FPS sonucu değildir. `check-duel-ai.ts`, `damage:test` ve `map:build` de çalıştırılır; teslim kaydı ROADMAP içindedir.

Tarayıcı erişim host'u kullanılamıyor. Oyun içi HUD/kamera görünümü, insan sürüş ve AI adaleti, ses dengesi ve GPU/kare süresi doğrulanmadı. Genel M1/M2/M3 kabulü kapanmaz. LAN modu bu çalışmadan etkilenmez.
