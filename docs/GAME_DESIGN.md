# Oyun tasarımı

## Kimlik

IRON DUST; War Thunder'ın mekanik derinliğini, World of Tanks'in erişilebilirliğini ve kendine özgü sinematik low-poly görsel dili bir araya getirmeyi hedefler. Referans oyunlarla eşdeğer özellik kapsamı vaat edilmez.

| Alan | Karar |
|---|---|
| Platform | Masaüstü web tarayıcı + Android APK / mobil tarayıcı |
| Tema | Kurgusal modern tanklar |
| Grafik | Stylized realistic low-poly / Industrial Low Poly |
| Kamera | Önce üçüncü şahıs, savaş aşamasında nişancı görüşü |
| Kontrol | Masaüstü klavye + fare; mobil çoklu dokunmatik |
| Oynanış | Erişilebilir, taktiksel ve fizik tabanlı |
| İlk deneyim | Tek başına haritada serbest sürüş |

## Deneyim ilkeleri

- Girdi hemen algılanır; hızlanma ve frenleme kütle, çekiş ve motor sınırlarıyla oluşur.
- Tank araziye oturur; süspansiyon darbeyi emer. Gövde yapay biçimde zemine yapıştırılmaz.
- İki paletin hız/kuvvet farkı dönüşü oluşturur. Hızlı sürüş ve yerinde dönüş farklı hissedilir.
- Kamera çevreyi okumayı kolaylaştırır; sinematik hareket ve sarsıntı kontrolü zorlaştırmaz.
- Derinlik oyuncunun anlayabileceği geri bildirimlerle sunulur. Gereksiz mürettebat ve bakım işlemleri ilk kapsamda yoktur.

## Sürüş teslimi — M2

Tek tank ve farklı zemin/eğim içeren küçük bir test sahası. Oyuncu hızlanır, durur, geri gider, döner ve engebeleri aşar. Motor/palet sesi, süspansiyon ve zemine bağlı toz fiziksel tepkiyi destekler.

Harita önerisi: Düz yol, geniş dönüş alanı, eğimli tepe, yan eğim, sığ hendek ve taşlı patika. Küçük bir sanayi yapısı ölçek referansı olabilir. Kesin boyutlar sürüş prototipinden sonra belirlenir.

## Savaş vertical slice — M3

- Gövdeden bağımsız kule yönlendirme, sınırlı kule dönüş hızı ve namlu yükselişi.
- Nişancı görüşü; hedeflenen yön ile namlunun gerçek yönünü ayıran işaretler.
- Anlık vuruş yerine uçuş süresi ve yerçekimi olan mermi.
- Namlu geri tepmesi, ateş sesi, namlu alevi ve isabet geri bildirimi.
- Zırh açısı, isabet noktası ve temel delme sonucu.
- Temel bölgesel hasar: palet, motor ve kule mekanizması.
- Önerilen ilk doğrulama ortamı: sabit zırhlı test hedefleri. Düşman AI bu vertical slice için zorunlu değildir.

Modern tank stabilizasyonunun ne kadar etkili olacağı ayarlanabilir: hareket hâlinde atış mümkün olmalı; sert arazi ve ani hareketlerin etkisi prototipte değerlendirilmelidir.

## MVP dışında

Multiplayer, tank özelleştirme mağazası, onlarca araç, devasa haritalar ve tüm yapıların fiziksel yıkımı. Bunların daha sonra eklenmesi otomatik taahhüt değildir.

## Önerilen kontroller — henüz kesinleşmedi

| Girdi | Davranış |
|---|---|
| W / S | İleri / yavaşlama ve geri sürüş |
| A / D | Palet farkıyla sola / sağa dönüş |
| Fare | Kamera bakışı ve kule hedef yönü |
| Sol tık | Ateş — M3 |
| Sağ tık | Nişancı görüşü — M3; basılı tutma/aç-kapat kararı bekliyor |
| Esc | Duraklatma ve fareyi serbest bırakma |

Fren/geri geçişi, serbest bakış tuşu ve tankı kurtarma kontrolü sürüş prototipinde kararlaştırılacak.
