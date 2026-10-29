# Task Plan: Kül Vadisi koridor birlikleri

## Goal
İki takım için üç koridora 30 saniyede bir üçer zayıf insansız paletli araç üretmek; menzil/görüş, tank ve birlik hasarı, sıfırlama ve temizlemeyi bağlamak.

## Next Step
Bağımsız dalga/çatışma modeli ve ortak kaynaklı araç görünümünü uygulamak.

## Current Phase
Phase 3

## Phases

### Phase 1: Requirements & Discovery
- [x] Kullanıcının onayları ve mevcut kaynaklar okundu.
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Sabit adım, üç rota, kaynak havuzu ve mevcut hasar bağlantısı seçildi.
- **Status:** complete

### Phase 3: Implementation
- [ ] Dalga modeli, görünüm, ana oyun ve takım bağlantıları.
- **Status:** in_progress

### Phase 4: Testing & Verification
- [ ] Süre, hedefleme, hasar, engel, kaynak temizliği ve derleme.
- **Status:** pending

### Phase 5: Delivery
- [ ] Belgeler, ilgili diff, commit ve push.
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 30 s / koridor başına 3 / iki üs | Kullanıcı onayı |
| 45 m menzil / 1 tank hasarı / 20 can / 6 m/s | İlk deneme ayarları |
| 108 canlı sınırı, 240 s ömür | Sınırsız birikmeyi önleme |
| Hafif animasyonlu raycast gövdeleri, katı tank engeli yok | Küçük destek birliklerinin ana tank yollarını kilitlememesi |

## Errors Encountered
| Error | Resolution |
|-------|------------|
