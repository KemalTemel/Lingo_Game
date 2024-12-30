const socket = io();
let oyuncular = [];
let odaId = window.location.pathname.split('/').pop();
let sureAnimasyonu = null;
let tahminYapilabilir = true;

// Sayfa yüklendiğinde oyuncu adlarını almak için
socket.on('connect', () => {
    // URL'den oyuncu adlarını al
    const urlParams = new URLSearchParams(window.location.search);
    oyuncular = urlParams.getAll('oyuncular[]');
    
    if (oyuncular.length === 0) {
        window.location.href = '/';
        return;
    }
    
    // Odaya katıl ve oyunu başlat
    socket.emit('odaya_katil', {
        oda_id: odaId,
        oyuncular: oyuncular
    });
});

function odadanAyril() {
    window.location.href = '/';
}

function tahminYap() {
    if (!tahminYapilabilir) return;
    
    const tahmin = document.getElementById('tahmin-input').value.trim().toLowerCase();
    if (!tahmin) return;
    
    socket.emit('tahmin_yap', {
        oda_id: odaId,
        tahmin: tahmin,
        oyuncu: oyuncular[0]
    });
    
    document.getElementById('tahmin-input').value = '';
}

function siradakiOyuncuyaGec() {
    socket.emit('siradaki_oyuncu_hazir', {
        oda_id: odaId
    });
    document.getElementById('siradaki-oyuncu-div').style.display = 'none';
    document.getElementById('tahmin-input').value = '';
    tahminYapilabilir = true;
}

function sureAnimasyonunuBaslat() {
    const sureProgress = document.getElementById('sure-progress');
    if (sureAnimasyonu) {
        sureProgress.style.animation = 'none';
        sureProgress.offsetHeight; // Reflow
    }
    sureProgress.style.animation = 'sure-animasyon 90s linear';
    sureAnimasyonu = setTimeout(() => {
        sureProgress.style.animation = 'none';
    }, 90000);
}

// Socket olayları
socket.on('oyun_durumu', (data) => {
    // Oyun başladığında bekleme ekranını gizle ve oyun ekranını göster
    document.getElementById('bekleme-ekrani').style.display = 'none';
    document.getElementById('oyun-ekrani').style.display = 'block';
    
    // Oyun bilgilerini güncelle
    document.getElementById('ilk-harf').textContent = data.ilk_harf;
    document.getElementById('kelime-uzunlugu').textContent = data.kelime_uzunlugu;
    document.getElementById('aktif-oyuncu').textContent = data.aktif_oyuncu;
    document.getElementById('kalan-sure').textContent = data.kalan_sure;
    
    // Süre animasyonunu başlat
    sureAnimasyonunuBaslat();
});

socket.on('tahmin_sonucu', (data) => {
    // Tahmin sonuçlarını göster
    const tahminlerDiv = document.getElementById('tahminler');
    tahminlerDiv.innerHTML = '';
    
    data.tahminler.forEach(tahmin => {
        const tahminDiv = document.createElement('div');
        tahminDiv.className = 'tahmin-satiri mb-2';
        
        tahmin.sonuc.forEach(harf => {
            const harfDiv = document.createElement('span');
            harfDiv.className = `harf ${harf.durum}`;
            harfDiv.textContent = harf.harf;
            tahminDiv.appendChild(harfDiv);
        });
        
        tahminlerDiv.appendChild(tahminDiv);
    });
});

socket.on('sure_guncelle', (data) => {
    document.getElementById('kalan-sure').textContent = data.kalan_sure;
});

socket.on('sure_bitti', (data) => {
    tahminYapilabilir = false;
    document.getElementById('siradaki-oyuncu-div').style.display = 'block';
    alert(`Süre bitti! Doğru kelime: ${data.dogru_kelime}`);
});

socket.on('kelime_bulundu', (data) => {
    tahminYapilabilir = false;
    document.getElementById('siradaki-oyuncu-div').style.display = 'block';
    alert(`Tebrikler! Kelimeyi buldunuz!\nTemel puan: ${data.temel_puan}\nSüre bonusu: ${data.sure_bonus}\nToplam: ${data.toplam_puan}`);
});

socket.on('tahmin_hakki_bitti', (data) => {
    tahminYapilabilir = false;
    document.getElementById('siradaki-oyuncu-div').style.display = 'block';
    alert(`Tahmin hakkınız bitti! Doğru kelime: ${data.dogru_kelime}`);
});

socket.on('siradaki_oyuncu', (data) => {
    // Oyun bilgilerini güncelle
    document.getElementById('ilk-harf').textContent = data.ilk_harf;
    document.getElementById('kelime-uzunlugu').textContent = data.kelime_uzunlugu;
    document.getElementById('tur-sayisi').textContent = data.tur_sayisi + 1;
    document.getElementById('aktif-oyuncu').textContent = data.aktif_oyuncu;
    document.getElementById('kalan-sure').textContent = data.kalan_sure;
    
    // Tahminleri temizle
    document.getElementById('tahminler').innerHTML = '';
    document.getElementById('tahmin-input').value = '';
    document.getElementById('tahmin-input').placeholder = 'Tahmininizi yazın...';
    
    // Süre animasyonunu yeniden başlat
    sureAnimasyonunuBaslat();
    tahminYapilabilir = true;
}); 