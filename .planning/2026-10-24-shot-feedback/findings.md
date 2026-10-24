# Bulgular

Mevcut geri tepme anlık konum sıçraması + yay; duman/parlama aynı dairesel sprite. Mevcut gövde darbesi 1100 N·s, atış sesi üç kısa katman. Kullanıcının kontrol/kamera çalışmalarına ait kirli dosyaları var; yalnız bu görevin farkları stage edilecek. Hareket tozu ve modeller korunacak.

Uygulama sırasında bağımsız MG entegrasyonu aynı çalışma alanında ilerliyor. CombatEffects.machineGunFlash korunarak yeni doku/havuzla uyumlu tutuldu. İlk map:check eksik MG metodu hatası verdi; yöntem korununca geçti. Başka görevin CombatAudio.machineGunShot, ProjectileSystem ve mapPreview entegrasyonu commit kapsamına alınmayacak.

Bağımsız gövde geri tepme düzeltmesi 51552c4 ile teslim edildi: 16000 N·s darbe namlu pitch pivotuna taşındı; ThermalSleeve/MuzzleShroud namluyla birlikte hareket ediyor. Yeni davranış korunur; bu görevdeki eski 4200 N·s ayarına geri dönülmez. İlk izole doğrulama eşzamanlı recoilParts değişikliğini ayırırken bağımlılık hatası verdi; güncel HEAD tabanı üstünde yeniden doğrulama yapılır.
Tarayıcı yakalamada önce Vite modülünün sorgusuz tekrar import edilmesi kayıt çakışmasına, canlı güncellemeler ise sayfa yenilenmesine yol açtı. Tam modül URLsi ve izole Vite sunucusu kullanıldı. Canvas framebuffer yalnız render callback içinde yakalandı. Ara karede ömrü biten parçacıkların görünmesi düzeltildi.
