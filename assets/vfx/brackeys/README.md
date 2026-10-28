# Brackeys VFX Bundle v1

Kaynak: https://brackeysgames.itch.io/brackeys-vfx-bundle
İndirme: 2026-10-28; resmi v1 arşivi, 28.227.919 bayt.
Lisans: CC0; orijinal `LICENSE & CREDITS.txt` korunur. Ticari kullanım/düzenleme serbest, atıf zorunlu değil.

Brackeys tarafından yeniden paketlenmiş/düzenlenmiş koleksiyon: parçacıklar Kenney ve Picster; flipbook'lar Thomas Iché; çizilmiş sprite sheet'ler CodeManu. Ayrıntılı kaynak bağlantıları lisans dosyasında.

Paketin tüm varlıkları özgün klasör ve dosya adlarıyla korundu; macOS meta dosyaları çıkarıldı. Görsellere değişiklik yapılmadı; lisans metninde yalnızca satır sonları LF olarak düzenlendi. `opague` adı kaynak paketten gelir.

## Oyunda kullanım

| Dosya | Kullanım |
|---|---|
| `particles/alpha/smoke_01_a.png` | Palet/hız/dönüş, atış basıncı ve yüzey isabet tozu |
| `particles/alpha/muzzle_02_a.png` | Top ve MG namlu parlaması |
| `particles/alpha/smoke_07_a.png` | Namlu gazı, delinme ve hasarlı motor dumanı |
| `particles/alpha/trace_01_a.png` | Metal isabeti/sekme kıvılcımı |
| `particles/alpha/flame_01_a.png` | Kritik hasar ve enkaz yangını |
| `runtime/explosion_01.png` | Tek seferlik tank imha animasyonu |

Parçacık PNG'leri 512×512'dir. Mevcut toprak/duman/alev renkleri ve sabit adım korunur. Palet havuzu 320, ortak savaş havuzu 128 canlı parçacıkla sınırlıdır. Savaş için altı ayrı sprite yöneticisi (tür başına 128 önceden ayrılmış sprite) kullanılır; yalnızca ilgili türün sprite'ı görünür. Yerel oyun ve LAN aynı CombatEffects sınıfını kullanır.

`runtime/explosion_01.png`, kaynak `flipbooks/explosion_01_8x8.tga` dosyasının piksel boyutlarını/alfasını koruyan PNG dönüşümüdür. Tekrar üretim: `magick assets/vfx/brackeys/flipbooks/explosion_01_8x8.tga assets/vfx/brackeys/runtime/explosion_01.png`. Dosya adı yanıltıcıdır: içerik 5×5, toplam 25 karedir; 1024/5 piksel hücreyle okunur. Animasyon 1,25 saniyede bir kez oynar; kare seçimi render sayısından bağımsızdır.

Vite yalnızca referans verilen dosyaları web derlemesine taşır. Kullanılmayan varlıklar kaynak paketinde kalır. TGA dosyaları doğrudan tarayıcıda yüklenmez. Lisans dağıtım kopyası: `public/licenses/BRACKEYS-VFX.txt`.
