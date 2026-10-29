# İlerleme

- Kaynaklar ve kirli çalışma ağacı incelendi; başlangıç dosyaları /tmp/d3-render-optimization içine alındı.
- Tarayıcı erişimi başarısız: browser access host unavailable. FPS sonucu raporlanmayacak.

- Başlangıç: 643 doğa parçası / 643 ayrı render kaynağı; 244 gölge parçası / 244 kaynak; 2235 sahne mesh, 150 fizik gövdesi. Bunlar NullEngine yapısal sayımlarıdır, GPU draw call/FPS değildir.
- İlk değişiklikten sonra map:check geçti.

- Son: 643 parça / 611 instance / 44 ayrı doğa render kaynağı; 244 gölge parçası / 117 kaynak; 1650 sahne mesh; 150 fizik gövdesi.
- 643 parçanın matris, dünya sınırları, materyal, picking ve gölge alma değerleri başlangıçla 1e-5 hassasiyette eşit.
- check-kul-vadisi.ts geçti: iki tank, bütün rotalar, çarpışma, temizlik.
- map:build geçti; mevcut büyük paket uyarısı sürüyor.

- İzole stage kopyası map:check geçti. HEAD doğa kodu ve optimize kod aynı commit arazisinde karşılaştırıldı: 643 parçanın tamamı eşit, 643 → 44 doğa ve 244 → 117 gölge render kaynağı tekrar doğrulandı.
- Paralel eklenen corner-tree ormanı çalışma ağacında korunup bu commit dışında bırakıldı.
- Son fark incelendi; görev dışı değişiklikler stage dışında.
