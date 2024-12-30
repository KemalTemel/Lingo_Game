const socket = io();
let sureAnimasyonu = null;
let tahminYapilabilir = true;

function tahminYap() {
    if (!tahminYapilabilir) return;
    
    const tahmin = document.getElementById('tahmin-input').value.trim().toLowerCase();
    if (!tahmin) return;
    
    socket.emit('tahmin_yap', {
        tahmin: tahmin,
        oyuncu: document.getElementById('aktif-oyuncu').textContent
    });
    
    document.getElementById('tahmin-input').value = '';
}

function siradakiOyuncuyaGec() {
    socket.emit('siradaki_oyuncu_hazir');
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
    alert(`Tebrikler! ${data.oyuncu} kelimeyi buldu ve ${data.puan} puan kazandı!`);
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

socket.on('oyun_bitti', (data) => {
    const puanlar = data.puanlar;
    let mesaj = 'Oyun bitti!\n\nPuanlar:\n';
    Object.entries(puanlar).forEach(([oyuncu, puan]) => {
        mesaj += `${oyuncu}: ${puan} puan\n`;
    });
    alert(mesaj);
    window.location.href = '/';
});

// Enter tuşu ile tahmin yapma
document.getElementById('tahmin-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        tahminYap();
    }
}); 