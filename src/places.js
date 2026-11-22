const campusMap = 'https://thupr.thu.edu.tw/traffic.php';
const walks = 'https://fineart.thu.edu.tw/web/visit/page.php?scid=44&sid=72';
const earlyCampus = 'https://www.tchac.taichung.gov.tw/historybuilding?pid=252&uid=37';
const park = 'https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53364';
const newDormSource = 'https://www.twarchitect.org.tw/works/東海大學學生宿舍/';
const farm = 'https://thufarm.thu.edu.tw/tw/%E8%AA%8D%E8%AD%98%E7%89%A7%E5%A0%B4/';

// Places follow the school's campus map (東海大學校園地圖): its five legend areas, its
// names and its numbers. Landmarks the legend does not number (gates, walks, gardens)
// are grouped at the end. One building can hold several legend units; the
// description lists them. featured: 1 shows the label in the overview, 2 gives it
// priority there.
export const zones = ['教學行政區', '生活機能區', '附屬學校區', '學生宿舍及教職員宿舍區', '其他區', '校門與景點'];
export const defaultPlaceId = 'w227101621';

export const places = [
  // 教學行政區 Academic & Administration Area
  ['w367195923',0,1,'社會科學院','College of Social Sciences','深灰坡頂分覆各翼。可見混凝土柱梁、紅磚端牆、成列窗格與開敞走廊，地下樓層設有芳華廳。','https://sosc.thu.edu.tw/',0,150,240],
  ['w367196899',0,2,'圖書館','Library','圖書館與圖書暨資訊處所在。地上四層採回字形配置，橘棕色坡頂與青綠色屋面帶環繞中央天井，入口柱廊朝東面向文理大道。','https://lis.thu.edu.tw/web/building/page.php?lang=zh_tw&scid=21&sid=35',1,120,190],
  ['w1302996436',0,3,'大智慧科技大樓','Science & Technology Building','應用物理系、資訊工程學系與圖資處服務台（地下一樓）等單位設於此，五樓有階梯教室。與中正紀念堂隔著廣場相對；模型的樓層數與立面細部為近似。','https://www.cs.thu.edu.tw/web/page/page.php?lang=zh_tw&scid=18&sid=12',0,120],
  ['w227101080',0,5,'建築系館','Dept. of Architecture Building','建築學系的系館，位於第一教學區北側，東鄰工業設計系館。',campusMap,0,80],
  ['w129849230',0,6,'工業設計系館','Dept. of Industrial Design Building','工業設計學系的系館，位於建築系館與語文館之間。',campusMap,0,75],
  ['w368066316',0,7,'語文館','Languages Building','四翼平屋頂圍成中庭。靠人文大樓一側的入口可見小段紅瓦雨棚與圓形月洞門。',campusMap,0,95,155],
  ['w227101851',0,8,'人文大樓','Humanities Building','位在約農路一帶，設有茂榜廳與東海大學藝術中心。',walks,0,165],
  ['w368071571',0,9,'創意設計暨藝術學院','College of Fine Arts & Creative Design','創藝學院與共同學科暨通識教育中心所在的教學院落，位於校友鐘樓西北側。灰瓦雙坡屋頂下可見紅磚、水平柱梁與朝向中庭的走廊。',campusMap,0,91],
  ['w368071570',0,10,'人文暨科技館','Humanities & Technology Building','文理大道北側的院落式校舍，由日文系及電機系的教室與研究空間圍合。',campusMap,0,90],
  ['w368071581',0,11,'文學院','College of Arts','早期仿唐式教學建築以低層教室圍出中庭，灰瓦屋頂下可見混凝土廊柱、清水磚牆與木框窗。',earlyCampus,0,83],
  ['w368304652',0,12,'行政大樓','Administration Building','校長室、副校長辦公室、秘書室、人事室、公共事務暨校友服務處與第一會議室所在，與秘書室等翼棟圍合草地中庭。灰瓦坡頂下可見清水混凝土柱梁、木框格窗與二樓外廊。',earlyCampus,0,70,120],
  ['administration-center',0,13,'行政中心','Administration Center','教務處、學務處、總務處、勞作教育處、軍訓室與會計室所在，位於行政大樓對面。低層灰瓦坡頂與紅磚牆的翼棟沿坡地圍繞中庭。',campusMap,0,110],
  ['r11031919',0,14,'博雅書院','Po-Ya School','設於宿舍30棟的住宿書院。校園地圖將其列入教學行政區。',campusMap,0,95],
  ['w368304680',0,15,'法律學院','College of Law','系館、教室和實習法庭環繞中庭，延續文理大道沿線的低層灰瓦坡頂。','https://law.thu.edu.tw/',0,92],
  ['w368071585',0,16,'農業暨健康學院','College of Agriculture & Health','鄰近文理大道西側，前廊入口朝向大道，景觀、食科與畜產等系的研究室和教室沿坡地圍成中庭。','https://agr.thu.edu.tw/',0,98],
  ['w368071586',0,17,'工學院','College of Engineering','前廊與三面教室、研究室圍合中庭，延續文理大道早期校舍的灰瓦、磚牆與柱梁構造。',walks,0,85],
  ['w368249647',0,18,'理學院','College of Science','灰瓦雙坡屋頂覆蓋教室、研究室和前廊。各翼棟隨地勢排列，中間保留庭院。',walks,0,90],
  ['w367194998',0,19,'化學系館','Dept. of Chemistry Building','化學系所在的系館，位於理學院南側，鄰近基礎科學大樓。',campusMap,0,75],
  ['w227120170',0,20,'化材系館','Dept. of Chemical & Materials Engineering Building','化學工程與材料工程學系的系館。',campusMap,0,80],
  ['w368222509',0,21,'生命科學系館','Dept. of Life Science Building','生命科學系的實驗室、研究室與圖書室環繞中庭，旁有溫室。',campusMap,0,90],
  ['w367195080',0,22,'基礎科學大樓','Basic Science Building','研究發展處與求真廳所在的大樓，位於理學院南側。',campusMap,0,85],
  ['w227128391',0,23,'體育室','Office of Physical Education','位於體育館東側。',campusMap,0,70],
  ['w368306823',0,24,'國際教育合作處','Office of International Relations','國際教育合作處與健康暨諮商中心所在，位於銘賢堂一帶的學生活動區。',campusMap,0,70],
  ['w227103239',0,25,'校牧室','Chaplain’s Office','校牧室所在的基督教活動中心，鄰近路思義教堂。正面混凝土斜牆嵌有黃色菱形琉璃瓦，中央入口有圓形月洞門。','https://thupr.thu.edu.tw/school3.php',0,66,120],
  ['w227124381',0,26,'健康中心','Health Center','提供師生健康服務，位於陽光草坪南側。',campusMap,0,65],
  ['w226829984',0,27,'管理學院','College of Management','位於第二教學區，是校園接駁路線的重要站點。','https://bus.service.thu.edu.tw/',1,195],
  ['w367198554',0,28,'音樂系館','Dept. of Music Building','校園地圖 28 號「音樂、美術系館」的音樂系館，鄰近美術系館。',campusMap,0,150],
  ['w367198636',0,28,'美術系館','Dept. of Fine Arts Building','清水混凝土、紅磚牆與外露樓梯構成系館立面。朝向中庭的植生曲面沿著坡地展開，連接建築與草坪。附近另有美術工坊。','https://www.taichung.gov.tw/media/271345/5102811383171.pdf',0,108],
  ['w226831045',0,29,'省政研究大樓','Provincial Government Building','又稱省政大樓（PG），設有國際學院、推廣部與國際會議廳。紅磚翼棟以深色坡屋頂收邊，入口設有玻璃帷幕和雨棚。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53371',1,76],
  ['w368191414',0,30,'產學大樓','Industry-Academia Building','第二教學區的產學合作空間，設有人工智慧中心。',campusMap,0,90],

  // 生活機能區 Campus Amenities Area
  ['yang-activity-center',1,31,'楊瑞祥綜合活動大樓','Jay Yang Multipurpose Stadium','位於第一教學區運動場南側，與西側舊體育館連通。地上三層、地下一層，規劃室內跑道與多功能球場，2026 年校慶舉行剪綵。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53634',1,132],
  ['w367195941',1,32,'中正紀念堂','CKS Memorial Auditorium','大跨距屋面後方是展演大廳。入口朝東，與圖書館的入口同樣面向文理大道：金色弧形雨棚由淺色柱支撐，入口前設有階梯，隔著廣場與大智慧科技大樓相對。','https://space.thu.edu.tw/detail/AS/AS3',0,142,200],
  ['w227116688',1,33,'校友會館','Alumni House','位於第一教學區北側，鄰近大智慧科技大樓與建築系館。',campusMap,0,75],
  ['w227111396',1,34,'男生餐廳','Men’s Dining Hall','兩段深灰坡頂由低矮通道相接，長簷遮蔽深色格窗和入口，旁邊是超商與磚鋪前庭。','https://thueat.thu.edu.tw/web/teacher/page.php?scid=4&sid=20',0,79,125],
  ['w367197981',1,35,'游泳池','Swimming Pool','邦華游泳池，位於大門東側、第一教學區運動場旁。',campusMap,0,80],
  ['w227106503',1,36,'體育館','Gymnasium','深灰色大跨距雙坡屋頂與紅磚山牆是主要特徵。入口階梯、混凝土柱和橫向窗帶面向西側。','https://www.culture.taichung.gov.tw/2061062/2099383/3337384/3338327/3338335/3346548',0,91,150],
  ['r5467507',1,37,'第一教學區運動場','First Teaching Area Sports Venue','位於楊瑞祥綜合活動大樓北側，設有 400 公尺戶外跑道與中央足球場。場館登記地址為臺中市西屯區臺灣大道四段 1727 號。','https://iplay.sports.gov.tw/gyminfo/index/15050',1,205],
  ['w227121427',1,38,'校友服務小棧','Alumni Service Center (Tunghai Study)','即東海書房，位於男生宿舍區南側。',campusMap,0,70],
  ['w227101621',1,39,'路思義教堂','Luce Chapel','四片曲面屋殼沿著採光縫向上收合。這座國定古蹟位在早期校園核心，草坪另一側可見畢律斯鐘樓。','https://chaplain.thu.edu.tw/web/page/page.php?scid=8&sid=29',1,140],
  ['student-gospel-center',1,40,'學生福音中心','Student Gospel Center','位於銘賢堂南側，鄰近女生宿舍區入口。',campusMap,0,70],
  ['w227099372',1,41,'女生餐廳','Women’s Dining Hall','女生宿舍區的學生餐廳，旁有涵文軒。',campusMap,0,85],
  ['w367193104',1,42,'花園餐廳','Garden Food Court','沿坡地展開的淺色建築有折線外牆、退縮露台與深灰遮棚。旁邊的翼棟設有銀行。','https://thueat.thu.edu.tw/web/teacher/detail_teacher.php?cid=&id=27',0,78,120],
  ['w1309048743',1,43,'路思義校企','LUCE Co., Ltd.','原為校園郵局，現為路思義校企經營的 Luce Shop & Cafe。低層灰瓦屋頂下保留紅框門窗，前方連接奧柏林廣場。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=52874',0,63,115],
  ['w368091259',1,44,'敦煌書局','Caves Books Store','位於銘賢堂北側的學生活動區，鄰近學生諮商中心。',campusMap,0,65],
  ['w227104642',1,45,'銘賢堂','Oberlin Hall','面向奧柏林廣場。深色灰瓦坡頂、紅磚立面、橫向高窗與中央格門構成正面。',walks,0,80,135],
  ['r5470567',1,46,'學生活動中心','Student Activity Center','學生會、課外活動組等學生組織所在的三層樓建築。',campusMap,0,80],
  ['w227124386',1,47,'招待所','S.R.R.M. Guest House','位於陽光草坪東南側的校內招待所。',campusMap,0,70],
  ['w227075021',1,48,'綠之心・乳品小棧','Green Heart','綠之心設有東海乳品小棧與環境教育館，位在教學區與牧場之間，是校園散步和品嚐東海乳品的停留點。','https://thucwc.thu.edu.tw/store/',1,165],
  ['w227075006',1,49,'教職員休閒中心','Faculty & Staff Activity Center','位於教職員宿舍區東側，東海路 136 號宿舍附近。',campusMap,0,75],
  ['w109505205',1,50,'東海湖','Tunghai Lake','鄰近農牧場與第二教學區的湖泊。沿著湖畔可往小王子玫瑰園。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53463',1,275],
  ['w226831394',1,51,'第二教學區餐廳','Second Teaching Area Dining Hall','第二教學區學生宿舍旁的學生餐廳。',campusMap,0,80],
  ['w1012133728',1,52,'第二教學區運動場','Second Teaching Area Sports Venue','第二教學區南側的運動場，設有棒球場。',campusMap,0,180],

  // 附屬學校區 Affiliated School Area
  ['affiliated-school',2,53,'東大附屬高級中等學校','The Affiliated High School of THU','校地位於大門東側，涵蓋國中部、高中部教學大樓與圖書館。',campusMap,0,190],
  ['w1300546479',2,54,'東大附中小學部','Elementary Division','附屬學校的小學部，位於附小門南側。',campusMap,0,110],
  ['w1300546480',2,55,'附屬小學活動中心','Elementary Division Activity Center','小學部南側的活動中心。',campusMap,0,90],
  ['affiliated-kindergarten',2,56,'附屬幼稚園','Affiliated Kindergarten','附屬學校小學部附設的幼兒園。',campusMap,0,110],
  ['w227009294',2,57,'教育研究所','Graduate Institute of Education','設於附中教學大樓內。',campusMap,0,90],
  ['w1014633354',2,58,'師資培育中心','Center for Teacher Education','校園地圖標示於教育研究所旁的附中綜合大樓一帶；模型位置依地圖推定。',campusMap,0,90],

  // 學生宿舍及教職員宿舍區 Residence Hall & Residential Area
  ['mens-residence',3,59,'男生宿舍','Men’s Residence Hall','大門西側的男生宿舍區。早期宿舍為清水紅磚牆與灰瓦廡殿頂，30、32、33 棟為後期興建的中高層宿舍。',campusMap,1,260],
  ['womens-residence',3,60,'女生宿舍','Women’s Residence Hall','路思義教堂南側的女生宿舍區，白牆、木作走廊欄杆與灰瓦屋頂的低層宿舍朝東、朝南配置。','https://www.tchac.taichung.gov.tw/uploads/tchac/files/202105/5ee76a08-09f2-485d-971c-66f35e46a3f0.pdf',1,240],
  ['w226831396',3,61,'第二教學區學生宿舍','Student Residence Hall, Second Teaching Area','72、73 棟為平屋頂的中高層宿舍，屋頂設有太陽能板。',campusMap,0,140],
  ['w227124380',3,62,'康敦樓','Congdon House','原校長公館，2026 年整修後重新啟用。白牆、木窗、灰瓦與上層陶管漏牆取自整修後外觀。','https://thupr.thu.edu.tw/newsdetail.php?id=53442',0,46,105],
  ['w367762370',3,63,'衛理會館','Wesley House','陳其寬設計的白牆建築沿坡地展開。前後棟的灰瓦坡頂之間留有天井，兩側可見不同樓層高度。','https://www.tchac.taichung.gov.tw/historybuilding?pid=211&uid=34',0,80,126],
  ['shansi-house',3,64,'銘賢樓','Shansi House','校園地圖標示於楊瑞祥綜合活動大樓東南側的宿舍；模型位置依地圖推定。',campusMap,0,90],
  ['w1344753003',3,null,'新建學生宿舍32棟','Student Residence 32','臺灣大道旁的新建女宿。2024 年落成，地上九層，立面以淺色外牆與紅磚格柵交錯呈現。',newDormSource,0,122],
  ['w1344753007',3,null,'新建學生宿舍33棟','Student Residence 33','與 32 棟同一計畫興建的新建男宿。2024 年落成，地上九層，透過階梯廣場銜接既有宿舍區。',newDormSource,0,122],
  ['faculty-residence-136',3,null,'東海路136號教師宿舍','Faculty Residence','校方列為新進教師暨退休宿舍，由三棟公寓式建物組成。校方配置圖列出各棟 1 至 7 樓，模型高度與外觀為近似。','https://ppms.thu.edu.tw/web/student/detail.php?cid=1&id=8',0,108],

  // 其他區 Others
  ['w129849196',4,66,'實習農牧場（牛棚）','Experimental Farm (Cattle)','東海牧場的牛棚，緊鄰養牛草地。',farm,0,90],
  ['farm-poultry',4,67,'實習農牧場（養雞場）','Experimental Chicken Farm','牧場南側成排的雞舍。',farm,0,110],
  ['farm-deer',4,68,'實習農牧場（養鹿場）','Experimental Deer Farm','東海湖北側的鹿舍與畜產實驗室。',farm,0,90],
  ['w227077832',4,69,'食品加工實驗工廠','The Pilot Plant of Food','鄰近養鹿場與小王子玫瑰園。',farm,0,80],
  ['w1300546478',4,70,'乳品加工廠','Dairy Plant','東海鮮乳的加工廠，位於東海湖西北側。',farm,0,80],
  ['carbon-neutrality-park',4,71,'智慧碳中和園區','Smart Carbon Neutrality Park','牧場南側的園區，成排的拱形溫室、橫向棚架與太陽能屋頂建築散布在開放地景中。溫室與建物位置依 2024 年正射影像，高度為近似。','https://sustainable.thu.edu.tw/campus/carbon/',0,130],
  ['horse-riding',4,72,'馬場','Racecourse','東海湖西側的馬場，旁有馬房。',farm,0,110],
  ['w367700949',4,null,'東海牧場','Tunghai Farm','牧場草地與東海湖形成校園東南側的開放景觀。',farm,1,340],

  // 校門與景點 Gates & landmarks
  ['n5439892666',5,null,'大門','Main Gate','第一教學區的大門，由臺灣大道進入約農路。2024 年拓寬後，中央分隔島兩側各有兩線汽車道與機車道，設有警衛亭與車牌辨識柵欄。從臺灣大道面向大門，右側（西側）立有約 15 公尺高的白色校名塔，塔頂東西兩面嵌有校名。','https://business.thu.edu.tw/web/news/detail.php?id=151',2,92],
  ['n3721534704',5,null,'附小門','Elementary Division Gate','附屬學校小學部旁的出入口。',campusMap,0,70],
  ['second-teaching-area-gate',5,null,'第二教學區校門','Second Teaching Area Gate','由臺灣大道慢車道經力行路進入第二教學區，雙向各兩線車道，設有車牌辨識柵欄機與繳費機，往管理學院與省政研究大樓。','https://tcs.thu.edu.tw/web/news/list.php?page=2',0,70],
  ['w367700897',5,null,'文理大道','Wenli Boulevard','校園的步行主軸串連圖書館、校友鐘樓與兩側院落。文、理、工學院的灰瓦坡屋頂和合院配置，延續到後來興建的校舍。',earlyCampus,1,286],
  ['n2358488959',5,null,'校友鐘樓','Alumni Bell Tower','位於文理大道中央的草帶上，兩根混凝土柱以橫梁相連，鐘懸在開放的塔身內。','https://labor.thu.edu.tw/labor-design-detail.php?i=3',0,34],
  ['n3714871469',5,null,'畢律斯鐘樓','Priest Bell Tower','帶有黃色琉璃面磚的狹長牆面圍著開放鐘座，與路思義教堂隔著草坪相望。','https://www.tchac.taichung.gov.tw/building?pid=170&uid=33',0,96],
  ['w227117506',5,null,'原藝術中心','Former Arts Center','陳其寬設計的市定古蹟。薄殼混凝土屋面以倒傘形態呈現，建築群圍出合院。','https://www.tchac.taichung.gov.tw/building?pid=173&uid=33',0,140],
  ['w341450780',5,null,'相思林','Acacia Woods','校園西側的林地，林間步道銜接東海別墅與第一教學區。',walks,0,260],
  ['w227124385',5,null,'陽光草坪','Sunshine Lawn','鄰近女生宿舍，在銘賢堂往乳品小棧的藝文散步路線上。',walks,0,195],
  ['w1507803521',5,null,'小王子玫瑰園','The Little Prince Rose Garden','東海湖旁的園地有兩座玫瑰造型花圃，於 2025 年校慶揭幕。',park,0,175],
].map(([id,zone,number,name,english,description,source,featured,width,aerialHeight]) =>
  ({id,zone,number,name,english,description,source,featured,width,aerialHeight}));

// Marker points for legend entries that are areas without a building outline in the
// map data. Coordinates are local metres (x east, z south), from OpenStreetMap: the
// centroid of the named way, or for the residence areas the mean of their buildings.
export const placePoints = [
  {osm: 'student-gospel-center', x: -275.6, z: 27.5},   // w227105790 學生福音中心
  {osm: 'affiliated-school', x: 52.3, z: -354.9},       // w367700953 東海大學附屬高中
  {osm: 'affiliated-kindergarten', x: 129.1, z: -432.3},// w367700954 附設幼兒園
  {osm: 'mens-residence', x: -395.7, z: -205.7},        // 男生宿舍 1–21 棟
  {osm: 'womens-residence', x: -335.2, z: 154.7},       // 女生宿舍 1–23 棟
  {osm: 'shansi-house', x: -66, z: -121},               // campus map no. 64
  {osm: 'farm-poultry', x: 434.6, z: 68.3},             // w227095384 雞舍
  {osm: 'farm-deer', x: 519.0, z: -358.7},              // w227077833 鹿舍
  {osm: 'horse-riding', x: 329.8, z: -152.2},           // w227078944 馬場
];
