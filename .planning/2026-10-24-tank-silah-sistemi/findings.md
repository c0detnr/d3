# Bulgular ve kararlar

## Gereksinimler
- M3.1: tek AP, basit delme, hasar yok, sağ tık basılı nişancı görüşü, görsel-only efekt.
- Mermi gerçek namlu ağzından ve namlu yönünde çıkmalı; kamera hedefi ile namlu ayrı kalmalı.
- Sabit zaman adımı; mermi tünellemesi olmamalı.
- Mevcut M1/M2 kodu ve Blender GLB korunmalı. M2 son kabulü açık.

## Araştırma bulguları
- `TurretController` yaw/pitch kinematik; `getMuzzleRay()` gerçek dünya namlu yönünü veriyor. Gövde tek Havok rigid body.
- GLB hiyerarşisi: `GunPitchPivot` çocukları `Barrel`, `GunPitchPivot_*`, `MuzzlePoint`, `MuzzleShroud`, `GunPitchPivot` (mesh). `Barrel` ve `MuzzlePoint` kardeş; ayrı `RecoilPivot` yok.
- Runtime geri tepme: `Barrel` ve `MuzzlePoint` yerel konumlarını `GunPitchPivot` uzayında birlikte −Z kaydırmak yeterli. Blender değişikliği gerekmiyor.
- `AimSystem.acquire` kamera ileri ışınından hedef alıyor; nişancı görüşünde bu yol kullanılmamalı, hedef fare ile sürülmeli.
- Fizik raycast `scene.getPhysicsEngine().raycast(from,to,{ignoreBody})`; mermi için süpürülmüş segment uygun.
- Harita: spawn (-34, -42); patika +Z. Hedefler patika üzerinde 60/105/150 m civarına yerleştirilebilir. Yükseklik `terrainHeight(x,z)`.
- `Quaternion.FromUnitVectorsToRef` Babylon 9.32'de mevcut; tracer silindirini yönlendirmek için kullanılabilir.

## Teknik kararlar
| Karar | Gerekçe |
|-------|---------|
| Silah tanımı VehicleDefinition'dan ayrı | Sürüş ayarları ile silah ayarlarını bağımsız tutmak |
| Mermi mantığı + görsel aynı sınıfta, raycast enjekte edilebilir | Testte gerçek Havok; oyunda aynı yol |
| Hasar yok, sonuç raporu var | Kullanıcı seçimi; zırh/delme yine doğrulanır |
| Nişancı kamerası hedefe bakar, merkez hedef yönü; halka gerçek namlu | Mevcut üçüncü şahıs semantiğiyle tutarlı |
| Hedefler ayrı statik Havok gövdeleri | Mermi başına gövde yok; bölge eşlemesi gövde→parça ile |

## Uygulama bulguları
- `WeaponSystem` gerçek `getMuzzleRay()` çıktısını kullanır; namlu ağzından 0,35 m ileri spawn eder.
- Geri tepme `Barrel` ve `MuzzlePoint` yerel Z konumunu birlikte kaydırır; Havok gövdesine dokunmaz.
- `ProjectileSystem` sabit adımda yerçekimini uygular ve önceki→yeni konum arasında raycast yapar; mermi başına gövde yoktur.
- `ArmorRange` hedef fizik gövdelerini `ArmorPart` eşlemesine taşır; yüzey normali yerel eksene çevrilerek ön/arka/yan/üst/alt seçilir.
- `GunnerSight` sağ tık basılıyken `FreeCamera` kullanır, tank mesh'lerini gizler ve nişan hedefini sağ tık sürüklemesiyle yönlendirir.
- `CombatEffects` özgün prosedürel flare dokusu ve sınırlı sprite havuzu kullanır; ses yoktur.

## Karşılaşılan sorunlar
| Sorun | Çözüm |
|-------|-------|
| `npm run typecheck` kök `tsconfig.json` olmadığı için kullanılamıyor | Bu değişiklikten önce de mevcut; harita kodu `map:check` ile doğrulandı, ayrı düzeltme açık. |

## Kaynaklar
- `docs/GAME_DESIGN.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/VALIDATION.md`
- `src/game/aim/AimSystem.ts`, `src/game/vehicle/TurretController.ts`, `src/game/vehicle/TankVehicle.ts`
- `src/game/world/terrain.ts`, `src/mapPreview.ts`
