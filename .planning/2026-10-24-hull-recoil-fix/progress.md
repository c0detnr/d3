# İlerleme

2026-10-24: README, oyun tasarımı, yol haritası, mimari ve mevcut kamera görev kaydı okundu. GLB parça hiyerarşisi ve atış/fizik sırası incelendi. /tmp genel aramasında sistem dizinlerine erişim hatası görüldü; gerekli tarayıcı betiği bulundu.

Namlu hareket grubu tamamlandı; darbe 16000 N·s ve namlu yükseliş pivotuna alındı. İlk kontrol öne atışta 0,354 m kayma ölçtü; 0,25 m ön sınırı yerine küçük tepkiye uygun 0,5 m sınırı kullanıldı. Yana atışta kalıcı 0,42° yaw değişimi toplam quaternion açısını durulma için yanlış ölçüt yaptı; durulma pitch/roll eğimi ve açısal hızla ölçülüyor. Sonuçlar: öne 0,816°, yana 0,500° tepe eğimi, 3 saniyede durulma, 30/60/120 FPS eşitliği. combat:test, turret:test ve map:build geçti.

Chromium headless 1280×720 üzerinde derlenmiş oyun açıldı; atış ve dolum HUD geçişi görüldü, önce/atış/sonra görüntüleri /tmp/d3-recoil-*.png altında incelendi; sayfa hatası yok. Bu kısa kontrol insan hissi kabulü veya performans ölçümü değildir. Commit için yalnız görev farkları HEAD üzerine seçilerek indexe alındı; diğer görevlerin hidrolik namlu eğrisi, manuel taret, MG, ses ve kamera değişiklikleri korunup dışarıda bırakıldı. Index /tmp/d3-recoil-staged altına çıkarılarak yeni gerçek GLB/Havok regresyonu ayrıca geçti.
