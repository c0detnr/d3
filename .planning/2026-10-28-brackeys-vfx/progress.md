# İlerleme
2026-10-28: README, oyun tasarımı, yol haritası, efekt/görsel belgeleri ve mevcut render kodu incelendi.
Paket resmi itch.io ücretsiz indirme uçlarından indirildi ve macOS meta dosyaları hariç açıldı. Lisans ve kaynak kaydedildi. smoke_01_a.png seçildi; mevcut toz havuzuna alfa harmanlama ve sisle bağlandı.
Karşılaşılan yardımcı araç hataları: Pillow kurulu değil; önizleme ImageMagick ile alındı. İlk önizlemede yanlış `transparent` klasörü yerine paketin `alpha` klasörü kullanılarak düzeltildi. Bağımlılık kurulmadı.
`npm run effects:test` geçti: gerçek Havok, deterministik 30/60/120 FPS, havuz sınırı, üç kaynak temizleme çevrimi. `npm run map:build` geçti; 74,79 KB PNG çıktıya taşındı. Büyük JS paket uyarısı mevcut.
Chrome 127.0.0.1:5173 üzerinde sahne açıldı. Fare kilidi otomasyonda başarısız; mevcut driveTest=1 gözlemiyle kısa sürüş başlatıldı. Otomasyon görünümünde düşük kare hızı/throttling var; bu performans kabulü değildir. Uzun gözlem yapılmadı.
Lisansın CRLF satır sonları diff kontrolünde uyarı verdi; metin korunarak LF yapıldı. Chrome hata günlüğü boş. README ve ROADMAP yalnızca bu görevin değişiklikleriyle indekse alındı; diğer çalışmalar çalışma ağacında korundu.
