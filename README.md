Bu proje, kullanıcıların odaklanma seanslarını takip etmesini, dikkat dağınıklıklarını kayıt altına almasını ve geçmiş performanslarını grafikler ile incelemesini sağlayan bir **mobil odaklanma uygulamasıdır**.

Uygulama, React Native ve Expo kullanılarak geliştirilmiştir. Zamanlayıcı ekranı ile Pomodoro tarzında odaklanma yapabilir, Raporlar ekranı ile geçmiş seanslarını analiz edebilirsin.



## 📱 Özellikler

- ⏱ **Zamanlayıcı Ekranı (Ana Sayfa)**
  - Varsayılan 25 dakikalık geri sayım sayacı
  - Süreyi 5’er dakikalık adımlarla **arttırma / azaltma** (min 5 dk, max 120 dk)
  - **Başlat / Duraklat / Sıfırla** butonları
  - Seans başlamadan önce **kategori seçimi**
  - İsteğe bağlı olarak seansa **görev bağlama** (Tasks ekranı ile entegre ise)
  - Seans sırasında uygulamadan çıkınca AppState ile **dikkat dağınıklığı sayma**
  - Seans özeti kartı:
    - Seçilen kategori
    - Bağlı görev (varsa)
    - Dikkat dağınıklığı sayısı

- 🧠 **Dikkat Dağınıklığı Takibi (AppState)**
  - Sayaç çalışırken uygulamadan çıkıldığında (`background` / `inactive`):
    - Dikkat dağınıklığı sayacı +1
    - Zamanlayıcı otomatik duraklatılır
  - Uygulamaya dönüldüğünde sayaç duraklamış şekilde kalır, kullanıcı isterse tekrar başlatabilir.

- 📊 **Raporlar (Dashboard) Ekranı**
  - Tüm seanslar **AsyncStorage** üzerinden okunur
  - Genel istatistikler:
    - Bugün toplam odaklanma süresi
    - Tüm zamanların toplam odaklanma süresi
    - Toplam dikkat dağınıklığı sayısı
  - Grafikler:
    - Son 7 / 30 güne ait odaklanma sürelerini gösteren **Bar Chart**
    - Odaklanma sürelerinin kategorilere göre dağılımını gösteren **Pie Chart**
  - Kayıtlı seanslar listesi (FlatList):
    - Tarih
    - Kategori
    - Hedef süre
    - Gerçek odak süresi
    - Tamamlama oranı
    - Dikkat dağınıklığı
    - Bitiş sebebi (süre doldu / manuel bitirildi)
  - Kategoriye göre filtreleme (Tümü + her kategori için buton)

- 🏷 **Kategoriler**
  - Varsayılan kategoriler: `Ders`, `Kodlama`, `Proje`, `Kitap`
  - Timer ekranından **“+ Kategori Ekle”** ile yeni kategori tanımlama
  - Kategoriler **AsyncStorage**’a kaydedilir ve Raporlar ekranında da kullanılır

---

## 🧰 Kullanılan Teknolojiler

- **React Native**
- **Expo**
- **AsyncStorage** (`@react-native-async-storage/async-storage`)
- **React Navigation** (Tab Navigator)
- **react-native-chart-kit** (BarChart, PieChart)
- **AppState API** (dikkat dağınıklığı takibi)
- **SafeAreaView** (`react-native-safe-area-context`)