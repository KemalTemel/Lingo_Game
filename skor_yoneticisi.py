import json
import os
from datetime import datetime

class SkorYoneticisi:
    def __init__(self):
        self.dosya_adi = 'skorlar.json'
        self.skorlar = self._skorlari_yukle()
    
    def _skorlari_yukle(self):
        if os.path.exists(self.dosya_adi):
            try:
                with open(self.dosya_adi, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return self._varsayilan_skorlar()
        return self._varsayilan_skorlar()
    
    def _varsayilan_skorlar(self):
        return {
            'kullanici_skorlari': {},  # {kullanici_adi: en_yuksek_skor}
            'en_yuksek_skorlar': []    # [{kullanici: str, puan: int, tarih: str}]
        }
    
    def _skorlari_kaydet(self):
        with open(self.dosya_adi, 'w', encoding='utf-8') as f:
            json.dump(self.skorlar, f, ensure_ascii=False, indent=2)
    
    def kullanici_en_yuksek_skor(self, kullanici_adi):
        return self.skorlar['kullanici_skorlari'].get(kullanici_adi, 0)
    
    def en_yuksek_skorlar(self, limit=10):
        return sorted(self.skorlar['en_yuksek_skorlar'], 
                     key=lambda x: x['puan'], 
                     reverse=True)[:limit]
    
    def skor_guncelle(self, kullanici_adi, yeni_skor):
        # Kullanıcının en yüksek skorunu güncelle
        mevcut_en_yuksek = self.kullanici_en_yuksek_skor(kullanici_adi)
        if yeni_skor > mevcut_en_yuksek:
            self.skorlar['kullanici_skorlari'][kullanici_adi] = yeni_skor
            
            # En yüksek skorlar listesine ekle
            yeni_kayit = {
                'kullanici': kullanici_adi,
                'puan': yeni_skor,
                'tarih': datetime.now().strftime('%Y-%m-%d %H:%M')
            }
            
            self.skorlar['en_yuksek_skorlar'].append(yeni_kayit)
            # En yüksek 100 skoru tut
            self.skorlar['en_yuksek_skorlar'] = sorted(
                self.skorlar['en_yuksek_skorlar'],
                key=lambda x: x['puan'],
                reverse=True
            )[:100]
            
            self._skorlari_kaydet()
            return True
        return False 