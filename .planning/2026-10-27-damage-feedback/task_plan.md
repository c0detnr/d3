# Hasar ve isabet geri bildirimi
## Goal
Metal isabeti, gerçek bölgesel hasar, hasar yönü, araç şeması, duman/yangın ve imhayı mevcut yerel ve LAN akışlarına bağla. 100 can / 25 hasar / 5 s dengesi korunur. AI eklenmez.
## Current Phase
Doğrulama ve teslim.
### Phase 1: Kaynak ve kapsam
**Status:** complete
### Phase 2: Ortak hasar, efekt, HUD ve ses
**Status:** complete
### Phase 3: Otomatik ve tarayıcı doğrulama, belge, commit/push
**Status:** in_progress
## Next Step
İki gerçek tarayıcıyla isabet/alınan hasar/imhayı doğrula, belgeleri ve Git teslimini tamamla.

## Kontrol notları
- İlk tarayıcı denemesinde test Q ile ters yöne ateş etti; oyun isabeti doğru biçimde toprak olarak çözdü. Test E yönü ve sunucu yaw gözlemiyle düzeltildi.
- Masaüstü tarayıcıda dört gerçek UI atışı 100→75→50→25→0 çalıştı; imha bildiriminin son modül mesajıyla kısa süre örtüldüğü bulundu ve düzeltildi. Temiz sunucu gereksinimi ve test startup yarışması kaydedildi; mobil test kullanıcı isteğiyle yapılmayacak.
