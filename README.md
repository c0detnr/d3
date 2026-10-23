# IRON DUST

**Çalışma adı • Web 3D Tank Combat**

Modern kurgusal tankları, mekanik derinliği ve erişilebilir kontrolleri özgün bir sinematik low-poly dünyada birleştiren masaüstü tarayıcı oyunu.

Temel ilke: **Grafikler sade olacak; tank onlarca tonluk zırhlı bir araç gibi hareket edecek.** Birebir simülasyon yerine eğlence ve gerçekçilik arasında bilinçli bir denge hedeflenir.

## Güncel durum

Uygulama geliştirmeye geçildi. Doğal arazi, ileride sıklaşan orman ve bağımsız harita önizlemesi mevcut. İlk sürüş prototipi mevcut; son tarayıcı kabulü ve sürüş hissi değerlendirmesi açık. Blender tank dosyaları `assets/tanks/iron_dust_01/` altında; önizleme gerçek GLB modelini metre ölçeğinde, zemine hizalı yükler.

İlk teslim tek tankla küçük bir haritada serbest sürüş olacak. Sonraki teslim sabit hedeflerle atış ve temel hasarı ekleyerek savaş mekaniklerini içeren vertical slice oluşturacak.

İlk özgün tank Blender MCP ile üretildi: [Blender kaynağı](assets/tanks/iron_dust_01/iron_dust_01.blend) · [GLB](assets/tanks/iron_dust_01/iron_dust_01.glb) · [önizlemeler ve doğrulama](assets/tanks/iron_dust_01/README.md). Görünür geometri 14.512 üçgen; Babylon entegrasyonu ve ilk dinamik sürüş prototipi mevcut.

## Belge haritası

Özel GitHub deposu: [c0detnr/d3](https://github.com/c0detnr/d3). Ana dal `main` olarak kullanılır. Kaynak kod, belgeler, paket kilidi ve teslim edilen tank varlıkları izlenir; bağımlılıklar, derleme çıktıları ve yerel yedekler `.gitignore` ile dışarıda tutulur.

| Belge | İçerik |
|---|---|
| [AGENTS.md](AGENTS.md) | Projede çalışan ajanların kuralları |
| [Oyun tasarımı](docs/GAME_DESIGN.md) | Kimlik, oyuncu deneyimi ve kapsam |
| [Görsel yön](docs/ART_DIRECTION.md) | Palet, ışık, tank, çevre ve varlık standardı |
| [Tank modelleme standardı](docs/TANK_ASSET.md) | Blender parça hiyerarşisi, hareket hazırlığı, üçgen hedefi ve teslim önerisi |
| [Teknik mimari](docs/ARCHITECTURE.md) | Seçilen yığın, sistem sınırları ve fizik yaklaşımı |
| [Yol haritası](docs/ROADMAP.md) | M1 dünya → M2 sürüş → M3 savaş |
| [Doğrulama](docs/VALIDATION.md) | Kabul senaryoları ve performans ölçümü |
| [Kararlar](docs/DECISIONS.md) | Kesin kararlar, öneriler ve açık konular |

Başlangıç belgeleri görevinin kaydı: [task_plan.md](task_plan.md), [findings.md](findings.md), [progress.md](progress.md).

## Planlanan teknoloji

TypeScript · Babylon.js · Havok Physics · React · Tailwind CSS · Zustand · Vite. Model üretimi: Blender → glTF/GLB.

Kurulu paket sürümleri `package.json` ve kilit dosyasında sabittir. Genel oyun komutları altyapı çalışması kapsamında; aşağıdaki komutlar bağımsız harita önizlemesine aittir.

## Doğal arazi önizlemesi

`npm start` veya `npm run dev` ile başlatılır. Terminalde yazan yerel adresi tarayıcıda aç; ana sayfa test haritasına yönlendirir. Varsayılan port 5173 doluysa Vite bir sonraki boş portu kullanır. `npm run map:dev` doğrudan harita sayfasını açar.

320 × 320 m ayrıntılı arazi çevresinde ufka devam eden seyrek geometrili tepeler bulunur. Düz ve açık başlangıç alanından kıvrılan toprak patika ormana ilerler; çamlar, geniş yapraklı ağaçlar, kayalar ve kuru ot kümeleri çevreyi oluşturur. Akşam ışığı, gölgeler ve uzaklık sisi kullanılır. Arazi, kayalar ve yakın ağaç gövdeleri statik Havok çarpışmasına sahiptir; uzaktaki orman görsel arka plandır. Metre esaslıdır; farklı zemin tutuşları ve oynanabilir alan sınırları henüz uygulanmadı.

W ileri, S fren ve durduktan 0,25 saniye sonra geri; A/D palet farkıyla dönüş, Space güçlü fren, R tankı başlangıca döndürür. Fareyi sürükleyerek bakışı değiştir, tekerlekle mesafeyi ayarla. Hareketliyken kamera son fare hareketinden 1,5 saniye sonra arkaya toparlanır. **Alanı göster** genel görünüşe geçer; **Başlangıca dön** tankı ve hızları sıfırlar.

- `npm test`: sabit zaman adımı, birikim sınırı, fren önceliği ve geri geçişi kontrolleri.
- `npm run drive:test`: gerçek Havok ile süspansiyon, ileri/fren/geri, dönüş, 30/60/120 FPS eşitliği, rampa, tümsek, engel ve sıfırlama; sonuç `docs/driving-results.json`.
- `npm run tank:test`: gerçek GLB ile ölçek, zemin hizası, hiyerarşi, gizli çarpışma geometrisi ve kaynak temizliği.
- `npm run map:check`: harita TypeScript kontrolü.
- `npm run map:test`: gerçek Havok ile arazi/görsel yüzey eşleşmesi, başlangıç açıklığı, orman/patika yerleşimi, ağaç çarpışması ve kaynak temizleme kontrolü.
- `npm run map:build`: `dist-map/` altında dağıtılabilir harita önizlemesi.

Harita kodla, tank Blender MCP ile bu projede üretildi; dış görsel varlık kullanılmadı. Havok bildirimi `public/licenses/HAVOK.txt` içinde ve derleme çıktısında korunur.

Son görünüm: [Orman eşiği](docs/previews/forest-clearing.png). Çevre geometrisi ve zemin tanesi bu proje için kodla üretildi; dış model veya kaplama eklenmedi.

Sürüş ayarları `src/game/vehicle/VehicleDefinition.ts` içinde SI birimleriyle tutulur. Palet geometrisi korunur; yürüyen bant deseni geçici prosedürel görseldir. Ses ve toz henüz yok; M2 tamamlanmadı. Geliştirme sunucusunda `/map-preview.html?driveTest`, isteğe bağlı 10 dakika otomatik gözlem aracını açar; bu insan sürüş hissi değerlendirmesinin yerini tutmaz.
