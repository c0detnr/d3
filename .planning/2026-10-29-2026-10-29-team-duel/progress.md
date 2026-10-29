# İlerleme

- Kaynaklar, belgeler ve mevcut değişiklikler incelendi.
- Oyuncu yapısı açıklaması beklenirken bağımsız AI düzeltmesi hazırlanıyor.

- AI görüş/tepki, mesafe koruma ve takılma kurtarma değişikliği uygulandı.
- check-duel-ai.ts, map:check ve map:build geçti; büyük paket uyarısı mevcut.
- CUA: browser access host unavailable; etkileşimli kabul yapılamadı.
- 5’e 5 bağımlı entegrasyon oyuncu dağılımı yanıtını bekliyor; tamamlandı sayılmadı.

- İlk 10 tank kontrolünde arka sıra aralığı test sınırına (12 m) eşitti; 14 m yapıldı.

- 150 s gerçek harita simülasyonunda iki takım ateş etti ve hasar verdi. Dar kapı dönüşlerinde hızlı yaklaşımın dış duvara taşırdığı görüldü; viraj/hız freni ve daha dar rota erişim eşiği eklendi.

- Dar dönüşler frenle yavaşlatıldı; ana kapı önüne her bot için yana ayrılan çıkış noktası eklendi. Dost algısı koni yerine gerçek araç genişliğine göre koridor kullanıyor.
- 150 s gerçek Kül Vadisi / 10 GLB / Havok testinde 36 AI atışı; 60 s içinde dokuz AI da üsten çıktı. Hasar, beş reset, iki üs/yön, kazanma/kaybetme/beraberlik, sonuç sonrası hasar kilidi, 30/60/120 adımlama ve kaynak temizliği geçti.
- Tarayıcı erişim host'u bu turda da yok; görsel/kamera ve FPS ölçümü yapılmadı.
- Mevcut sis entegrasyonuna TeamDuel.blocksSight kancası yerelde bağlandı; sis çalışması önceki uncommitted kapsamda korundu. Takım commit'i sis dosyalarına bağımlı olmayacak.
