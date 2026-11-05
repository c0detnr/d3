# Sis mühimmatı — perde ve ikmal

**Durum (2026-11-05):** Beşli kapsül salvosu, billboard bulutları, büyüme/sönme/rüzgâr, başlangıç şarjları, HUD uyarıları, ikmal işareti ve ortak ses hattı uygulandı. Otomatik kabul geçti. **Tarayıcıda görsel/klavye/ses kabulü ve GPU/FPS ölçümü yapılmadı.** Gerçek kule atıcılarına bağlama adımı aşağıda açık.

## Kullanım ve denge

- Başlangıçta **2 şarj**, kapasite **3**. G veya HUD hücresi bir şarj tüketir; ana top dolumunu etkilemez. Atışlar arasında **12 saniye** beklenir; böylece iki perde örtüşebilir.
- HUD şarjı ve kalan saniyeyi gösterir. Şarj yokken G, iki saniyelik **SİS ŞARJI YOK · F İLE İKMAL** uyarısı verir. Beklerken kullanım kalan süreyi bildirir.
- Başlangıç çevresindeki üç sandık birer şarj verir. **8 m** içinde, arada fiziksel engel yokken **F — Sis şarjı al** istemi görünür. Sandık çevresinde hafif titreşen açık yeşil halka bulunur; dolu envanter sandığı tüketmez.
- Alınınca sandık ve işareti kapanır; yükselen kısa ses ve **+1 SİS ŞARJI** bildirimi gelir. Sandıklar kendiliğinden yeniden doğmaz.
- R, sandıkları geri getirir, mevcut sisi temizler ve başlangıçtaki iki şarjı verir. Yenilemede envanter saklanmaz.
- Mevcut oyun odağı, duraklama, genel/serbest kamera ve imha kapıları korunur. LAN sis senkronizasyonu ve yeni APK teslimi bu iş kapsamında yoktur.

Bütün oynanış değerleri metre/saniye cinsinden `src/game/items/SmokeModel.ts` içindeki `SMOKE` nesnesindedir. Bekleme, yarıçap ve parçacık bütçesi dahil bu değerler ilk denge ayarlarıdır; insan oynanış kabulü değildir.

| Alan | Değer |
|---|---|
| Salvo | 5 küçük kapsül; sağ/sol atıcı kökenleri, öne yelpaze |
| Uçuş | 0,8 sn; 2,4 m ek yüksekliğe çıkan parabolik kavis |
| Yerleşim | Yaklaşık 11–12 m önde, merkezden ±6 m yana; 2,1 m yükseklikte hava patlaması |
| Büyüme | İlk 1 sn hızlı genişleme; kalan sürede yaklaşık %10 ek genişleme |
| Bulut ömrü | Patlamadan sonra 20 sn: 1 sn büyüme + 14 sn yoğun + 5 sn incelme |
| Tam yarıçap | 6 m; düşey oran 0,7 |
| Rüzgâr | X: 0,14 m/sn, Z: 0,055 m/sn; görsel ve AI hacmi birlikte sürüklenir |
| Görüş eşiği | Işık geçirgenliği %20 altına düşünce AI görüşü kesilir |
| Fiziksel koruma | Yok; mermiler geçer, sis hasar vermez |

## Görsel ve ses

`SmokeParticles` iki ortak SpriteManager kullanır: perde için en çok **240 billboard** (10 bulut × 24), atıcı parlamaları için beş sprite. Bulutların farklı hacim içi konumları, boyutları, başlangıç kareleri, dönüşleri ve dönüş hızları vardır. CC0 [Brackeys VFX Bundle](../assets/vfx/brackeys/README.md) içindeki mevcut `cloud_01_8x8.png` ve `muzzle_02_a.png` yeniden kullanılır; yeni paket veya dış varlık eklenmedi.

Kirli beyaz/gri renkler sahnedeki DirectionalLight yönüne göre tonlanır. Yumuşak alfa dokusu kenarları inceltir. Bulut sönme sırasında küçülmez; alfa ve optik yoğunluk azalır. İki perde örtüşürken eski bulutun silinmesi diğerinin parçacık düzenini değiştirmez.

`SmokeScreen` derinlik üzerinden ışın/elipsoit integralini hesaplar: sisin önündeki nesneler korunur; bulut arkasında yoğun örtü oluşur. İçeride hacim perdesinin opaklığı %68 ile sınırlanır; yakındaki billboardlar ve içerideki parçacık katmanı da inceltilir. Sınır geçişi bir metre boyunca yumuşatılır. Bu okunabilirlik tercihi AI'ın görüş eşiğini değiştirmez.

Hacim shader'ı bulut başına üç yerine bir detay konumu örnekler. Tam ekran çözünürlüğü korunur. Parçacık sayısı, doku sayısı ve eşzamanlı perde sayısı sınırlıdır; **bu bütçe gerçek cihazda kare düşüşü olmadığına dair ölçüm değildir**.

`SmokeAudio`, AudioSystem'in mevcut master/limiter hattına bağlanır; ikinci AudioContext açmaz. Kısa filtrelenmiş “pof”, patlama nefesi ve ikmal tonu prosedüreldir. Ses seviyesi, susturma, sekme askısı ve stüdyo kaydı mevcut ses sistemiyle ortaktır; ses yalnız kullanıcı etkileşimiyle açılan bağlamda çalar. Sesler ve olay dinleyicileri kapanışta temizlenir.

## AI ve entegrasyon

`SmokeModel.blocksSight` yumuşak yoğunluğun ışın boyunca integralini kullanır; gözlemci veya hedef hacmin içindeyken de çalışır. Görsel ve AI aynı `smokeRadius`, `smokeCenter`, `smokeStrength` hesaplarını kullanır. Son beş saniyede yoğunluk azalınca görüş, bulut tamamen silinmeden geri gelir.

Mevcut yerel EasyDuelAI, TeamDuel hedef seçimi/ateş kapısı ve LaneDrones görüş/ateş kararı zaten bu modele bağlanır. EasyDuelAI görüş kesilince nişan hedefi üretmez ve ateşi hemen kapatır; yeniden görüşte mevcut 0,85 sn tepki süresini uygular. Bu davranışlar değişiklik gerektirmedi; gerçek sınıflarla otomatik sınandı.

**Açık entegrasyon:** `mapPreview.ts` içindeki mevcut `useSmoke()` hâlâ gövde pozisyonunu ve gövde ileri yönünü gönderiyor. `SmokeSupply.launcherPose` isteğe bağlı sağlayıcısı eklendi ve otomatik sınandı: `{ origin, forward }` verildiğinde eski gövde girdilerini geçersiz kılar. Ana ajan, tankın kule dönüşümünden atıcı merkezi ve ileri yönünü sağlayan bu callback'i bağlamalıdır. Bu görevde `src/mapPreview.ts`, `src/lanDuel.ts` ve `src/game/input/*` değiştirilmedi. Callback bağlanana kadar salvo gövde yönünde çıkar; gerçek kule atıcılarıyla hizalanmış kabul edilmez.

Kapsülün çıkış/hedef ışın sorgusu hedefi duvarın önüne kısaltır. Uçuş kozmetiktir; ayrı fizik cismi veya kavis boyunca süpürülmüş çarpışma yoktur. Alçak tavan/çıkıntı kabulü açık.

## Varlıklar

Özgün [ikon](../assets/items/smoke_supply_01/inventory.svg), 1594 üçgenlik [sandık GLB](../assets/items/smoke_supply_01/smoke_supply_01.glb), [kapsül GLB](../assets/items/smoke_supply_01/smoke_capsule_01.glb) ve [Blender kaynağı](../assets/items/smoke_supply_01/smoke_supply_01.blend) korunur. Sandık ve işaretler fiziksel engel değildir; nişan sorgusuna girmez.

## Doğrulama ve açık kabul

- `npm run smoke:test`: başlangıç/kapasite/tüketim/bekleme/uyarı süresi; beşli gerçek GLB kavis; kule pose sağlayıcısı; büyüme ve küçülmeden sönme; rüzgâr; iki perde bütçesi; gerçek EasyDuelAI nişan/ateş kaybı ve yeniden tepki, TeamDuel görüşü ve LaneDroneModel ateşi; çift yön/içeride/ön/üst görüş; 30/60/120 FPS sabit adım; ikmal mesafe/duvar/tek kullanım; kamera değişimi, reset ve iki kaynak temizliği çevrimi.
- `npm run combat:test`, `npm run map:build`, `npm run audio:test` geçti. Derlemenin mevcut büyük paket uyarısı sürüyor. `glslangValidator -S frag /tmp/d3-smoke-work/smoke.frag` yeni GLSL shader'ını doğruladı; önceki sürümün piksel sonuçları yeni görünüşün kanıtı sayılmaz.
- Impeccable'ın HUD dosyaları üzerindeki mekanik kontrolü bulgu üretmedi; bu tarayıcı görsel kabulünün yerine geçmez.
- Ek `node --experimental-strip-types scripts/check-lane-drones.ts` kontrolü mevcut `smoke blocks drone fire` satırında **97 !== 100** ile başarısız oldu. Fikstür, ilk 30 sn simülasyondan sonra görüş engelini açıp sabit 100 can bekliyor; bu dosya değiştirilmedi. Yeni `smoke:test`, sabit başlangıç durumu ve gerçek yoğunlukla dronun sis içinden ateş etmediğini ve incelince devam ettiğini ayrıca sınar.
- **Yapılmadı:** tarayıcıda görsel kalite, F/G etkileşimi, HUD yerleşimi, insan dinlemesi, eğimli arazi/alçak tavan, taktik denge ve iki perdeyle cihaz/tarayıcı/çözünürlük belirtilmiş GPU/FPS ölçümü. Kule callback'i bağlanıp bunlar doğrulanmadan görsel/oynanış kabulü kapanmaz.
