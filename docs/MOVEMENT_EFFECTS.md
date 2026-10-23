# Tank hareket efektleri — uygulama planı

Tarih: 2026-10-23. **Durum: palet temas tozu, hızlı sürüş izi ve dönüş tozu uygulandı. Fren, parçalar, iniş ve egzoz uygulanmadı.** Kullanıcının isteği hareket sırasında çıkan parçacık efektlerini planlamak. Aşağıdaki eşikler, sayılar ve teknik tercihler prototip başlangıç değerleridir; onaylanmış kullanıcı kararı veya ölçülmüş performans sonucu değildir.

## Hedef görünüm

Tankın ağırlığını zeminin verdiği tepkiyle okut: ağır ilerlerken palet hizasında ince toz, hızlanırken uzayan iz, dönüşte yana savrulan toprak. Toz palet çevresinde yoğunlaşır, geride genişleyip dağılır; gövde ve yol okunur kalır. Industrial Low Poly yönü için düzensiz, yumuşak kenarlı kümeler ve seyrek köşeli toprak parçaları kullanılır.

Ana renk kuru toprakta `#BDAB8B`, aydınlanan kenarda `#D5C7AB`, seyrek koyu toprak vurgusunda `#9D6F50`. Duman gibi siyah, parlayan veya kamerayı kaplayan sürekli bir bulut hedeflenmez. Akşam ışığında ve gölge içinde ayrı görsel ayar yapılır. Kaynak: [görsel yön](ART_DIRECTION.md).

## Efektler ve tetikleyiciler

| Efekt | Tetikleyici | Görünüm ve önerilen başlangıç değeri | Sıra |
|---|---|---|---|
| Palet temas tozu | Yüklü zemin teması ve temas düzleminde hareket | İki palet boyunca, temas bölgesinden ince yayılım; 0,3–1,2 m boyut, 0,6–1,6 sn ömür | P1 |
| Hızlı sürüş izi | Temas sürerken artan zemin hızı | Ayrı bulut sistemi yerine aynı tozun üretimi ve boyutu artar; en çok 1,8 m boyut / 2 sn ömür | P1 |
| Yerinde ve hareketli dönüş | Palet taraflarının yerel hız farkı ve yanal hareket | Sağ/sol ayrı yoğunluk; toprak yerel kaymanın tersine ve yana yayılır. Gövde ileri hızı sıfıra yakınken de çalışır | P1 |
| Fren tozu | Hareket hâlinde fren ve ölçülen yavaşlama | Temas bölgesinde kısa yoğunlaşma; yaklaşık 0,15–0,35 sn. Tuşa basılı kaldıkça tekrarlayan patlama olmaz | P1 |
| Toprak/çakıl parçaları | Kuru toprakta belirgin sürüş/dönüş | Seyrek 1–4 cm koyu köşeli parçalar, 0,25–0,7 sn ömür; yaklaşık 0,1–0,4 m yükselme | P2 |
| Yere iniş tozu | Havadan yüklü temasa geçiş ve yeterli darbe | Sadece yere inen tarafta kısa, alçak ve geniş toz; 0,4–1 sn ömür | P2 |
| Egzoz pufu | Motor yükü artışı; hareketten bağımsız motor görseli | Çok seyrek, kısa ve düşük opaklıkta; egzoz çıkışı runtime konumu doğrulandıktan sonra | P3, isteğe bağlı |

Geri sürüşte üretim bölgesi hareket yönüne göre değişir. Tüm tozun gövdenin sabit arka noktasından çıkması yerine yük taşıyan palet temasları kullanılır. Yeni parçacık gerçek temasın yaklaşık 2–5 cm üstünde doğar; küçük başlangıç hızı yüzey normaline ve yerel harekete göre hesaplanır. Doğan toz dünya uzayında kalır; tank döndüğünde eski bulut onunla dönmez.

Egzoz M2 temel toz kabulünün koşulu değildir. Kalıcı palet izleri ayrı bir yüzey/decal işidir; bu parçacık tesliminde yok. Namlu alevi, vuruş, hasar dumanı, kıvılcım, su sıçraması ve çamur püskürtmesi sonraki ilgili sistemlere bırakılır. Mevcut haritada su/çamur yüzeyi varsayılmaz.

## İlk davranış ayarları

- Sürekli toz yalnızca `grounded` ve anlamlı normal yük varken üretilir. Başlangıç yük kapısı, temas başına statik yükün %5'i; eşik çevresinde titreşimi önlemek için küçük histerezis önerilir.
- Hız kapısı için temas düzlemi hızında 0,25 m/sn üstünde açılma, 0,15 m/sn altında kapanma denenir. Yoğunluk yaklaşık 8 m/sn'ye kadar artar ve sınırlandırılır. Bunlar tank hız sınırını değiştirmez.
- Her paletin hızı ayrı kullanılır. Dönüş etkisi temas düzlemindeki boyuna ve yanal hızlardan türetilir; yalnızca gövde hızına veya A/D girdisine bakılmaz.
- Fren pufu için başlangıç adayı: fren etkin, hız >1 m/sn ve filtrelenmiş boyuna yavaşlama >1,5 m/sn². Yeniden tetikleme en erken 0,4 sn sonra; hız sıfırken yeni puf yok. Tümsek kaynaklı tek örneklik hız farkı filtrelenir.
- İniş adayı: en az 0,1 sn temas kaybından sonra yüklü yeniden temas, normal yaklaşma hızı >1 m/sn. Aynı taraftaki altı temas tek olaya birleştirilir; taraf başına 0,3 sn bekleme uygulanır. Küçük süspansiyon salınımı patlama üretmez.
- Doğum oranı saniye başına tanımlanır. Kesirli üretim biriktirilir; render kare sayısı üretim miktarını belirlemez. Sabit tohumlu rastgelelik testleri tekrarlanabilir kılar.

Gaz girdisi tek başına toz nedeni olmaz. Mevcut modelde bağımsız tahrikli palet hızı bulunmadığından gerçek patinaj oranı hesaplanamaz. İlk sürüm yerel temas hareketi/yanal kaymayla çalışır; duvara dayanıp gaz verme durumunda fizik tarafından üretilmeyen patinajı görsel olarak uydurmaz. Gerçek patinaj eklenirse ayrı fizik verisi gerektirir.

## Yüzeye göre tepki

| Görsel yüzey | Toz katsayısı — öneri | Parça davranışı |
|---|---|---|
| Kuru toprak patika | 1,0 | Seyrek toprak ve küçük çakıl |
| Otlu/orman tabanı | 0,35 | Daha az toz; ilk teslimde yaprak sistemi yok |
| Kaya yüzeyi | 0,05 | İlk teslimde parça ve metal kıvılcımı yok |
| Bilinmeyen yüzey | 0,25 | Sadece düşük yoğunluklu toz |

Mevcut `terrain.ts` içindeki `pathWeight` yalnızca patika ağırlığıdır; hazır fiziksel yüzey kimliği değildir. İlk uygulamada gerçek arazi isabetinde bu ağırlıkla patika/otlu alan yumuşak harmanlanabilir; kaya collider'ı ayrıca tanınır. Bu geçici **görsel sınıflama** tutuş veya fiziği değiştirmez. Ağaç gövdesi gibi toz kaynağı olmayan nesneler hariç tutulur. İleride ortak yüzey tanımı geldiğinde efekt ve fizik aynı kimliği okuyabilir.

## Mevcut kodla bağlantı

İlgili kaynaklar: [TankVehicle](../src/game/vehicle/TankVehicle.ts), [TankVisual](../src/game/vehicle/TankVisual.ts), [tankRig](../src/game/vehicle/tankRig.ts), [terrain](../src/game/world/terrain.ts).

`ContactState` bugün yalnızca `grounded`, `compression`, `load` ve boyuna `speed` taşır. Efekt için aşağıdaki sözleşmenin eklenmesi önerilir; bu veriler mevcutmuş gibi kabul edilmez:

| Veri | Birim / kaynak | Kullanım |
|---|---|---|
| Temas noktası ve normal | Dünya metre koordinatı / birim vektör; mevcut süspansiyon ray isabeti | Doğum konumu ve yönü |
| Palet tarafı | Rig'in gerçek konumdan hesapladığı `wheel.side` | Sol/sağ gruplama; GLB adından taraf tahmini yok |
| Normal yük ve temas | N / boolean; süspansiyon | Temas kapısı ve yoğunluk |
| Boyuna / yanal temas hızı | m/sn; mevcut temas hızı hesapları | Sürüş, dönüş, yayılma yönü |
| Görsel yüzey kimliği | Ray isabetindeki gövde/mesh ve arazi koordinatı | Renk, oran, parça seçimi |
| Temas öncesi normal yaklaşma hızı | m/sn; impuls öncesi bağıl hız | İniş olayının şiddeti |
| Fren durumu, gövde hızı, zaman | Komut / m/sn / sn; sabit adım | Fren pufu ve bekleme süreleri |

Önerilen sorumluluklar:

1. `TankVehicle` mevcut 12 ray sonucunu yeniden kullanarak temas örneğini doldurur. Görsel efektler için ikinci bir süspansiyon ray seti açılmaz.
2. `src/game/effects/MovementEffects.ts` sabit fizik adımıyla temasları palet başına toplar; sürekli üretim isteğini ve bir defalık fren/iniş olaylarını oluşturur. Fizik kuvvetlerini değiştirmez.
3. Render tarafı zaman damgalı olayları bir kez tüketir; sürekli kaynakları TankVisual ile aynı interpolasyon zamanına yerleştirir. Bir render karesinde birden çok fizik adımı varsa olaylar kaybolmaz veya tekrar oynatılmaz. Doğmuş parçacıklar dünya uzayında yaşar.
4. `MovementEffectsDefinition.ts` hız eşikleri, ömür, boyut, yüzey katsayıları ve kalite limitlerini SI birimleriyle tek yerde tutar; araç başına fark gerekirse merkezi araç tanımı bu profile referans verir.
5. Başlangıçta ortak toz atlası kullanan, kapasitesi sınırlı sprite parçacıkları ve havuzlanmış küçük görsel parçalar denenir. Her parçacık için React bileşeni veya Havok gövdesi oluşturulmaz. CPU/GPU parçacık seçimi kurulu Babylon sürümünde ölçülerek yapılır; API seçimi bu belgede kesinleştirilmez.

Toz yavaşça yükselir, yayılır ve sönümlenir. Toprak parçaları basit balistik görseldir; ilk prototipte kısa ömürle zemine yakın söner, zıplama/çarpışma simülasyonu vaat edilmez. Eğimde zeminin içinden görünme veya kameradan bakıldığında kart kesişmesi olursa ömür/boyut ve basit arazi örneklemesi değerlendirilir; pahalı parçacık fiziği eklenmez.

## Kalite ve kaynak bütçesi

Aşağıdakiler tek oyuncu tankı için başlangıç tavanlarıdır; ölçülmüş kapasite değildir. Rakamlar tüm temasların toplamıdır; 12 temasla çarpılmaz. Sürekli toz ile fren/iniş aynı havuzu paylaşır.

| Profil | Toplam toz doğumu üst sınırı | Canlı toz tavanı | Canlı toprak parçası tavanı |
|---|---|---|---|
| Düşük | 60/sn | 160 | 0 |
| Orta — ilk deneme | 120/sn | 320 | 24 |
| Yüksek — ölçüm sonrası | 200/sn | 512 | 48 |

Puf için toplam oran limitini aşmayan kısa üretim artışı kullanılır; havuz doluysa yeni düşük öncelikli üretim atlanır, kapasite büyümez. Egzoz eklenirse aynı toplam görsel bütçe içinde pay ayrılır. Efektleri kapatma seçeneği olur. Uzak genel kamera görünümünde üretim azaltılır; tam kaybolmada yeni üretim durur. Sayı kadar büyük saydam kartların ekranı kaplaması da ölçülür.

Sahne kapanınca parçacık sistemleri, havuzlar, atlas/materyaller ve gözlemciler temizlenir; paylaşılan kaynağın sahibi tek olur. R ile sıfırlamada parçacıklar, olay kuyruğu, hız geçmişi ve üretim birikimi temizlenir; başlangıçta sahte iniş oluşmaz. Gizli sekmede üretim/yaş ilerlemesi durur, dönüşte süre ve olay birikimi sıfırlanır; toplu parçacık patlaması olmaz.

Atlas ve küçük parçalar bu projede prosedürel/özgün üretilecek geçici varlık önerileridir; henüz üretilmedi. Uygulamada kaynak/üretici kaydı eklenir; dış varlık seçilirse lisans ve değişiklikler teslim kaydına yazılır. Blender tank kaynağına bu plan nedeniyle değişiklik gerekmiyor; egzoz bağlantı noktası ayrıca doğrulanır.

## Uygulama sırası ve kabul

**P1 — M2 temel toz:** Temas veri sözleşmesi → iki palet için kuru toprak tozu → ileri/geri/yerinde dönüş → fren ve yaşam döngüsü. Önce mevcut dünya ve sürüş kabulü korunur; taret/savaş entegrasyonuna bağımlılık eklenmez.

**P2 — Yüzey ve darbe ayrıntısı:** Görsel yüzey ayrımı, seyrek parçalar, yere iniş pufu. P1 görünümü ve performansı kabul edildikten sonra.

**P3 — İsteğe bağlı cila:** Egzoz ve gerekirse daha gelişmiş ışık/yumuşak kesişme. P3, M2 teslimini bekletmez.

| Kontrol | Kabul beklentisi | Yöntem |
|---|---|---|
| Duruş, havada gaz, havadaki tek taraf | Yüksüz temasta sürekli toz yok; yerdeki taraf bağımsız çalışır | Mantık testi + tarayıcı |
| İleri/geri ve iki yöne yerinde dönüş | Doğum yönü doğru, gövde hızı sıfıra yakınken dönüş tozu var | Mantık testi + tarayıcı |
| Fren, küçük tümsek, gerçek iniş | Duruşta tekrar puf yok; salınım iniş sanılmaz; altı temas tek taraf olayına birleşir | Sabit adım olay testi |
| Patika, otlu taban, kaya | Katsayılar ve renkler doğru; görsel sınıflama fiziği etkilemez | Sınıflama testi + tarayıcı |
| 30/60/120 render FPS, aynı fizik izi | Sabit tohumla aynı üretim talepleri/olaylar; kareye bağlı artış yok | Başsız mantık testi; canlı sayısı havuz tavanını aşmaz |
| R, odak/gizli sekme, sahneyi üç kez aç/kapat | Eski olay patlaması yok; kaynak sayıları tabana döner | Yaşam döngüsü testi + tarayıcı |
| Yakın/uzak kamera, güneşe karşı ve gölgede sürüş | Tank, palet ve yol okunur; toz tankla dönmez, belirgin zemin altı parçalar yok | Tarayıcı ve insan değerlendirmesi |
| Efekt kapalı/açık aynı rota, 10 dakika | Havuz/kaynak sürekli büyümez; kare süreleri karşılaştırılır | Cihaz/GPU, OS, tarayıcı sürümü, backend, çözünürlük/DPR ve kalite kaydı |

Efekt açık/kapalı ölçümünde ortanca ve p95 kare süresi, takılma, canlı parçacık sayısı ve mümkünse CPU/GPU süreleri tutulur. İlk değerlendirme eşiği, aynı koşullarda p95 kare süresi artışını %10 altında tutmayı denemektir; sonuç alınmadan 60 FPS veya minimum cihaz desteği sözü verilmez. Yetmezse önce boyut/örtüşme, üretim ve parça sayısı azaltılır.

Uygulama sırasında mevcut `npm test`, `npm run drive:test`, `npm run tank:test`, `npm run map:test` ve `npm run map:build` regresyon olarak çalıştırılır. Yeni efekt testleri anlamlı davranışlar için o aşamada eklenir; şu anda efekt test komutu tanımlı değildir. Bu planlama görevinde tarayıcı görünümü, efekt performansı veya yeni efekt davranışı test edilmedi.


## 2026-10-23 — İlk üç efektin uygulaması

Kullanıcı palet temas tozu, hızlı sürüş tozu ve dönüş tozunu seçti. `TankVehicle` mevcut raylardan dünya temas noktası/normalini, düzlemsel hızı, yanal hızı ve isabet nesnesi adını dışarı verir; yeni fizik sorgusu yok. `DustSimulation` sabit 60 Hz'de üretir/yaşlandırır; `MovementEffects` dünya konumlarını render interpolasyonuyla sprite olarak gösterir. Her temas bağımsızdır; ileri/geri, yerinde dönüş ve yanal kayma gerçek temas hareketinden çıkarılır. Patinaj simülasyonu eklenmedi.

- Toplam 120 doğum/sn ve 320 parçacık tavanı; kapasite büyümez. Hız artınca üretim, boyut ve ömür artar. Dönüşte yerel harekete ters ve paletin dışına yayılım vardır.
- Toprak patikası/otlu alan harmanı, kaya azaltması ve ağaç gövdesi hariç tutma görsel sınıflamadır; tutuş değişmedi.
- 64×64 RGBA düzensiz yumuşak toz kaplaması bu projede kodla özgün üretildi; dış varlık yok. İlk görsel prototip ayarları `MovementEffectsDefinition.ts` içindedir; sprite biçim/renk ayarları `MovementEffects.ts` içindedir.
- R sıfırlaması, görünürlük değişimi ve kapatma havuzu temizler. Gizli sekmede adım yok; sahne kapanışında sprite/kaplama temizlenir. Panelde aç/kapat kutusu vardır; 80 m ötesinde üretim azaltılır, 350 m ötesinde kesilir.
- `npm run effects:test` anlamlı davranış, deterministik kare hızı ve gerçek Havok kontrollerini çalıştırır. 10 dakika testi hızlandırılmış sabit adımlı havuz testidir; 10 dakika tarayıcı performans kaydı değildir.
- Fren ve iniş pufu, çakıl/toprak parçaları, egzoz ve kalıcı palet izi bu teslimde yok. M1/M2 son kabulü ve efekt açık/kapalı performans karşılaştırması hâlâ açık.
