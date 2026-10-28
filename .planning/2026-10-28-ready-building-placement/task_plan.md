# Hazır bina yerleşimi

## Kapsam
Kül Vadisi üs hangarlarını ve merkez depo kutusunu mevcut hangar/atölye GLB dosyalarıyla değiştir. Kaynak modeller ve devam eden doğa/mevzi işi korunur.

## Aşamalar
- İnceleme: complete
- Yerleşim ve fizik kontrolü: complete
- Tarayıcı ve belge: complete
- Teslim hazırlığı: complete

## Next Step
Kontroller ve diff incelemesi tamamlandı; commit/push sonucunu son raporda bildir.

## Errors Encountered
- İlk dosya arama kalıbı büyük harf nedeniyle eşleşmedi; gerçek dosya adlarıyla okundu.

- İlk yön kontrolü birleştirilmeden önceki kapı nesne adını aradı; GLB malzeme grubu olan MH01_Recess_Geometry ile düzeltildi.

## Ek kapsam
Kullanıcı diğer hazır varlıkları da istedi. Yeni teslim edilen beton mevzi GLB altı geçici beton siperin yerine uygulanır; iki tarafın cepheleri ters yönde.
- Atölye ölçü kontrolünde float yuvarlama farkı görüldü; ölçüm toleransı 1 mm yapıldı.

- Tarayıcı 5174 sunucusu kapandığı için bağlantıyı reddetti; ayrı 5175 Vite sunucusuyla görsel kontrol tamamlandı.
