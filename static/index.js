const socket = io();

function oyuncuAlanlariOlustur() {
    const oyuncuSayisi = parseInt(document.getElementById('oyuncu-sayisi').value);
    const oyuncuAlanlari = document.getElementById('oyuncu-alanlari');
    oyuncuAlanlari.innerHTML = '';
    
    for (let i = 1; i <= oyuncuSayisi; i++) {
        const div = document.createElement('div');
        div.className = 'mb-3';
        div.innerHTML = `
            <label for="oyuncu-${i}" class="form-label">${i}. Oyuncu Adı:</label>
            <input type="text" class="form-control" id="oyuncu-${i}" required>
        `;
        oyuncuAlanlari.appendChild(div);
    }
}

function oyunuBaslat() {
    const oyuncuSayisi = parseInt(document.getElementById('oyuncu-sayisi').value);
    const oyuncular = [];
    
    // Oyuncu isimlerini topla
    for (let i = 1; i <= oyuncuSayisi; i++) {
        const oyuncuAdi = document.getElementById(`oyuncu-${i}`).value.trim();
        if (!oyuncuAdi) {
            alert('Lütfen tüm oyuncu isimlerini girin!');
            return;
        }
        oyuncular.push(oyuncuAdi);
    }
    
    // Oyunu başlat
    socket.emit('oyun_baslat', {
        oyuncular: oyuncular
    });
}

// Socket olayları
socket.on('oyun_durumu', (data) => {
    // Oyun sayfasına yönlendir
    window.location.href = '/oyun';
});

socket.on('hata', (data) => {
    alert(data.mesaj);
});

// Sayfa yüklendiğinde oyuncu alanlarını oluştur
document.addEventListener('DOMContentLoaded', () => {
    oyuncuAlanlariOlustur();
}); 