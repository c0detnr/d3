# LAN düellosu

## Goal
İki masaüstü tarayıcıda aynı LAN üzerinden sunucu yetkili tank düellosu.

## Next Step
Ortak Havok simülasyonunu ve maç kurallarını uygulayıp gerçek varlıklarla doğrula.

## Current Phase
Phase 1

## Phases
### Phase 1: Sunucu simülasyonu
- **Status:** in_progress
- Tek Havok dünyası, 100 can / 25 top hasarı, 5 saniye dolum, hazır/rövanş/iptal.
### Phase 2: Bağlantı ve istemci
- **Status:** pending
- Tek komut LAN sunucusu, iki oyuncu, ayrı tarayıcı sayfası; tek oyunculu korunur.
### Phase 3: Doğrulama ve teslim
- **Status:** pending
- İki istemci, sınır doğrulama, regresyon, belgeler, commit ve push.

## Decisions Made
Kullanıcı tasarımı onayladı. İnternet, Android multiplayer, zırh/parça hasarı ve MG hasarı kapsam dışı. Node.js yerel sunucu tüm fizik ve maç sonuçlarında yetkili; WebSocket durum paylaşımı. ws 8.22.0 MIT, Node >=10; mevcut Node 26.8.2. Bağımlılıklar tam sürümle kilitlendi.

## Errors Encountered
İlk geçici task-spec düzenlemesinde iskelet başlığı beklenenden farklıydı; dosya okunarak doğru bölüm düzenlendi.
