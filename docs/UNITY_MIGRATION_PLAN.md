# Unity'ye sıfırdan geçiş planı

Durum: **ÖNERİ. Onaylanmış karar değildir.** Kullanıcı 2026-10-28 tarihinde planın hazırlanmasını ve yeni bir sohbette uygulanmasını istedi. Uygulamaya başlamadan önce "Karar kapısı" bölümü kullanıcıyla netleştirilir ve sonuç [DECISIONS.md](DECISIONS.md) içine kesin karar olarak yazılır.

Bu belge yeni bir sohbette tek başına okunup uygulanabilecek şekilde yazıldı. Önce [AGENTS.md](../AGENTS.md), [GAME_DESIGN.md](GAME_DESIGN.md), [ROADMAP.md](ROADMAP.md) ve [ARCHITECTURE.md](ARCHITECTURE.md) okunur.

## 1. Amaç ve sınırlar

IRON DUST'ı Unity'de, mevcut tasarım kimliğini koruyarak yeniden kurmak: Industrial Low Poly görsel dil, önce dünya, sonra sürüş, ardından savaş sırası.

- Hedef platform: masaüstü (Windows/Linux), klavye ve fare, tek oyuncu. Tarayıcı (WebGL) ve Android bu planın hedefi değildir; ayrı karar gerektirir.
- MVP dışı kalanlar değişmez: multiplayer, mağaza, çok sayıda araç, devasa harita, kapsamlı yıkım.
- LAN düello ve Android bu planda **sonraya bırakılmıştır** (U8). Mevcut web sürümü bu işler için referans olarak kalır.
- War Thunder ve World of Tanks varlıkları kopyalanmaz.

## 2. Mevcut projenin durumu (envanter)

Kaynak: depo incelemesi, 2026-10-28.

| Alan | Konum | Unity'ye etkisi |
|---|---|---|
| Oyun kodu | `src/game/*` (aim, audio, camera, combat, core, effects, input, network, ui, vehicle, world; yaklaşık 75 TS dosyası) | C#'a elle yeniden yazılır; otomatik çeviri yok |
| Blender kaynakları ve GLB | `assets/tanks`, `assets/weapons`, `assets/cockpit`, `assets/environment`, `assets/vfx` (yaklaşık 138 MB) | Doğrudan aktarılır, pivot ve ölçek doğrulanır |
| Harita verisi | `kulVadisiLayout.ts`, `kulCraterLayout.ts`, `kulFieldPropsLayout.ts`, `kulLandmarkLayout.ts`, `kulBattlefieldLayout.ts`, `terrain.ts` | JSON'a dışa aktarılıp C#'ta okunur; çıkarım betiği yazılır |
| Araç değerleri | `VehicleDefinition.ts` | `ScriptableObject`'e taşınır |
| Balistik/zırh | `combat/ArmorModel.ts`, `ProjectileSystem.ts`, `WeaponDefinition.ts` | Matematik birebir taşınır |
| Prosedürel ses | `audio/*` (Web Audio) | Unity'de ses kaynağı yok; yeniden tasarlanır |
| UI | React + Tailwind + Zustand, `ui/*` | uGUI veya UI Toolkit ile yeniden yapılır |
| Otomatik kontroller | `scripts/check-*.ts` (30'a yakın) | Unity Test Framework (EditMode/PlayMode) ile yeniden yazılır; sadece anlamlı olanlar |
| Ağ | `network/*`, `scripts/lan-server.ts` | Kapsam dışı (U8) |
| Blender betikleri | `scripts/blender/*` | Değişmez; çıktı Unity'ye gider |

Mevcut ilerleme: M1 devam, M2 ilk sürüş prototipi, M3.1 balistik çekirdek, ikinci tank, AI düello prototipi, Kül Vadisi haritası. Web sürümü **Unity sürümü eşdeğerliğe ulaşana kadar silinmez ve bozulmaz.**

## 3. Karar kapısı (uygulamadan önce kullanıcıyla netleştirilecek)

Her birinin yanındaki seçenek **öneridir**, karar değil.

1. **Geçişin amacı.** Öneri: masaüstü kalite ve editör iş akışı. Hedef "tarayıcıda anında açılma" ise geçiş önerilmez.
2. **Unity sürümü.** Öneri: Unity 6 LTS (güncel LTS alt sürümü). Kurulum öncesi resmi sürüm sayfasından ve paket uyumundan doğrulanır; sürüm `ProjectSettings/ProjectVersion.txt` ile kilitlenir.
3. **Render hattı.** Öneri: URP (low poly stil ve performans için). HDRP önerilmez.
4. **Fizik.** Öneri: yerleşik PhysX (GameObject fiziği). Gerekçe: mevcut yaklaşım zaten özel raycast süspansiyonudur, Havok'un tek başına sunduğu avantaj kullanılmıyor. Unity DOTS/Havok bu aşamada kullanılmaz.
5. **Depo düzeni.** Öneri: aynı depoda `unity/` alt klasörü, web sürümü yerinde kalır. Alternatif: ayrı depo. Blender kaynakları tek yerde kalır (`assets/`), Unity'ye kopyalanan GLB'ler `unity/Assets/Imported/` altında.
6. **Girdi.** Öneri: yeni Input System paketi.
7. **UI.** Öneri: UI Toolkit; HUD'ın çoğu veri tabanlı olduğundan uygundur. Alternatif uGUI.
8. **Web sürümünün akıbeti.** Öneri: Unity sürümü kabul koşullarını geçene kadar paralel sürdürülür, sonra arşivlenir.

## 4. Aşamalar

Sıra: dünya → sürüş → savaş. Her aşama kabul koşulları geçince commit'lenir, ROADMAP'e kanıt yazılır. Çalıştırılmamış kontrol başarılı gösterilmez.

### U0 — Karar ve altyapı

- Karar kapısı kararlarını DECISIONS.md'ye "kesin karar" olarak yaz.
- Unity Hub ve editörü kur (Linux). Sürümü ve paketleri resmi kaynaktan doğrula. Bu makinede kurulumun mümkün olduğunu doğrula.
- `unity/` projesi: URP şablonu, Input System, glTFast (ya da FBX akışı), Test Framework, Cinemachine (kameraya karar verilirse).
- `.gitignore`: `Library/`, `Temp/`, `Obj/`, `Logs/`, `UserSettings/`, `*.csproj`, `*.sln`. `Assets/`, `Packages/manifest.json`, `packages-lock.json`, `ProjectSettings/` sürüm kontrolünde. `.meta` dosyaları commit'lenir (Force Text serialization). Büyük ikililer için Git LFS ihtiyacı değerlendirilir.
- README'ye yalnızca gerçekten çalışan Unity komutları eklenir (örnek: batchmode test çalıştırma).

Kabul: boş sahne editörde ve `-batchmode` ile açılır; CI'sız yerel test komutu çalışır; kilit dosyaları commit'lidir.

### U1 — Varlık aktarımı

- GLB/FBX aktarım hattı: ölçek (metre), eksen (Babylon sol el / Unity sol el, glTF sağ el farkı), pivotlar, materyal yuvaları, çarpışma düğümleri (`COL_*`).
- Tank 01, Tank 02, silahlar, kabin, hangar, atölye, beton siper, hurda zırhlı, çiftlik harabesi, Quaternius doğa paketi.
- Varlık kaynağı ve lisans kaydı korunur (mevcut README'ler).
- Tank rigi: kule, namlu, 12/14 yol tekeri, geri tepme kökü, namlu ağzı noktaları, 14 temas noktası adlandırması aynen taşınır ([tankRig.ts](../src/game/vehicle/tankRig.ts) referans).

Kabul: her varlık boş sahnede doğru ölçek ve yönle görünür; pivot testleri (kule/namlu dönüşü) editörde gözle ve küçük bir EditMode testiyle doğrulanır.

### U2 — Dünya (M1 eşdeğeri)

- Arazi: 720 × 720 m, 3 m ızgara, yönlendirilmiş faceted low poly. Seçenek A: Unity `Terrain`. Seçenek B (öneri): mevcut `facetedTerrain.ts` mantığını portlayan prosedürel mesh. Faceted stil için B daha sadıktır; yükseklik fonksiyonu kod olarak taşınır, sürüş testi için MeshCollider kullanılır.
- Yerleşim verileri: layout dosyaları bir betikle JSON'a çıkarılır, Unity'de `ScriptableObject`/JSON okuyucu sahneyi kurar.
- Dağlar, gökyüzü/atmosfer (`SkyAtmosphere.ts` shader'ı → Shader Graph veya HLSL skybox), sıcak düşük güneş, soğuk dolgu, ortak sis.
- Krater, zemin decal'leri, saha propları, yer işaretleri.
- Kamera: serbest uçuş ve takip kamerası; çevreyle kesişme davranışı.
- Referans cihaz ve kalite ayarı kaydı.

Kabul: Kül Vadisi, web sürümüyle yan yana karşılaştırılabilir ekran görüntüleriyle doğrulanır; boş sahnede sabit kare hızı ölçümü (cihaz, çözünürlük, kalite belirtilerek) kaydedilir.

### U3 — Sürüş (M2 eşdeğeri)

- Sabit adım: `FixedUpdate`, 60 Hz hedefi (`Time.fixedDeltaTime = 1/60`); render interpolasyonu için `Rigidbody.interpolation`.
- `Rigidbody` tek gövde; `WheelCollider` **kullanılmaz**. 12/14 ışınlı (raycast/spherecast) süspansiyon, yay-sönümleme, palet başına tahrik/fren, yanal sürtünme. Değerler `VehicleDefinition` ScriptableObject'te.
- Birimler: metre, kilogram, saniye, radyan iç hesapta; Unity'de dereceyle çalışan API'ler kenarda dönüştürülür.
- Komut hemen alınır, gecikme taklidi yapılmaz.
- Görsel yol tekerlekleri/palet UV kayması/süspansiyon gövdeden ayrı çalışır.
- Girdi: sekme/pencere odağı kaybında tuş takılı kalmaz.
- Toz efektleri (VFX Graph veya Particle System, havuzlu).
- Motor/palet/rüzgâr sesi: prosedürel yerine örnek tabanlı + parametrik; kaynak ve lisans kaydı tutulur. ([SOUND_DESIGN.md](SOUND_DESIGN.md) hedefleri korunur.)

Kabul (ROADMAP M2 maddeleri taşınır): ileri/fren/geri/dönüş; yerinde ve hareketli dönüş tutarlı; tepe/eğim/engebede titreme ve batma yok; farklı kare hızlarında aynı girdi benzer sonuç (PlayMode testi, `Application.targetFrameRate` 30/60/120); on dakikalık serbest sürüş notu.

Otomatik kontrol önerisi (yalnızca anlamlı olanlar): sabit adım/kare hızı bağımsızlığı, eğimde durma ve süspansiyon denge testi. Mevcut `check-driving.ts` senaryoları referanstır.

### U4 — Kule ve nişan

- `TurretController` portu: dönüş/yükseliş sınırları ve hızları, dünya hedefinin gövdeden bağımsızlığı, interpolasyon.
- Namlu doğrultusu ≠ kamera hedefi; yakın engel ve açı sınırı göstergeleri.
- Sağ tık nişancı görüşü; kamera yakınlaşması.

Kabul: `check-turret.ts` ve `check-aim` senaryolarının Unity karşılıkları (hedef yakınsaması, eğimli gövde, 30/60/120 FPS).

### U5 — Savaş çekirdeği (M3 eşdeğeri)

- `ArmorModel`, `ProjectileSystem`, `WeaponDefinition` matematiğini birebir C#'a taşı: süpürülmüş (sweep/`SphereCast` zinciri) mermi, yerçekimi, mesafeyle delme azalması, geliş açısına göre etkin zırh, 70° sekme eşiği.
- Yüksek hızlı mermi ince hedefi atlamamalı: sürekli sorgu zorunlu; birim testle doğrulanır.
- Üç sabit zırhlı hedef, HUD sonuç yazısı (`DELDİ/SEKTİ/DELMEDİ/ENGEL`).
- Hasar ve modül hasarı (can 100, top 25, modül 50 kayıp, ikinci isabette arıza), imha duman/yangın.
- Makineli tüfek.

Kabul: `check-combat.ts` içindeki zırh/balistik eğrilerinin aynı sayısal sonuçları vermesi. Bu, regresyon koruması için en değerli testtir.

### U6 — Düello ve AI

- `DuelTank`, `EasyDuelAI` portu: görüşte yaklaşma, tepki süreli nişan, yalnız açık görüşte atış; sıfırlama (R).
- Sonuç ekranı, engelden kurtulma davranışı (web sürümünde açıktı).

### U7 — UI ve cila

- Taktik HUD, hasar HUD, menü, duraklatma, ayarlar.
- Ses ve efekt dengesi, performans bütçesi, kalite ayarları.
- Ekran görüntüleriyle görsel kabul.

### U8 — İsteğe bağlı sonraki işler (ayrı karar)

- LAN düello: Netcode for GameObjects veya Mirror; [network/SPEC.md](../src/game/network/SPEC.md) protokol hedefleri referans.
- Android, WebGL derlemesi, dağıtım paketleme.

## 5. Eşleme tablosu (Babylon/TS → Unity/C#)

| Mevcut | Unity karşılığı (öneri) |
|---|---|
| `fixedStep.ts` birikimli adım | `FixedUpdate` (+ `Rigidbody.interpolation`) |
| Havok gövde ve sorgular | PhysX `Rigidbody`, `Physics.Raycast/SphereCast/ComputePenetration` |
| `VehicleDefinition.ts` | `VehicleDefinition : ScriptableObject` |
| `tankRig.ts` düğüm adları | prefab içinde aynı adlı çocuk nesneler + rig bileşeni |
| `FollowCamera`, `FreeFlyCamera` | Cinemachine veya özel kamera betiği |
| `SkyAtmosphere.ts` shader | Shader Graph/HLSL skybox + `RenderSettings.fog` |
| Babylon `ParticleSystem` | Particle System / VFX Graph |
| Web Audio prosedürel ses | `AudioSource` + `AudioMixer`, parametrik pitch/volume |
| React + Zustand HUD | UI Toolkit, veri bağlama (yüksek frekanslı veri yine UI'dan ayrı tutulur) |
| `check-*.ts` betikleri | Unity Test Framework (EditMode: matematik, PlayMode: fizik/sürüş) |
| Vite/npm komutları | Unity `-batchmode -runTests` komutları |

## 6. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Sürüş hissinin web sürümüyle farklı çıkması | Yüksek | Aynı raycast süspansiyon formülü; değerler aynen taşınır; eşdeğerlik ölçümü |
| PhysX'in ince/hızlı mermide tünelleme | Orta | Süpürülmüş sorgu zinciri, birim test |
| Eksen/ölçek/pivot uyuşmazlığı | Orta | U1'de otomatik doğrulama, rig adlandırması sabit |
| Linux'ta Unity Editor kararlılığı | Orta | U0'da kurulum doğrulaması; olmazsa Windows makine |
| Yeniden yazma süresi, web ilerlemesinin durması | Yüksek | Web sürümü korunur; U-aşamaları küçük, kabul kapılı |
| Faceted arazi stilinin `Terrain` ile uyuşmaması | Düşük | Prosedürel mesh öner seçeneği |
| Ses karakteri kaybı | Orta | Önce örnek + parametrik prototip, insan dinlemesi |

## 7. İlk adımlar (yeni sohbet için sıra)

1. Bu belgeyi, AGENTS.md, ROADMAP, ARCHITECTURE ve DECISIONS belgelerini oku.
2. Kullanıcıya Karar kapısındaki 8 maddeyi tek mesajda, önerilerle sor (Unity sürümü ve depo düzeni en kritik olanlar).
3. Yanıtları DECISIONS.md'ye kesin karar olarak yaz, ROADMAP'e "Unity geçişi" bölümü ekle.
4. U0'ı uygula; her aşama sonunda kontrolleri çalıştır, diff'i incele, yalnızca ilgili dosyaları commit'le ve `origin`'e push et.
5. Mevcut web çalışmasına ait değişiklikleri (bekleyen `.blend`, `src/*`, `.planning/*`) kendi commit'ine katma.

## 8. Yeni sohbette kullanılacak başlangıç komutu

> `docs/UNITY_MIGRATION_PLAN.md` dosyasını oku ve planı U0'dan itibaren uygula. Önce Karar kapısı maddelerini bana sor, cevaplarımı DECISIONS.md'ye yaz, sonra U0'ı başlat. Web sürümünü bozma.
