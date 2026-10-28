# Kül Vadisi K0 + K1

## Goal
Mevcut test sahasını koruyarak ayrı seçilen, gerçek tankla sürülebilen kaba harita üretmek.

## Next Step
Kontrolleri geçen dar kapsamlı değişikliği commit ve push et; sonucu kullanıcıya bildir.

## Phases
- [x] Mevcut kod, plan, tank ve paralel değişiklikleri incele.
- [x] K0: ölçüleri ve geçici davranışları kaydet.
- [x] K1: arazi, üç koridor, bağlantılar, iki üs ve hedef hacimleri.
- [x] Gerçek Havok kontrolü, sürüş ölçümleri, tarayıcı incelemesi.
- [x] Belgeler ve yalnız ilgili değişikliklerin teslim hazırlığı.

## Decisions
- Kullanıcı K0 + K1 başlangıcını onayladı. Hangar Blender'da üretiliyor; ölçüsü bilinmiyor, geçici hacim kullanılacak.
- Yeni bağımlılık yok; mevcut arazi dokusu, atmosfer ve tank sistemi kullanılacak.
- src/mapPreview.ts ve ROADMAP dahil çok sayıda paralel değişiklik var; yalnız bu görevin farkı stage edilecek.

## Errors Encountered
- VehicleRig.ts bulunmadı; gerçek dosya tankRig.ts.

## Kontrol sırasında giderilenler
- Yol içindeki dış savunma geri çekildi.
- Otomatik kontrolcüde dönüş işareti ve viraj hız kontrolü düzeltildi.
- glTF sahneye ait ortak BRDF dokusu için kaynak sayımı öncesi ısınma yüklemesi yapıldı.
- A/B yan koridor erişim farkı üs başlangıcını avlu merkezine alarak giderildi.
- Büyük haritanın kuşbakışında gökyüzü küresi uzak araziyi kesiyordu; aynı atmosferin çap parametresi artırıldı.
- Geliştirme sunucusu kapanınca TTY ile tekrar açıldı; son görsel kontrol sabit üretim önizlemesinde yapıldı.
