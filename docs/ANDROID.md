# Android sürümü

Kullanıcının 2026-10-24 isteğiyle Android APK ve mobil tarayıcı desteği eklendi. Soldaki geliştirici paneli masaüstü ve mobil HTML'den kaldırıldı. Küçük dolum/menzil göstergesi ve namlu halkası korunur.

## Kurulum

`artifacts/iron-dust-android.apk` dosyasını telefona kopyala, dosyaya dokun ve dosya uygulaması için istenen APK kurulum iznini ver. Android 8.0+ ve güncel Android System WebView/Chrome gerekir; WebGL2 desteği zorunludur. İlk teslim yerel kurulum için debug anahtarıyla imzalıdır; mağaza yayını değildir. Güncellemede aynı yerel debug anahtarı kullanılmalıdır.

Uygulama yatay tam ekran çalışır. Oyun, gerçek GLB modelleri, Havok WASM ve lisans bildirimi APK içindedir; internet/sunucu gerektirmez. WebViewAssetLoader yerel dosyaları HTTPS origin üzerinden sunar. Uygulama internet izni istemez.

## Dokunmatik kontrol

- Sol çubuk: ileri, fren/geri ve dönüş. Geri geçişi mevcut fizik kurallarını kullanır.
- Sağ çubuk: yatay taret, düşey namlu; MG modunda tüfek nişanı.
- Boş oyun alanında sürükleme: kamera bakışı; MG modunda tüfek nişanı.
- ATEŞ: top için her basışta bir atış; MG için basılı tutunca seri atış.
- Mercek: basılı tutunca yakın kamera. FREN: güçlü fren.
- MG/TOP: silah değiştir. KURTAR: başlangıca dön. SES: sesi aç/kapat.

Birden fazla parmakla sürüş, nişan ve ateş eşzamanlıdır. Parmak bırakma, pointercancel, capture kaybı, odak/sekme kaybı girdileri temizler. Dikey mobil tarayıcıda yatay çevirme mesajı gösterilir.

## Tekrar derleme

JDK 17+, Android SDK 36 ve build-tools 36.0.0 kurulu olmalı. `ANDROID_HOME` veya `ANDROID_SDK_ROOT` özel SDK yolu verebilir; varsayılan `~/Android/Sdk`.

```bash
npm ci
npm run touch:test
npm run android:build
```

Script web derlemesini üretir, Android assets klasörüne kopyalar, Gradle ile APK oluşturur ve imzasını doğrular. Çıktı `artifacts/iron-dust-android.apk`. `adb install -r artifacts/iron-dust-android.apk` bağlı telefona yükler. Kaynak Android projesi Git'te; APK, Gradle çıktıları ve üretilen asset kopyaları Git dışında tutulur.

Mobil başlangıç profili: 1024 gölge haritası, antialias kapalı, 1280×720 referansına göre render ölçeği sınırlı. Bunlar FPS garantisi değildir; fizik hâlâ 60 Hz sabit adımda çalışır. Gerçek telefonda uzun sürüş, ısınma, pil ve performans kabulü açık.

Kaynaklar: [Android yerel içerik](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), [AGP 9.1 uyumluluk](https://developer.android.com/build/releases/agp-9-1-0-release-notes), [AndroidX WebKit](https://developer.android.com/jetpack/androidx/releases/webkit). AGP 9.1.0 / Gradle 9.3.1 / WebKit 1.14.0 sabitlenmiştir.
