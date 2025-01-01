from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import random
from threading import Timer
import os
import logging
import uuid

# Flask uygulamasını oluştur
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins='*')

# Logging ayarları
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Sabitler
SURE_SINIRI = 90  # saniye
TAHMIN_SINIRI = 6
BOMBA_CEZA_ORANI = 0.25  # Puanın %25'i kaybedilir

# Global timer değişkeni
aktif_timer = None

# Global değişkenler
oyun_odalari = {}  # Her odadaki oyun durumunu tutacak

# Aktif oyun bilgisi
oyun = {
    'aktif': False,
    'oyuncular': [],
    'kelime': '',
    'tahminler': [],
    'puanlar': {},
    'kelime_uzunlugu': 4,
    'aktif_oyuncu': '',
    'tur_sayisi': 0,
    'kalan_sure': SURE_SINIRI,
    'bomba_harfleri': [],  # Bomba harfleri
    'bomba_sayaci': 3,  # Bomba harfinin açığa çıkması için kalan tahmin
    'bomba_aciga_cikti': False  # Bomba harfi görünür mü?
}

def kelimeleri_yukle():
    kelimeler = {}
    for uzunluk in [4, 5, 6, 7]:
        with open(f'kelimeler_{uzunluk}.json', 'r', encoding='utf-8') as f:
            kelimeler[uzunluk] = json.load(f)
    return kelimeler

kelimeler = kelimeleri_yukle()

def timer_durdur():
    global aktif_timer
    if aktif_timer:
        aktif_timer.cancel()
        aktif_timer = None

def timer_baslat(oda_id):
    global aktif_timer
    timer_durdur()
    aktif_timer = Timer(1.0, lambda: sure_kontrolu(oda_id))
    aktif_timer.start()

def sure_kontrolu(oda_id):
    if oda_id not in oyun_odalari or not oyun_odalari[oda_id]['aktif']:
        return
        
    oyun = oyun_odalari[oda_id]
    if oyun['kalan_sure'] > 0:
        oyun['kalan_sure'] -= 1
        socketio.emit('sure_guncelle', {'kalan_sure': oyun['kalan_sure']}, room=oda_id)
        
        if oyun['kalan_sure'] > 0:
            timer_baslat(oda_id)
        else:
            dogru_kelime = oyun['kelime']
            socketio.emit('sure_bitti', {
                'aktif_oyuncu': oyun['aktif_oyuncu'],
                'dogru_kelime': dogru_kelime,
                'bomba_harfleri': oyun['bomba_harfleri']
            }, room=oda_id)

def yeni_kelime_sec(uzunluk):
    kelime = random.choice(kelimeler[uzunluk])['madde'].lower()
    sessiz_harfler = set('bcçdfgğhjklmnprsştvyz')
    kullanilabilir_harfler = sessiz_harfler - set(kelime)
    kullanilabilir_harfler = list(kullanilabilir_harfler)
    
    if len(kullanilabilir_harfler) < 2:
        kullanilabilir_harfler = list(sessiz_harfler - set(kelime))
    
    random.shuffle(kullanilabilir_harfler)
    bomba_harfleri = kullanilabilir_harfler[:2]
    
    return kelime, bomba_harfleri

@socketio.on('oyun_baslat')
def oyun_baslat(data):
    oda_id = data.get('oda_id')
    if not oda_id or oda_id not in oyun_odalari:
        emit('hata', {'mesaj': 'Geçersiz oda!'})
        return
        
    oyun = oyun_odalari[oda_id]
    if len(oyun['oyuncular']) < 2:
        emit('hata', {'mesaj': 'En az 2 oyuncu gerekli!'})
        return
    
    # Oyunu başlat
    kelime, bomba_harfleri = yeni_kelime_sec(4)
    oyun['aktif'] = True
    oyun['kelime'] = kelime
    oyun['bomba_harfleri'] = bomba_harfleri
    oyun['bomba_sayaci'] = 3
    oyun['bomba_aciga_cikti'] = False
    oyun['tahminler'] = []
    oyun['puanlar'] = {oyuncu: 0 for oyuncu in oyun['oyuncular']}
    oyun['kelime_uzunlugu'] = 4
    oyun['aktif_oyuncu'] = oyun['oyuncular'][0]
    oyun['tur_sayisi'] = 0
    oyun['kalan_sure'] = SURE_SINIRI
    
    # Timer'ı başlat
    timer_baslat(oda_id)
    
    # Tüm odadakilere oyun durumunu gönder
    emit('oyun_durumu', {
        'aktif_oyuncu': oyun['oyuncular'][0],
        'ilk_harf': kelime[0],
        'kelime_uzunlugu': 4,
        'oyuncular': oyun['oyuncular'],
        'kalan_sure': SURE_SINIRI,
        'ilk_oyun': True,
        'bomba_sayaci': 3,
        'tahmin_yapilabilir': True  # Yeni eklenen alan
    }, room=oda_id)

@socketio.on('tahmin_yap')
def tahmin_yap(data):
    oda_id = data.get('oda_id')
    tahmin = data.get('tahmin', '').lower()
    oyuncu = data.get('oyuncu')

    if not oda_id or oda_id not in oyun_odalari:
        emit('hata', {'mesaj': 'Geçersiz oda!'})
        return

    oyun = oyun_odalari[oda_id]
    if not oyun['aktif']:
        emit('hata', {'mesaj': 'Oyun henüz başlamadı!'})
        return

    if oyuncu != oyun['aktif_oyuncu']:
        emit('hata', {'mesaj': 'Sıra sizde değil!'})
        return

    # Tahmin sonucunu hesapla ve gönder
    sonuc = tahmin_sonucunu_hesapla(tahmin, oyun['kelime'])
    oyun['tahminler'].append({'tahmin': tahmin, 'sonuc': sonuc})

    emit('tahmin_sonucu', {
        'tahminler': oyun['tahminler'],
        'bomba_aciga_cikti': oyun['bomba_aciga_cikti'],
        'bomba_harfi': oyun['bomba_harfleri'][0] if oyun['bomba_aciga_cikti'] else None,
        'puanlar': oyun['puanlar']
    }, room=oda_id)

    # Kelime doğru tahmin edildiyse
    if tahmin == oyun['kelime']:
        oyun['puanlar'][oyuncu] = oyun['puanlar'].get(oyuncu, 0) + 100
        siradaki_oyuncuya_gec(oda_id)

@socketio.on('siradaki_oyuncu')
def siradaki_oyuncuya_gec():
    global oyun, aktif_timer
    if not oyun['aktif']:
        return
        
    # Önceki timer'ı durdur
    timer_durdur()
    
    oyuncu_sayisi = len(oyun['oyuncular'])
    simdiki_index = oyun['oyuncular'].index(oyun['aktif_oyuncu'])
    sonraki_index = (simdiki_index + 1) % oyuncu_sayisi
    oyun['aktif_oyuncu'] = oyun['oyuncular'][sonraki_index]
    oyun['tahminler'] = []
    oyun['kalan_sure'] = SURE_SINIRI
    
    # Yeni timer başlat
    aktif_timer = Timer(1.0, sure_kontrolu)
    aktif_timer.start()
    
    # Oyuncu turu kontrolü
    if sonraki_index == 0:
        oyun['tur_sayisi'] += 1
        if oyun['tur_sayisi'] >= 2:
            oyun['kelime_uzunlugu'] += 1
            oyun['tur_sayisi'] = 0
            if oyun['kelime_uzunlugu'] > 7:
                oyun['aktif'] = False
                socketio.emit('oyun_bitti', {'puanlar': oyun['puanlar']})
                return
    
    # Yeni kelime ve bomba harfleri seç
    kelime, bomba_harfleri = yeni_kelime_sec(oyun['kelime_uzunlugu'])
    oyun['kelime'] = kelime
    oyun['bomba_harfleri'] = bomba_harfleri
    
    socketio.emit('siradaki_oyuncu', {
        'aktif_oyuncu': oyun['aktif_oyuncu'],
        'kelime_uzunlugu': oyun['kelime_uzunlugu'],
        'tur_sayisi': oyun['tur_sayisi'],
        'ilk_harf': oyun['kelime'][0],
        'kalan_sure': SURE_SINIRI,
        'ilk_oyun': False
    })
    
    # Yeni tur başlatıldığında
    socketio.emit('yeni_tur', {
        'ilk_harf': oyun['kelime'][0],
        'kelime_uzunlugu': len(oyun['kelime']),
        'aktif_oyuncu': oyun['aktif_oyuncu'],
        'kalan_sure': SURE_SINIRI,
        'tur_sayisi': oyun['tur_sayisi'],
        'bomba_sayaci': 2,
        'puanlar': oyun['puanlar']
    })

@socketio.on('joker_kullan')
def joker_kullan(data):
    global oyun
    if not oyun['aktif']:
        return
        
    oyuncu = data['oyuncu']
    
    if oyuncu != oyun['aktif_oyuncu']:
        emit('hata', {'mesaj': 'Sıra sizde değil!'})
        return
    
    if oyun['puanlar'][oyuncu] < 40:
        emit('hata', {'mesaj': 'Joker kullanmak için 40 puana ihtiyacınız var!'})
        return
    
    dogru_kelime = oyun['kelime']
    acilmamis_harfler = []
    
    for i, harf in enumerate(dogru_kelime):
        acildi_mi = False
        for tahmin in oyun['tahminler']:
            if tahmin['sonuc'][i]['durum'] == 'dogru':
                acildi_mi = True
                break
        if not acildi_mi and i > 0:  # İlk harf zaten açık
            acilmamis_harfler.append((i, harf))
    
    if not acilmamis_harfler:
        emit('hata', {'mesaj': 'Açılacak yeni harf kalmadı!'})
        return
    
    secilen_index, secilen_harf = random.choice(acilmamis_harfler)
    oyun['puanlar'][oyuncu] -= 40
    
    emit('joker_sonucu', {
        'harf_index': secilen_index,
        'harf': secilen_harf,
        'puanlar': oyun['puanlar']
    }, broadcast=True)

@socketio.on('emoji_gonder')
def emoji_gonder(data):
    oyuncu = data['oyuncu']
    emoji = data['emoji']
    emit('emoji_alindi', {
        'oyuncu': oyuncu,
        'emoji': emoji
    }, broadcast=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/oyun')
def oyun_sayfasi():
    return render_template('oyun.html')

@socketio.on('odaya_katil')
def odaya_katil(data):
    oyuncu = data.get('oyuncu')
    oda_id = data.get('oda_id')
    
    if not oyuncu:
        emit('hata', {'mesaj': 'Oyuncu adı gerekli!'})
        return
    
    if not oda_id:
        # Yeni oda oluştur
        oda_id = str(uuid.uuid4())[:8]
        oyun_odalari[oda_id] = {
            'aktif': False,
            'oyuncular': [oyuncu],
            'kelime': '',
            'tahminler': [],
            'puanlar': {},
            'kelime_uzunlugu': 4,
            'aktif_oyuncu': '',
            'tur_sayisi': 0,
            'kalan_sure': SURE_SINIRI,
            'bomba_harfleri': [],
            'bomba_sayaci': 3,
            'bomba_aciga_cikti': False
        }
    else:
        # Mevcut odaya katıl
        if oda_id not in oyun_odalari:
            emit('hata', {'mesaj': 'Oda bulunamadı!'})
            return
            
        if oyuncu in oyun_odalari[oda_id]['oyuncular']:
            emit('hata', {'mesaj': 'Bu oyuncu zaten odada!'})
            return
            
        if len(oyun_odalari[oda_id]['oyuncular']) >= 4:
            emit('hata', {'mesaj': 'Oda dolu! (Maksimum 4 oyuncu)'})
            return
            
        oyun_odalari[oda_id]['oyuncular'].append(oyuncu)
    
    # Odaya katıl
    join_room(oda_id)
    
    # Tüm odadakilere güncel bilgiyi gönder
    emit('oda_durumu', {
        'oda_id': oda_id,
        'oyuncular': oyun_odalari[oda_id]['oyuncular']
    }, room=oda_id)

@socketio.on('odalari_getir')
def odalari_getir():
    aktif_odalar = []
    for oda_id, oda in oyun_odalari.items():
        if not oda['aktif'] and len(oda['oyuncular']) < 4:  # Sadece aktif olmayan ve dolu olmayan odalar
            aktif_odalar.append({
                'oda_id': oda_id,
                'oyuncu_sayisi': len(oda['oyuncular']),
                'oyuncular': oda['oyuncular']
            })
    emit('odalar_listesi', {'odalar': aktif_odalar})

if __name__ == '__main__':
    if os.environ.get('FLASK_ENV') == 'development':
        socketio.run(app, debug=True)
    else:
        port = int(os.environ.get("PORT", 5000))
        socketio.run(app, host='0.0.0.0', port=port) 
