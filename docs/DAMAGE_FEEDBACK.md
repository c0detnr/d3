# Hasar ve isabet geri bildirimi

2026-10-27: kullanıcının seçtiği metal darbe, kısa yön göstergesi, araç şeması ve duman/yangın yaklaşımı uygulandı. Oyun ayarları gerçek tank verisi değildir.

## Oynanan davranış

- **Yerel hasar testi:** `map-preview.html?duel=1`. İki tank da hasar alır; top atışı 25 hasar verir; 100→75→50→25→0. R/kurtar iki aracı, hasarı ve efektleri sıfırlar. Kolay mod rakibi görüşte yaklaşır, gecikmeli nişan alır ve açık görüşte karşı ateş eder; engelden kurtulma ve sonuç ekranı açık.
- **LAN düellosu:** aynı hasar ve bölge modeli sunucuda çalışır. İki oyuncu da vurabilir ve hasar alabilir. 5 saniye dolum ve dört isabetlik imha korunur; maç/rövanş kuralları değişmez.
- **Sabit zırhlı hedefler:** mevcut açı/mesafe delme hesabı geri bildirime bağlandı. Delme dar, koyu dumanlı bir darbe; delmeme/sekme daha geniş metal kıvılcımı üretir. Deneme mermisinin 180 m/s balistiği korunur; zırh hedeflerinde mevcut AP delme tablosu kullanılır. Bu tablo LAN tank hasarını değiştirmez.
- **MG:** yerel tanka isabetinde metal saçılması ve “Zırh delinmedi”; can/modül hasarı yok. Görünür kule ve gövde aynı süpürülmüş sorgudan geçer.

Her top isabeti gövdeden 25 can ve vurulan modülden 50 bütünlük götürür. İkinci aynı-bölge isabetinde palet, motor veya kule devre dışıdır. Motor kaybında veya iki palet kaybında çekiş kesilir ve fren uygulanır; tek palet kaybında araç sağlam paletle topallar, kırık palet itki vermez ve yarım fren gibi sürükleyerek aracı kendi yanına çeker; kule mekanizması kaybında dönüş/yükseliş girdisi kesilir. Tamir veya kendiliğinden iyileşme yoktur; sıfırlama/rövanş sistemi yeniler. Fiziksel palet parçalanması veya kopan kule geometrisi eklenmedi.

Bölge gövdenin yerel koordinatında belirlenir: alçak dış yanlar palet, üst bölüm kule, arka güverte motor. Hacim sınırları `DamageModel.ts` içindeki prototip ayarlardır; iki model aynı kuralı kullanır.

## Görsel ve ses

İsabet gerçek temas noktasında kıvılcım ve kısa koyu duman üretir. Hasarlı motor veya 50 ve altı can duman çıkarır; 25 ve altı can küçük alevler, imha ise bir kez parlama ve süren motor yangını üretir. Enkaz geometri olarak dünyada kalır. Duman/alev araca bağlı güncel güverte konumundan yayılır.

Nişangâh yanında etkili isabet, modül ve imha bildirimleri vardır; uçuşan hasar sayısı yoktur. Alınan darbede 1,4 saniyelik turuncu/kritik kırmızı yay kameraya göre saldırı yönünü gösterir. En fazla dört yön işareti tutulur. Kısa kenar parlaması ve küçük kamera darbesi nişan girdisini değiştirmez; hareket azaltma tercihi bu iki yeni hareketi kapatır. Sol altta can ve sabit, namlusu yukarı bakan araç şeması; hasarlı bölge sarı, devre dışı bölge kesik kırmızı kenarla gösterilir. Metin ve durum etiketleri rengi destekler.

Prosedürel metal/delme/imhaya özgü kısa sesler, motor zorlanması ve yangın uğultusu mevcut AudioSystem master/limiter üzerinden geçer. LAN'a ses aç/kapat düğmesi eklendi. Mesafe ve stereo yön uygulanır; ilk kullanıcı etkileşimi sesi açar. Odak kaybı/gizli sekme, sessiz, sıfırlama ve kapanış kaynakları temizler. Sesler prosedüreldir; görsel efektler sonraki Brackeys entegrasyonunu kullanır. Yeni bağımlılık yok.

## Sistem sınırları ve doğrulama

Sunucu en fazla 32 isabetlik bir kuyruğu artan kimlikle snapshot'larda tekrarlar; istemci olayı yalnız bir kez, görüntülenen sunucu zamanına ulaştığında oynatır. Hasar istemciden kabul edilmez. Parçacıklar 128 girişli ortak havuzda ve 60 Hz sabit görsel adımla ilerler; araç dumanı 20 Hz, ortam hasar sesi 2,5 Hz üretilir. Sesler mevcut 12 kısa ses sınırında kalır. Hasar modeli React/Zustand'a taşınmaz.

- `npm run damage:test`: bölge, bağımsız modüller, iki isabetlik arıza, dört isabetlik imha, ölü hedefte tekrar hasar yokluğu.
- `npm run lan:test`: gerçek iki GLB/Havok kulesi, engel/atıcı ayrımı, gerçek hasar olayı, kalıcı ve bağımsız snapshot, modül arızasının fizik/nişan girdisine etkisi, rövanşta olay/modül temizliği.
- `npm run combat:test`: mevcut balistik/nişan/kamera kontrollerine ek delme/delmeme/imhadan sonra sürekli yangında havuz sınırı ve kaynak temizliği.
- `npm run audio:test`: yeni seslerin kurulması, 12 ses sınırı ve temizliği; mevcut waveform kontrolleri.

Tarayıcı kanıtı ve açık kabul maddeleri `VALIDATION.md` içinde tutulur. İnsan dinlemesi, darbe hissi, gerçek Android cihaz ve uzun süre performans kabulü ayrıca yapılmalıdır.

2026-10-28 commit doğrulaması: `npm test`, `combat:test`, `damage:test`, `turret:test`, `mg:test`, `lan:check`, gerçek ağ simülasyonu ve `map:build` geçti. LAN sunucu kontrolü derleme ile çakışınca ENOENT verdi; derleme bittikten sonra tek başına tekrar geçti. Kolay mod AI için hedefsiz durma, görünür hedefe yaklaşma, tepki süresi, atış beklemesi, görüş kaybı ve sıfırlama doğrudan kontrol edildi. Bu turda yeni insan/tarayıcı oynanış kabulü yapılmadı.

2026-10-29: Gelen mermi gövdeye çarpma noktasından momentum itmesi uygular (top geri tepmesinin 0,6 katı, yalnız yerel düello). Oyuncu tankı da duman/alev çıkarır. Tek palet kaybı artık aracı durdurmaz. `map:check`, `lan:check`, `damage:test`, `lan:test`, `drive:test` geçti; tarayıcıda his kabulü yapılmadı.
