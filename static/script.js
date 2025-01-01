const socket = io();
const SURE_SINIRI = 90; // saniye
let sureAnimasyonu = null;
let tahminYapilabilir = true;

// Ses efektleri
const sesler = {
    basari: new Audio('/static/sounds/success.mp3'),
    basarisiz: new Audio('/static/sounds/fail.mp3'),
    alkis: new Audio('/static/sounds/applause.mp3'),
    patlama: new Audio('/static/sounds/explosion.mp3'),
    tik: new Audio('/static/sounds/tick.mp3'),
    uyari: new Audio('/static/sounds/warning.mp3')
};

// Sesleri önceden yükle ve hazırla
Object.values(sesler).forEach(ses => {
    ses.load();
    ses.preload = 'auto';
});

// Ses ayarları
let sesAcik = true;

// Ses çalma fonksiyonu
async function sesOynat(sesAdi) {
    if (sesAcik && sesler[sesAdi]) {
        const ses = sesler[sesAdi];
        ses.currentTime = 0;
        try {
            await ses.play();
        } catch (error) {
            console.log('Ses çalınamadı:', error);
        }
    }
}

// Ses açma/kapama fonksiyonu
function sesiAcKapat() {
    sesAcik = !sesAcik;
    const sesAcikSpan = document.querySelector('.ses-acik');
    const sesKapaliSpan = document.querySelector('.ses-kapali');
    
    if (sesAcik) {
        sesAcikSpan.style.display = 'block';
        sesKapaliSpan.style.display = 'none';
    } else {
        sesAcikSpan.style.display = 'none';
        sesKapaliSpan.style.display = 'block';
    }
}

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

function tahminYap() {
    if (!tahminYapilabilir) {
        console.log('Tahmin yapılamaz durumda');
        return;
    }
    
    const tahminInput = document.getElementById('tahmin-input');
    const tahmin = tahminInput.value.trim().toLowerCase();
    if (!tahmin) return;
    
    const kelimeUzunlugu = parseInt(document.getElementById('kelime-uzunlugu').textContent);
    if (tahmin.length !== kelimeUzunlugu) {
        alert(`Kelime ${kelimeUzunlugu} harfli olmalı!`);
        return;
    }
    
    socket.emit('tahmin_yap', {
        tahmin: tahmin,
        oyuncu: document.getElementById('aktif-oyuncu').textContent
    });
    
    tahminInput.value = '';
    tahminInput.focus();
}

function siradakiOyuncuyaGec() {
    socket.emit('siradaki_oyuncu');
    
    // Önceki tahminleri ve animasyonları temizle
    const tahminlerDiv = document.getElementById('tahminler');
    tahminlerDiv.innerHTML = '';
    
    // Başarısızlık/başarı mesajlarını temizle
    const basarisizDiv = document.querySelector('.basarisiz-animasyon');
    const basariDiv = document.querySelector('.basari-bildirimi');
    const sureBittiDiv = document.querySelector('.sure-bitti-animasyon');
    if (basarisizDiv) basarisizDiv.remove();
    if (basariDiv) basariDiv.remove();
    if (sureBittiDiv) sureBittiDiv.remove();
    
    // Sıradaki oyuncu butonunu gizle
    const siradakiOyuncuDiv = document.getElementById('siradaki-oyuncu-div');
    if (siradakiOyuncuDiv) {
        siradakiOyuncuDiv.style.display = 'none';
    }
    
    // Tahmin yapılabilir duruma getir
    tahminYapilabilir = true;
}

function sureAnimasyonunuBaslat() {
    const sureProgress = document.getElementById('sure-progress');
    if (sureProgress) {
        // Mevcut animasyonu temizle
        sureProgress.style.animation = 'none';
        sureProgress.offsetHeight; // Reflow
        
        // Yeni animasyonu başlat
        sureProgress.style.animation = 'sure-animasyon 90s linear';
        sureProgress.style.transform = 'rotate(-90deg)';
        sureProgress.style.borderColor = '#3b82f6'; // Mavi
    }
    
    // Süre metnini güncelle
    document.getElementById('kalan-sure').textContent = SURE_SINIRI;
}

function jokerKullan() {
    if (!tahminYapilabilir) return;
    
    socket.emit('joker_kullan', {
        oyuncu: document.getElementById('aktif-oyuncu').textContent
    });
}

function puanTablosunuGuncelle(puanlar) {
    const puanTablosu = document.getElementById('puan-tablosu');
    puanTablosu.innerHTML = '<h6 class="mb-3">Anlık Puanlar:</h6>';
    
    // Puanları sırala (yüksekten düşüğe)
    Object.entries(puanlar)
        .sort(([,a], [,b]) => b - a)
        .forEach(([oyuncu, puan], index) => {
            const div = document.createElement('div');
            div.className = 'puan-satiri';
            
            // İlk üç için özel stil
            let sira = '';
            if (index === 0) sira = '🥇 ';
            else if (index === 1) sira = '🥈 ';
            else if (index === 2) sira = '🥉 ';
            
            div.innerHTML = `
                <span>${sira}${oyuncu}</span>
                <span>${puan} puan</span>
            `;
            puanTablosu.appendChild(div);
        });
}

function enYuksekPuanlariGuncelle(skorlar) {
    const enYuksekPuanlar = document.getElementById('en-yuksek-puanlar');
    enYuksekPuanlar.innerHTML = '';
    
    Object.entries(skorlar).forEach(([oyuncu, puan]) => {
        const div = document.createElement('div');
        div.className = 'puan-satiri';
        div.innerHTML = `
            <span>${oyuncu}</span>
            <span>En İyi: ${puan} puan</span>
        `;
        enYuksekPuanlar.appendChild(div);
    });
}

// Boş tahmin satırlarını oluştur
function tahminSatirlariniOlustur() {
    const tahminlerDiv = document.getElementById('tahminler');
    if (!tahminlerDiv) {
        console.error('Tahminler div bulunamadı!');
        return;
    }
    
    tahminlerDiv.innerHTML = ''; // Önce mevcut tahminleri temizle
    const kelimeUzunlugu = parseInt(document.getElementById('kelime-uzunlugu').textContent);
    const ilkHarf = document.getElementById('ilk-harf').textContent;

    // 6 satır oluştur
    for (let i = 0; i < 6; i++) {
        const satirDiv = document.createElement('div');
        satirDiv.className = 'tahmin-satiri mb-2';
        if (i > 0) satirDiv.classList.add('bos');

        // Her satıra kelime uzunluğu kadar kutu ekle
        for (let j = 0; j < kelimeUzunlugu; j++) {
            const harfDiv = document.createElement('div');
            harfDiv.className = 'harf';
            
            // İlk harfi tüm satırlarda göster
            if (j === 0) {
                harfDiv.textContent = ilkHarf;
                harfDiv.classList.add('dogru');
            } else {
                harfDiv.textContent = '';
            }
            satirDiv.appendChild(harfDiv);
        }
        tahminlerDiv.appendChild(satirDiv);
    }
    
    // Tahmin kutularının oluşturulduğunu kontrol et
    const tahminSatirlari = tahminlerDiv.getElementsByClassName('tahmin-satiri');
    if (tahminSatirlari.length === 0) {
        console.error('Tahmin satırları oluşturulamadı!');
    }
}

// Tahmin sonuçlarını güncelle
function tahminSonuclariniGuncelle(tahminler) {
    const tahminlerDiv = document.getElementById('tahminler');
    const satirlar = tahminlerDiv.getElementsByClassName('tahmin-satiri');
    const kelimeUzunlugu = parseInt(document.getElementById('kelime-uzunlugu').textContent);
    const ilkHarf = document.getElementById('ilk-harf').textContent;

    // Önceki tahminlerdeki doğru harfleri bul
    let dogruHarfler = new Array(kelimeUzunlugu).fill(null);
    tahminler.forEach(tahmin => {
        tahmin.sonuc.forEach((sonuc, index) => {
            if (sonuc.durum === 'dogru') {
                dogruHarfler[index] = tahmin.tahmin[index];
            }
        });
    });

    // Önceki tahminleri işle
    for (let i = 0; i < tahminler.length; i++) {
        const tahmin = tahminler[i];
        const satirDiv = satirlar[i];
        satirDiv.classList.remove('bos');

        const harfDivler = satirDiv.getElementsByClassName('harf');
        for (let j = 0; j < kelimeUzunlugu; j++) {
            const harfDiv = harfDivler[j];
            if (j === 0) {
                // İlk harf her zaman aynı ve yeşil
                harfDiv.textContent = ilkHarf;
                harfDiv.className = 'harf dogru';
            } else {
                // Kullanıcının tahmin ettiği harfi göster
                harfDiv.textContent = tahmin.tahmin[j];
                harfDiv.className = `harf ${tahmin.sonuc[j].durum}`;
            }
        }
    }

    // Kalan boş satırlara sadece doğru harfleri yerleştir
    for (let i = tahminler.length; i < 6; i++) {
        const satirDiv = satirlar[i];
        satirDiv.classList.add('bos');
        const harfDivler = satirDiv.getElementsByClassName('harf');

        for (let j = 0; j < kelimeUzunlugu; j++) {
            const harfDiv = harfDivler[j];
            if (j === 0) {
                // İlk harf her zaman aynı ve yeşil
                harfDiv.textContent = ilkHarf;
                harfDiv.className = 'harf dogru';
            } else if (dogruHarfler[j] !== null) {
                // Önceki tahminlerde doğru bulunan harfleri yeşil olarak göster
                harfDiv.textContent = dogruHarfler[j];
                harfDiv.className = 'harf dogru';
            } else {
                // Diğer kutular boş
                harfDiv.textContent = '';
                harfDiv.className = 'harf';
            }
        }
    }
}

// Socket olayları
socket.on('oyun_durumu', (data) => {
    // Giriş ekranını gizle, oyun ekranını göster
    document.getElementById('giris-ekrani').style.display = 'none';
    document.getElementById('oyun-ekrani').style.display = 'block';
    
    // Oyun bilgilerini güncelle
    document.getElementById('aktif-oyuncu').textContent = data.aktif_oyuncu;
    document.getElementById('kelime-uzunlugu').textContent = data.kelime_uzunlugu;
    document.getElementById('ilk-harf').textContent = data.ilk_harf;
    document.getElementById('kalan-sure').textContent = data.kalan_sure;
    document.getElementById('tur-sayisi').textContent = data.tur_sayisi;
    
    // Tahmin alanını temizle
    document.getElementById('tahmin-input').value = '';
    
    // Tahmin satırlarını yeniden oluştur
    tahminSatirlariniOlustur();
    
    // Süreyi yeniden başlat
    sureAnimasyonunuBaslat();
    
    // Tahmin yapılabilir duruma getir
    tahminYapilabilir = true;
    
    // Bomba sayacını güncelle
    const bombaSayaciElement = document.getElementById('bomba-sayaci');
    if (bombaSayaciElement) {
        bombaSayaciElement.textContent = data.bomba_sayaci;
    }
    
    // Bomba harflerini güncelle
    const bombaHarfiElement = document.getElementById('bomba-harfi');
    if (bombaHarfiElement) {
        bombaHarfiElement.textContent = data.bomba_aciga_cikti ? data.bomba_harfleri.join(', ') : '?';
    }
});

socket.on('tahmin_sonucu', (data) => {
    // Tahminleri güncelle
    tahminSonuclariniGuncelle(data.tahminler);
    
    // Bomba bilgilerini güncelle
    if (data.bomba_aciga_cikti && data.bomba_harfi) {
        document.getElementById('bomba-harfi').textContent = data.bomba_harfi;
        document.getElementById('bomba-harfi').classList.add('tehlike');
        sesOynat('uyari');
    }

    // Puan tablosunu güncelle
    if (data.puanlar) {
        puanTablosunuGuncelle(data.puanlar);
    }
});

socket.on('sure_guncelle', (data) => {
    // Süre metnini güncelle
    const kalanSure = parseInt(data.kalan_sure);
    document.getElementById('kalan-sure').textContent = kalanSure;
    
    // Süre çemberini güncelle
    const sureProgress = document.getElementById('sure-progress');
    if (sureProgress) {
        const kalanYuzde = (kalanSure / SURE_SINIRI) * 100;
        const donusDerece = -90 + ((100 - kalanYuzde) * 3.6);
        sureProgress.style.transform = `rotate(${donusDerece}deg)`;
        
        // Renk değişimi
        if (kalanSure <= 10) {
            sureProgress.style.borderColor = '#ef4444'; // Kırmızı
        } else if (kalanSure <= 30) {
            sureProgress.style.borderColor = '#f59e0b'; // Turuncu
        } else {
            sureProgress.style.borderColor = '#3b82f6'; // Mavi
        }
    }
});

socket.on('sure_bitti', async (data) => {
    tahminYapilabilir = false;
    
    // Başarısızlık sesi çal
    await sesOynat('basarisiz');
    
    // Süre bitti mesajı
    alert(`⏰ Süre bitti!\n❌ Doğru kelime: ${data.dogru_kelime}\n💣 Bomba harfleri: ${data.bomba_harfleri.join(', ')}`);
    
    // Süre bitti animasyonu
    const tahminlerDiv = document.getElementById('tahminler');
    const sureBittiDiv = document.createElement('div');
    sureBittiDiv.className = 'sure-bitti-animasyon';
    sureBittiDiv.innerHTML = '⏰ ❌ 😢';
    tahminlerDiv.appendChild(sureBittiDiv);
    
    // Sıradaki oyuncu butonunu göster
    document.getElementById('siradaki-oyuncu-div').style.display = 'block';
});

socket.on('kelime_bulundu', async (data) => {
    // Tahmin sonuçlarını göster
    const tahminlerDiv = document.getElementById('tahminler');
    tahminlerDiv.innerHTML = '';
    
    // Önceki tahminleri normal şekilde göster
    for (let i = 0; i < data.tahminler.length - 1; i++) {
        const tahmin = data.tahminler[i];
        const tahminDiv = document.createElement('div');
        tahminDiv.className = 'tahmin-satiri mb-2';
        
        tahmin.sonuc.forEach(harf => {
            const harfDiv = document.createElement('span');
            harfDiv.className = `harf ${harf.durum}`;
            harfDiv.textContent = harf.harf;
            tahminDiv.appendChild(harfDiv);
        });
        
        tahminlerDiv.appendChild(tahminDiv);
    }

    // Son tahmini tüm harfleri yeşil olacak şekilde göster
    const sonTahminDiv = document.createElement('div');
    sonTahminDiv.className = 'tahmin-satiri mb-2 dogru-tahmin';
    
    data.tahmin.split('').forEach(harf => {
        const harfDiv = document.createElement('span');
        harfDiv.className = 'harf dogru';  // Tüm harfler yeşil
        harfDiv.textContent = harf;
        sonTahminDiv.appendChild(harfDiv);
    });
    
    tahminlerDiv.appendChild(sonTahminDiv);
    
    // Puan bilgilerini göster
    puanTablosunuGuncelle(data.puanlar);
    
    // Ses efekti
    await sesOynat('alkis');
    
    // Detaylı bildirim göster
    const bildirim = document.createElement('div');
    bildirim.className = 'alert alert-success basari-bildirimi';
    bildirim.innerHTML = `
        <h4>🎉 Tebrikler! ${data.oyuncu} kelimeyi buldu!</h4>
        <div class="puan-detaylari">
            <p>🌟 Temel Puan: ${data.temel_puan}</p>
            <p>⏱️ Süre Bonusu: +${data.sure_bonus}</p>
            <p>💣 Bomba Bonusu: +${data.bomba_bonus}</p>
            <p class="toplam-puan">🏆 Toplam Puan: ${data.toplam_puan}</p>
        </div>
    `;
    tahminlerDiv.appendChild(bildirim);
    
    // Sıradaki oyuncu butonunu göster
    document.getElementById('siradaki-oyuncu-div').style.display = 'block';
    tahminYapilabilir = false;
});

socket.on('tahmin_hakki_bitti', async (data) => {
    tahminYapilabilir = false;
    
    // Başarısızlık sesi çal
    await sesOynat('basarisiz');
    
    // Başarısızlık mesajı
    alert(`😔 Tahmin hakkınız bitti!\n❌ Doğru kelime: ${data.dogru_kelime}\n💣 Bomba harfleri: ${data.bomba_harfleri.join(', ')}`);
    
    // Başarısızlık animasyonu
    const tahminlerDiv = document.getElementById('tahminler');
    const basarisizDiv = document.createElement('div');
    basarisizDiv.className = 'basarisiz-animasyon';
    basarisizDiv.innerHTML = '😔 ❌ 😢';
    tahminlerDiv.appendChild(basarisizDiv);
    
    // Sıradaki oyuncu butonunu göster
    document.getElementById('siradaki-oyuncu-div').style.display = 'block';
});

socket.on('siradaki_oyuncu', (data) => {
    // Oyun bilgilerini güncelle
    document.getElementById('ilk-harf').textContent = data.ilk_harf;
    document.getElementById('kelime-uzunlugu').textContent = data.kelime_uzunlugu;
    document.getElementById('tur-sayisi').textContent = data.tur_sayisi;
    document.getElementById('aktif-oyuncu').textContent = data.aktif_oyuncu;
    document.getElementById('kalan-sure').textContent = SURE_SINIRI;
    
    // Tahmin alanını temizle
    document.getElementById('tahmin-input').value = '';
    document.getElementById('tahmin-input').placeholder = 'Tahmininizi yazın...';
    
    // Önceki tahminleri ve animasyonları temizle
    const tahminlerDiv = document.getElementById('tahminler');
    tahminlerDiv.innerHTML = '';
    
    // Yeni tahmin satırlarını oluştur
    tahminSatirlariniOlustur();
    
    // Süre çemberini sıfırla ve yeniden başlat
    sureAnimasyonunuBaslat();
    
    // Bomba bilgilerini sıfırla
    const bombaHarfiElement = document.getElementById('bomba-harfi');
    if (bombaHarfiElement) {
        bombaHarfiElement.textContent = '?';
        bombaHarfiElement.classList.remove('tehlike');
    }
    
    // Tahmin yapılabilir duruma getir
    tahminYapilabilir = true;
    
    // Input alanına fokuslan
    document.getElementById('tahmin-input').focus();
    
    // Sıradaki oyuncu butonunu gizle
    const siradakiOyuncuDiv = document.getElementById('siradaki-oyuncu-div');
    if (siradakiOyuncuDiv) {
        siradakiOyuncuDiv.style.display = 'none';
    }
});

socket.on('oyun_bitti', (data) => {
    const puanlar = data.puanlar;
    let mesaj = 'Oyun bitti!\n\nPuanlar:\n';
    Object.entries(puanlar).forEach(([oyuncu, puan]) => {
        mesaj += `${oyuncu}: ${puan} puan\n`;
    });
    alert(mesaj);
    window.location.reload();
});

socket.on('hata', (data) => {
    alert(data.mesaj);
});

socket.on('joker_sonucu', (data) => {
    const tahminlerDiv = document.getElementById('tahminler');
    const jokerDiv = document.createElement('div');
    jokerDiv.className = 'tahmin-satiri mb-2';
    
    // Joker harfini göster
    const harfDiv = document.createElement('span');
    harfDiv.className = 'harf joker dogru';
    harfDiv.textContent = data.harf;
    harfDiv.style.marginLeft = `${data.harf_index * 60}px`; // Harfin konumunu ayarla
    jokerDiv.appendChild(harfDiv);
    
    tahminlerDiv.appendChild(jokerDiv);
    
    // Puan tablosunu güncelle
    puanTablosunuGuncelle(data.puanlar);
});

// Enter tuşu ile tahmin yapma
document.getElementById('tahmin-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        tahminYap();
    }
});

// Sayfa yüklendiğinde oyuncu alanlarını oluştur
document.addEventListener('DOMContentLoaded', () => {
    oyuncuAlanlariOlustur();
    sesiAcKapat();
});

socket.on('tahmin_durumu', (data) => {
    tahminYapilabilir = data.tahmin_yapilabilir;
    if (tahminYapilabilir) {
        document.getElementById('tahmin-input').focus();
    }
});

// Bomba patlama efekti fonksiyonu
async function bombaPatlamaEfekti() {
    // Önce ses efektini başlat
    await sesOynat('patlama');
    
    // Kırmızı flash efekti
    const patlamaEfekti = document.createElement('div');
    patlamaEfekti.className = 'patlama-efekti';
    document.body.appendChild(patlamaEfekti);
    
    // Bomba emoji animasyonu
    const patlamaMerkez = document.createElement('div');
    patlamaMerkez.className = 'patlama-merkez';
    patlamaMerkez.innerHTML = '💣💥';
    document.body.appendChild(patlamaMerkez);
    
    // Ekranı sarsma efekti
    document.body.classList.add('sarsinti');
    
    // Efektleri temizle
    setTimeout(() => {
        document.body.removeChild(patlamaEfekti);
        document.body.removeChild(patlamaMerkez);
        document.body.classList.remove('sarsinti');
    }, 500);
}

socket.on('bomba_patladi', async (data) => {
    tahminYapilabilir = false;
    
    // Patlama efektini başlat
    await bombaPatlamaEfekti();
    
    // Kısa bir gecikme ile mesajı göster
    setTimeout(() => {
        // Patlama mesajı
        alert(`💣 BOOM! ${data.oyuncu} bomba harfini (${data.bomba_harfi}) kullandı!\n` +
              `📉 Puan Kaybı: ${data.puan_kaybi} puan\n` +
              `❌ Doğru kelime: ${data.dogru_kelime}\n` +
              `💣 Bomba harfleri: ${data.bomba_harfleri.join(', ')}`);
        
        // Patlama animasyonu
        const tahminlerDiv = document.getElementById('tahminler');
        const patlamaDiv = document.createElement('div');
        patlamaDiv.className = 'patlama-animasyon';
        patlamaDiv.innerHTML = '💣 💥 🔥';
        tahminlerDiv.appendChild(patlamaDiv);
        
        // Puan tablosunu güncelle
        puanTablosunuGuncelle(data.puanlar);
        
        // Sıradaki oyuncu butonunu göster ve özel stil ekle
        const siradakiOyuncuDiv = document.getElementById('siradaki-oyuncu-div');
        siradakiOyuncuDiv.style.display = 'block';
        siradakiOyuncuDiv.innerHTML = `
            <div class="alert alert-danger mb-3">
                💣 Bomba patladı! Sıradaki oyuncuya geçmek için butona tıklayın.
            </div>
            <button class="btn btn-danger" onclick="siradakiOyuncuyaGec()">
                Sıradaki Oyuncuya Geç
            </button>
        `;
    }, 600);
});

// Emoji panel kontrolü
function toggleEmojiPanel() {
    const panel = document.getElementById('emoji-panel');
    const button = document.querySelector('.emoji-btn');
    
    // Panel pozisyonunu emoji butonuna göre ayarla
    if (panel.style.display === 'none') {
        const buttonRect = button.getBoundingClientRect();
        panel.style.position = 'absolute';
        panel.style.left = buttonRect.left + 'px';
        panel.style.top = (buttonRect.top - 220) + 'px';
    }
    
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Emoji gönderme
function sendEmoji(emoji) {
    const aktifOyuncu = document.getElementById('aktif-oyuncu').textContent;
    socket.emit('emoji_gonder', {
        oyuncu: aktifOyuncu,
        emoji: emoji
    });
    toggleEmojiPanel(); // Paneli kapat
}

// Emoji alma
socket.on('emoji_alindi', (data) => {
    const emojiMessages = document.getElementById('emoji-messages');
    const message = document.createElement('div');
    message.className = 'emoji-message';
    message.innerHTML = `<strong>${data.oyuncu}:</strong> ${data.emoji}`;
    
    emojiMessages.appendChild(message);
    
    // 3 saniye sonra mesajı kaldır
    setTimeout(() => {
        message.remove();
    }, 3000);
});

// Sayfa tıklaması ile emoji panelini kapat
document.addEventListener('click', (e) => {
    const panel = document.getElementById('emoji-panel');
    const emojiBtn = e.target.closest('.emoji-btn');
    const emojiPanel = e.target.closest('.emoji-panel');
    
    if (!emojiBtn && !emojiPanel && panel.style.display === 'block') {
        panel.style.display = 'none';
    }
});

// Mevcut socket olaylarına ek olarak
socket.on('yeni_tur', (data) => {
    // Oyun bilgilerini güncelle
    document.getElementById('ilk-harf').textContent = data.ilk_harf;
    document.getElementById('kelime-uzunlugu').textContent = data.kelime_uzunlugu;
    document.getElementById('aktif-oyuncu').textContent = data.aktif_oyuncu;
    document.getElementById('kalan-sure').textContent = data.kalan_sure;
    document.getElementById('tur-sayisi').textContent = data.tur_sayisi;

    // Tahmin kutularını yeniden oluştur
    tahminSatirlariniOlustur();

    // Bomba bilgilerini sıfırla
    document.getElementById('bomba-harfi').textContent = '?';
    document.getElementById('bomba-harfi').classList.remove('tehlike');
    
    // Bomba sayacını güncelle
    if (data.bomba_sayaci) {
        document.getElementById('bomba-sayaci').textContent = data.bomba_sayaci;
    }

    // Varsa önceki patlama animasyonunu temizle
    const patlamaDiv = document.querySelector('.patlama-animasyon');
    if (patlamaDiv) {
        patlamaDiv.remove();
    }

    // Sıradaki oyuncu butonunu gizle
    const siradakiOyuncuDiv = document.getElementById('siradaki-oyuncu-div');
    siradakiOyuncuDiv.style.display = 'none';

    // Tahmin yapılabilir duruma getir
    tahminYapilabilir = true;

    // Puan tablosunu güncelle
    if (data.puanlar) {
        puanTablosunuGuncelle(data.puanlar);
    }
}); 
