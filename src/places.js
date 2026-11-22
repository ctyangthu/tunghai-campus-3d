const campusMap = 'https://thupr.thu.edu.tw/traffic.php';
const walks = 'https://fineart.thu.edu.tw/web/visit/page.php?scid=44&sid=72';
const park = 'https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53364';
const newDormSource = 'https://www.twarchitect.org.tw/works/東海大學學生宿舍/';
export const zones = ['第一教學區', '校園生活與牧場', '第二教學區'];
export const places = [
  ['w227101621',0,'路思義教堂','Luce Memorial Chapel','四片曲面屋殼沿著採光縫向上收合。這座國定古蹟位在早期校園核心，草坪另一側可見畢律斯鐘樓。','https://chaplain.thu.edu.tw/web/page/page.php?scid=8&sid=29',1,140],
  ['n3714871469',0,'畢律斯鐘樓','Priest Bell Tower','帶有黃色琉璃面磚的狹長牆面圍著開放鐘座，與路思義教堂隔著草坪相望。','https://www.tchac.taichung.gov.tw/building?pid=170&uid=33',0,96],
  ['n5439892666',0,'第一教學區校門','First Teaching Area Entrance','由臺灣大道進入約農路的主校門。2024 年拓寬後，中央分隔島兩側各有兩線汽車道與機車道，設有警衛亭與車牌辨識柵欄。入口東側立有約 15 公尺高的白色校名塔，塔頂東西兩面嵌有校名。','https://business.thu.edu.tw/web/news/detail.php?id=151',1,92],
  ['w367700897',0,'文理大道','Wenli Boulevard','串連圖書館與早期文、理教學建築。坡道和階梯隨地勢展開，兩旁院落留有樹蔭與步行空間。','https://www.tchac.taichung.gov.tw/historybuilding?pid=252&uid=37',1,265],
  ['w368071581',0,'文學院','College of Arts','早期教學區以低層院落順應大肚山地勢，走廊連接教室與庭園。','https://www.tchac.taichung.gov.tw/historybuilding?pid=252&uid=37',0,185],
  ['w367196899',0,'圖書館總館','Main Library','座落於文理大道上端。地面四層採回字形配置，中央保留庭院。','https://lis.thu.edu.tw/web/building/page.php?lang=zh_tw&scid=21&sid=35',1,190],
  ['w367195941',0,'中正紀念堂','Chiang Kai-shek Memorial Hall','校內典禮與各類展演的集會堂。入口門廳與雨棚朝東，與圖書館總館的入口同樣面向文理大道，隔著廣場與大智慧科技大樓相對；平屋頂鋪設太陽能板。','https://space.service.thu.edu.tw/place/activity',0,130],
  ['w227117506',0,'原藝術中心','Former Arts Center','陳其寬設計的市定古蹟。薄殼混凝土屋面以倒傘形態呈現，建築群圍出合院。','https://www.tchac.taichung.gov.tw/building?pid=173&uid=33',0,140],
  ['w227101851',0,'人文大樓','Humanities Building','位在約農路一帶，人文大樓內設有東海大學藝術中心。',walks,0,165],
  ['w367195923',0,'社會科學院','College of Social Sciences','社會科學教學大樓鄰近相思林，地下樓層設有芳華廳藝術空間。',walks,0,180],
  ['w1302996436',0,'大智慧科技大樓','Intelligent Technology Building','第一教學區的科技教學大樓，應用物理系、資訊工程學系與圖資處服務台（地下一樓）等單位設於此，五樓有階梯教室。與中正紀念堂隔著廣場相對；模型的樓層數與立面細部為近似。','https://www.cs.thu.edu.tw/web/page/page.php?lang=zh_tw&scid=18&sid=12',0,120],
  ['administration-building',0,'行政大樓','Administration Building','位於校長室對面，總務處、學生事務處、教務處、會計室與勞作教育處等行政單位所在，各翼圍繞中庭、覆灰瓦廡殿頂。牆面依早期行政建築的白牆與木構框架近似建模。',campusMap,0,110],
  ['w341450780',0,'相思林','Acacia Woods','校園西側的林地，林間步道銜接東海別墅與第一教學區。',walks,0,260],
  ['w1344753003',0,'新建學生宿舍32棟','Student Residence 32','臺灣大道旁的新建女宿。2024 年落成，地上九層，立面以淺色外牆與紅磚格柵交錯呈現。',newDormSource,1,122],
  ['w1344753007',0,'新建學生宿舍33棟','Student Residence 33','與 32 棟同一計畫興建的新建男宿。2024 年落成，地上九層，透過階梯廣場銜接既有宿舍區。',newDormSource,0,122],
  ['yang-activity-center',0,'楊瑞祥綜合活動大樓','Multi-Purpose Activity Center','位於田徑場南側，與西側舊體育館連通。地上三層、地下一層，規劃室內跑道與多功能球場，2026 年校慶舉行剪綵。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53634',1,132],
  ['r5467507',0,'東海大學田徑場','Tunghai University Athletics Track','位於楊瑞祥綜合活動大樓北側，設有 400 公尺戶外跑道與中央足球場。場館登記地址為臺中市西屯區臺灣大道四段 1727 號。','https://iplay.sports.gov.tw/gyminfo/index/15050',1,205],
  ['w227104642',1,'銘賢堂','Ming-Hsien Hall','位於教堂與學生生活區之間，可由教堂沿校方藝文散步路線抵達。',walks,0,155],
  ['w227124385',1,'陽光草坪','Sunshine Lawn','鄰近女生宿舍，在銘賢堂往乳品小棧的藝文散步路線上。',walks,0,195],
  ['w227075021',1,'綠之心・乳品小棧','Green Heart Hall','位在教學區與牧場之間，是校園散步和品嚐東海乳品的停留點。','https://thucwc.thu.edu.tw/store/',1,165],
  ['w109505205',1,'東海湖','Tunghai Lake','鄰近農牧場與第二教學區的湖泊。沿著湖畔可往小王子玫瑰園。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53463',1,275],
  ['w1507803521',1,'小王子玫瑰園','The Little Prince Rose Garden','東海湖旁的園地有兩座玫瑰造型花圃，於 2025 年校慶揭幕。',park,0,175],
  ['w367700949',1,'東海牧場','Tunghai Farm','牧場草地與東海湖形成校園東南側的開放景觀。','https://thufarm.thu.edu.tw/tw/%E8%AA%8D%E8%AD%98%E7%89%A7%E5%A0%B4/',1,340],
  ['faculty-residence-136',1,'東海路136號教師宿舍','Faculty Residence','校方列為新進教師暨退休宿舍，由三棟公寓式建物組成。校方配置圖列出各棟 1 至 7 樓，模型高度與外觀為近似。','https://ppms.thu.edu.tw/web/student/detail.php?cid=1&id=8',0,108],
  ['second-teaching-area-gate',2,'第二教學區校門','Second Teaching Area Entrance','由臺灣大道慢車道經力行路進入第二教學區，雙向各兩線車道，設有車牌辨識柵欄機與繳費機，往管理學院與省政研究大樓。','https://tcs.thu.edu.tw/web/news/list.php?page=2',0,70],
  ['w226829984',2,'管理學院','College of Management','位於第二教學區，是校園接駁路線的重要站點。','https://bus.service.thu.edu.tw/',1,195],
  ['w367198554',2,'音樂系館','Department of Music','第二教學區的音樂教學空間，鄰近美術系館。',campusMap,0,150],
  ['w367198636',2,'美術系館','Department of Fine Arts','清水混凝土、紅磚牆與外露樓梯構成系館立面。朝向中庭的植生曲面沿著坡地展開，連接建築與草坪。','https://www.taichung.gov.tw/media/271345/5102811383171.pdf',0,108],
  ['w226831045',2,'省政研究大樓','Provincial Government Building','又稱省政大樓（PG），位於第二教學區管理學院旁。紅磚翼棟以深色坡屋頂收邊，入口設有玻璃帷幕和雨棚。館內設有國際會議廳。','https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53371',1,76],
].map(([id,zone,name,english,description,source,featured,width]) => ({id,zone,name,english,description,source,featured,width}));
