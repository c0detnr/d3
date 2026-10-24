# MG 02 — sıfırdan Blender teslimi

## Aşamalar
1. İnceleme ve mevcut dosyaları koruma: tamamlandı.
2. Özgün model, tank yerleşimi ve POV: tamamlandı.
3. Hareket, GLB ve görsel doğrulama: tamamlandı.
4. Teslim belgeleri ve Git için ilgili dosyaların seçimi: tamamlandı.

## Next Step
Commit/push sonucunu son yanıtta bildir; sonraki ürün görevi oyun entegrasyonudur.

## Hatalar ve çözümler
- Etkileşimli MCP 300 s zaman aşımı: ayrı stdio MCP istemcisi ve CLI aracı kullanıldı. Açık Blender kapatılmadı.
- inspect.py Python modülünü gölgeledi: inspect_tank.py olarak adlandırıldı.
- Birleştirilmiş mesh nesne referansları: canlı koleksiyon kullanıldı.
- Object.parent_recursive mevcut değil: children_recursive kullanıldı.
- GLB JSON değişkeni açı değişkeniyle gölgelendi: gun_elev adıyla düzeltildi, doğrulama yeniden çalıştırıldı.
- İlk montaj optik muhafazasına giriyordu: 20 konum denemesi sonrası öne/içeri taşındı, taban açıklığı ve 897 duruş yeniden kontrol edildi.

## Açık kapsam
Dinamik kapak rig’i yok; kapak açılma süpürmesi doğrulanmadı. Oyun entegrasyonu yapılmadı. M1/M2/M3 kabulü tamamlanmadı.
