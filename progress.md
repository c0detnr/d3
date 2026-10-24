# İlerleme kaydı

## 2026-10-23 — Başlangıç adresi düzeltmesi

- Eksik kök giriş dosyası nedeniyle oluşan 404 giderildi; `index.html` test haritasına yönlendirir.
- `npm start` eklendi, README başlangıç ve değişken port bilgisini içeriyor; harita derlemesine kök giriş dahil edildi.
- 5174 üzerinde başlangıç, ana sayfa/harita/modül HTTP 200 ve `npm run map:build` doğrulandı. Tarayıcı görsel incelemesi yapılmadı.

## 2026-10-23 — Başlangıç belgeleri

- Boş çalışma dizini ve üst dizinlerde uygulanabilir AGENTS.md bulunmadığı kontrol edildi.
- Kullanıcı kararı: plan ve belge aşaması; uygulama koduna başlanmayacak.
- AGENTS.md, README.md ve docs/ altında oyun tasarımı, görsel yön, mimari, yol haritası, doğrulama ve karar belgeleri oluşturuldu.
- Başlangıç görevi için task_plan.md, findings.md ve bu ilerleme kaydı oluşturuldu; toplam 11 Markdown dosyası.
- Yerel Markdown bağlantıları kontrol edildi: kırık bağlantı ve boş dosya yok.
- M2 sürüş / M3 savaş kapsamı ve henüz başlanmadı durumları belgeler arasında kontrol edildi.
- Kesin kullanıcı kararları ve önerilen teknik/tasarım tercihleri ayrıldı.
- Sonuç: başlangıç belge görevi tamamlandı. Yazılım testleri henüz uygulanabilir değil.
- Uygulama, bağımlılık, çalıştırma komutu veya test altyapısı henüz yok.

## 2026-10-23 — İlk tankın modelleme standardı

- Kullanıcının parça hiyerarşisi, bağımsız kule/namlu hareketi, hıza bağlı palet animasyonu ve yaklaşık 12–20 bin üçgen hedefi kaydedildi.
- Mat zeytin yeşili, koyu grafit paletler, seyrek aşınma ve form/ışık önceliği görsel yön ile karar kaydına işlendi.
- Blender ajanı için `docs/TANK_ASSET.md` oluşturuldu; teslim kontrolleri ve açık teknik tercihler onaylanan kararlardan ayrıldı.
- README belge haritası güncellendi. Uygulama kodu ve model üretilmedi; M1/M2/M3 durumları değişmedi.

## 2026-10-23 — Basit test haritası

- `src/game/world/createTestGround.ts`: düz zemin, şerit/dönüş alanı, iki yönlü rampa, beş tümsek, fiziksel sınırlar; statik Havok şekilleri ve dispose.
- `map-preview.html` ve `src/mapPreview.*`: bağımsız kamera önizlemesi, sabit geçici tank, yükleme/hata mesajı; sürüş yok.
- `npm run map:check`, `npm run map:test`, `npm run map:build`: geçti. Üretim derlemesi büyük paket uyarısı verdi.
- Tarayıcı görsel kontrolü araç bağlantı hatası nedeniyle yapılamadı; bu sınır VALIDATION içinde kayıtlı.
- M1 devam ediyor. Tank dosyaları ve mevcut altyapı görevi korundu.

## 2026-10-23 — Blender MCP ile tank modeli

- assets/tanks/iron_dust_01/ altında düzenlenebilir kaynak, hiyerarşik GLB, üç açı render ve JSON kanıt dosyaları üretildi; mevcut Blender sahnesi korundu.
- Görünür model 14.512 üçgen, ayrı prototip çarpışma kutusu 12 üçgen. Zeytin/grafit paleti, köşeli zırh, motor ızgaraları, optikler ve seyrek aşınmalar uygulandı.
- Kule ve namlu hareketi, iki tarafın toplam 12 yol tekerleği, GLB yeniden içe aktarımı, ebeveynlik, konumlar ve materyal yuvaları doğrulandı. GLB üçgenleri doğrudan dosya indekslerinden sayıldı.
- Ön, yan ve üç çeyrek renderlar görsel incelendi. Teslim README'sinde eksen, ölçü, metadata ve lisans/kaynak kaydı açıklandı.
- Blender ad son ekleri ve quaternion modu kaynaklı kontrol hataları düzeltildi; tüm son kontroller JSON kayıtlarında geçti.
- Bu görevde oyun kodu, paketler ve harita değiştirilmedi. Motor entegrasyonu, hareketli palet ve fizik prototipi açık; M1/M2 kabulü tamamlandı sayılmaz.

## 2026-10-23 — Gerçek tank dünyada

- @babylonjs/loaders 9.32.0, core ile uyumlu kilitli kuruldu; kaynak model değiştirilmedi.
- loadTankModel ile GLB, gizli collision metadata, metre ölçeği, zemine hizalama ve dispose eklendi. Geçici maket kaldırıldı; başlangıç kamerası üç çeyrek görünüşe ayarlandı.
- tank:test, map:test, map:build geçti. Chrome içinde görünüm, yakınlaşma ve kamera düğmeleri kontrol edildi; in_world.png kaydedildi.
- M1 hâlâ açık: takip/kesişme, ışık iyileştirmesi ve performans. Sürüş yok.

## 2026-10-23 — Doğal arazi ve orman

- Düz test pisti ve yapay sınırlar yerine dalgalı arazi, toprak patika ve ufuk tepeleri eklendi. Başlangıç alanı düz/açık; ileride çam ve geniş yapraklı orman, seyrek kaya/ot kümeleri var.
- terrain.ts: sabit tohumlu yerleşim, metre cinsinden yükseklik, patika ve başlangıç tanımı. Arazi tek görsel/fizik mesh; yakın ağaç gövdeleri ve kayalar statik Havok engeli. Uzak orman görsel arka plan.
- Tekrar kullanılan ağaç geometrisi, zemin renkleri/üretilmiş tane dokusu, gökyüzü, sıcak ışık, gölge ve mesafe sisi. Tank kaynak/GLB ve paket kilidi korundu.
- map:test, tank:test ve map:build geçti. Chrome başlangıç/genel kamera görünümü incelendi; docs/previews/forest-clearing.png kaydedildi. Büyük paket uyarısı sürüyor; FPS ölçülmedi.
- İlk yüz yönü ve test üçgen örnekleme indeksi düzeltildi. Tarayıcıda kod yenilendiği için eski düğme indeksi geçersiz kaldı; güncel erişilebilirlik ağacı alınarak kamera kontrolü tamamlandı.
- README, görsel yön, kararlar, yol haritası ve doğrulama kanıtı güncellendi. M1 tamamlanmadı, sürüş henüz yok.

## 2026-10-23 — Özel Git deposu kurulumu

- `main` dalıyla Git başlatıldı; ilk proje anlık görüntüsü `0db1108` commit'iyle gönderildi.
- Özel depo: https://github.com/c0detnr/d3 ; GitHub API görünürlüğü PRIVATE, varsayılan dal main. İlk uzak commit yerel HEAD ile eşleşti.
- `.gitignore`: node_modules, dist/dist-map, ortam dosyaları, kimlik bilgileri, yerel yedekler ve Blender otomatik yedekleri dışlandı; paket kilidi ve teslim tank kaynakları korundu. 10 dışlama ve 4 izleme kontrolü geçti.
- Stage diff whitespace kontrolü geçti; metin dosyalarında yaygın gizli anahtar desenleri bulunmadı. Oyun testleri bu Git yapılandırma görevinde çalıştırılmadı.
- AGENTS.md tamamlanan işler için kontrol, commit ve push kuralını içeriyor.
- CLI eski hesap adını gösterdiğinden ilk oluşturma 404 verdi; API'den güncel c0detnr hesabı doğrulanıp işlem tamamlandı.
- Kurulum sırasında devam eden sürüş çalışmasına ait kamera/araç dosyaları yeniden değişti; ilk anlık görüntüden sonraki bu değişiklikler Git kurulum commit'ine katılmadı.

## 2026-10-23 — İlk sürüş fiziği (devam ediyor)

- Modelden COL_Hull kutusu ve 12 tekerlek merkezi çıkarıldı; Blender/GLB değişmedi. Merkezi SI araç tanımı, sabit 60 Hz döngü, input resolver, ray süspansiyon ve temas yüküyle sınırlanan çekiş/fren/yana kayma uygulandı.
- GLB'nin gerçek dünya tarafları kullanıldı; gövde yönü doğrudan değiştirilmedi. Fizik pose'u görsel ankordan ayrıldı, interpolasyon ve tekerlek/palet görsel hareketi eklendi.
- Kamera hedef güncellemesinde açı kayması giderildi; gecikmeli arkaya toparlanma, tekerlekle mesafe ve beş ışınlı engel sorgusu eklendi. HUD 10 Hz DOM güncellemesi; React/Zustand yüksek frekanslı durum taşımıyor.
- map:check, map:test, tank:test, drive:test ve 4 sabit döngü/girdi testi geçti. Hareketli dönüş, yuvarlanma, motor hız sınırı, gövde engeli ve tümsek senaryoları genişletildi; son drive:test geçti.
- Testteki ilk hareketli dönüş beklentisi 2 saniyede >2 m yana sapmaydı; ölçülen 1,19 m, 0,155 rad. Hızlı dönüşün azaltıldığı tasarıma uygun 4 saniyelik manevra ve simetri kontrolüne düzeltildi.
- Tarayıcıda takip ve serbest fare bakışı görüldü; geliştirme modundaki otomatik 600 saniyelik gözlem sürüyor. İlk 180 saniyede sayısal hata yok. Performans sonucu nihai kayıt gelince yazılacak.
- Sunucu yeniden başladığında mevcut sekme yeniden bağlandı; ilk policy yükleme hatası ikinci denemede giderildi.

## 2026-10-23 — Sürüş çalışmasını Git ile kaydetme

- Kullanıcı geliştirmeye yeni sohbette devam edilmesini, bu sohbette Git işinin bitirilmesini istedi.
- Mevcut sürüş düzeltmeleri, otomatik Havok kabul senaryoları, test çıktısı ve geliştirme gözlem aracı commit kapsamına alındı. Paket sürümleri, kilit dosyası ve Blender/GLB korunuyor.
- README, ROADMAP ve VALIDATION mevcut prototipi ve açık kabul maddelerini ayıracak şekilde güncellendi. 600 saniye sonucu kaydedilmedi; M1/M2 tamamlandı iddiası yok.
- Git teslimi öncesi yeniden çalıştırıldı: `npm test`, `npm run drive:test`, `npm run map:test`, `npm run tank:test`, `npm run map:build`; tümü geçti. Derlemenin büyük paket uyarısı sürüyor.

## 2026-10-23 — Taret prototipi

- Mevcut sürüşe kinematik TurretController eklendi. Merkezi araç ayarları, sabit zaman adımı, kısa yönden yaw, sınırlı yükseliş ve render interpolasyonu; gövde Havok fiziği ayrı kaldı.
- Kamera hedefi/namlu doğrultusu ayrı. Fizik sorgusuyla hedef/engel, hizalanma ve açı sınırı göstergeleri; Alt/C serbest bakış; R sıfırlama; genel görünüşte hedef korunması. Nişan sırasında otomatik kamera toparlanması kapalı.
- TankVisual.syncHull sabit adımda yalnızca gövde pozunu günceller; tekerlek animasyonu render aşamasında kalır. GLB, Blender ve paket kilidi değiştirilmedi.
- turret:test, npm test, tank:test, drive:test, map:test ve map:build geçti. Chrome hedef takibi, C serbest bakış/takibe dönüş, genel görünüş, R sıfırlama kontrol edildi; warn/error kaydı boş. Görsel: docs/previews/turret-free-look.png.
- İlk test Hull'u transformNodes içinde aradığı için başarısızdı; mesh/transform metadata aramasıyla düzeltildi. Eski kamera bakışı namlu sınırını aştığından başlangıç nişan açısı ayarlandı.
- README, DECISIONS, ROADMAP, VALIDATION güncellendi. Nişancı görüşü/atış ve tam namlu kesişme çözümü açık; M1/M2 kabulü tamamlanmadı.
- Paralel hareket efektleri belge çalışması d522ee0 commit'iyle ayrı kaydedildi; bu göreve katılmadı.

## 2026-10-24 — Gerçekçi arazi yüzeyi

- Kullanıcı isteğiyle arazi dokuları gerçekçileştirildi. `src/game/world/terrainSurfaceTextures.ts` içinde çalışma anında üretilen 1024² albedo, 1024² normal ve 256² ince detay dokusu eklendi; tümü sabit tohumlu ve dikişsiz.
- Albedo toprak kümeleri, taş taneleri, seyrek çatlaklar ve kuru yaprak/dal artıkları taşır. Normal haritası aynı yükseklik alanından türetilir; detay katmanı farklı ölçekte örneklenerek 22 m'lik ana tekrar kırılır. Arazi düzgün normallerle gölgelenir; patika kenarı dünya gürültüsüyle düzensizleştirildi.
- `npm run map:check`, `npm run map:test` ve `npm run map:build` geçti. Üç kur/temizle çevriminde yeni kaplamalar dahil tüm kaynaklar temizleniyor. Görsel kontrol Chromium headless/SwiftShader 1280 × 720'de yapıldı; [kanıt](docs/previews/terrain-surface.png). FPS ölçülmedi; insan görsel kabulü ve doku ayarı açık. M1/M2/M3 kabulü tamamlanmadı.

## 2026-10-24 — Kamera, nişan ve atış yenileme planı

- Konuşmadaki kontroller, görünür balistik ve hasarı sonraya bırakma kararı `docs/AIM_AND_FIRE_REWORK.md` içine aktarıldı.
- Mevcut kamera/nişan/silah kaynakları okundu; A1–A5 uygulama sırası, girdi/odak güvenliği, otomatik ve tarayıcı kabul senaryoları yazıldı.
- README belge haritası, DECISIONS ve ROADMAP güncellendi. Eski M3.1 kayıtları tarihsel olarak korundu; uygulandı iddiası eklenmedi.
- Oyun kodu, paketler ve Blender/GLB değiştirilmedi. Oyun testleri ve tarayıcı incelemesi belge görevi için çalıştırılmadı.
- Belge doğrulaması: 7 dosyada 33 yerel Markdown bağlantısı ve plandaki kaynak yolları geçerli; A1–A5/kapsam/kabul maddeleri mevcut. `git diff --check` geçti. Git teslimi için yalnız ilgili 7 Markdown dosyası seçildi.
