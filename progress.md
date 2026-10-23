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
