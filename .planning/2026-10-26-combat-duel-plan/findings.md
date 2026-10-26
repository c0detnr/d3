# Bulgular

- README, GAME_DESIGN, ROADMAP, DECISIONS, ARCHITECTURE ve VALIDATION incelendi. İndekslenmiş spec aramasında savaş/hasar kaydı bulunmadı; mevcut tasarım belgeleri frontmatter taşımıyor.
- src/mapPreview.ts tek TankVehicle kuruyor; ikinci model URL tank=02 ile seçiliyor. Bu, sahnede iki eşzamanlı tank anlamına gelmiyor.
- Top ve MG isabetleri yalnız efekt/geri bildirim üretiyor. ArmorModel ve ArmorTarget korunmuş, son top akışında delme çözümü kullanılmıyor.
- ProjectileSystem sabit adımlı süpürülmüş sorgu kullanıyor; raycast kapanışı şu anda yalnız oyuncu gövdesini dışlıyor. AI mermileri için atıcı ayrımı gerekiyor.
- Gerçek namlu başlangıcı, 180 m/s, yerçekimi, 5 s dolum, geri tepme ve atış sesi mevcut; bunlar korunacak.
- İkinci tank/sürüş/araç testleri ve kök plan belgelerinde kullanıcıya ait commit dışı çalışmalar var. Bu göreve katılmayacak.
- .planning/.active_plan kullanıcı tarafından değiştirilmiş; bu görev o işaretçiyi değiştirmeden kendi dizinini kullanır.
- docs/VALIDATION.md içindeki eski zırh/modül kabulü uzun vadeli M3 kapsamıdır; basit can düellosu tüm M3 tamamlandı demek değildir.
