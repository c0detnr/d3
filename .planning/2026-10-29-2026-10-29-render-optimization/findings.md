# Bulgular

- createKulBattlefield doğa parçalarını doNotInstantiate: true ile çoğaltıyor.
- Test haritasında zaten instance/thin instance yaklaşımı var.
- Sabit bina ve doğa mesh matrisleri çoğunlukla her kare hesaplanıyor.
- Çalışma ağacında kullanıcıya ait devam eden harita/GUI değişiklikleri var; yalnız görev farkı stage edilecek.
- CUA: browser access host unavailable; canlı FPS ve görsel karşılaştırma yapılamıyor.
- Kapsam: ortak doğa çizimi, sabit matrisler ve gereksiz fare picking taramasını kapatma. Gölge çözünürlüğü/görünüm değişmeyecek.

- Gerçek GLB yüklemesinde bazı accessor AABB değerleri geometri sınırından farklı. Kaynak sınırını vertekslerden yenilemek clone/instance boyut eşitliğini sağlıyor.
- InstancedMesh materyal/gölge alma ayarını kaynaktan alır; ortak ayarlar instantiate öncesinde kaynakta yapılmalı.
