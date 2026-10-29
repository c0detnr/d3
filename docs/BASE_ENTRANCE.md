# Üs giriş avlusu

2026-10-29. Kullanıcının onayladığı yerleşim iki üsse nokta simetrisiyle uygulandı. Mevcut özgün GLB modelleri kullanılır; yeni dış varlık yoktur.

## Yerleşim

A üssünde doğma noktası (0, −309) korunur. Komuta merkezi (−48, −330) konumunda, hangarın yanında ve doğma noktasının gerisindedir. Kapısı savaş alanına bakar. Bakım atölyesi (42, −282) ile avlunun sağ önündedir. B üssü bu konumların 180 derece döndürülmüş karşılığıdır.

Üç dış savunma ve bir iç savunma geçici kutusu ile 8 m yüksekliğindeki doğma perdesi kaldırıldı. Her üste mevcut hasarlı beton mevzinin 14 parçası z=±264 m hattına yerleştirildi. Beton 2.5 m, demir uçlarıyla 2.672 m yüksekliktedir; arka payandalar avluya bakar. Ana kapı x=0 çevresinde **24 m**, yan açıklık yerel x=78 çevresinde **40.8 m** genişliğindedir. Duvar uçları da açık kalır; bu bir kapalı çevre çiti değildir.

Ana yol doğrudan tankın önünden çıkar; batı ve doğu yolları ana/yan çıkışlara bağlanır. Ana çıkışta görüş perdesi yoktur. Eski doğma noktasına düz atışı engelleyen kutu testi, çıkışların ve ileri görüşün açık olduğunu doğrulayan kontrollerle değiştirildi. Doğma koruması eklenmedi; gerçek maçtaki doğma güvenliği ve taktik denge ayrıca değerlendirilmelidir. Bu yerleşim savunma zinciri veya üs ele geçirme mekaniği uygulamaz.

## Doğrulama

- `node --experimental-strip-types scripts/check-kul-vadisi.ts`: gerçek GLB/Havok ile iki üste çıkış genişliği, ileri görüş, siperlerin mermi engellemesi ve payanda yönü; bina zemini/ölçeği, komuta merkezi çarpışmaları, iki tankla üç koridor ve iki dere bağlantısının iki yönlü sürüşü, merkez geçişleri ve iki kur/kapat çevriminde kaynak temizliği geçti.
- `npm run map:build`: TypeScript ve üretim derlemesi geçti; mevcut büyük paket uyarısı sürüyor. Commit için ayrılan değişiklikler HEAD üzerine ayrı bir geçici ağaca uygulanarak aynı fizik kontrolü ve derleme tekrar geçti.
- Tarayıcı erişim sunucusu kullanılamıyor (`cua.getState`: browser access host unavailable). Tarayıcı görüntüsü, yakın kamera, insan sürüş hissi ve FPS kabulü yapılmadı. M1/M2/M3 ve K2 genel kabulü kapanmadı.
