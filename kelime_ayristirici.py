import json

def kelime_ayristir():
    # Her uzunluk için kelime listelerini tutacak sözlükler
    kelimeler_4 = []
    kelimeler_5 = []
    kelimeler_6 = []
    kelimeler_7 = []

    # JSON dosyasını satır satır oku
    with open('gts.json', 'r', encoding='utf-8') as f:
        for line in f:
            try:
                line = line.strip()
                if not line:  # Boş satırları atla
                    continue
                kelime = json.loads(line)
                
                madde = kelime.get('madde', '').strip()
                kelime_id = kelime.get('_id')
                
                # Sadece id ve madde bilgisini içeren yeni sözlük
                yeni_kelime = {
                    'id': kelime_id,
                    'madde': madde
                }
                
                uzunluk = len(madde)
                if uzunluk == 4:
                    kelimeler_4.append(yeni_kelime)
                elif uzunluk == 5:
                    kelimeler_5.append(yeni_kelime)
                elif uzunluk == 6:
                    kelimeler_6.append(yeni_kelime)
                elif uzunluk == 7:
                    kelimeler_7.append(yeni_kelime)
            except json.JSONDecodeError:
                continue  # Hatalı JSON satırlarını atla

    # Her uzunluk için ayrı JSON dosyası oluştur
    def kaydet(kelimeler, dosya_adi):
        with open(dosya_adi, 'w', encoding='utf-8') as f:
            json.dump(kelimeler, f, ensure_ascii=False, indent=2)

    kaydet(kelimeler_4, 'kelimeler_4.json')
    kaydet(kelimeler_5, 'kelimeler_5.json')
    kaydet(kelimeler_6, 'kelimeler_6.json')
    kaydet(kelimeler_7, 'kelimeler_7.json')

    print(f"4 harfli kelime sayısı: {len(kelimeler_4)}")
    print(f"5 harfli kelime sayısı: {len(kelimeler_5)}")
    print(f"6 harfli kelime sayısı: {len(kelimeler_6)}")
    print(f"7 harfli kelime sayısı: {len(kelimeler_7)}")

if __name__ == '__main__':
    kelime_ayristir() 