# Fare kilidi

Amaç: Masaüstünde tıkla oyuna gir, Esc ile çık; kilitsizken oyun girdisi verme.

- [x] Mevcut giriş ve kirli çalışma ağacını incele.
- [x] Ana oyun ve LAN fare kilidini uygula.
- [x] Otomatik kontroller ve gerçek tarayıcı kilit/Esc/yeniden giriş denemesi.
- [x] İlgili değişiklikleri ayır ve bağımsız tip/test kontrolünü yap.

## Next Step
Commit oluştur, izlenen dala push et ve sonucu son raporda bildir.

## Hatalar
İlk geniş /tmp araması sistem dizinlerinde izin hatası verdi; sonraki aramalar bilinen konumlarla sınırlı.

Node strip-only parametre özelliğini reddetti; açık alan atamalarına çevrildi. Tarayıcı otomasyonunda bir tıklama ve bir görüntü çağrısı zaman aşımına uğradı; güncel AX görüntüsüyle durum doğrulandı.
