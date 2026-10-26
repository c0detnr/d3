# Bulgular

- Mevcut C1 DuelTank iki GLB'yi ortak fizik dünyasında yönetiyor; sunucuda yeniden kullanılacak.
- Mevcut harita tek oyunculu döngüsü src/mapPreview.ts içinde. Multiplayer ayrı sayfayla izole edilecek.
- Vite çok sayfalı yapı vite.map.config.ts içinde; üretim LAN sunucusu yalnız dist-map sunacak (kaynak depo değil).
- npm ws 8.22.0 MIT ve Node >=10; @types/ws 8.18.2 doğrulandı. npm install sonrası audit 0 açık.
- Paralel çalışanlar: simülasyon/protokol ve ayrı LAN istemcisi. Ortak plan dosyalarını yalnız ana ajan yönetir.
