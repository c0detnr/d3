# Task Plan: Kül Vadisi çizim optimizasyonu

## Goal
Tekrarlanan doğa modellerinin çizim yükünü azalt; yerleşim, çarpışma ve kaynak temizliğini koru.

## Next Step
İncelenen optimizasyon değişikliklerini commit/push et ve sonucu kullanıcıya bildir.

## Current Phase
Complete

## Phases

### Phase 1: Requirements & Discovery
- [x] Kullanıcı optimizasyon uygulamasını istedi
- [x] Mevcut kirli dosyaları koru; yalnız görev farkını commit et
- [x] Kaynak incelemesini findings.md içine kaydet
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Dekor için instance, sert kaya için bağımsız collider; mevcut görünümü koru
- [x] Başlangıç gerçek GLB ölçümü ve görev planı hazır
- **Status:** complete

### Phase 3: Implementation
- [x] Doğa instance ve statik matris değişiklikleri
- [x] Gereksiz pointer move picking kapalı
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Gerçek GLB başlangıç/son yerleşim eşitliği, Havok rotaları, temizlik ve üretim derlemesi
- [x] Sayımlar ve tarayıcı sınırı kaydedildi
- **Status:** complete

### Phase 5: Delivery preparation
- [x] Göreve ait farkları incele ve commit için ayır
- [x] Sonuçları ve açık tarayıcı doğrulamasını kaydet
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|

## Errors Encountered
| Error | Resolution |
|-------|------------|
| İlk yerleşim karşılaştırmasında Float32Array JSON nesne olarak serileşti | Matrisleri normal sayı dizisiyle kaydet; başlangıç matrislerini aynı hassasiyete normalleştir |

- Sınır kutusu karşılaştırması: kaynak GLB accessor ölçüsü ile clone geometri ölçüsü farklıydı; refreshBoundingInfo({}) ile instance ayak izi eskiyle eşitlendi.
- TypeScript refreshBoundingInfo sıfır argümanı reddetti; IMeshDataOptions için boş nesne verildi.

- İzole stage ağacını çalışma ağacı snapshotı ile karşılaştırmak, commit dışındaki arazi yüksekliği değişiklikleri nedeniyle farklı sonuç verdi. İzole ağaçta HEAD doğa koduyla ayrı başlangıç alınıp optimize kod aynı arazide karşılaştırılıyor.
