# Findings
- Envanter/loot sistemi yok; mevcut HUD DOM/SVG.
- mapPreview.ts üzerinde kullanıcı GUI kaldırma değişiklikleri var; yalnız sis ekleme hunks stage edilmeli.
- Mevcut EasyDuelAI görünürlük boolean alıyor; sis bu sorguya eklenecek.
- Blender CLI mevcut; kaynak dosyaları ayrı background process ile üret, açık sahnelere dokunma.
- Blender kaynak/GLB ve bağımsız kapsül üretildi: 1594 üçgen, özgün materyaller, dış varlık yok.
- Shader, dünya derinliğine kadar olan sis kesişimini hesaplar; AI aynı elipsoit/yoğunluğu kullanır. Kamera değişiminde postprocess ve depth renderer yeniden bağlanır.
- İlk TypeScript kontrolünde Effect API isimleri düzeltildi; setFloatArray4 kurulu sürümün doğru metodu.
- Paralel çalışma sürüyor: araç/girdi dosyaları da kullanıcı tarafından değişiyor; bunlara dokunulmadı.
