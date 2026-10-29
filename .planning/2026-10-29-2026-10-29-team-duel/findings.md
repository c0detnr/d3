# Bulgular

- Mevcut mod tek rakipli EasyDuelAI; takım/maç döngüsü yok.
- Kullanıcı her takımın kendi üssünde doğmasını istedi. Yerel bot/çevrimiçi oyuncu yapısı soruldu, yanıt bekleniyor.
- mapPreview.ts, görev menüsü, belgeler ve paket dosyasında önceki çalışmalar mevcut; bunlar korunacak ve stage kapsamından ayrılacak.
- AI görüş kaybında erken return yüzünden wasVisible bayrağını sıfırlamayabiliyor; canShoot görünürlük kaybından sonra 0.3 saniye açık kalıyor.

- Kullanıcı onayladı: oyuncu + 4 dost AI, 5 düşman AI; herkes kendi üssünde. Yeni mod ?map=kul&duel=5v5, eski tek rakipli mod korunur.
- KUL_ROUTES sürüş için doğrulanmış yol noktalarını sağlar. Beşli doğuş avluda aralıklı dizilir; başlangıç çıkışları geciktirilir.
- Ortak simülasyonda tek Havok adımı korunur; takım hasarı kapalı, dostlar mermiyi fiziksel olarak keser.
