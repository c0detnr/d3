# Ses sistemi planı

Durum: **Plan.** Ses kodu henüz yazılmadı; bu belge uygulama sırasını, ses paletini, teknik sınırları ve doğrulamayı tanımlar. M1/M2/M3 kabul durumlarını değiştirmez.

## Amaç ve ilkeler

Ses, tankın kütlesini ve palet/zemin etkileşimini görselden bağımsız olarak hissettirmeli. Low-poly görsel dil gibi ses de özgün ve sade olacak; referans oyunlardan ses dosyası alınmayacak.

- Motor devri, palet takırtısı ve zemin teması sürüş durumundan türetilir; sabit döngü sesi yalnızca arka plan katmanıdır.
- Yüksek frekanslı fizik verisi React/Zustand üzerinden taşınmaz. Ses parametreleri oyun katmanında, sınırlı sıklıkta güncellenir.
- Ses komut gecikmesi yaratmaz; motor sesi girdiden sonra fiziksel tepkiyi destekler, onu taklit etmez.
- Önce sürüş sesleri (M2), sonra savaş sesleri (M3). Müzik, konuşma ve radyo MVP dışında.
- Tüm ilk sesler kodla sentezlenir. Dış örnek kullanılırsa kaynak, üretici, lisans ve değişiklik kaydı zorunludur.

## Sesleri kim üretiyor?

İlk sürüm tamamen prosedürel sentezdir:

- Sesler tarayıcıda Web Audio düğümleriyle (osilatör, gürültü tamponu, filtre, zarf, dalga şekillendirici, convolution reverb) üretilir.
- Ses dosyası indirilmez; paket boyu büyümez, lisans sorunu oluşmaz ve parametreler araç tanımından yönetilebilir.
- Ajan tarafından dinlenemeyen estetik denge, tarayıcıda insan dinlemesiyle ayarlanır. Sayısal kontroller (frekans, kazanç, tepe sınırı, ses sayısı, determinizm, kaynak temizliği) otomatikleştirilir.

Alternatif (varsayılan değil): gerçek kayıt katmanları. Bu yol seçilirse sesler CC0/uygun lisansla `public/audio/` altına eklenir, kaynak ve lisans `docs/` içinde kaydedilir; sentetik katmanlarla harmanlanır.

## Ses paleti ve öncelik

| Öncelik | Ses | Kaynak davranışı | Aşama |
|---|---|---|---|
| P1 | Motor | Rölanti + yük/devir katmanları; gaz ve hızla perde/parlaklık | M2 |
| P1 | Palet takırtısı | Temas sayısı, palet hızı ve yönüyle darbe dizisi; iki palet ayrı | M2 |
| P1 | Rüzgâr/ortam | Hız ve kameraya bağlı yumuşak gürültü yatağı | M2 |
| P1 | Ana ses denetimi | Sesi etkinleştir, kapat, ana ses düzeyi | M2 |
| P2 | Süspansiyon darbe | Temas yükü/compression değişiminden kısa tok darbe | M2 |
| P2 | Fren/hava | Fren girdisi ve duruşta kısa hava tahliyesi | M2 |
| P2 | Taret servo | Açısal hıza bağlı motor vızıltısı; duruşta klank | M2/M3 |
| P3 | Top ateşi | Gürültü patlaması + düşük frekans gövde + reverb kuyruğu | M3 |
| P3 | Mermi uçuşu | Konuma bağlı kısa ıslık/pass-by | M3 |
| P3 | İsabet | Zemin/zırh malzemesine göre tokluk ve metalik bileşen | M3 |
| P3 | Hasar/motor arızası | Motor katmanında kesiklik ve düşük devir | M3 |
| — | Müzik, konuşma, radyo | Kapsam dışı | — |

Ses seviyesi hedefleri başlangıç önerisidir: ana çıkışta tepe ≤ −1 dBFS ve limiter; motor ~−12 dB, palet ~−16 dB, rüzgâr ~−24 dB, top ~−6 dB ve kısa duck. Kesin değerler dinleme ve ölçümle ayarlanır.

## Mimari

Yeni modüller `src/game/audio/` altında toplanır:

| Modül | Sorumluluk |
|---|---|
| `AudioSystem.ts` | AudioContext yaşam döngüsü, master bus + limiter, sessize alma, görünürlük/odak davranışı, kaynak temizliği |
| `AudioDefinition.ts` | Merkezi ses ayarları: kazançlar, filtre kesimleri, zarf süreleri, ses sayısı sınırları |
| `EngineAudio.ts` | Motor katmanları ve devir/yük eşlemesi |
| `TrackAudio.ts` | Palet başına darbe dizisi, hız/yön/yan kayma |
| `AmbienceAudio.ts` | Rüzgâr yatağı |
| `VehicleAudio.ts` | Araç durumundan ses parametrelerini türeten orkestrasyon |
| `WeaponAudio.ts` (M3) | Ateş, geri tepme, mermi, isabet |
| `AudioSelfTest.ts` | Ses düğümü olmadan parametre ve durum kontrolleri için saf fonksiyonlar |

Veri akışı:

```
TankVehicle (hız, temas, komut) ─┐
TurretController (açısal hız)  ─┼→ VehicleAudio (10–20 Hz) → AudioParam hedefleri
Kamera mesafesi                ─┘        ↓
                                    Web Audio düğümleri (tek kez kurulur)
```

- Düğümler başlangıçta bir kez kurulur; render/fizik döngüsünde yeni düğüm üretilmez.
- Parametreler `setTargetAtTime`/`linearRampToValueAtTime` ile yumuşatılır; sıfır geçişlerinde tık oluşmaması için en az 20–50 ms zarf kullanılır.
- Palet darbeleri gibi olaylar önceden ayrılmış küçük bir ses havuzundan çalınır; eşzamanlı ses sayısı sınırlıdır (öneri: toplam 16, palet 8, savaş 8).
- AudioContext ilk kullanıcı girdisinde (tık/tuş) açılır; tarayıcı otomatik çalma kısıtına uyulur.
- Sekme gizlenince veya oyun duraklatılınca ses yumuşakça kısılır/askıya alınır; dönüşte büyük sıçrama olmadan devam eder.
- Sahne kapanışında tüm osilatör, tampon, reverb ve dinleyiciler bırakılır; çift başlatma engellenir.
- M2'de mekânsallaştırma sade: motor/palet tanka bağlı, kamera-mesafe zayıflaması. M3'te dünya olayları (patlama, isabet) `PannerNode` ile konumlandırılır.

## Araç verisinden ses eşlemesi

- Devir göstergesi doğrudan RPM değildir; hız, gaz ve vites/yön işaretinden türetilen sınırlı bir "motor yükü" kullanılır.
- Palet darbe sıklığı `|palet hızı| / bakla aralığı` yaklaşımıyla sınırlandırılır; yan kayma ayrı sürtünme sesi üretir.
- Temas yükü ve süspansiyon sıkışmasındaki ani değişim süspansiyon darbesini tetikler; hava teması sessizdir.
- Taret servo perdesi açısal hıza bağlıdır; hedefe varışta kısa mekanik duruş sesi.
- Tüm eşikler `VehicleDefinition` yanında ayrı `AudioDefinition` içinde SI/Hz/dB olarak tutulur; araç fiziği değişmeden ses ayarı yapılabilir.

## Arayüz ve ayarlar

- Panelde **Ses** aç/kapat ve ana ses düzeyi; ilk sürümde tek kaydırıcı yeterli.
- Gerekirse M3'te **Efekt** ve **Silah** ayrımı eklenir; motor/palet aynı efekt grubunda kalır.
- Ayar Zustand'da düşük frekanslı UI durumu olarak tutulur; kalıcılık (localStorage) isteğe bağlı ve ayrı karar.
- Ses kapalıyken hiçbir ses düğümü çalışmaz; açıldığında yeniden etkinleştirme kullanıcı girdisiyle yapılır.

## Doğrulama

Otomatik (ses donanımı gerektirmeyen):

- Motor devir/yük eşlemesi: monotonluk, üst/alt sınır, NaN üretmeme.
- Palet darbe sıklığı: hız ve yönle artış, duruşta sıfır, üst sınır.
- Taret perde eşlemesi ve süspansiyon tetik eşiği.
- Zarf/kazanç değerlerinin sonlu ve limiter tavanının altında kalması.
- Ses havuzu: eşzamanlı ses sınırı, reset sonrası deterministik durum.
- Sahte ses arka ucuyla kur/kapat döngüsü: düğüm ve dinleyici sızıntısı yok, çift başlatma yok.
- Görünürlük/duraklatma durumunda askıya alma ve geri dönüş davranışı.

Tarayıcıda insan kontrolü:

- Sessiz ortamda ve hoparlör/kulaklıkta 10 dakikalık sürüş; motor, palet, rüzgâr dengesi.
- Gaz/fren/geri/dönüş/rampa sırasında sesin fizikle uyumu; tık/pop ve ani kesilme yok.
- Sekme değiştir, geri dön; ses takılı kalmaz, sıçramaz.
- Ses aç/kapat, düzey kaydırıcısı, R ile sıfırlama.
- Ses açık/kapalı kısa performans karşılaştırması; cihaz, tarayıcı, çözünürlük ve kalite kaydedilir.
- M3: ateş, uçuş ve isabet seslerinin yön/mesafe okunabilirliği.

## Uygulama sırası

1. **S1 — Ses çekirdeği + motor/palet/rüzgâr:** AudioSystem, limiter, ilk kullanıcı girdisiyle açma, ayar paneli, parametre eşlemeleri ve otomatik kontroller. M2 sürüş teslimine ses katkısı.
2. **S2 — Süspansiyon, fren/hava, taret servo:** Olay havuzu ve ek katmanlar; uzun dinleme ayarı.
3. **S3 — Savaş sesleri:** Top, geri tepme, mermi uçuşu, isabet ve hasar; mekânsallaştırma ve M3 ölçümü.

Her adım sonunda ilgili otomatik kontroller, tarayıcı dinlemesi ve mümkünse kısa performans kaydı alınır; çalıştırılmayan kontrol başarılı gösterilmez.

## Açık konular

| Konu | Ne zaman? |
|---|---|
| Prosedürel sentez mi, gerçek kayıt katmanları mı? | S1 başlangıcı (öneri: prosedürel) |
| Ses düzeyi kalıcılığı ve varsayılan seviye | S1 arayüzü |
| Ayrı efekt/silah kaydırıcısı gerekli mi? | S3 |
| Dinleme referansı (hoparlör/kulaklık) ve hedef cihaz | S1 dinlemesi |
| Reverb/oda hissi: kapalı alan yokken ne kadar? | S1–S2 ayarı |
| Müzik ve ambiyans derinliği | MVP sonrası |
