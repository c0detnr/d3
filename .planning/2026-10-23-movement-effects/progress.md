# İlerleme

## 2026-10-23
- Proje belgeleri ve ilgili sürüş/arazi kaynakları incelendi.
- Taret görevinin kök kayıtlarını korumak için bu görev ayrı dizinde izleniyor.
- Kapsam: hareket tozu, yüzey parçaları, fren/dönüş/iniş davranışı; uygulama yok.
- docs/MOVEMENT_EFFECTS.md: görünüm, tetikleyiciler, SI eşikleri, yüzey katsayıları, eksik temas verileri, kalite limitleri, yaşam döngüsü ve kabul senaryoları yazıldı.
- README, ART_DIRECTION, DECISIONS ve ROADMAP bağlantıları eklendi; M1/M2 durumu tamamlandı sayılmadı.
- 5 belgede 31 yerel bağlantı kontrolü ve git diff --check geçti. Oyun kodu değiştirilmediğinden oyun/efekt testleri ve tarayıcı ölçümü çalıştırılmadı.
- İlgili belge diff'i incelendi; devam eden taret kodu ve kök kayıtlar stage edilmeyecek. Push sonucu son teslimde uzak dal üzerinden doğrulanır.

## İlk üç efektin uygulanması
- Palet temas/hız/dönüş tozu, sınırlı dünya uzayı havuzu, interpolasyon, yüzey katsayıları ve aç/kapat eklendi. R/görünürlük/sahne temizliği bağlandı.
- effects:test, npm test, turret:test, tank:test, drive:test, map:test ve map:build geçti. İlk spriteManagers undefined hatası testte düzeltildi; son kontroller başarılı.
- Chrome'da kısa sürüş ve kapatma kontrolü yapıldı, konsol warn/error boş; docs/previews/track-dust.png kaydedildi. Uzun tarayıcı kabulü ve performans karşılaştırması yapılmadı.
- Belgeler gerçek kapsam ve açık kabul maddeleriyle güncellendi. Diff incelendi; Git commit/push teslimine geçildi. Uzak HEAD eşleşmesi son raporda doğrulanır.
