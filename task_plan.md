# IRON DUST — Başlangıç belgeleri

## Git kurulumu — 2026-10-23

- Depo/hesap incelemesi: complete. Yerel Git deposu ve `c0detnr/d3` uzak deposu yok; GitHub hesabı Emirix.
- `.gitignore` ve ajan commit/push kuralları: complete.
- İlk commit, özel uzak depo oluşturma ve push doğrulaması: complete. `0db1108`, `c0detnr/d3`, PRIVATE ve uzak `main` doğrulandı.
- Kurulum öncesi `git status` depo olmadığı için çalışmadı; `gh repo view` hedef deponun bulunmadığını doğruladı.

## Next Step

Git kurulumu tamamlandı; hesap düzeltmesi ve doğrulama kaydını commit edip push et. Devam eden sürüş çalışmasının yeni değişiklikleri ayrı tutulur.

## Goal

Uygulama kodu yazmadan proje kurallarını, oyun kapsamını, teknik yaklaşımı ve doğrulama ölçütlerini oluşturmak.

## Current Phase

Başlangıç dokümantasyonu tamamlandı. Kullanıcı altyapı kurulumunu istedi; uygulamaya geçiş hazırlığı sürüyor.

### Phase 1: Mevcut durumu ve kararları derle
**Status:** complete

- Proje klasörü boş; mevcut uygulama, paket veya Git deposu yok.
- Kullanıcının tasarım kararları ve üç aşamalı MVP sırası derlendi.

### Phase 2: Proje belgelerini oluştur
**Status:** complete

- AGENTS.md ve README.md.
- Oyun tasarımı, görsel yön, teknik mimari, yol haritası ve doğrulama planı.
- Karar kaydı ve açık sorular.

### Phase 3: Belgeleri doğrula ve teslim et
**Status:** complete

- Yerel bağlantıları ve kapsam tutarlılığını kontrol et.
- Belgeler ile çalışan özellikler arasındaki farkı açıkça belirt.

## Next Step

Bu belge görevi tamamlandı. Kullanıcı uygulamaya geçmeyi istediğinde docs/ROADMAP.md içindeki hazırlık adımından devam et.

## Decisions Made

- Bu görevin kapsamı yalnızca belge oluşturma; bağımlılık kurulumu ve uygulama kodu yok.
- İlk sürüş teslimi M2 sonunda; savaş içeren vertical slice M3 sonunda.
- Projenin geliştirme durumu docs/ROADMAP.md içinde izlenir; bu dosya başlangıç belgeleri görevini izler.

## Errors Encountered

Henüz hata yok.

## Tank varlığı görevi — 2026-10-23

Kullanıcı Blender MCP ile model üretimini istedi. Oyun kodlaması kapsam dışında.

- Hazırlık ve sahne inceleme: complete.
- Özgün tank, hareket hiyerarşisi ve materyaller: complete.
- GLB dışa aktarım, yeniden içe aktarım ve pivot kontrolleri: complete.
- Üç açı önizleme ve teslim belgesi: complete.

Tank görevi tamamlandı. Sonraki model adımı: M1 motor entegrasyonunda görsel doğrulama; bu teslimde oyun kodu değiştirilmedi.

Kontrol notu: klasör Git deposu olmadığı için git diff uygulanamadı; mevcut belgeler korunarak düzenlenecek.

## Altyapı kurulumu — 2026-10-23

### Phase 4: Sürümleri ve dağıtım koşullarını doğrula
**Status:** in_progress

### Phase 5: Vite, React, Babylon ve Havok başlangıcını kur
**Status:** pending

### Phase 6: Derleme, fizik döngüsü ve tarayıcı kontrolü
**Status:** pending

## Next Step

Resmi kaynakları ve npm paket uyumluluğunu doğrulayarak kilitli kurulumu yap.

## Kurulum notları

- Git deposu yok; mevcut belgeler korunacak.
- assets-source/ ve public/ henüz yok; tank teslimi var sayılmayacak.

## Basit test haritası — 2026-10-23

Kullanıcı sade, tankı deneyebileceği bir alan istedi.
- Arazi ve statik çarpışmalar: in_progress.
- Sahneye bağlama ve tarayıcı incelemesi: pending.
- Doğrulama kaydı: pending.

Sonraki adım: 160 × 160 m test sahasını mevcut altyapıya bağla.

### Basit harita sonucu

- Arazi ve statik çarpışmalar: complete.
- Bağımsız sahne önizlemesi: complete.
- TypeScript, Havok sorguları, üretim derlemesi: complete.
- Tarayıcı incelemesi: araç bağlantısı nedeniyle yapılamadı; M1 açık.

## Next Step

Tarayıcıda map-preview.html görünümünü doğrula; ardından M1 takip kamerası ve gerçek tank entegrasyonuna devam et. M2 sürüş henüz uygulanmadı.

## Gerçek tankı dünyaya ekleme — 2026-10-23

- Teslim dosyalarını incele: complete. GLB, kaynak ve Blender kontrol kayıtları mevcut.
- Babylon GLB yükleyicisiyle sabit dünya yerleşimi: complete.
- Derleme, gerçek GLB yükleme ve tarayıcı kontrolü: complete.

## Next Step

M1 takip kamerasını, kesişme davranışını ve ışık ayarını değerlendir; referans performans ölçümü yap. Sürüş M2 kapsamında.

### Entegrasyon sırasında çözülen kontrol hataları

- Node ESM, loaders/dynamic için .js uzantısı istedi; import düzeltildi.
- Dış anchor ebeveynliği addAllToScene öncesi container uyarısı üretti; önce sahneye eklenerek çözüldü.
- Kaynak mesh sayısı runtime materyal parçalarıyla aynı değil; kabul kontrolü gerçek üçgen sayısı üzerinden yapıldı.
- Ek 180° dönüş namluyu ters çevirdi; Babylon koordinat dönüşümü korunarak kaldırıldı ve dünya +Z doğrulandı.

## Doğal arazi ve orman — 2026-10-23

### Phase 7: Dünya ve çevre düzenlemesi
**Status:** complete

- Düz test pistini açık toprak arazi, doğal eğimler ve ileride sıklaşan ormanla değiştir.
- Tank kaynağını koru; başlangıç çevresini düz ve açık tut.
- Gerçek arazi ve yakın ağaç/kayalar için statik çarpışmalar oluştur.

### Phase 8: Fizik, derleme ve tarayıcı doğrulaması
**Status:** complete

## Next Step

Prosedürel araziyi ve çevreyi oluştur; ardından gerçek Havok ve tarayıcı ile doğrula.

## İlk sürüş fiziği — 2026-10-23

- Aşama 9 — Mevcut doğal arazi/model ve kamera sözleşmesi: tamamlandı (kaynak okuma).
- Aşama 10 — Tek gövde, 12 ray süspansiyon, girdi, sabit döngü: devam ediyor.
- Aşama 11 — Görseller, takip/kesişme, HUD: bekliyor.
- Aşama 12 — Gerçek Havok senaryoları, tarayıcı ve 10 dakika gözlem: bekliyor.
- Aşama 13 — Belgeler ve sonuç kaydı: bekliyor.

## Next Step

Modelden fizik rigini çıkar; 60 Hz tek fizik döngüsünde süspansiyon ve palet kuvvetlerini uygula.

## Bu çalışmadaki hatalar

- Git deposu yok; diff/status alınamadı. Mevcut dosyalar `.backups/first-drive/` altında korundu.

## Next Step

Üretim derlemesini ve tank regresyonunu çalıştır; tarayıcıdaki başlangıç ve genel görünümü kaydet.

### Doğal arazi kontrol düzeltmeleri

- İlk görsel incelemede arazi üçgen yönü ters bulundu; indeks sırası ve yukarı bakan normal kontrolü düzeltildi.
- İlk fizik testinde üçgen örnekleme başlangıcı üçe bölünmüyordu; gerçek üçgen sınırına hizalandı. Son Havok testi geçti.

## Next Step

Doğal arazi ve orman görevi tamamlandı. M1 için takip/kesişme kamerası ve referans performans ölçümü sonraki adımlardır.

### Git kurulumu hata kaydı

- CLI eski `Emirix` hesabını gösterdiği için ilk uzak depo oluşturma isteği 404 döndü. API güncel hesabı `c0detnr` olarak doğruladı; hedef ve belge bağlantısı düzeltildi.

## İlk sürüş — güncel durum

- Aşama 10 (fizik/girdi/döngü): tamamlandı; gerçek Havok testleri geçti.
- Aşama 11 (görsel/kamera/HUD): uygulandı; uzun gözlem ve son tarayıcı kontrolleri sürüyor.
- Aşama 12 (doğrulama): devam ediyor; 600 saniyelik gerçek zamanlı gözlem bitişi bekleniyor.
- Aşama 13 (belgeler/commit/push): bekliyor.

## Next Step

Uzun tarayıcı gözlemini kaydet; son derleme ve diff kontrolünden sonra sürüş değişikliklerini commit et ve origin/main'e push et.

## Git teslimi — son durum

Kullanıcı sürüş geliştirmesini yeni sohbete taşıdı; bu sohbette kapsam mevcut değişiklikleri doğrulayıp commit/push ile kaydetmek. Sürüş ve M1/M2 kabulü tamamlandı sayılmayacak. 600 saniyelik gözlemin nihai kaydı henüz alınmadı.

## Next Step

İlgili diff'i kontrol edip commit oluştur; origin/main'e push et ve uzak HEAD eşleşmesini doğrula. Son sürüş/tarayıcı kabulüne yeni sohbette devam et.

## Taret prototipi — 2026-10-23

Kullanıcı taret planının uygulanmasını istedi. Önce mevcut sürüşü koruyarak bağımsız taret/namlu takibi; atış ve hasar bu adımda yok. M1/M2 kabulünü tamamlandı sayma.

### Phase 14: Taret denetleyicisi ve kamera hedefi
**Status:** complete

### Phase 15: Gerçek GLB ile nişan testleri ve tarayıcı kontrolü
**Status:** complete

### Phase 16: Belgeler ve teslim kontrolleri
**Status:** complete

## Next Step

Taret prototipi ve kontroller tamamlandı. Git tesliminden sonra sıradaki özellik nişancı görüşü; M1/M2 son kabulü ve tam namlu kesişme çözümü açık.

## Arazi yüzeyi — 2026-10-24

Kullanıcı arazi dokularının gerçekçi olmasını istedi. Dış varlık kullanmadan albedo, normal ve ince detay katmanları; düzgün zemin normalleri ve düzensiz patika kenarı uygulandı.

### Phase 17: Prosedürel arazi yüzeyi
**Status:** complete

### Phase 18: Harita kontrolleri ve görsel doğrulama
**Status:** complete

## Next Step

M1/M2 tarayıcı kabulü, gerçek GPU performans ölçümü ve insan görsel değerlendirmesi sürüyor. Farklı zemin türleri (çamur, çakıl, kaya) için malzeme ayrımı açık.

## Kamera, nişan ve atış plan dosyası — 2026-10-24

### Phase 19: Konuşma kararlarını mevcut prototiple eşleştir ve planı yaz
**Status:** complete

- `docs/AIM_AND_FIRE_REWORK.md`: onaylanan kontroller, uygulama yorumları, dosya sorumlulukları, A1–A5 sırası ve kabul senaryoları.
- README, DECISIONS ve ROADMAP bağlantıları; hasar kapsam dışı, uygulama henüz başlamadı.

### Phase 20: Belge kontrolleri ve Git teslim hazırlığı
**Status:** complete

## Next Step

Belge kontrolleri tamamlandı; yalnız ilgili belgeleri commit edip origin/main'e push et. Sonraki uygulama adımı docs/AIM_AND_FIRE_REWORK.md içindeki A1 kamera/girdidir; bu belge görevinde oyun koduna başlanmayacak.
