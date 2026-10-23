# Görsel yön — Industrial Low Poly

## Temel dil

Gerçekçi oranlar, köşeli tank geometrisi, güçlü silüetler, doğal arazi formları ve sinematik ışık. Özgünlük renk, ışık, silüet ve atmosferden gelir. Tankın kütlesi çevre objeleriyle okunur.

## Materyal paleti

Aşağıdaki renkler kullanıcı tarafından seçildi; kullanım rolleri başlangıç önerisidir.

| Renk | Önerilen kullanım |
|---|---|
| #404B42 | Ana zırh boyası, koyu yeşil |
| #828575 | İkincil zırh ve soluk bitki örtüsü |
| #BDAB8B | Kuru toprak ve kum |
| #9D6F50 | Pas ve sıcak toprak vurguları |
| #D5C7AB | Toz ve açık taş |
| #34383B | Palet, koyu metal ve mekanik parçalar |

Sade mat PBR materyaller, seçici kenar aşınması ve doğal metal yansımaları kullanılacak. Silüeti örten yoğun kaplama gürültüsünden kaçınılacak.

## Tank

- Gerçekçi gövde/kule/namlu oranları; özgün kurgusal tasarım.
- Okunabilir zırh plakaları, palet ve yürüyen aksam.
- Ayrı hareket edebilen kule, namlu yükseliş grubu, geri tepme grubu ve tekerlekler.
- Basit modelde dahi doğru ölçek ve dönüş merkezleri; detaylar sürüş doğrulandıktan sonra artırılır.
- İlk tank tek mesh olmayacak; parça hiyerarşisi ve Blender teslim tarifi [tank modelleme standardında](TANK_ASSET.md) tanımlıdır.
- İlk tankın görünür geometrisi için yaklaşık 12–20 bin üçgen hedeflenir. Mat zeytin yeşili zırh, koyu grafit paletler, seyrek aşınma izleri ve az sayıda vurgu rengi kullanılır.
- Fotoğraf dokuları yerine modelin formu ve ışıklandırma öne çıkar.

## Çevre ve ışık

Low-poly kayalar, tepeler, toprak yollar, ilerleyen aşamalarda yıkılmış fabrikalar ve terk edilmiş yerleşimler. Küçük test sahası önce sürüş işlevini yerine getirmeli.

Akşam güneşi, uzun gölgeler ve atmosferik sis hedeflenir. Sis, gölge ve toz arazi okumasını engellememeli. Efekt yoğunluğu ve gölge kalitesi ayarlanabilir olmalı.

## Efektler

M2: Zemine ve palet hareketine bağlı toz. M3: Hacimli görünen toz/duman, namlu alevi, kıvılcımlar ve yüzeye göre isabet efekti. Hacimli görünümün hangi teknikle üretileceği performans denemesinde seçilecek; pahalı gerçek hacimsel simülasyon şart değil.

Hareket efektlerinin davranışı, yüzey tepkileri ve başlangıç bütçe önerileri [hareket efektleri planında](MOVEMENT_EFFECTS.md) bulunur. Palet/hız/dönüş tozu ilk prototipi uygulandı; diğer efektler bekliyor. Değerler tarayıcı prototipi ve ölçümle ayarlanacak.

## Önerilen varlık teslim standardı

- Blender kaynakları korunur, oyun için GLB/glTF dışa aktarılır.
- Ölçek metre esaslıdır. Blender ve oyun koordinat dönüşümü örnek bir varlıkla kontrol edilir.
- Gövde, kule dönüş merkezi, namlu yükselişi ve geri tepme için tutarlı pivotlar kullanılır.
- Görsel modelden ayrı, basit çarpışma geometrisi hazırlanır.
- Dosya/bileşen adları İngilizce ve tutarlı olur; yükleme sözleşmesi ilk modelle kesinleşir.
- Her dış varlık için kaynak, üretici, lisans ve yapılan değişiklikler kaydedilir. İlk özgün tank Blender MCP ile üretildi; dış model veya kaplama kullanılmadı. [Varlık teslimi](../assets/tanks/iron_dust_01/README.md).
- Referanslar ilham içindir; başka oyundan model, kaplama veya harita alınmaz.

İlk tankın üçgen hedefi yukarıda belirlenmiştir; kaplama, parçacık ve diğer varlık bütçeleri ölçüm cihazı belirlendikten sonra yazılacak. Üçgen hedefi doğrulanmış performans sonucu değildir.

## 2026-10-23 — Uygulanan arazi yönü

Kullanıcı isteği: ıssız doğal arazi, ileride orman. Başlangıç çevresi açık; toprak patika düzensiz orman sınırına bağlanır. İşlenmiş test rampası ve sınır blokları yerine dalgalı arazi, seyrek kaya ve ot kullanılır. Çam/geniş yapraklı ağaç çeşitleri özgün low-poly taslaklardır. Çevre geometri ve zemin tanesi kodla bu proje için üretildi; dış varlık veya lisanslı kaplama eklenmedi. Son görsel bütçe performans ölçümünde değerlendirilecek.
