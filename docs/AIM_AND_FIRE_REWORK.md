# Kamera, nişan ve atış yenileme planı

Tarih: 2026-10-24. Durum: **Uygulama sürüyor; A1 otomatik kontrolleri geçti, tarayıcı kabulü açık.**

## Amaç ve sınır

Sağ tuşla açılan mevcut dürbün görünümünü, taretin sağından yakın üçüncü şahıs nişanına dönüştürmek. Serbest kamera ile taret kontrolünü ayırmak; uçuşu ve düşüşü okunabilen, güçlü geri bildirimli tek atış döngüsü kurmak.

Bu belge mevcut M3.1 prototipinin yenilenmesini tarif eder. Hasar, mühimmat sınıfları, zırh delme, sekme, modüller ve tank imhası sonraki planın konusudur. M1/M2 kabulü açık kalır; sürüş teslimi bu çalışmaya bağlanmaz. Bu belge görevi uygulama kodunu değiştirmez.

## Onaylanan davranışlar

| Durum / girdi | Beklenen davranış |
|---|---|
| Normal görünüm | Fare kamerayı tank çevresinde serbestçe yönlendirir; kamera hareketi tareti veya namluyu yönlendirmez. |
| Sağ fare tuşunu basılı tutma | Kamera taretin sağ yanına yaklaşır; tankın ve namlunun bir kısmı görünür kalır. Dürbün görünümü açılmaz. |
| Sağ tuş + yatay fare hareketi | Taret hedef yönü değişir; taret kendi dönüş hızıyla hedefe yetişir. |
| Sağ tuş + dikey fare hareketi | Namlu hedef yükselişi değişir; namlu kendi hız ve açı sınırlarında hareket eder. |
| Sağ tuşu bırakma | Kamera normal mesafeye döner; taret ve namlu bırakıldıkları yönü korur. |
| Sol tık | Her iki görünümde de tek atış; basılı tutmak otomatik ateş üretmez. Mermi gerçek namlu ağzından, gerçek namlu yönünde çıkar. |
| Doldururken sol tık | Atış yapılmaz, sonraki atış sıraya alınmaz. |
| Nişangâh | Merkez işareti hedeflenen yönü, ikinci işaret gerçek namlu doğrultusunu gösterir. Balistik çarpma noktası hesaplanıp gösterilmez. |
| Mermi | Uçuş süresi, belirgin düşüş ve kısa ömürlü parlak iz; uzakta yükselterek ve hareketli hedefin önüne nişan almak gerekir. |
| Atış kamerası | Oyuncunun bakışında kalır; mermi takip kamerasına geçmez. |
| Geri bildirim | Namlu geri tepmesi, kısa parlama/duman, hafif gövde tepkisi, kısa kamera darbesi, atış ve doldurma sesi, sade dolum göstergesi. |
| Çarpma | Mermi ilk engele çarpar ve biter; yüzeye uygun görsel/ses geri bildirimi verilir. Hasar uygulanmaz. |

Yakınlaşma ve geri dönüş kısa, yumuşak geçişlerdir. Yakın nişanda mevcut bakış yönü korunur; taret bu yöne fiziksel hız sınırlarıyla yönelir. Yakın nişanın mesafesi sabittir; bu teslimde dürbün veya kademeli yakın nişan zoom'u yoktur.

## Başlangıç ayarları ve uygulama yorumları

Aşağıdakiler son oyun dengesi değil, denenecek başlangıç tercihleridir:

- Doldurma süresi 5 saniye. Mevcut 6,5 saniyelik prototip değerinin yerini alır.
- Yakın nişanda tank ekranın sol bölümünde, hedef alanı merkezde kalır. Sağ yan, modelin parça adlarından değil gerçek taret ekseninden hesaplanır.
- Kamera konumu taret çevresinde tanımlanır; bakış hedefi ayrı tutulur. Taret gecikmesi kamerayı ve fare hedefini geri çekmez, takip döngüsü oluşturmaz.
- Sağ tuş bırakıldığında o andaki yerel taret açısı ve namlu yükselişi tutulur; eski dünya hedefini izleyerek dönmeye devam etmez. Gövde dönerse taret gövdeyle taşınır. Bu, “son yönde kalma” ifadesinin başlangıç uygulama yorumudur; bağımsız stabilizasyon sonraki değerlendirmedir.
- Serbest görünümde hedef nişangâhı gizlenebilir; gerçek namlu işareti görünür olduğunda atış yönünü anlatır. Ekran dışındaki namlu için yanıltıcı merkez işareti çizilmez.
- Merkez altındaki mesafe çizgileri yalnızca kalibre edildikten sonra sayısal etiket alır. Otomatik düşüş telafisi yapılmaz.
- Namlu hızı, yerçekimi ölçeği, iz parlaklığı/uzunluğu, kamera ofseti, geçiş süresi ve darbe büyüklüğü merkezi ayarlanır. Kesin sayılar tarayıcı denemesiyle seçilir; modern gerçek mühimmat performansı iddiası yoktur.
- İlk mermi hasarsız deneme mermisidir. 120 mm AP kimliği ve mevcut delme/sekme sonuçları yeni tasarımın kesin kararı değildir.

## Mevcut kodla ilişkisi

Kaynak incelemesiyle görülen durum; bu görevde çalıştırılarak doğrulanmış davranış sayılmaz:

| Mevcut dosya | Planlanan sorumluluk / değişiklik |
|---|---|
| `src/game/camera/FollowCamera.ts` | Serbest bakış ve takip mesafesi; yakın nişan geçişi ve çevre engeli çözümüyle uyum. |
| `src/game/combat/GunnerSight.ts` | Mevcut namlu kamerası, dar görüş açısı ve tank gizleme davranışı yerine sağ yan nişan kamerası. Gerekirse açıklayıcı yeni dosya adı kullanılır. |
| `src/game/aim/AimSystem.ts` | Kamera hedefi, gerçek namlu yönü ve yakın engeli ayırma; yalnız sağ tuşta nişan hedefi güncelleme. |
| `src/game/vehicle/TurretController.ts` | Sınırlı hız/açı, sabit adım ve interpolasyonu koruma; serbest bakışta yerel açı tutma. |
| `src/game/combat/WeaponDefinition.ts` | 5 s dolum, ayarlanabilir deneme mermisi ve geri tepme ayarları; hasar parametrelerinden ayrım. |
| `src/game/combat/WeaponSystem.ts` | Tek basışta atış, dolum kapısı ve gerçek namlu pozu. |
| `src/game/combat/ProjectileSystem.ts` | Sabit adımlı balistik ve ilk engelde süpürülmüş isabeti koruma; okunur uçuş ve sınırlı yaşam süresi. |
| `src/game/combat/CombatEffects.ts` | Kısa iz, parlama/duman, yüzeye göre isabet; sınırlı havuz ve temizlik. |
| `src/game/combat/ArmorModel.ts`, `ArmorTarget.ts` | Hasar/zırh yeniden tasarımı yok. Mevcut hedefler test yüzeyi olarak kullanılabilir; yeni akış delme/sekme hesabına bağımlı olmaz. İlgisiz kod topluca silinmez. |
| `src/game/audio/`, `docs/SOUND_DESIGN.md` | Mevcut prosedürel ses çekirdeğine atış, mekanik geri tepme/dolum ve yüzey isabet olaylarını ekleme. |
| `src/mapPreview.ts`, `src/mapPreview.css`, `map-preview.html` | Tek girdi sahibi, döngü entegrasyonu, dürbün katmanının kaldırılması ve HUD. |

Sürüş kuvvetleri, dünya, mevcut hareket tozu, Blender/GLB ve paket kilidi korunur. Yeni bağımlılık veya motor değişimi planlanmaz.

## Girdi ve kamera sözleşmesi

- Serbest bakış ve yakın nişan iki ayrı durumdur; geçiş animasyonu girdi yetkisini geciktirmez. Sağ tuş basıldığı anda nişan girdisi alınır, bırakıldığı anda kesilir.
- Aynı fare hareketi iki denetleyici tarafından tüketilmez. Mevcut Alt/C serbest bakış gereksinimi kalkar; sağ tuş dışından taret kontrolü açılamaz.
- Normal bakışta imleç yakalama / sürükleme yöntemi mevcut tarayıcı düzenine uygun seçilir; sol tıkla atış ve UI kullanımıyla çakışmaz. İmleç kilidi gerekirse yalnız kullanıcı etkileşiminde istenir ve Esc ile bırakılır.
- Yakın nişanda tekerlek mesafeyi değiştirmez; normal görünümün önceki takip mesafesi saklanır. Çıkışta güncel bakış korunarak bu mesafeye dönülür.
- Kamera geçişinin tüm yolu ve son konumu çevreye karşı denetlenir. Duvar/zemin içinden geçmez; engelde güvenli mesafeye çekilir, engel kalkınca yumuşak açılır.
- Kamera hedefi görse bile namlu önündeki engel atışı durdurur. Kamera ve namlu arasındaki paralaks korunur; namludan hedefe ışınlamak merminin balistik hareketinin yerini almaz.
- Yakın nişanda otomatik gövde arkasına toparlanma kapalıdır. Genel görünüş nişanı ve ateşi devre dışı bırakır; HUD düğmesine tıklamak ateş üretmez.
- `blur`, gizli sekme, `pointercancel`, yakalama kaybı, Esc, sıfırlama ve sahne kapanışı basılı tuş/atış isteklerini temizler. Dönüşte kendiliğinden nişan veya atış başlamaz.

## Uygulama sırası

A1 uygulandı; A2–A5 sürüyor. Her tamamlanabilir adımda ilgili kontroller, diff incelemesi, commit ve izlenen dala push yapılır.

### A1 — Kamera ve girdi

- Tek girdi yönlendirmesi; serbest bakış ile sağ tuş nişan durumlarını ayır.
- Sağ yan yakın kamera, kesintisiz geçiş, çevre engeli ve yaşam döngüsü temizliği.
- Taretin yalnız nişan sırasında hedef almasını ve bırakınca yerel açılarını korumasını sağla.
- Kabul: Normal bakış tareti oynatmaz; yatay/dikey nişan çalışır; hızlı bas/bırak, araç hareketi ve odak kaybında sıçrama/takılı kalma yok.

### A2 — Nişangâh ve atış döngüsü

- Hedef ve gerçek namlu işaretleri, açı sınırı ve yakın engel geri bildirimi.
- Her görünümde tek basışta atış; 5 s dolum ve sade hazır göstergesi; atış kuyruğu yok.
- Kabul: Taret hedefe yetişmeden ateşlenirse mermi gerçek namlu yönünden çıkar. Aynı anda sağ/sol tuşlar doğru işlenir; basılı sol tuş tekrar ateşlemez.

### A3 — Görünür balistik

- Deneme mermisini hasar/delme çözümünden ayır; sabit adım, yerçekimi ve süpürülmüş sorguyu koru.
- Kısa iz, render interpolasyonu, yaşam süresi/menzil ve havuz sınırı.
- Yakın/orta/uzak mesafelerde gözlenebilir uçuş ve düşüşü ayarla. Başlangıç test mesafeleri 50/150/300 m önerisidir; mevcut haritanın erişimine göre değişir.
- Kabul: Uzaktaki hedef yukarı nişan gerektirir; ince engel atlanmaz, ilk engel sonrası mermi sürmez. Tahmini çarpma işareti ve otomatik düşüş telafisi yok.

### A4 — Atış hissi, yüzey ve ses

- Namlu geri çekilmesi/dönüşü, küçük gövde tepkisi ve kısa kamera darbesi; kamera hedefi gizlice değiştirilmez.
- Kısa parlama ve görüşü boğmayan duman; toprak, beton ve metal için ayrı isabet tepkisi. Mevcut haritada olmayan yüzeyler yalnız küçük test düzeniyle doğrulanır.
- Atış/doldurma/isabet seslerini mevcut AudioSystem yaşam döngüsüne bağla; dış ses gerekirse kaynak/lisans kaydet.
- Kabul: Yakın nişanda hedef ve çarpma görülebilir; sesler üst üste sınırsız birikmez. Görsel/ses havuzları ve kaynaklar temizlenir.

### A5 — Doğrulama ve teslim

- Otomatik kontrolleri, tarayıcı senaryolarını ve insan değerlendirmesini ayrı kaydet.
- README kontrol açıklamalarını, DECISIONS, ROADMAP, VALIDATION ve bu planın aşama durumlarını gerçek sonuçlarla güncelle.
- M1/M2 veya hasarlı M3 teslimini bu çalışmayla tamamlandı işaretleme.

## Doğrulama planı

### Otomatik kontroller

- Nişan açık/kapalı ve geçiş sırasında girdi yetkisi; bırakınca sürmekte olan taret takibinin durması; gövde dönerken yerel açı tutma.
- Taret/namlu hız ve açı sınırları, eğimli gövde ve 30/60/120 FPS tutarlılığı.
- Tek basış/tek atış, iki tuş birlikte, dolum sınır anı, kuyruğa alınmayan erken tık, sıfırlama.
- Gerçek GLB namlu ağzı ve yönü; farklı render hızlarında aynı balistik sonuç, yerçekimi düşüşü, ince hedef ve ilk engel.
- Kaynakları üç kur/kapat çevriminde kontrol et; mermi/efekt/ses havuzlarının sınırlarını doğrula.
- İlgili mevcut komutları kullan: `npm test`, `npm run turret:test`, `npm run combat:test`, `npm run tank:test`, `npm run audio:test`, `npm run map:check`, `npm run map:build`. Sürüş entegrasyonu değişirse `npm run drive:test`; dünya/efekt değişirse ilgili `map:test` / `effects:test`. Yeni kontroller gerekli mevcut testlere eklenir; tanımlanmamış komut varmış gibi yazılmaz.

### Tarayıcı ve insan kabulü

- Dururken/hareketliyken, taret gövdeye göre yana/arkaya dönükken yakın kamera; farklı en-boy oranları ve pencere boyutları.
- Yakın duvar/ağaç/zemin ve eğim; kamera açık görüşteyken namlu engelli atış; taret hedefe yetişmeden ateşleme.
- Sağ tuşa hızlı ve uzun basma, iki fare tuşu, tuşu canvas dışında bırakma, Alt-Tab, gizli sekme, Esc, sıfırlama ve UI tıklamaları.
- Yakın/orta/uzak atışlarda uçuşu, düşüşü ve kısa izi gözle takip etme; sonraki atışın isabete göre düzeltilebilmesi.
- Kamera darbesi, gövde tepkisi, duman ve sesin nişanı okunmaz hâle getirmemesi; atış/dolumun insan tarafından değerlendirilmesi.
- Performans raporunda cihaz, GPU, tarayıcı, çözünürlük ve kaliteyi yaz; efekt/ses açık-kapalı karşılaştır. Ölçüm yapılmadıysa FPS sonucu verme.

## Açık ayarlar ve sonraya bırakılanlar

Kamera ofseti/geçiş hızı, fare hassasiyeti, serbest bakışın imleç yöntemi, mermi hızı/yerçekimi ölçeği, nişangâh çizgilerinin kalibrasyonu ve efekt/ses dengesi uygulamada denenir. Bunlar planın başlamasını engelleyen sorular değildir.

Hasar, zırh delme/sekme, mühimmat türü, tank imhası, bağımsız dünya stabilizasyonu ve düşman AI bu teslimin kabul şartı değildir. Mevcut eski kararlar tarihsel prototip kaydıdır; bu yenilemenin kapsamını genişletmez.

## Belge görevinin doğrulanması

Plan, README bağlantısı, karar ve yol haritası kayıtları hazırlanmıştır. Uygulama testleri veya tarayıcı kabulü bu belge görevi kapsamında çalıştırılmadı. Yerel bağlantı ve Git diff kontrollerinin sonucu `progress.md` içinde kaydedilir.
