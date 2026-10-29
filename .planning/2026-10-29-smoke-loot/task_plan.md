# Task Plan: Sis mühimmatı

## Goal
Özgün 2D ikon, Blender/GLB loot modeli ve ana sahnede toplama/kullanma/AI görüş engeli.

## Next Step
Yalnız ilgili değişiklikleri stage et, diff incele ve commit/push sonucunu doğrula.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- Kullanıcı öne perde ve tanktan tuşla toplamayı seçti.
- **Status:** complete

### Phase 2: Planning & Structure
- SVG ikon mevcut HUD dilini kullanır; tek item, F toplama, G kullanım. Mevcut kirli dosyaları koru.
- **Status:** complete

### Phase 3: Implementation
- Blender kaynak/GLB, ikon, sabit adımlı sis, toplama ve AI entegrasyonu.
- **Status:** complete

### Phase 4: Testing & Verification
- Durum/görüş/GLB/temizlik, build, combat, glslang ve EGL/GLES2 piksel kontrolleri geçti. Tarayıcı host unavailable; görsel kabul açık olarak kaydedildi.
- **Status:** complete

### Phase 5: Delivery
- Belgeler, yalnız ilgili değişiklikleri commit ve push.
- **Status:** in_progress

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Tank önünde sis perdesi | Kullanıcı seçimi |
| Tanktan F ile toplama | Kullanıcı seçimi |
| 3 kullanım, 20 s bekleme | Onaylanan taslağın ilk deneme değerleri |

## Errors Encountered
| Error | Resolution |
|-------|------------|

## Verification notes
- Effect API düzeltildi; Node ESM için .js uzantısı eklendi.
- Kaynak testinin ilk farkı scene-owned BRDF lookup idi; sahne lookup başlangıçta oluşturularak doğrulandı. Gerçek item kaynakları iki çevrimde temiz.
- Tarayıcı host erişimi yok. GLSL derleme ve ayrı EGL piksel denemesi geçti; tarayıcı kabulü yerine sunulmadı.
- Belge patch bağlamı eşleşmeyince yazma yöntemi düzeltildi; diğer dosyalar korunuyor.
