# IRON DUST — Ajan çalışma kuralları

## Mevcut aşama

Kullanıcı 2026-10-23 tarihinde proje altyapısının kurulmasını istedi; uygulama geliştirmeye başlama izni verilmiştir. Seçilen yığınla altyapı ve M1 temel dünya aşamasından ilerle. Aynı izin için tekrar sorma.
Önce dünya, sonra sürüş, ardından savaş sırasını koru. Blender tank varlığına ilişkin mevcut çalışmaları koru; teslim edilmemiş varlığı hazır kabul etme.

## Önce oku

1. [README.md](README.md): proje haritası ve güncel durum.
2. [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): oyun kimliği ve kapsam.
3. [docs/ROADMAP.md](docs/ROADMAP.md): geliştirme sırası ve kabul koşulları.
4. Görevle ilgili mimari, görsel yön, doğrulama veya karar belgesi.
5. Devam eden belge görevi varsa task_plan.md ve progress.md.

## Ürün sınırları

- Masaüstü tarayıcı, klavye ve fare, tek oyuncu.
- Modern kurgusal tanklar; özgün Industrial Low Poly görsel dil.
- Önce dünya, sonra sürüş, ardından savaş mekanikleri. Sürüş teslimini savaş sistemine bağlama.
- Multiplayer, mağaza, çok sayıda araç, devasa harita ve kapsamlı fiziksel bina yıkımı MVP dışında.
- War Thunder ve World of Tanks deneyim referanslarıdır; modellerini, haritalarını, arayüzlerini veya marka varlıklarını kopyalama.
- İlk aşamada backend, kullanıcı hesabı veya sunucu altyapısı ekleme.

## Teknik kurallar — uygulamaya geçildiğinde

- Seçilen yığın: TypeScript, Babylon.js, Havok Physics, Vite; UI için React + Tailwind, yalnızca UI state için Zustand.
- Kurulum öncesi resmi dokümanlardan güncel sürüm uyumluluğunu ve Havok dağıtım koşullarını doğrula; kilit dosyasını koru.
- Fizik ve render döngülerini ayır. Fizik sabit zaman adımıyla çalışmalı; kare başına sabit hareket miktarı kullanma.
- Yüksek frekanslı tank konumu ve fizik verisini React/Zustand üzerinden taşıma.
- Gövde fiziği ile görsel kule, tekerlek ve palet animasyonlarının sorumluluklarını ayır.
- Palet baklalarını tek tek fizik cismi yapma. Temas noktaları, süspansiyon ve palet başına kuvvet yaklaşımını önce prototiple.
- Mesafe, kütle, kuvvet ve açı birimlerini açık tut. Tank değerlerini merkezi araç tanımından yönet.
- Gerçekçi ağırlığı kontrol gecikmesiyle taklit etme; komut hemen alınmalı, araç fiziksel sınırlarıyla tepki vermeli.
- Kamera, ışık, olay dinleyicileri ve fizik kaynaklarını sahne kapanışında temizle.
- Geçici varlıkları belirt; varlık kaynağını ve lisansını kaydet.

## Çalışma ve doğrulama

- Kullanıcıyla ve proje belgelerinde Türkçe; kod sembolleri ve dosya adlarında tutarlı İngilizce kullan.
- İstenen değişiklikle ilgili en küçük tamamlanabilir adımı uygula; ilgisiz yeniden düzenlemelerden kaçın.
- docs/DECISIONS.md içinde kesin karar, öneri ve açık soruyu ayır. Öneriyi onaylanmış karar gibi sunma.
- Her kilometre taşından sonra ROADMAP durumunu ve doğrulama kanıtını güncelle.
- Çalıştırılmamış kontrolleri başarılı gösterme. Komutlar ancak gerçekten tanımlandığında README'ye eklenmeli.
- Fizik ve nişan gibi hesaplamaları anlamlı otomatik kontrollerle; sürüş hissi, kamera ve görsel kaliteyi tarayıcıda doğrula.
- Test yazmayı varsayılan bir görev olarak görme; test kapsamını değişikliğin hata riskine göre belirle. Metin, stil, basit arayüz ve düşük riskli küçük değişiklikler için yeni test yazma; ilgili mevcut kontrolü çalıştır veya sonucu doğrudan doğrula.
- Yeni testleri hesaplama, durum geçişi, veri kaybı riski veya tekrar oluşabilecek somut bir hata gibi anlamlı davranışlarla sınırla. Uygulamanın iç yapısını tekrar eden testlerden ve aynı davranışı gereksiz varyasyonlarla sınamaktan kaçın.
- İlgili kontroller geçtiğinde, yeni bir şüphe veya hata yoksa doğrulamayı genişletme. Küçük bir hata düzeltmesinde, hatanın tekrarını yakalayan en küçük yeterli kontrolü tercih et.
- Performans sonucu verirken cihaz, tarayıcı, çözünürlük ve kalite ayarını belirt.
- Kullanıcı değişikliklerini koru. Son raporda ne değiştiğini, neyin kontrol edildiğini ve açık kalan konuları belirt.

## Git çalışma düzeni

- Tamamlanan her anlamlı iş adımından sonra ilgili kontrolleri çalıştır, diff'i incele ve açıklayıcı bir Git commit'i oluştur. Kullanıcı ayrıca istemese de tamamlanan işi commit'le.
- Yalnızca ilgili dosyaları stage et; başka devam eden çalışmaların değişikliklerini kendi commit'ine katma. İlk depo kurulumu mevcut proje durumunu kapsar.
- Bağımlılıkları, derleme çıktılarını, yerel yedekleri ve gizli bilgileri commit'leme; `.gitignore` kurallarını koru. `package-lock.json`, Blender `.blend` kaynağı ve teslim edilen `.glb` dosyaları sürüm kontrolünde kalır.
- Bu özel depoda tamamlanan commit'leri `origin` üzerindeki izlenen dala push et; sonucu doğrula. Hata varsa raporla; force push, geçmişi yeniden yazma ve kullanıcı değişikliklerini silme.
- Son raporda commit kimliğini, push sonucunu ve varsa commit dışında kalan değişiklikleri belirt.
