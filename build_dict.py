# -*- coding: utf-8 -*-
"""สร้างพจนานุกรมหลายภาษาเป็นไฟล์สคริปต์ที่ฝังลงหน้าเว็บได้

กุญแจคือ "ข้อความไทย" ที่เขียนอยู่ในโค้ดอยู่แล้ว ทุกเลเยอร์จึงใช้ได้ทันที
โดยไม่ต้องไล่ใส่รหัสคีย์ทีละจุด ซึ่งเป็นงานที่ตกหล่นแน่นอนเมื่อมีเกือบ 800 ชิ้น

ภาษาที่ยังไม่มีคำแปลจะถอยไปอังกฤษเสมอ (ไม่ใช่ไทย)
"""
import json, io

# code order for each row:      en          zh          ja          ko          id          vi          ms          de          fr          es          pt          ar
LANGS = ["en","zh","ja","ko","id","vi","ms","de","fr","es","pt","ar"]

# ── แถวละหนึ่งข้อความ: ไทย, แล้วตามด้วยคำแปลตามลำดับ LANGS ──
ROWS = [
# ═══ เมนูหลักและโครงเว็บ ═══
("หน้าหลัก","Home","首页","ホーム","홈","Beranda","Trang chủ","Utama","Startseite","Accueil","Inicio","Início","الرئيسية"),
("การาจ","Garage","车库","ガレージ","차고","Garasi","Nhà xe","Garaj","Garage","Garage","Garaje","Garagem","المرآب"),
("นิตยสาร","Magazine","杂志","マガジン","매거진","Majalah","Tạp chí","Majalah","Magazin","Magazine","Revista","Revista","المجلة"),
("ร้านค้า","Shop","商店","ショップ","상점","Toko","Cửa hàng","Kedai","Shop","Boutique","Tienda","Loja","المتجر"),
("เข้าสู่ระบบ","Sign in","登录","ログイン","로그인","Masuk","Đăng nhập","Log masuk","Anmelden","Se connecter","Iniciar sesión","Entrar","تسجيل الدخول"),
("ออกจากระบบ","Sign out","退出登录","ログアウト","로그아웃","Keluar","Đăng xuất","Log keluar","Abmelden","Se déconnecter","Cerrar sesión","Sair","تسجيل الخروج"),
("โปรไฟล์ & ตั้งค่า","Profile & settings","个人资料与设置","プロフィールと設定","프로필 및 설정","Profil & pengaturan","Hồ sơ & cài đặt","Profil & tetapan","Profil & Einstellungen","Profil et réglages","Perfil y ajustes","Perfil e definições","الملف والإعدادات"),
("บัญชีของฉัน","My account","我的账户","マイアカウント","내 계정","Akun saya","Tài khoản của tôi","Akaun saya","Mein Konto","Mon compte","Mi cuenta","Minha conta","حسابي"),
("แผงควบคุมแอดมิน","Admin panel","管理面板","管理パネル","관리자 패널","Panel admin","Bảng quản trị","Panel admin","Admin-Bereich","Panneau admin","Panel de admin","Painel admin","لوحة الإدارة"),
("เปิดแผงควบคุม","Open the panel","打开面板","パネルを開く","패널 열기","Buka panel","Mở bảng","Buka panel","Panel öffnen","Ouvrir le panneau","Abrir el panel","Abrir painel","افتح اللوحة"),
("จัดการผู้ใช้ ยศ นิตยสาร สถิติ และตั้งค่าเว็บทั้งหมด","Manage users, roles, magazine, stats and every site setting","管理用户、角色、杂志、统计和所有网站设置","ユーザー・権限・記事・統計・サイト設定を管理","사용자, 권한, 매거진, 통계 및 모든 설정 관리","Kelola pengguna, peran, majalah, statistik, dan semua pengaturan","Quản lý người dùng, vai trò, tạp chí, thống kê và cài đặt","Urus pengguna, peranan, majalah, statistik dan tetapan","Nutzer, Rollen, Magazin, Statistik und Einstellungen verwalten","Gérer utilisateurs, rôles, magazine, stats et réglages","Gestiona usuarios, roles, revista, estadísticas y ajustes","Gerir utilizadores, funções, revista, estatísticas e definições","إدارة المستخدمين والأدوار والمجلة والإحصاءات والإعدادات"),
("เสร็จสิ้น","Done","完成","完了","완료","Selesai","Xong","Selesai","Fertig","Terminé","Listo","Concluído","تم"),
("ผู้มาเยือน","Guest","访客","ゲスト","게스트","Tamu","Khách","Tetamu","Gast","Invité","Invitado","Convidado","زائر"),
("ยังไม่ได้เข้าสู่ระบบ","Not signed in","未登录","未ログイン","로그인하지 않음","Belum masuk","Chưa đăng nhập","Belum log masuk","Nicht angemeldet","Non connecté","Sin iniciar sesión","Sem sessão iniciada","لم تسجّل الدخول"),

# ═══ หน้าแรกและวิดเจ็ต ═══
("แต่งหน้าหลัก","Customise","自定义首页","ホームを編集","홈 꾸미기","Sesuaikan","Tùy chỉnh","Sesuaikan","Anpassen","Personnaliser","Personalizar","Personalizar","تخصيص"),
("รถของฉัน","My cars","我的车","マイカー","내 차","Mobil saya","Xe của tôi","Kereta saya","Meine Autos","Mes voitures","Mis coches","Os meus carros","سياراتي"),
("จัดการ →","Manage →","管理 →","管理 →","관리 →","Kelola →","Quản lý →","Urus →","Verwalten →","Gérer →","Gestionar →","Gerir →","إدارة →"),
("ข่าวสารล่าสุด","Latest news","最新消息","最新ニュース","최신 뉴스","Berita terbaru","Tin mới nhất","Berita terkini","Neuigkeiten","Actualités","Últimas noticias","Últimas notícias","آخر الأخبار"),
("กำลังโหลดข่าว...","Loading news…","正在加载新闻…","ニュースを読み込み中…","뉴스 불러오는 중…","Memuat berita…","Đang tải tin…","Memuatkan berita…","Nachrichten werden geladen…","Chargement des actualités…","Cargando noticias…","A carregar notícias…","جارٍ تحميل الأخبار…"),
("กำลังโหลดข่าวล่าสุด...","Loading the latest news…","正在加载最新消息…","最新ニュースを読み込み中…","최신 뉴스 불러오는 중…","Memuat berita terbaru…","Đang tải tin mới nhất…","Memuatkan berita terkini…","Aktuelle Nachrichten werden geladen…","Chargement des dernières actualités…","Cargando las últimas noticias…","A carregar as últimas notícias…","جارٍ تحميل آخر الأخبار…"),
("นิตยสารรถยนต์","Car magazine","汽车杂志","カーマガジン","자동차 매거진","Majalah otomotif","Tạp chí ô tô","Majalah kereta","Auto-Magazin","Magazine auto","Revista del motor","Revista automóvel","مجلة السيارات"),
("ดูทั้งหมด","See all","查看全部","すべて見る","전체 보기","Lihat semua","Xem tất cả","Lihat semua","Alle ansehen","Tout voir","Ver todo","Ver tudo","عرض الكل"),
("วันนี้มีอะไรต้องทำ","What needs doing today","今天要做什么","今日やること","오늘 할 일","Yang perlu dilakukan hari ini","Việc cần làm hôm nay","Apa yang perlu dibuat hari ini","Was heute ansteht","À faire aujourd'hui","Qué hay que hacer hoy","O que fazer hoje","ما يجب فعله اليوم"),
("เปิดสรุปวันนี้","Open today's brief","打开今日简报","今日のまとめを開く","오늘의 브리핑 열기","Buka ringkasan hari ini","Mở tóm tắt hôm nay","Buka ringkasan hari ini","Tagesüberblick öffnen","Ouvrir le résumé du jour","Abrir el resumen de hoy","Abrir resumo de hoje","افتح ملخص اليوم"),

# ═══ ห้องนักบิน ═══
("รถ","Vehicle","车辆","車両","차량","Kendaraan","Xe","Kenderaan","Fahrzeug","Véhicule","Vehículo","Veículo","المركبة"),
("สถานะ","Status","状态","ステータス","상태","Status","Trạng thái","Status","Status","État","Estado","Estado","الحالة"),
("ยังไม่มีรถ","No vehicle","暂无车辆","車両なし","차량 없음","Belum ada kendaraan","Chưa có xe","Tiada kenderaan","Kein Fahrzeug","Aucun véhicule","Sin vehículo","Sem veículo","لا توجد مركبة"),
("กำหนดถัดไป","Next due","下次保养","次回予定","다음 정비","Jatuh tempo berikutnya","Kỳ hạn kế tiếp","Tempoh seterusnya","Nächste Fälligkeit","Prochaine échéance","Próximo vencimiento","Próximo prazo","الموعد القادم"),
("รายการเลยกำหนด","Overdue","已逾期","期限超過","기한 초과","Terlambat","Quá hạn","Tertunggak","Überfällig","En retard","Vencido","Em atraso","متأخر"),
("เลยกำหนด","Overdue","已逾期","期限超過","기한 초과","Terlambat","Quá hạn","Tertunggak","Überfällig","En retard","Vencido","Em atraso","متأخر"),
("ค่าใช้จ่าย/กม.","Cost / km","每公里成本","1kmあたり費用","km당 비용","Biaya / km","Chi phí / km","Kos / km","Kosten / km","Coût / km","Coste / km","Custo / km","التكلفة / كم"),
("ตรวจล่าสุด","Last check","最近检查","最終点検","최근 점검","Cek terakhir","Kiểm tra gần nhất","Semakan terakhir","Letzte Prüfung","Dernier contrôle","Última revisión","Última verificação","آخر فحص"),
("ยังไม่เคย","Never","从未","なし","없음","Belum pernah","Chưa từng","Belum pernah","Nie","Jamais","Nunca","Nunca","أبداً"),
("ควบคุม AI","AI control","AI 控制","AI コントロール","AI 제어","Kontrol AI","Điều khiển AI","Kawalan AI","KI-Steuerung","Commande IA","Control de IA","Controlo de IA","تحكم الذكاء"),
("เปิดห้องแชต","Open chat","打开聊天","チャットを開く","채팅 열기","Buka obrolan","Mở trò chuyện","Buka sembang","Chat öffnen","Ouvrir le chat","Abrir el chat","Abrir chat","افتح المحادثة"),
("แผงรถ","Vehicle panel","车辆面板","車両パネル","차량 패널","Panel kendaraan","Bảng xe","Panel kenderaan","Fahrzeugpanel","Panneau véhicule","Panel del vehículo","Painel do veículo","لوحة المركبة"),
("บอกอาการรถของคุณ หรือสั่งงานอะไรก็ได้…","Describe a symptom, or ask anything…","描述车辆症状，或随便问…","車の症状を書くか、何でも聞いてください…","증상을 알려주거나 무엇이든 물어보세요…","Ceritakan gejalanya, atau tanya apa saja…","Mô tả triệu chứng, hoặc hỏi bất cứ điều gì…","Ceritakan gejalanya, atau tanya apa sahaja…","Beschreiben Sie ein Symptom oder fragen Sie etwas…","Décrivez un symptôme ou posez une question…","Describe un síntoma o pregunta lo que sea…","Descreva um sintoma ou pergunte o que quiser…","صف العرض أو اسأل أي شيء…"),
("งานที่ต้องทำ · กำหนดที่ใกล้ถึง","To do · Due soon","待办 · 即将到期","やること · 期限が近い","할 일 · 곧 만료","Tugas · Segera jatuh tempo","Việc cần làm · Sắp đến hạn","Tugasan · Akan tamat","Zu tun · Bald fällig","À faire · Bientôt dû","Por hacer · Próximo","A fazer · Em breve","المهام · قريباً"),
("ประวัติล่าสุด","Recent activity","最近活动","最近の履歴","최근 활동","Aktivitas terbaru","Hoạt động gần đây","Aktiviti terkini","Letzte Aktivität","Activité récente","Actividad reciente","Atividade recente","النشاط الأخير"),
("ไม่มีอะไรค้าง เดินทางได้เลย","Nothing pending — you're good to go","没有待办，可以出发","保留なし — 出発できます","대기 중인 항목 없음 — 출발하세요","Tidak ada tertunda — siap jalan","Không có gì tồn đọng — cứ đi thôi","Tiada tertunggak — boleh jalan","Nichts offen — gute Fahrt","Rien en attente — bonne route","Nada pendiente — puedes salir","Nada pendente — pode ir","لا شيء معلّق — يمكنك الانطلاق"),
("รถคุณตอนนี้","Your car right now","你的车现状","今のあなたの車","현재 내 차 상태","Mobil Anda saat ini","Xe của bạn lúc này","Kereta anda sekarang","Ihr Auto jetzt","Votre voiture maintenant","Tu coche ahora","O seu carro agora","سيارتك الآن"),
("สิ่งที่ต้องทำ","What needs doing","需要做的事","やるべきこと","해야 할 일","Yang perlu dilakukan","Việc cần làm","Apa yang perlu dibuat","Was zu tun ist","Ce qu'il faut faire","Qué hay que hacer","O que é preciso fazer","ما يجب فعله"),
("ถาม AI เรื่องรถ","Ask about your car","问问你的车","車について聞く","내 차에 대해 묻기","Tanya tentang mobil Anda","Hỏi về xe của bạn","Tanya tentang kereta anda","Fragen Sie zu Ihrem Auto","Poser une question sur votre voiture","Pregunta sobre tu coche","Pergunte sobre o seu carro","اسأل عن سيارتك"),
("เพิ่มรถ","Add a car","添加车辆","車を追加","차량 추가","Tambah mobil","Thêm xe","Tambah kereta","Auto hinzufügen","Ajouter une voiture","Añadir coche","Adicionar carro","أضف سيارة"),

# ═══ เครื่องมือ ═══
("พิมพ์ถาม","Ask","文字提问","質問する","질문하기","Tanya","Hỏi","Tanya","Fragen","Demander","Preguntar","Perguntar","اسأل"),
("ถ่ายรูป","Photo","拍照","写真","사진","Foto","Chụp ảnh","Foto","Foto","Photo","Foto","Foto","صورة"),
("วิดีโอ","Video","视频","動画","동영상","Video","Video","Video","Video","Vidéo","Vídeo","Vídeo","فيديو"),
("ฟังเสียงรถ","Listen","听车声","車の音を聞く","차 소리 듣기","Dengarkan","Nghe tiếng xe","Dengar","Zuhören","Écouter","Escuchar","Ouvir","استمع"),
("ตรวจใบเสนอราคา","Check a quote","检查报价单","見積もりを確認","견적서 확인","Periksa penawaran","Kiểm tra báo giá","Semak sebut harga","Angebot prüfen","Vérifier un devis","Revisar presupuesto","Verificar orçamento","تحقق من عرض السعر"),
("วัดอาการสั่น","Shake test","抖动检测","振動テスト","진동 테스트","Uji getaran","Đo rung lắc","Ujian getaran","Vibrationstest","Test de vibration","Prueba de vibración","Teste de vibração","اختبار الاهتزاز"),
("จำที่จอด","Parking","记住停车位","駐車位置","주차 위치","Parkir","Nhớ chỗ đậu","Tempat letak","Parken","Stationnement","Aparcamiento","Estacionamento","الوقوف"),
("ต้นทุน & สมุดรถ","Cost & record","成本与记录","費用と記録","비용 및 기록","Biaya & catatan","Chi phí & sổ xe","Kos & rekod","Kosten & Protokoll","Coûts et carnet","Costes y registro","Custos e registo","التكاليف والسجل"),
("อะไหล่ Spares","Spares","配件","パーツ","부품","Suku cadang","Phụ tùng","Alat ganti","Ersatzteile","Pièces","Repuestos","Peças","قطع الغيار"),
("เครื่องมือ","Tools","工具","ツール","도구","Alat","Công cụ","Alat","Werkzeuge","Outils","Herramientas","Ferramentas","الأدوات"),

# ═══ หน้าตั้งค่า ═══
("ตั้งค่า","Settings","设置","設定","설정","Pengaturan","Cài đặt","Tetapan","Einstellungen","Réglages","Ajustes","Definições","الإعدادات"),
("ทั่วไป","General","通用","一般","일반","Umum","Chung","Umum","Allgemein","Général","General","Geral","عام"),
("บัญชี","Account","账户","アカウント","계정","Akun","Tài khoản","Akaun","Konto","Compte","Cuenta","Conta","الحساب"),
("โควตา","Usage","用量","使用量","사용량","Kuota","Hạn mức","Kuota","Nutzung","Utilisation","Uso","Utilização","الاستخدام"),
("แพ็กเกจ","Plan","套餐","プラン","요금제","Paket","Gói","Pelan","Tarif","Forfait","Plan","Plano","الباقة"),
("ส่งความเห็น","Feedback","反馈","フィードバック","피드백","Masukan","Góp ý","Maklum balas","Feedback","Retour","Comentarios","Comentários","ملاحظات"),
("เรียนรู้เพิ่มเติม","Learn more","了解更多","詳しく見る","더 알아보기","Pelajari lebih lanjut","Tìm hiểu thêm","Ketahui lagi","Mehr erfahren","En savoir plus","Saber más","Saber mais","اعرف المزيد"),
("ภาษา","Language","语言","言語","언어","Bahasa","Ngôn ngữ","Bahasa","Sprache","Langue","Idioma","Idioma","اللغة"),
("ภาษา / Language","Language","语言","言語","언어","Bahasa","Ngôn ngữ","Bahasa","Sprache","Langue","Idioma","Idioma","اللغة"),
("ธีม","Theme","主题","テーマ","테마","Tema","Giao diện","Tema","Design","Thème","Tema","Tema","المظهر"),
("ระดับการใช้งาน","Experience level","使用等级","利用レベル","사용 수준","Tingkat pengalaman","Cấp độ sử dụng","Tahap penggunaan","Erfahrungsstufe","Niveau d'expérience","Nivel de experiencia","Nível de experiência","مستوى الخبرة"),
("พื้นฐาน","Basic","基础","ベーシック","기본","Dasar","Cơ bản","Asas","Basis","Basique","Básico","Básico","أساسي"),
("ก้าวหน้า","Advance","进阶","アドバンス","고급","Lanjutan","Nâng cao","Lanjutan","Fortgeschritten","Avancé","Avanzado","Avançado","متقدم"),
("ตัวจริง","Enthusiast","发烧友","エンスージアスト","마니아","Penggemar","Đam mê","Peminat","Enthusiast","Passionné","Entusiasta","Entusiasta","متحمّس"),
("สว่าง","Light","浅色","ライト","라이트","Terang","Sáng","Cerah","Hell","Clair","Claro","Claro","فاتح"),
("มืด","Dark","深色","ダーク","다크","Gelap","Tối","Gelap","Dunkel","Sombre","Oscuro","Escuro","داكن"),
("มหาสมุทร","Ocean","海洋","オーシャン","오션","Samudra","Đại dương","Lautan","Ozean","Océan","Océano","Oceano","محيط"),
("ต้นไม้","Plant","森绿","プラント","플랜트","Tanaman","Cây xanh","Tumbuhan","Pflanze","Végétal","Planta","Planta","نبات"),
("ลาวา","Magma","熔岩","マグマ","마그마","Magma","Dung nham","Magma","Magma","Magma","Magma","Magma","حِمم"),
("ธีมเดียวใช้ทั้งหน้าหลักและห้องแชต เปลี่ยนที่ไหนก็เปลี่ยนพร้อมกัน","One theme for both the dashboard and the chat — change it anywhere.","主页和聊天共用一个主题，任何地方修改都会同步。","ダッシュボードとチャットで同じテーマ。どこで変えても同期します。","대시보드와 채팅이 같은 테마를 사용합니다. 어디서 바꿔도 함께 바뀝니다.","Satu tema untuk dasbor dan obrolan — ubah di mana saja.","Một giao diện cho cả bảng điều khiển và trò chuyện — đổi ở đâu cũng được.","Satu tema untuk papan pemuka dan sembang — tukar di mana-mana.","Ein Design für Dashboard und Chat — überall änderbar.","Un seul thème pour le tableau de bord et le chat — modifiable partout.","Un tema para el panel y el chat: cámbialo donde quieras.","Um tema para o painel e o chat — mude em qualquer lugar.","مظهر واحد للوحة والمحادثة — غيّره من أي مكان."),
("ยิ่งระดับสูง ยิ่งมีเครื่องมือให้ใช้มากขึ้น เปลี่ยนเมื่อไรก็ได้","Higher levels unlock more tools. Change it whenever you like.","等级越高，可用工具越多。随时可更改。","レベルが上がるほど使えるツールが増えます。いつでも変更できます。","등급이 높을수록 도구가 많아집니다. 언제든 변경할 수 있습니다.","Makin tinggi levelnya, makin banyak alatnya. Ubah kapan saja.","Cấp càng cao càng nhiều công cụ. Đổi lúc nào cũng được.","Lebih tinggi tahap, lebih banyak alat. Tukar bila-bila masa.","Höhere Stufen schalten mehr Werkzeuge frei. Jederzeit änderbar.","Plus le niveau est élevé, plus il y a d'outils. Modifiable à tout moment.","Cuanto mayor el nivel, más herramientas. Cámbialo cuando quieras.","Níveis mais altos desbloqueiam mais ferramentas. Mude quando quiser.","كلما ارتفع المستوى زادت الأدوات. غيّره متى شئت."),
("ดาวน์โหลดข้อมูลของฉัน","Download my data","下载我的数据","マイデータをダウンロード","내 데이터 다운로드","Unduh data saya","Tải dữ liệu của tôi","Muat turun data saya","Meine Daten herunterladen","Télécharger mes données","Descargar mis datos","Transferir os meus dados","تنزيل بياناتي"),
("ดาวน์โหลด","Download","下载","ダウンロード","다운로드","Unduh","Tải xuống","Muat turun","Herunterladen","Télécharger","Descargar","Transferir","تنزيل"),
("รถในการาจ","Cars in your garage","车库中的车辆","ガレージの車","차고의 차량","Mobil di garasi","Xe trong nhà xe","Kereta dalam garaj","Autos in der Garage","Voitures au garage","Coches en el garaje","Carros na garagem","السيارات في المرآب"),
("บัญชีและความปลอดภัย","Account and safety","账户与安全","アカウントと安全","계정 및 보안","Akun dan keamanan","Tài khoản và an toàn","Akaun dan keselamatan","Konto und Sicherheit","Compte et sécurité","Cuenta y seguridad","Conta e segurança","الحساب والأمان"),
("โซนอันตราย","Danger zone","危险区域","危険な操作","위험 구역","Zona berbahaya","Vùng nguy hiểm","Zon bahaya","Gefahrenzone","Zone sensible","Zona peligrosa","Zona de perigo","منطقة خطرة"),
("รีเซ็ตบัญชี","Reset account","重置账户","アカウントをリセット","계정 초기화","Setel ulang akun","Đặt lại tài khoản","Set semula akaun","Konto zurücksetzen","Réinitialiser le compte","Restablecer cuenta","Repor conta","إعادة تعيين الحساب"),
("ปิดใช้งานบัญชี","Deactivate account","停用账户","アカウントを無効化","계정 비활성화","Nonaktifkan akun","Vô hiệu hóa tài khoản","Nyahaktifkan akaun","Konto deaktivieren","Désactiver le compte","Desactivar cuenta","Desativar conta","تعطيل الحساب"),

# ═══ ตั้งค่าครั้งแรกและเข้าสู่ระบบ ═══
("เข้าสู่ระบบ SpireONE","Sign in to SpireONE","登录 SpireONE","SpireONE にログイン","SpireONE 로그인","Masuk ke SpireONE","Đăng nhập SpireONE","Log masuk ke SpireONE","Bei SpireONE anmelden","Se connecter à SpireONE","Inicia sesión en SpireONE","Entrar no SpireONE","تسجيل الدخول إلى SpireONE"),
("สร้างบัญชี","Create account","创建账户","アカウントを作成","계정 만들기","Buat akun","Tạo tài khoản","Buat akaun","Konto erstellen","Créer un compte","Crear cuenta","Criar conta","إنشاء حساب"),
("ยินดีต้อนรับกลับมา","Welcome back","欢迎回来","おかえりなさい","다시 오신 것을 환영합니다","Selamat datang kembali","Chào mừng trở lại","Selamat kembali","Willkommen zurück","Bon retour","Bienvenido de nuevo","Bem-vindo de volta","مرحباً بعودتك"),
("อีเมล","Email address","电子邮箱","メールアドレス","이메일 주소","Alamat email","Địa chỉ email","Alamat e-mel","E-Mail-Adresse","Adresse e-mail","Correo electrónico","Endereço de e-mail","البريد الإلكتروني"),
("รหัสผ่าน","Password","密码","パスワード","비밀번호","Kata sandi","Mật khẩu","Kata laluan","Passwort","Mot de passe","Contraseña","Palavra-passe","كلمة المرور"),
("ลืมรหัสผ่าน?","Forgot your password?","忘记密码？","パスワードをお忘れですか？","비밀번호를 잊으셨나요?","Lupa kata sandi?","Quên mật khẩu?","Lupa kata laluan?","Passwort vergessen?","Mot de passe oublié ?","¿Olvidaste tu contraseña?","Esqueceu-se da palavra-passe?","نسيت كلمة المرور؟"),
("หรือใช้อีเมล","or use email","或使用邮箱","またはメールで","또는 이메일 사용","atau gunakan email","hoặc dùng email","atau guna e-mel","oder per E-Mail","ou par e-mail","o usa el correo","ou use o e-mail","أو استخدم البريد"),
("ถัดไป","Continue","继续","次へ","계속","Lanjut","Tiếp tục","Teruskan","Weiter","Continuer","Continuar","Continuar","متابعة"),
("ย้อนกลับ","Back","返回","戻る","뒤로","Kembali","Quay lại","Kembali","Zurück","Retour","Atrás","Voltar","رجوع"),
("ข้ามขั้นนี้","Skip this step","跳过此步","このステップをスキップ","이 단계 건너뛰기","Lewati langkah ini","Bỏ qua bước này","Langkau langkah ini","Diesen Schritt überspringen","Passer cette étape","Omitir este paso","Ignorar este passo","تخطَّ هذه الخطوة"),
("เริ่มใช้งาน","Finish setup","完成设置","設定を完了","설정 완료","Selesaikan pengaturan","Hoàn tất thiết lập","Selesaikan tetapan","Einrichtung abschließen","Terminer la configuration","Finalizar configuración","Concluir configuração","إنهاء الإعداد"),
("คุณสนใจรถแค่ไหน?","How into cars are you?","你有多喜欢车？","車にどれくらい詳しいですか？","자동차에 얼마나 관심이 있나요?","Seberapa suka Anda pada mobil?","Bạn mê xe đến mức nào?","Sejauh mana anda minat kereta?","Wie sehr interessieren Sie sich für Autos?","À quel point aimez-vous les voitures ?","¿Cuánto te gustan los coches?","Que tanto gosta de carros?","ما مدى اهتمامك بالسيارات؟"),
("เลือกแพ็กเกจ","Choose your plan","选择套餐","プランを選ぶ","요금제 선택","Pilih paket","Chọn gói","Pilih pelan","Tarif wählen","Choisissez un forfait","Elige tu plan","Escolha o seu plano","اختر باقتك"),
("ธีมสี","Colour theme","配色主题","カラーテーマ","색상 테마","Tema warna","Giao diện màu","Tema warna","Farbdesign","Thème de couleur","Tema de color","Tema de cor","لون المظهر"),
("เรียกคุณว่าอะไรดี?","What should we call you?","怎么称呼你？","なんとお呼びしますか？","어떻게 불러 드릴까요?","Kami harus memanggil Anda apa?","Chúng tôi nên gọi bạn là gì?","Apa yang patut kami panggil anda?","Wie sollen wir Sie nennen?","Comment devons-nous vous appeler ?","¿Cómo te llamamos?","Como devemos chamá-lo?","بماذا نناديك؟"),
("หน่วยวัดและสกุลเงิน","Units and currency","单位与货币","単位と通貨","단위 및 통화","Satuan dan mata uang","Đơn vị và tiền tệ","Unit dan mata wang","Einheiten und Währung","Unités et devise","Unidades y moneda","Unidades e moeda","الوحدات والعملة"),
("รถคันแรกของคุณ","Your first car","你的第一辆车","最初の車","첫 번째 차량","Mobil pertama Anda","Chiếc xe đầu tiên của bạn","Kereta pertama anda","Ihr erstes Auto","Votre première voiture","Tu primer coche","O seu primeiro carro","سيارتك الأولى"),
("ให้เราเตือนคุณไหม?","Want us to remind you?","需要我们提醒你吗？","リマインドしましょうか？","알림을 보내 드릴까요?","Mau kami ingatkan?","Bạn muốn chúng tôi nhắc chứ?","Mahu kami ingatkan?","Sollen wir Sie erinnern?","Voulez-vous des rappels ?","¿Quieres que te avisemos?","Quer que o lembremos?","هل نذكّرك؟"),
("เปิดการแจ้งเตือน","Turn on reminders","开启提醒","リマインダーをオン","알림 켜기","Aktifkan pengingat","Bật nhắc nhở","Hidupkan peringatan","Erinnerungen aktivieren","Activer les rappels","Activar recordatorios","Ativar lembretes","تفعيل التذكيرات"),
("ยังไม่ต้อง","Not right now","暂时不用","今はしない","지금은 아니요","Belum sekarang","Chưa cần","Belum sekarang","Jetzt nicht","Pas maintenant","Ahora no","Agora não","ليس الآن"),

# ═══ ปุ่มและคำทั่วไป ═══
("บันทึก","Save","保存","保存","저장","Simpan","Lưu","Simpan","Speichern","Enregistrer","Guardar","Guardar","حفظ"),
("ยกเลิก","Cancel","取消","キャンセル","취소","Batal","Hủy","Batal","Abbrechen","Annuler","Cancelar","Cancelar","إلغاء"),
("ลบ","Delete","删除","削除","삭제","Hapus","Xóa","Padam","Löschen","Supprimer","Eliminar","Eliminar","حذف"),
("แก้ไข","Edit","编辑","編集","편집","Ubah","Sửa","Edit","Bearbeiten","Modifier","Editar","Editar","تحرير"),
("ปิด","Close","关闭","閉じる","닫기","Tutup","Đóng","Tutup","Schließen","Fermer","Cerrar","Fechar","إغلاق"),
("เริ่ม","Start","开始","開始","시작","Mulai","Bắt đầu","Mula","Starten","Démarrer","Iniciar","Iniciar","ابدأ"),
("ล้าง","Clear","清除","クリア","지우기","Bersihkan","Xóa sạch","Kosongkan","Leeren","Effacer","Borrar","Limpar","مسح"),
("วันนี้","Today","今天","今日","오늘","Hari ini","Hôm nay","Hari ini","Heute","Aujourd'hui","Hoy","Hoje","اليوم"),
("เมื่อวาน","Yesterday","昨天","昨日","어제","Kemarin","Hôm qua","Semalam","Gestern","Hier","Ayer","Ontem","أمس"),
("กม.","km","公里","km","km","km","km","km","km","km","km","km","كم"),
("เติมน้ำมัน","Fuel","加油","給油","주유","Isi bahan bakar","Đổ xăng","Isi minyak","Tanken","Carburant","Combustible","Combustível","وقود"),
("คุยกับ AI","AI chat","AI 对话","AI チャット","AI 채팅","Obrolan AI","Trò chuyện AI","Sembang AI","KI-Chat","Chat IA","Chat de IA","Chat de IA","محادثة الذكاء"),
("ข้อความ","messages","条消息","件のメッセージ","개의 메시지","pesan","tin nhắn","mesej","Nachrichten","messages","mensajes","mensagens","رسائل"),
("กำลังโหลด…","Loading…","加载中…","読み込み中…","불러오는 중…","Memuat…","Đang tải…","Memuatkan…","Wird geladen…","Chargement…","Cargando…","A carregar…","جارٍ التحميل…"),
("ลองใหม่","Try again","重试","もう一度","다시 시도","Coba lagi","Thử lại","Cuba lagi","Erneut versuchen","Réessayer","Reintentar","Tentar de novo","حاول مجدداً"),
("ต้องเข้าสู่ระบบก่อน","Please sign in first","请先登录","先にログインしてください","먼저 로그인하세요","Silakan masuk dulu","Vui lòng đăng nhập trước","Sila log masuk dahulu","Bitte zuerst anmelden","Veuillez d'abord vous connecter","Inicia sesión primero","Inicie sessão primeiro","يرجى تسجيل الدخول أولاً"),
]

def build():
    dict_ = {c: {} for c in LANGS}
    for row in ROWS:
        th = row[0]
        vals = row[1:]
        assert len(vals) == len(LANGS), "แถวนี้จำนวนภาษาไม่ครบ: %s (%d ค่า)" % (th, len(vals))
        for code, val in zip(LANGS, vals):
            if val:
                dict_[code][th] = val
    return dict_

if __name__ == "__main__":
    d = build()
    out = io.StringIO()
    out.write('<script id="i18ndict">\n')
    out.write("/* พจนานุกรมหลายภาษา — สร้างจาก build_dict.py อย่าแก้ไฟล์นี้ตรง ๆ\n")
    out.write("   กุญแจคือข้อความไทยที่เขียนอยู่ในโค้ด ภาษาที่ยังไม่มีคำแปลจะถอยไปอังกฤษ */\n")
    out.write("window.__SPIRE_DICT__=")
    out.write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    out.write(";\n</script>\n")
    open("/tmp/claude-0/-home-user-SpireONE-Beta/0751d599-673f-51ab-9d6f-cb9c1a579f73/scratchpad/i18n_dict.js",
         "w", encoding="utf-8").write(out.getvalue())
    print("ภาษา:", len(LANGS), "· ข้อความต่อภาษา:", len(d["en"]),
          "· รวม", sum(len(v) for v in d.values()), "คำแปล")
