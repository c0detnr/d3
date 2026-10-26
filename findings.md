# Bulgular ve kaynak ayrımı

## 2026-10-23 — Git kurulumu

- GitHub CLI hesabı Emirix; proje henüz Git deposu değildi, c0detnr/d3 de mevcut değildi.
- Tank kaynakları ve teslim varlıkları küçük: standart Git yeterli. `.blend1` otomatik yedeği ve `.backups/` yerel tutulacak.
- Paket kilidi, `.blend`, `.glb` ve belge önizlemeleri izlenecek. Bağımlılık ve derleme klasörleri dışlanacak.

## 2026-10-23 — Başlangıç

- Çalışma dizini: /home/mami/Projects/d3. Başlangıçta boştu.
- Kaynak: Bu oturumdaki kullanıcı tasarım metni ve kapsam tercihleri.
- Kullanıcı: masaüstü web, modern kurgusal tanklar, Industrial Low Poly, üçüncü şahıs ve ileride nişancı görüşü.
- Kullanıcı: ilk deneyim tek başına haritada sürüş; son paylaşılan MVP planı üçüncü aşamada savaş mekaniklerini de içeriyor.
- Bu iki hedef M2 sürüş teslimi / M3 savaş vertical slice ayrımıyla korunuyor.
- Kullanıcının seçtiği yığın: TypeScript, Babylon.js, Havok Physics, React, Tailwind CSS, Zustand, Vite; varlık üretimi Blender ve GLB/glTF.
- Paket sürümleri, API uyumluluğu, Havok dağıtım/lisans koşulları ve gerçek performans bu görevde araştırılmadı. Teknik belgeler uygulama planıdır, doğrulanmış entegrasyon raporu değildir.
- Referans görsellerin dosyaları bu klasörde yok; kullanıcı tarafından yazılan görsel tarifler esas alındı.
- Önerilen kontrol ayrıntıları, harita ölçüleri ve performans bütçeleri kesinleşmiş kullanıcı kararlarından ayrı işaretlenecek.

## 2026-10-23 — Altyapı kaynak doğrulaması

- Vite resmi kurulum belgesi Node 20.19+ / 22.12+ istiyor; yerel Node 26.8.2, npm 12.2.0.
- Babylon resmi belgesi Havok Physics V2, async WASM başlatma ve MIT lisansını doğruluyor. WASM SIMD gerekiyor; üretimde paketler yerelden sunulmalı.
- Havok MIT bildirimi dağıtım çıktısına eklenecek.
- Tailwind resmi Vite eklentisi: @tailwindcss/vite ve CSS @import.
- Kaynaklar: https://vite.dev/guide/ ; https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin/ ; https://tailwindcss.com/docs/installation/using-vite ; https://zustand.docs.pmnd.rs/learn/getting-started/introduction ; https://react.dev/versions

## 2026-10-23 — Blender tank varlığı

- Blender MCP bağlantısı çalışıyor; Blender 5.2.1 LTS. Mevcut varsayılan sahne korunarak ayrı IRON_DUST_01 sahnesi oluşturuldu.
- İlk geometri 35.216 üçgendi. Küçük palet parçaları ve silindirlerde gereksiz bevel kaldırılarak 14.512 üçgene indirildi; 12 üçgen çarpışma kutusu ayrı.
- Üç çeyrek render incelendi: silüet, iki palet, zırh plakaları, içi açık namlu ve materyaller okunuyor.
- MCP render aracı istenen proje yolu yerine geçici dizine yazıyor; sonuç proje önizleme dizinine kopyalandı.
- İlk GLB yeniden açma kontrolünde Blender'ın sayısal ad son ekleri eşleştirmeyi bozdu (StopIteration); kontrol ad eşleştirmesi düzeltilecek. Kontrol sahnesi kamerasız olduğundan bu sahnede ön render denenemedi; ana sahneye dönüldü.

## 2026-10-23 — Basit test haritası

- Kullanıcı kapsamı: tankı denemek için çok basit harita. 160 × 160 m taslak; düz şerit, dönüş alanı, 2 m rampa ve küçük tümsekler.
- Gerçek Havok ray sorguları eğimlerin/zeminin statik çarpışmalarını doğruladı. Harita kaynakları üç yaşam döngüsü boyunca temizlendi.
- Tarayıcı aracı: IAB yok; Chrome policy yüklemesi iki kez başarısız. Görsel test yapılamadı.
- Kaynak: https://github.com/BabylonJS/havok ve resmi Babylon Using Havok dokümanı; MIT dağıtım bildirimi korundu. Tüm geometri yerel prosedürel üretim; Blender dosyaları değiştirilmedi.

- Ad son eklerini kaldırarak eşleştirme denemesi WheelArmor gibi tekrar eden parçalarda belirsiz kaldı. Tekerleklerin sabit ayrıntıları tekerleğe birleştirildi; her düğüme kalıcı asset_node_id eklendi. Son GLB 53 düğüm, 42 görünür mesh, 8 materyal içeriyor.
- İçe aktarılan Blender düğümleri quaternion dönüş modundaydı; Euler alanına yazma hareket sağlamadı. Dönüş modu doğru ele alındığında 90° kule ve 15° namlu kontrolleri geçti. Bu hatalar modelin değil kontrol yönteminin hatalarıydı.
- Son kontroller: kaynak ve GLB hareketi, 12 tekerlek merkezi, tam ebeveynlik ve materyal yuvaları; konum farkı 0 m. GLB binary indeksleri 14.512 görünür / 12 collision üçgenini doğruladı.
- Çalışma sırasında README/ROADMAP ve altyapı dosyaları başka çalışmalarla güncellendi; eski plan durumuyla değiştirilmedi. İlk geniş README yaması eski satır nedeniyle uygulanmadı; güncel içerik okunarak yalnızca tank teslim bilgisi eklendi.

## 2026-10-23 — Tankı dünyaya ekleme

- Model teslimi mevcut: 14.512 görünür üçgen, 8 materyal, 53 düğüm. Kaynak ve GLB hareket kontrolleri validation.json içinde.
- Önizleme hâlâ kodla üretilen maketi gösteriyor. Gerçek modelin COL_Hull geometrisi metadata ile gizlenmeli; kök seviyesinden 7,6 cm yukarıdaki palet altı zeminle hizalanmalı.
- @babylonjs/loaders henüz kurulu değil; core ile aynı 9.32.0 sürümü kullanılacak. Blender kaynakları korunacak.

- Resmi GLB yükleme kaynağı: https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/glTF.md ; dinamik loaders kayıt yöntemi kullanıldı. Npm peer koşulu core ^9.0.0; aynı 9.32.0 sürümü kuruldu.
- Gerçek Babylon yüklemesinde ilave yaw gerekmiyor; namlu dünya +Z yönünde. Görünür üçgenler 14.512; palet tabanı 0 m. Üç kaynak temizleme çevrimi geçti.
- Chrome görsel incelemesi başarılı; önceki bağlantı sorunu bu oturumda tekrarlanmadı. Zemin aşırı parlak, ışık düzenlemesi sonraki M1 işi.

## 2026-10-23 — Doğal arazi isteği

- Mevcut sahne düz bir kutu, test rampası ve sınır bloklarından oluşuyor; doğal arazi yok.
- Tank dünya +Z yönüne bakıyor. Orman bu yönde, başlangıçtan uzakta yoğunlaşacak.
- Tank GLB ve Blender kaynağı korunacak. Dış varlık/paket eklemeden prosedürel geometri ve vertex renkleri kullanılacak.
- Yerel Vite 5173 üzerinde çalışıyor; Chrome harita sekmesi mevcut. Git deposu yok.

- İlk tarayıcı incelemesinde tank/orman çiziliyor ancak arazi yüzeyi görünmüyor; üçgen yüz yönü ve normal hesabı inceleniyor. Tarayıcı gözlemi tamamlanmış sayılmadı.

## İlk sürüş — kaynak incelemesi

- Mevcut dünya artık prosedürel doğal arazi/orman; eski map:test düz pist beklentileri güncel dünyayla uyumsuz. Doğal dünya korunacak, testleri güncellenecek.
- GLB yüklemesinde Left isimli tekerlekler dünya +X, Right -X tarafında; kuvvet tarafı isimden değil dünya konumundan çıkarılmalı.
- 12 tekerlek merkezi |x|=1,69 m, z=±2,10/1,26/0,42 m; zemin hizalı merkez y=0,64356 m. COL_Hull merkezi y=0,97356 m.
- Resmi fizik kaynağı: https://doc.babylonjs.com/features/featuresDeepDive/physics/usingPhysicsEngine/ . Mevcut kurulu Babylon 9.32.0/Havok 1.3.14 korunuyor; paket kurulmayacak.

- Ters yüz yönü giderildi; Chrome başlangıç görünümünde arazi, tank, patika, ağaç kümeleri ve gökyüzü görünüyor.
- 380 ağaç için tekrar kullanılan geometri ve thin instance matrisleri var; yakın gövdeler statik Havok şekli, uzak orman görsel arka plan.
- Havok doğrulaması görsel üçgenlerin ara noktalarını, düz başlangıcı, doğal eğimleri, patika açıklığını ve kaynak temizliğini kontrol ediyor.

- GitHub CLI yerel auth kaydı eski `Emirix` adını gösterdi; ilk oluşturma isteği HTTP 404 döndü. `gh api user` ile güncel hesap `c0detnr` olarak doğrulandı; depo bu hesapta oluşturulacak.

## İlk sürüş — uygulama ve test bulguları

- Tek Havok dinamik kutu, 12 ray, `ignoreBody` ile kendi gövdesi hariç. Kuvvetler N × sabit dt ile impuls olarak uygulanıyor; Havok applyForce'ın gizli zaman adımına bağlı kalınmadı.
- Düz zeminde son poz kararlı; Havok adım sonu düşey hız yaklaşık -0,060 m/s olduğundan kabul hem iki saniyelik poz farkını (<2 mm) hem hızı (<0,1 m/s) ölçüyor. Statik sıkışma 0,207 m (hedef 0,22 m).
- Fren iki saniyede yaklaşık 0,16 m/s artık hız bırakıyor; beş saniye basılı frenle <0,02 m/s. Anlık hız sıfırlaması yok.
- 30/60/120 FPS aynı 720 adım, aynı son konum ve hız. Hızlı hareketli dönüş yavaşlatılıyor; dört saniyelik dönüşte simetri ve yön ölçülüyor.
- İlk kamera hedef güncellemesi açıyı da yeniden hesaplıyordu. ArcRotateCamera.setTarget dördüncü parametre cloneAlphaBetaRadius=true ile takip açısı korunuyor.
- Node strip-only parameter properties desteklemedi; constructor alan atamaları açık yazıldı. Matrix.FromQuaternion bu sürümde yok; Matrix.Compose kullanıldı. Testler ardından geçti.
- Tarayıcı 10 dakikalık otomatik gerçek zamanlı rota gözlemi 20:34:19 UTC'de başladı; bu insan sürüş hissi değerlendirmesi değildir. İlk 180 saniyede non-finite durum yok, tarayıcı error/warn kaydı boş.
- Çalışma sırasında kullanıcı ayrı Git kurulumunu tamamladı; son kural commit ve origin/main push gerektiriyor. İlk çalışma dosyalarının bir kısmı ilk depo anlık görüntüsüne girmiş, kalan düzeltmeler ayrı commit edilecek.

## Taret prototipi — kaynak incelemesi

- Çalışma ağacı temiz. Sürüş prototipi, FixedStep, TankVisual ve FollowCamera mevcut; önceki konuşmanın eski README durumu artık geçerli değil.
- GLB handedness dönüşümü korunmalı; taret/namlu eksenleri gerçek GLB üzerinde doğrulanmalı. Dünya hedefi yerel pivot uzayına çevrilecek.
- Paket kurulumuna gerek yok; kilit ve Blender varlığı korunacak. Mevcut sürükleyerek kamera kontrolüne Alt ile serbest bakış eklenecek.

- Gerçek GLB testi ilk denemede Hull düğümünü yalnızca transformNodes içinde aradığı için başarısız oldu; Hull mesh olduğundan metadata ile tüm düğümler üzerinde arama düzeltildi. Son taret testi geçti.
- Başlangıç kamerasının eski 26° aşağı bakışı namlunun −8° sınırının dışındaydı. Nişan için hedef yüksekliği 3 m ve başlangıç beta 1,48 rad seçildi; gökyüzüne bakabilmek için üst beta sınırı genişletildi.
- Yaw gecikmesinde arkadaki hedef namluyu gereksizce yukarı kaldırmasın diye yükseliş yatay uzaklıktan hesaplandı. Yakın engel göstergesi gerçek Havok sorgusu; balistik isabet tahmini değil.

## Kamera, nişan ve atış yenileme — 2026-10-24

- Çalışma başında main dalı temiz, HEAD `68d5743`; origin/main izleniyor.
- Güncel kaynak Babylon/Havok kullanıyor. GunnerSight dar açılı namlu kamerası açıp tankı gizliyor; AimSystem normal kameradan hedef alıyor ve taret her sabit adımda bu hedefi izliyor. Yeni girdi sözleşmesi bu bağlantıları ayırmayı gerektiriyor.
- WeaponDefinition mevcut değerleri 900 m/s ve 6,5 s. Kullanıcı okunur uçuş/düşüşü ve 5 s başlangıç dolumunu kabul etti; kesin balistik değerler seçilmedi.
- Mevcut ArmorModel/ArmorTarget delme/sekme içeriyor; hasar yeniden tasarımı istenmedi. Yeni atış yolu bunlara bağımlı olmayacak; ilgisiz kod topluca silinmeyecek.
- Kullanıcının bu turdaki teslim isteği plan dosyası; uygulama kodu ve varlıklar değiştirilmez.

## İkinci tank planı — 2026-10-26

- `tankRig.ts` 12 yol tekeri/temas noktası zorunlu tutuyor; yedi teker/yan yeni model ayrı entegrasyon gerektirir.
- `TurretController.ts` dört namlu parçasını ayrı kaydırıyor; önerilen GunRecoilRoot için çift geri tepme önlenecek şekilde uyarlama gerekir.
- `TankVisual.ts` ilk tankın palet mesh adlarını kullanıyor. Yeni UV/palet sözleşmesi otomatik uyumlu kabul edilmez.
- Blender MCP araçları mevcut; ilk canlı çağrı bağlantı hatası verdi. Plan için model veya mevcut sahne değiştirilmedi.
