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

## 2026-10-24 — Gerçekçi arazi yüzeyi

Kullanıcı isteği: arazi dokularını daha gerçekçi yap.

Zemin artık tek düze gri tanecik yerine üç kodla üretilen katman kullanır: toprak/ot renk kümelerini taşıyan albedo, aynı yükseklik alanından türetilen normal haritası ve yakın planda gözenek/grit veren ince detay haritası. Albedo; açık-koyu toprak lekeleri, gömülü taş taneleri, seyrek ince çatlaklar ve kuru yaprak/dal artıkları içerir. Normal haritası taş ve gözeneklerin düşük açılı fırtına ışığında okunmasını sağlar. Malzeme kekik (specular) parlaklığı düşük tutulur; ıslak veya cilalı görünüm hedeflenmez.

Doku 22 m'de bir dikişsiz tekrarlanır; tekrarı gizlemek için ince detay katmanı farklı ölçekte örneklenir. Arazi yüzeyi düzgün normallerle gölgelenir; böylece 2 m'lik geometri ızgarası keskin üçgen lekeleri olarak okunmaz. Patika kenarı dünya gürültüsüyle düzensizleştirilir. Tüm veri çalışma anında üretilir; dış doku, fotoğraf veya lisanslı kaplama kullanılmaz.

Açık: doku ölçeği, taş/çatlak yoğunluğu, parlaklık ve farklı zemin türlerinde (çamur, çakıl, kaya yüzeyi) okunabilirlik tarayıcıda insan değerlendirmesiyle ayarlanacak. Bu prototip onaylanmış son görsel yön değildir.

## 2026-10-24 — Kaotik fırtına gökyüzü

Kullanıcı isteği: gökyüzünü değiştir; kaotik bir atmosfer hedeflenir.

Uygulanan ilk prototip tek bir prosedürel gökyüzü shader'ıdır. Gökyüzü artık düz gradyan değil; soğuk grafit zenitten sıcak toprak ufkuna geçen bir fırtına bandı, iki farklı hızda sürüklenen ve birbirini çalkalayan bulut katmanları, düşük parlaklıkta koyu bulut kütleleri ve seyrek açık kül tonları içerir. Bulut yoğunluğu hafifçe basamaklandırılır; böylece Industrial Low Poly diline yakın, keskin kenarlı kütleler okunur. Ufuk, paletin `#A87D50` sıcak toprak tonuna yaklaşır; gölgeler ve uzaklık sisi aynı fırtına paletine çekilir.

Atmosferin hareketi ve kaosu iki katmandan gelir: yavaş çalkalanan büyük bulut kütleleri ve ters yönde kayan ince detay. Ara ara ufka yakın bir yönde kısa, iki darbeli şimşek çakması olur; çakma bulutları, sis rengini, ortam ışığını ve pozlamayı kısa süre yükseltir. Işık kaynağı düşük açılı, sıcak ve tozlu tutulur; tankın ve ağaçların uzun gölgeleri korunur.

Teknik sınır: gerçek hacimsel bulut, yağmur, rüzgârla savrulan yaprak veya ekranı kaplayan parçacık yoktur. Shader `src/game/world/SkyAtmosphere.ts` içinde; dış doku, HDR gökyüzü veya lisanslı varlık kullanılmadı. Şimşek sıklığı, bulut örtüsü, ufuk sıcaklığı ve genel okunabilirlik tarayıcıda insan değerlendirmesiyle ayarlanacak. Bu prototip kullanıcı tarafından onaylanmış son görsel değildir.
