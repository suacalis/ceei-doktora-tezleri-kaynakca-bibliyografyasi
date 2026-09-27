import re, unicodedata
TR = str.maketrans('çğıöşüÇĞİÖŞÜâîûÂÎÛ', 'cgiosuCGIOSUaiuAIU')
def fold(s):
    s = str(s).translate(TR)
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return s.lower()
def alnum(s):
    return re.sub(r'[^a-z0-9]', '', fold(s))
def split_adv(s):
    if not isinstance(s, str) or not s.strip(): return []
    parts = re.split(r'(?<!YRD)\s(?=(?:PROF DR|DOC DR|DR OGR UYESI|YRD DOC DR)\s)', ' ' + s.strip())
    return [p.strip() for p in parts if p.strip()]
# Üniversite adlarını Türkçe karakterli göster
UNI = {'Istanbul': 'İstanbul', 'Universitesi': 'Üniversitesi', 'Eylul': 'Eylül', 'Suleyman': 'Süleyman', 'Uludag': 'Uludağ',
       'Haci': 'Hacı', 'Yildirim': 'Yıldırım', 'Beyazit': 'Beyazıt', 'Ataturk': 'Atatürk', 'Kirklareli': 'Kırklareli',
       'Aydin': 'Aydın', 'Orta Dogu': 'Orta Doğu', 'Mugla': 'Muğla', 'Sitki': 'Sıtkı', 'Kocman': 'Koçman', 'Canakkale': 'Çanakkale',
       'Karadeniz': 'Karadeniz', 'Cukurova': 'Çukurova', 'Erciyes': 'Erciyes', 'Bogazici': 'Boğaziçi', 'Galatasaray': 'Galatasaray',
       'Hacettepe': 'Hacettepe', 'Dumlupinar': 'Dumlupınar', 'Karabuk': 'Karabük', 'Duzce': 'Düzce', 'Bulent': 'Bülent', 'Ecevit': 'Ecevit',
       'Nigde': 'Niğde', 'Omer': 'Ömer', 'Nevsehir': 'Nevşehir', 'Bilim': 'Bilim', 'Ticaret': 'Ticaret', 'Cumhuriyet': 'Cumhuriyet',
       'Kutahya': 'Kütahya', 'Dicle': 'Dicle', 'Firat': 'Fırat', 'Inonu': 'İnönü', 'Ondokuz': 'Ondokuz', 'Mayis': 'Mayıs', 'Selcuk': 'Selçuk',
       'Yuzuncu': 'Yüzüncü', 'Ahi': 'Ahi', 'Sehir': 'Şehir', 'Guvenligi': 'Güvenliği', 'Komutanligi': 'Komutanlığı', 'Mimar': 'Mimar',
       'Kastamonu': 'Kastamonu', 'Tokat': 'Tokat', 'Gaziosmanpasa': 'Gaziosmanpaşa', 'Sakarya': 'Sakarya', 'Kirikkale': 'Kırıkkale',
       'Bartin': 'Bartın', 'Usak': 'Uşak', 'Afyon': 'Afyon', 'Kocatepe': 'Kocatepe', 'Balikesir': 'Balıkesir', 'Istinye': 'İstinye',
       'Medipol': 'Medipol', 'Uskudar': 'Üsküdar', 'Isik': 'Işık', 'Ozyegin': 'Özyeğin', 'Bahcesehir': 'Bahçeşehir', 'Gumushane': 'Gümüşhane'}
def uni_tr(u):
    u = str(u)
    for a, b in UNI.items(): u = re.sub(r'\b' + a + r'\b', b, u)
    return u
ADV = {'OZ': 'ÖZ', 'SENKAL': 'ŞENKAL', 'SAHIN': 'ŞAHİN', 'TINAR': 'TINAR', 'OZDEMIR': 'ÖZDEMİR', 'UGUR': 'UĞUR', 'OZKAN': 'ÖZKAN',
       'OZUGURLU': 'ÖZUĞURLU', 'OZAYDIN': 'ÖZAYDIN', 'DOGA': 'DOĞA', 'BASAR': 'BAŞAR', 'SARIIPEK': 'SARIİPEK', 'LORDOGLU': 'LORDOĞLU',
       'AYTAC': 'AYTAÇ', 'SOZER': 'SÖZER', 'DELICAN': 'DELİCAN', 'YUCEL': 'YÜCEL', 'ZEKI': 'ZEKİ', 'ARIF': 'ARİF', 'MUSTAFA': 'MUSTAFA',
       'ABDULKADIR': 'ABDULKADİR', 'YASAR': 'YAŞAR', 'SULEYMAN': 'SÜLEYMAN', 'EYUP': 'EYÜP', 'BEDIR': 'BEDİR', 'METIN': 'METİN',
       'MEHMET': 'MEHMET', 'ALI': 'ALİ', 'SERPIL': 'SERPİL', 'SEDAT': 'SEDAT', 'HAKAN': 'HAKAN', 'KESER': 'KESER', 'CAGLAR': 'ÇAĞLAR',
       'OZBEK': 'ÖZBEK', 'ERDINC': 'ERDİNÇ', 'YAZICI': 'YAZICI', 'GOKCE': 'GÖKÇE', 'CEREV': 'CEREV', 'SAYIM': 'SAYIM', 'YORGUN': 'YORGUN',
       'ULKER': 'ÜLKER', 'KIVILCIM': 'KIVILCIM', 'METIN': 'METİN', 'ISIKLI': 'IŞIKLI', 'GULTEN': 'GÜLTEN', 'OZER': 'ÖZER', 'OZTURK': 'ÖZTÜRK',
       'CELIK': 'ÇELİK', 'CETIN': 'ÇETİN', 'GUNES': 'GÜNEŞ', 'ERGUN': 'ERGÜN', 'SUBASI': 'SUBAŞI', 'ASLAN': 'ASLAN', 'KORAY': 'KORAY',
       'UCKAN': 'ÜÇKAN', 'BANU': 'BANU', 'ISIGICOK': 'IŞIĞIÇOK', 'OZLEM': 'ÖZLEM', 'AYSE': 'AYŞE', 'MUGE': 'MÜGE', 'GOKHAN': 'GÖKHAN',
       'OZGUR': 'ÖZGÜR', 'MURTEZA': 'MURTEZA', 'AYDEMIR': 'AYDEMİR', 'FARUK': 'FARUK', 'SAPANCALI': 'SAPANCALI', 'ILHAN': 'İLHAN',
       'IBRAHIM': 'İBRAHİM', 'ISMAIL': 'İSMAİL', 'HULYA': 'HÜLYA', 'SUKRU': 'ŞÜKRÜ', 'SEREF': 'ŞEREF', 'TUNCAY': 'TUNCAY', 'ERDOGDU': 'ERDOĞDU',
       'GUL': 'GÜL', 'KUCUK': 'KÜÇÜK', 'BUYUK': 'BÜYÜK', 'OGUZ': 'OĞUZ', 'SAHIN': 'ŞAHİN', 'SIMSEK': 'ŞİMŞEK', 'CAKIR': 'ÇAKIR', 'SENOL': 'ŞENOL',
       'ONDER': 'ÖNDER', 'SERIF': 'ŞERİF', 'GULAY': 'GÜLAY', 'TURKER': 'TÜRKER', 'BULENT': 'BÜLENT', 'YILDIZ': 'YILDIZ', 'EMINE': 'EMİNE',
       'FIKRET': 'FİKRET', 'NIHAT': 'NİHAT', 'SENOCAK': 'ŞENOCAK', 'GURKAN': 'GÜRKAN', 'KUVVET': 'KUVVET', 'CAGATAY': 'ÇAĞATAY', 'SELAMI': 'SELAMİ',
       'VAROL': 'VAROL', 'AHMET': 'AHMET', 'SELIM': 'SELİM', 'SENER': 'ŞENER', 'ERHAN': 'ERHAN', 'NURI': 'NURİ', 'OMER': 'ÖMER', 'FUSUN': 'FÜSUN', 'YILMAZ': 'YILMAZ', 'ILKAY': 'İLKAY', 'SARIOGLU': 'SARIOĞLU', 'CANIKLIOGLU': 'CANİKLİOĞLU', 'GOKBAYRAK': 'GÖKBAYRAK',
       'AYKAC': 'AYKAÇ', 'MUJDAT': 'MÜJDAT', 'SENAY': 'ŞENAY', 'OREN': 'ÖREN', 'SAKAR': 'ŞAKAR', 'CAGLAR': 'ÇAĞLAR', 'HALIL': 'HALİL',
       'KEMAL': 'KEMAL', 'BICERLI': 'BİÇERLİ', 'GUNDOGAN': 'GÜNDOĞAN', 'ALPER': 'ALPER', 'YUSUF': 'YUSUF', 'ISIL': 'IŞIL', 'SUKRAN': 'ŞÜKRAN',
       'ERTURK': 'ERTÜRK', 'DOGAN': 'DOĞAN', 'KOKSAL': 'KÖKSAL', 'OZCAN': 'ÖZCAN', 'GUNER': 'GÜNER', 'TUGBA': 'TUĞBA', 'GOKSEL': 'GÖKSEL',
       'SERAFETTIN': 'ŞERAFETTİN', 'TURKAY': 'TÜRKAY', 'ZULAL': 'ZÜLAL', 'MEHMET': 'MEHMET', 'NILGUN': 'NİLGÜN', 'SUREYYA': 'SÜREYYA', 'GUMUS': 'GÜMÜŞ', 'ISKENDER': 'İSKENDER', 'NAZIM': 'NAZIM', 'KADIR': 'KADİR', 'YILDIRIM': 'YILDIRIM',
       'RECEP': 'RECEP', 'SEYMEN': 'SEYMEN', 'MUHARREM': 'MUHARREM', 'ELVAN': 'ELVAN', 'CIHAN': 'CİHAN', 'KARADENIZ': 'KARADENİZ', 'PARLAK': 'PARLAK',
       'SAVCI': 'SAVCI', 'UYANIK': 'UYANIK', 'YAVUZ': 'YAVUZ', 'MURAT': 'MURAT', 'SARI': 'SARI', 'KILIC': 'KILIÇ', 'KIRLI': 'KIRLI', 'ALTINTAS': 'ALTINTAŞ', 'AKGEYIK': 'AKGEYİK', 'KAGNICIOGLU': 'KAĞNICIOĞLU', 'GOK': 'GÖK', 'YUKSEL': 'YÜKSEL', 'YAGIMLI': 'YAĞIMLI', 'ELIF': 'ELİF', 'SIBEL': 'SİBEL', 'ENGIN': 'ENGİN', 'DENIZ': 'DENİZ', 'FEVZI': 'FEVZİ', 'NURSEN': 'NURSEN', 'OKTAY': 'OKTAY'}
TITLES = [('PROF DR', 'Prof. Dr.'), ('DOC DR', 'Doç. Dr.'), ('DR OGR UYESI', 'Dr. Öğr. Üyesi'), ('YRD DOC DR', 'Yrd. Doç. Dr.')]
def adv_tr(s):
    s = str(s).strip(); pre = ''
    for a, b in sorted(TITLES, key=lambda x: -len(x[0])):
        if s.startswith(a + ' '): pre, s = b, s[len(a) + 1:]; break
    ws = [ADV.get(w, w) for w in s.split()]
    ws = [w[:-1] + 'İ' if False else w for w in ws]
    name = ' '.join(w.capitalize() if i < len(ws) - 1 else w for i, w in enumerate(ws))
    name = name.replace('İ'.lower(), 'i')
    # Türkçe büyük/küçük harf dönüşümü
    def cap(w):
        low = w.replace('I', 'ı').replace('İ', 'i').lower()
        return low[:1].upper().replace('i', 'İ') + low[1:] if low[:1] != 'i' else 'İ' + low[1:]
    def cap2(w):
        if w in ADV: return cap(ADV[w])
        return (w[:1] + w[1:].lower()).replace('İ', 'i')
    raw = s.split()
    last = ADV.get(raw[-1], raw[-1].replace('I', 'İ')) if raw else ''
    name = ' '.join([cap2(w) for w in raw[:-1]] + [last]) if raw else ''
    return (pre + ' ' + name).strip()
