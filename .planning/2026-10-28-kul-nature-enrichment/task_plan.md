# Kül Vadisi doğa zenginleştirmesi
## Goal
Hazır Quaternius modelleriyle sırt, dere ve taş ocağını zenginleştir; yolları ve merkez görüşünü koru.
## Phases
- İnceleme: complete
- Uygulama: complete
- Gerçek GLB/Havok ve tarayıcı doğrulama: complete
- Belgeler, commit ve push: complete
## Next Step
Teslim; FPS ve insan sürüş kabulü sonraki değerlendirmede.
## Errors Encountered
- İlk okumada KulVadisiLayout.ts büyük harfle arandı; doğru dosya kulVadisiLayout.ts.
- Pillow kurulu değil; yeni bağımlılık eklenmeden mevcut ImageMagick ile dokular küçültüldü.
- IAB bulunmadı; mevcut Chrome bağlantısıyla görsel kontrol tamamlandı. İlk Chrome atamasında tanımsız değişken hatası ardından açılmış sekmeye bağlanıldı.
- Son ekran görüntüsündeki giriş katmanını kapatma denemesinde Chrome CDP zaman aşımı verdi; önceden kaydedilmiş genel/merkez görsel doğrulaması geçerli.
