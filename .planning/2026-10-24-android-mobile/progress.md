# İlerleme
- 2026-10-24: Kaynak, girdiler, yerel Android araçları ve resmi dağıtım belgeleri incelendi.
- Dokunmatik sürüş/nişan, ateş, fren, zoom, silah, kurtar ve ses kontrolleri eklendi. Sol panel DOM'dan kaldırıldı.
- touch:test; npm test; combat:test; mg:test; map:build geçti. Chromium dokunmatik 915×412 ve masaüstü 1280×720: sahne açıldı, üç eşzamanlı dokunma ateş/dolum ve iki çubuğu birlikte çalıştırdı; bırakma sıfırladı; MG geçişi çalıştı; pageerror yok.
- İlk Gradle bin dağıtımı indirmesi zaman aşımına uğradı; aynı sürümün mevcut all dağıtımıyla wrapper çalıştırıldı. APK derlendi ve apksigner doğruladı (yaklaşık 6,7 MiB).
- Android emülatöründe WebView HTTPS origin, WebGL2, 914×411 CSS yatay ekran ve HUD yokluğu doğrulandı. CDP gerçek touch: top dolum 4,7 s; MG geçişi ve basılı ateşte 6 atım görüldü.
- Android ekranında gereğinden düşük render ölçeği fark edildi; CSS çözünürlüğü esaslı 1280×720 sınıra düzeltildi. Kaldırılan panelin ses/toz DOM bağımlılıkları da temizlendi.
- Önceden kirli taret/kamera değişikliklerini commit'e katmamak için yalnız ilgili index snapshot hazırlandı; snapshot masaüstünde HEAD davranışını korur, mobilde mevcut smooth manual API kullanır. Çalışma alanındaki manuel masaüstü davranışı korunur.
- Commit için ayrılan temiz index snapshot: map:check, touch:test, npm test ve map:build geçti. Ayrı Chromium denemesinde mobil eşzamanlı girişler, dolum, MG, bırakma ve masaüstü panel yokluğu tekrar geçti; pageerror kaydı boş.
- Son APK render ölçeği ve panel DOM temizliğiyle tekrar derlendi; imza doğrulandı. Zip içindeki Havok WASM, iki gerçek GLB ve HAVOK.txt kontrol edildi. Son APK SHA-256: fce2b7405df933e0f1a01be59a4fb593d737ab00f45e9f76f60a8df79c8db0c5.
