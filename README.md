# Lingo Oyunu 🎯

Türkçe kelime tahmin etme oyunu. Wordle benzeri bir oyun, ancak Türkçe kelimelerle ve çok oyunculu olarak oynanabiliyor.

## Özellikler 🌟

- Çok oyunculu oynama imkanı
- 4, 5, 6 ve 7 harfli kelimeler
- Bomba harfi sistemi
- Puan sistemi
- Süre sınırı
- Sesli efektler
- Joker kullanma özelliği

## Nasıl Oynanır? 🎮

1. Oyuncu sayısını seçin (2-4 kişi)
2. Her oyuncu sırayla kelimeyi tahmin etmeye çalışır
3. Her tahminden sonra:
   - Yeşil: Harf doğru yerde
   - Sarı: Harf var ama yanlış yerde
   - Kırmızı: Harf kelimede yok
4. Dikkat! Bomba harflerini kullanmaktan kaçının
5. Joker kullanarak yeni harf açabilirsiniz (100 puan karşılığında)

## Teknolojiler 💻

- Python (Flask)
- Socket.IO
- JavaScript
- HTML/CSS
- Bootstrap

## Kurulum 🛠️

1. Repository'yi klonlayın:
```bash
git clone https://github.com/KemalTemel/Lingo_Game.git
```

2. Gerekli paketleri yükleyin:
```bash
pip install -r requirements.txt
```

3. Uygulamayı çalıştırın:
```bash
python app.py
```

4. Tarayıcınızda açın:
```
http://localhost:5000
```

## Puan Sistemi 🏆

- Temel Puan: Her doğru tahmin için
- Süre Bonusu: Kalan süreye göre
- Bomba Bonusu: Bomba harflerini kullanmadan bilme 