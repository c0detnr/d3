# Task Plan: Üs giriş avlusu

## Goal
İki üste komuta merkezi, atölye, açık avlu ve iki çıkışlı hasarlı siper hattı kur.

## Next Step
İncelenen ve doğrulanan görev farkını commit/push et.

## Current Phase
Complete

## Phases

### Phase 1: Requirements & Discovery
- [x] Kullanıcı hasarlı duvarlı giriş avlusunu onayladı
- [x] Kirli çalışma ağacı ve çağrılar incelendi
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Geride komuta, sağda atölye ve iki açık çıkış belirlendi
- [x] Diğer çalışmaların farklarını commit dışında tut
- **Status:** complete

### Phase 3: Implementation
- [x] Kutu/perde yerine hazır GLB modelleri, yollar ve kroki açıklaması
- [x] Belgeler ve mevcut fizik kontrolleri güncellendi
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Çalışma ağacında gerçek GLB/Havok rotaları ve map:build geçti
- [x] İzole commit ağacında aynı fizik kontrolü ve map:build geçti
- [x] Tarayıcı erişim sınırı kaydedildi
- **Status:** complete

### Phase 5: Delivery preparation
- [x] Yalnız görev kapsamı stage edildi ve diff incelendi
- [x] Commit/push için bağımsız doğrulama ve görev kapsamı hazır
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Mevcut hasarlı siper modeli | Özgün görsel dil, hazır ayrı çarpışmalar |
| Ana kapı 24 m ve yan açıklık 40.8 m | Açık görüş ve tank geçişi |
| Yüksek doğma perdesini kaldır | Kullanıcının açık giriş avlusu isteği; maç dengesi ayrıca açık |
| HEAD üzerine yalnız görev farkını ayrı ağaçta doğrula | Diğer kirli değişiklikleri commit etmeden bağımsız teslim |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Doğu yoluna yakın uç siper | Sağ uç parçaları 8.4 m kaydır |
| Karşı üs yolu komuta tabanına yakın | Komutayı arkaya al ve uç yolları nokta simetrili bağla |
| Payanda gerçek GLB yönü ters | A yaw=0, B yaw=π |
| Browser access host unavailable | Görsel/insan sürüş/FPS kabulünü açık bildir |
