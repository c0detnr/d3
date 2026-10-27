# Sürümleme

## 0.1.0 — 2026-10-27

Projenin mevcut geliştirme durumu `v0.1.0` açıklamalı Git etiketiyle kaydedilir. Bu, tamamlanmış oyun veya M1/M2/M3 kabulü anlamına gelmez.

Kapsam: doğal arazi ve orman, iki oynanabilir tank, Havok sürüş fiziği, taret/top ve MG02 prototipleri, ses/toz/atış efektleri, Android/dokunmatik altyapısı ve ayrı LAN düello prototipi. Kabin varlığı depoda bulunur; oyun entegrasyonu açık. LAN modu güvenilir yerel ağ içindir; ayrıntıları [modül belgesinde](../src/game/network/SPEC.md).

Paket ve kilit dosyasındaki sürüm `0.1.0`; Android `versionName` değeri `0.1.0`, `versionCode` değeri `1`. Bunlar zaten doğru olduğu için bu teslimde değiştirilmedi.

### Doğrulama

`npm test`, `npm run map:build`, `npm run lan:check` ve `npm run lan:test` geçti. LAN testleri gerçek GLB/Havok simülasyonu ve HTTP/WebSocket sunucu kontrollerini kapsadı. İlk yerel denemede ağ arayüzü erişimi kısıtlıydı; gerekli erişimle yeniden çalıştırıldı ve geçti. Derlemedeki 500 kB üzeri paket uyarısı sürüyor. Tarayıcı/telefon üzerinde yeni kabul testi ve APK derlemesi bu işlemin kapsamında değildir. Önceki açık kabul koşulları [yol haritasında](ROADMAP.md) korunur.

## Nasıl çalışır?

- **Sürüm numarası** paket dosyalarında yazan ürün sürümüdür.
- **Commit** dosyaların belirli andaki kaydıdır.
- **Etiket (tag)** belirli bir commit'e verdiğimiz kalıcı sürüm adıdır. Sonraki commit'ler `v0.1.0` etiketini ilerletmez.
- **Push** yereldeki commit ve etiketi GitHub'a gönderir. Commit'i göndermek etiketi kendiliğinden göndermez.

Bu projede geliştirme sürümleri için küçük düzeltmede `0.1.1`, yeni özellik grubunda `0.2.0` kullanacağız. `1.0.0` kararlı ilk teslim için ayrılır; `0.x` döneminde kapsam ve davranış değişebilir.

## Bir sonraki sürümü çıkarma örneği

Aşağıdaki örnek `0.1.1` içindir; bugün çalıştırılmadı. Çalışma ağacı temiz olmalı veya sürüme girecek değişiklikler önce ayrı commit'lerle kaydedilmelidir.

```bash
# 1. Durumu gör ve güncel main kayıtlarını al.
git status --short
git switch main
git pull --ff-only origin main

# 2. package.json ve package-lock.json sürümünü birlikte güncelle.
# Commit ve etiketi kendimiz oluşturacağız.
npm version 0.1.1 --no-git-tag-version
```

Android sürümü de çıkarılacaksa `android/app/build.gradle` içinde `versionName '0.1.1'`, `versionCode 2` yap. `versionCode` her yeni Android tesliminde artmalıdır. README içindeki sürüm numarasını ve etiketi de güncelle. İlgili sürüm notunu bu belgeye ekle.

```bash
# 3. Kontrolleri çalıştır; hata varsa sürümü etiketlemeden çöz.
npm test
npm run map:build
npm run lan:check
npm run lan:test
# Değişen sistemlerin ilgili diğer testlerini de çalıştır.

# 4. Değişiklikleri incele, yalnız sürüm dosyalarını kaydet.
git diff --check
git diff
git add package.json package-lock.json android/app/build.gradle README.md docs/VERSIONING.md
git commit -m "chore: release 0.1.1"

# 5. Commit'e açıklamalı sürüm etiketi koy ve ikisini birlikte gönder.
git tag -a v0.1.1 -m "IRON DUST 0.1.1"
git push --atomic origin main refs/tags/v0.1.1

# 6. GitHub'daki commit ve etiketi doğrula.
git ls-remote origin refs/heads/main refs/tags/v0.1.1 'refs/tags/v0.1.1^{}'
```

Açıklamalı etiketin kendi kimliği vardır; `^{}` ile biten satır etiketin işaret ettiği commit'tir. Bu satırın kimliği sürüm commit'iyle eşleşmelidir.

## Eski sürümü inceleme

```bash
git show v0.1.0 --stat
```

O sürümün dosyalarını ana çalışma klasörüne dokunmadan ayrı klasörde açmak için:

```bash
git worktree add --detach ../d3-v0.1.0 v0.1.0
```

Bu yeni klasörde bağımlılıkları kurup projeyi çalıştırabilirsin. Etiket sonradan taşınmaz; düzeltme yeni bir sürüm numarasıyla çıkarılır. GitHub Release sayfası ve indirilebilir APK/ZIP yüklemek ayrıca yapılabilecek bir dağıtım adımıdır; bu teslim kaynak sürümünü commit ve etiketle kaydeder.
