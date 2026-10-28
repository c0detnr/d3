# Taktik HUD — 2026-10-27

Kullanıcının görsel konsepti onaylamasıyla ana sürüş ve mevcut LAN sahnesine uygulandı. Özgün SVG çizimleri ve CSS; dış görsel varlık veya yeni bağımlılık yok.

- Üstte kameranın baktığı dünya yönünü gösteren pusula. +Z kuzey kabul edilir; K/D/G/B yönleri ve 000–359 derece.
- Nişangâh olarak mevcut dünya projeksiyonundan gelen namlu halkası kullanılır. Dolum süresi ve çubuğu gerçek WeaponSystem durumundan gelir. Yakın engel amber halka ve mesafe uyarısıyla belirtilir.
- Sol altta kameraya göre dönen gövde/kule şeması, gerçek ileri/geri hızının mutlak km/sa değeri ve sürüş yönü.
- Sağ altta ana top, dolum ve Tank 01 için tıklanabilir MG seçimi. Mevcut 1/2 tuşları korunur; Tank 02 ve LAN'da MG sunulmaz.
- Hasar çalışmasının mevcut göstergeleri korunur; aynı aracı iki kez çizmemek için hasar paneli kompakt metin olarak üstte kalır.
- Dokunmatik sürüş/nişan/ateş kontrolleri korunur. Coarse-pointer yerleşimi bunların üstüne taşınır; safe-area boşlukları kullanılır.

HUD yalnız sunum katmanıdır. Ana sahnede mevcut 10 Hz telemetri akışı kullanılır. LAN'da hız, iki sunucu pozunun 60 Hz tick farkından elde edilir; istemci fizik çalıştırmaz. Kule açısı sunucunun ara değerlenmiş açısıdır. DOM ve dinleyiciler sahne kapanışında temizlenir.

## Doğrulama

- `node --experimental-strip-types scripts/check-tactical-hud.ts`: negatif/çok turlu açı, kuzeyde yuvarlama ve ileri/geri hız birimi kontrolü geçti.
- `npm run map:build`, `npm run lan:check`, `npm run touch:test`, `npm run combat:test`, `npm run lan:test` geçti. Mevcut büyük paket uyarısı devam ediyor.
- Chrome'da gerçek sahne: masaüstü 1255×493, dar ekran 844×390 ve 390×844; iki tank, atış sonrası dolum geri sayımı, HUD düğmesinden MG geçişi ve LAN görünümü kontrol edildi. LAN konsolunda hata görülmedi.
- [Gerçek oyun görüntüsü](previews/tactical-hud.jpg).
- Devam eden hasar değişiklikleri hariç, HEAD + yalnız HUD dosyalarıyla ayrı ağaçta `map:build`, `lan:check` ve HUD hesap kontrolü de geçti.
- Dar ekran kontrolü fiziksel telefon/coarse-pointer cihaz kabulü değildir. APK yeniden üretilmedi; performans ölçümü ve insan görsel kabulü açık. M1/M2/M3 genel kabulü değişmez.

## 2026-10-28 — Sade nişangâh

Kullanıcı tercihiyle yalnız mevcut yuvarlak namlu nişangâhı bırakıldı. Merkez artısı kaldırıldı; commit edilmemiş köşeli odak nişangâhı, ek mesafe yazısı ve yükseklik ölçümü ana oyun ve LAN sahnesinden çıkarıldı. Mevcut dolum ve HUD mesafe bilgisi korunur.

`npm run map:build`, `npm run lan:check` ve `git diff --check` geçti. Büyük paket uyarısı sürüyor. Bu değişiklik için yeni tarayıcı görsel kontrolü yapılmadı.
