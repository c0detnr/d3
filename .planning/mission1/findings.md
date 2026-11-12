- Kabuk createGameSession / finishMission üzerinden bağlanabilir; doğal arazi ArmorRange içinde üç gerçek hedef var.
- EasyDuelAI her örnek için ayrı durum tutuyor; DuelTank yeniden kullanılabilir.
- Drone kontrolü değişiklikten önce 97 !== 100 veriyor. İlk dalga oluşurken tank önceden vurulmuş; sis testinde başlangıç canı yakalanmalı.
- Kullanıcı isteği: commit/push yok; sürüş fiziğine dokunma; görev 2 açılır ama Yakında.

- Son DEV ve üretim tarayıcı kontrolleri başarılı. Gerçek viewport PNG boyutundan doğrulandı: DEV 1440x817, üretim 1280x577 (Chrome dış pencere ölçüleri değildir).
- Çatışma görüntüsü DEV inceleme kamerasıdır. Üretim bundle içinde __missionTest yok.
