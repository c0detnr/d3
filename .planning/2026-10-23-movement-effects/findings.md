# Kaynak bulguları

- README, GAME_DESIGN, ROADMAP, ART_DIRECTION, ARCHITECTURE, TANK_ASSET, DECISIONS, VALIDATION ve kök görev kayıtları okundu.
- M1/M2 kabulü açık; mevcut GLB ve 12 ışın süspansiyonlu sürüş var, toz/ses yok.
- TankVehicle.ContactState yalnızca compression/load/speed/grounded taşıyor. Temas noktası, normal, yüzey kimliği ve yanal hız dışarı aktarılmıyor; gerçek bağımsız palet açısal hızı/patinaj oranı yok.
- terrain.ts içinde pathWeight var; fiziksel zemin türleri ve tutuş ayrımı yok. Görsel yüzey sınıflaması ilk uygulamada ayrı ve geçici olmalı.
- TankVisual sabit adım verisini görsel interpolasyonla işliyor; efektler aynı oyun katmanında kalmalı.
- Görev başında taret çalışmasına ait findings.md, task_plan.md, FollowCamera.ts, VehicleDefinition.ts değişmiş; TurretController.ts izlenmiyor. Bu değişiklikler commit kapsamı dışında.
- Sayısal efekt değerleri ve bütçeler prototip önerisi olacak; performans ölçülmedi.
