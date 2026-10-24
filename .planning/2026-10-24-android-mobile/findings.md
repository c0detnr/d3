# Bulgular
- Mevcut Babylon/Havok oyunu Vite map:build ile paketleniyor.
- Çalışma başlangıcında taret/kamera ve MG Blender dosyalarında kullanıcı değişiklikleri mevcut; başlangıç kopyaları /tmp/iron-dust-mobile-baseline altında.
- Android SDK 35/36, build-tools 36, Java 17 ve Gradle 9.3.1 önbellekte mevcut. Bağlı Android cihaz yok.
- Android resmi yerel içerik belgesi HTTPS origin üzerinden paket varlıklarının yüklenmesini öneriyor: https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
- AGP 9.1 için Gradle 9.3.1 uyumlu: https://developer.android.com/build/releases/about-agp
- Mevcut hareket efektleri korunacak. Harici görsel gerekmiyor; kontroller özgün CSS/SVG ile ölçeklenecek.
