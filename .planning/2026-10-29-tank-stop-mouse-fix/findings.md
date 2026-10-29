# Bulgular
- CombatInput kilitliyken setPointerCapture çağırıyor; InvalidStateError buttons() öncesinde kesiyor. W3C Pointer Events 8.2 bunu doğruluyor. LAN aynı çağrıyı içeriyor.
- Gazsız araçta yalnızca tanh yuvarlanma direnci var; statik tutuş/eğim telafisi yok. TankVisual tüm küçük temas hızlarını biriktiriyor.
- Ortak TankVehicle yerel/AI/LAN tarafından kullanılıyor. Mevcut harita/UI/model değişiklikleri görev dışı.
- Havok hız örneklemesinde gövde konumu sabitken süspansiyon hızı var; eğimde park tepkisini konum farkıyla ölçmek kalan sürüklenmeyi giderdi. Dinamik sürüş aynı hız yolunu korur.
- Ayrı teslim kopyası /tmp/d3-stop-review-sm6vxg2w; derleme ve LAN kontrolü paralel arayüz/duman çalışmalarından bağımsız doğrulandı.
