# Tank silah sistemi — M3.1 ateş ve balistik çekirdeği

## Goal
Tankın gerçek namlusundan çıkan, yerçekimi ve süpürülmüş isabet kullanan tek AP mermili ateş sistemini; açıya bağlı delme sonucu, sabit zırh hedefleri, sağ tık nişancı görüşü ve görsel geri bildirimle birlikte çalışır hale getir.

## Next Step
Phase 5: Tarayıcıda atış, sağ tık nişancı görüşü, HUD ve efektleri doğrula; performans notunu kaydet.

## Current Phase
Phase 5 — Entegrasyon ve doğrulama

## Kesin kapsam
- Tek 120 mm AP; mesafeyle azalan delme; etkin zırh = kalınlık / cos(geliş açısı); 70° üzeri sekme.
- Hasar yok: hedefler yıkılmaz; sonuç DELDİ / SEKTİ / DELMEDİ / ENGEL olarak raporlanır.
- Sağ tık basılı tut: nişancı görüşü. Bırakınca üçüncü şahıs kamera.
- Görsel-only: namlu alevi, geri tepme, tracer, isabet kıvılcımı/dumanı. Ses yok.
- Kapsam dışı: hedef HP/yıkılma, modül hasarı, HE, düşman AI, oyuncu hasarı, ses.

## Phases

### Phase 1: Silah durumu ve ateş
- [x] `WeaponDefinition.ts`: tek AP, dolum, geri tepme
- [x] `WeaponSystem.ts`: hazır/dolum durumu, gerçek namlu ağzı, görsel geri tepme
- [x] `TurretController`: `Barrel` düğümünü dışa aktar
- [x] Ateş/dolum/sıfırlama birim testi
- **Status:** completed

### Phase 2: Mermi, balistik ve süpürülmüş isabet
- [x] `ProjectileSystem.ts`: havuz, yerçekimi, önceki→yeni raycast, tracer
- [x] Düşüş, tünelleme yokluğu, ilk engel, kendi gövdesini yok sayma testleri
- **Status:** completed

### Phase 3: Zırh, delme ve sabit hedefler
- [x] `ArmorModel.ts`: etkin zırh, mesafe delmesi, sekme
- [x] `ArmorTarget.ts` + `ArmorRange`: 3 sabit hedef, yüzey kalınlıkları
- [x] Açı/mesafe tablosu ve hedef bölge testleri
- **Status:** completed

### Phase 4: Nişancı görüşü, HUD ve efektler
- [x] `GunnerSight.ts`: sağ tık basılı tut, dar FOV, tank gizleme
- [x] HUD: dolum, menzil, sonuç; kapsam overlay'i
- [x] `CombatEffects.ts`: namlu alevi, isabet kıvılcımı/duman
- **Status:** completed (tarayıcı doğrulaması bekliyor)

### Phase 5: Entegrasyon ve doğrulama
- [x] `mapPreview.ts` sabit adım sırası ve `R` sıfırlama
- [x] `combat:test` + mevcut regresyonlar
- [ ] Tarayıcı kabulü ve performans notu
- **Status:** in_progress

### Phase 6: Belgeler ve Git
- [x] ROADMAP / DECISIONS / VALIDATION / README güncelle
- [ ] Diff incelemesi, commit ve `origin/main` push doğrulaması
- **Status:** in_progress

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Tek AP + basit delme | Kullanıcı seçimi; test edilebilir ve M3 çekirdeğini hızlı kurar |
| İlk aşamada hasar yok | Kullanıcı seçimi; atış/balistik/zırh sonucu doğrulanır, hedef sağlam kalır |
| Sağ tık basılı tut nişancı görüşü | Kullanıcı seçimi; bırakınca üçüncü şahsa dönüş |
| Görsel-only efekt | Kullanıcı seçimi; ses varlığı/lisansı sonraya |
| Geri tepme yalnızca görsel | Süspansiyon/fizik dengesini bozmamak; gövde tek rigid body kalır |
| Mermi başına fizik cismi yok | Süpürülmüş raycast tünellemeyi önler ve performansı korur |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `npm run typecheck` kullanım metni döndürüyor | `tsc --noEmit` | Kök `tsconfig.json` yok; bu değişiklikten önce de mevcut. `map:check` ile doğrulandı; ayrı düzeltme açık. |
