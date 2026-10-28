---
id: lan-duel
type: module-design
status: active
title: LAN tank düellosu
tags: [multiplayer, lan]
---

## Responsibility

Aynı güvenilir yerel ağdaki iki masaüstü tarayıcı için tank düellosu. Bu, tek oyunculu MVP kapsamına kullanıcı onayıyla eklenen ayrı bir moddur; mevcut serbest sürüş ve AI düello planı değişmez.

Yerel Node.js sunucusu tek 60 Hz Havok dünyasını, araçları, kuleyi, dolumu, süpürülmüş balistiği, canı ve maç sonucunu yönetir. İstemcinin konum, isabet veya kazanan bildirmesi kabul edilmez. Birimler metre, saniye ve radyandır; gövde pozu ile model kök pozu karıştırılmaz.

## Boundary

İki oyuncu bağlanıp hazır olduğunda maç başlar. Her tank 100 canla başlar; ana topun ilk doğrudan rakip isabeti 25 hasar verir, dolum 5 saniyedir. Zırh/açı hasarı değiştirmez; MG hasarı yoktur. İmha sonrası sonuç gösterilir; iki taraf yeniden hazır olunca fizik, silah, mermiler ve can sıfırlanır. Aynı fizik adımında çift imha beraberedir. Bağlantı kaybı maçın iptalidir, yenilgi değildir.

Sunucuya yalnız sınırlanmış sürüş/nişan/atış girdileri ve hazır komutu gönderilir. Sayısal alanlar sonlu ve aralık içinde, sıra numaraları artan olmalıdır. Eski komut tekrar işlenmez; kısa girdi kesintisi sürüşü nötrler. Kuyrukta atış biriktirilmez. Üçüncü oyuncu reddedilir. WebSocket origin kontrolü, paket boyutu ve mesaj hızı sınırları LAN'da da uygulanır.

Tarayıcı ortak pozları görsel olarak yumuşatır; bağımsız maç fiziği hesaplamaz. Yüksek frekanslı durum React/Zustand üzerinden taşınmaz. Gizli/odaksız istemci komutlarını temizler; sunucu başka oyuncu için çalışmaya devam eder. Sahne ve bağlantı kapanışında kaynaklar temizlenir.

## Dependencies

Mevcut araç, kule, silah, Havok ve arazi kodu kullanılır; Blender/GLB kaynakları değiştirilmez. HTTP sunucusu yalnız derlenmiş `dist-map/` dosyalarını sunar, kaynak depoyu sunmaz. `ws` MIT lisanslı bağlantı bağımlılığıdır. Havok lisans bildirimi dağıtımda korunur.

İnternete açık barındırma, hesap/eşleştirme, Android multiplayer, bağlantısı kopan maça geri dönme, gecikme telafisi ve rekabetçi hile önleme kapsam dışıdır. Origin kontrolü kimlik doğrulama değildir; sunucu yalnız güvenilir LAN için tasarlanmıştır.

## Hasar geri bildirimi — 2026-10-27

Tank snapshot'ları palet/motor/kule bütünlüğünü içerir. Top hasarı 25, isabet edilen modül hasarı 50'dir. Palet/motor arızası çekişi, kule arızası nişan hareketini sunucuda keser. Sunucu en fazla 32 isabetlik, artan kimlikli olay kuyruğuyla temas noktası, normal, giriş yönü, atıcı/hedef ve imhayı yayınlar. İstemci aynı olayı iki kez oynatmaz; rövanş olayları ve modülleri sıfırlar. Görsel/ses efekti hasar hesaplamaz. Ayrıntılar: `docs/DAMAGE_FEEDBACK.md`.
