# Kaynak bulguları

- README, GAME_DESIGN, ROADMAP, ART_DIRECTION, ARCHITECTURE, TANK_ASSET, DECISIONS, VALIDATION ve kök görev kayıtları okundu.
- M1/M2 kabulü açık; mevcut GLB ve 12 ışın süspansiyonlu sürüş var, toz/ses yok.
- TankVehicle.ContactState yalnızca compression/load/speed/grounded taşıyor. Temas noktası, normal, yüzey kimliği ve yanal hız dışarı aktarılmıyor; gerçek bağımsız palet açısal hızı/patinaj oranı yok.
- terrain.ts içinde pathWeight var; fiziksel zemin türleri ve tutuş ayrımı yok. Görsel yüzey sınıflaması ilk uygulamada ayrı ve geçici olmalı.
- TankVisual sabit adım verisini görsel interpolasyonla işliyor; efektler aynı oyun katmanında kalmalı.
- Görev başında taret çalışmasına ait findings.md, task_plan.md, FollowCamera.ts, VehicleDefinition.ts değişmiş; TurretController.ts izlenmiyor. Bu değişiklikler commit kapsamı dışında.
- Sayısal efekt değerleri ve bütçeler prototip önerisi olacak; performans ölçülmedi.

## Uygulama bulguları
- İlk üç efekt kullanıcı tarafından seçildi. 12 mevcut ray isabeti ContactState üzerinden kopyalanıyor; fizik kuvveti değişmedi.
- Sabit adımlı simülasyon ve render interpolasyonu ayrı; 320 sprite, toplam 120/sn üst sınır. Kaplama kodla özgün üretildi.
- İlk görsel ayar fazla silikti; yoğunluk/alpha artırıldı. Üretim tavanı nedeniyle hızlı/yavaş test beklentisi en az %50 artış olarak düzenlendi.
- NullEngine scene.spriteManagers ilk SpriteManager'dan önce undefined; temizleme testi sıfır kabul edecek şekilde düzeltildi.
- Tarayıcıda toz ve kapatma doğrulandı. Kısa gözlemde uzun kare aralıkları var; karşılaştırmalı performans sonucu çıkarılmadı.
