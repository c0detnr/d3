# İlerleme
- Model ve POV, sınırlı nişan ve seri ateş bağlandı.
- İlk Node testi strip-only parametre property sözdizimini reddetti; açık alan atamasına çevrildi.
- Yerel Vite 5174 üzerinde; 5173 önceden kullanılıyordu.

- Gerçek GLB ve otomatik ateş/input testleri geçti; 30/60/120 FPS eşitliği ve üç kaynak temizliği çevrimi doğrulandı.
- Chromium dağıtım sürümünde 2/POV, fare nişanı, 0→4 atış, WASD sürüş ve 1/tank dönüşü görüldü; pageerror yok. Screenshot docs/previews/machine-gun-pov.png.
- Çalışma ağacı ve seçici commit snapshot için map:check, mg:test, combat:test, turret:test geçti. map:build geçti.
- Aynı depoda eşzamanlı kamera/top geri bildirimi ve önceden duran manuel taret işleri var; bağımsız Git index ile yalnız MG değişiklikleri hazırlanıyor. Çalışma dosyaları korunuyor.
