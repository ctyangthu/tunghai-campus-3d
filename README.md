# 東海大學 3D 校園

互動導覽涵蓋臺中東海大學的第一、第二教學區，可旋轉、縮放並選取 90 處地標。地標名稱、編號與分區依東海大學校園地圖。

頁面採滿版配置：地圖填滿視窗，右側地標面板可用地圖右上角的按鈕收合，地圖控制列另有全螢幕按鈕；手機上地圖占滿寬度、約四分之三螢幕高度，地標面板在下方。

An English version is at [/en/](https://ctyangthu.github.io/tunghai-campus-3d/en/): the same 3D campus with English interface, landmark names and descriptions.

- [開啟 3D 校園](https://ctyangthu.github.io/tunghai-campus-3d/) · [English version](https://ctyangthu.github.io/tunghai-campus-3d/en/)
- [近看文理大道](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367700897)
- [近看校友鐘樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=n2358488959)
- [近看美術系館](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367198636)
- [近看省政研究大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w226831045)
- [近看新建學生宿舍](https://ctyangthu.github.io/tunghai-campus-3d/?place=w1344753003)
- [近看楊瑞祥綜合活動大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=yang-activity-center)
- [近看 400 公尺田徑場](https://ctyangthu.github.io/tunghai-campus-3d/?place=r5467507)
- [近看東海路 136 號教師宿舍](https://ctyangthu.github.io/tunghai-campus-3d/?place=faculty-residence-136)
- [近看 B House 教職員宿舍（東海路 24 號）](https://ctyangthu.github.io/tunghai-campus-3d/?place=faculty-house-b) · [學人宿舍](https://ctyangthu.github.io/tunghai-campus-3d/?place=scholars-residence) · [鳥瞰教職員宿舍區](https://ctyangthu.github.io/tunghai-campus-3d/?view=130,200,380,0.5,0.75)
- [近看小王子玫瑰園](https://ctyangthu.github.io/tunghai-campus-3d/?place=w1507803521)
- [校園公車路線與時刻](https://ctyangthu.github.io/tunghai-campus-3d/?bus=1)
- [近看圖書館總館](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367196899)
- [近看康敦樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w227124380)
- [近看中正紀念堂入口](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367195941) · [近看大智慧科技大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w1302996436) · [近看行政中心](https://ctyangthu.github.io/tunghai-campus-3d/?place=administration-center) · [近看智慧碳中和園區](https://ctyangthu.github.io/tunghai-campus-3d/?place=carbon-neutrality-park)
- [近看大門與校名塔](https://ctyangthu.github.io/tunghai-campus-3d/?place=n5439892666)
- [近看第二教學區校門](https://ctyangthu.github.io/tunghai-campus-3d/?place=second-teaching-area-gate)
- [鳥瞰男生宿舍區](https://ctyangthu.github.io/tunghai-campus-3d/?view=-470,-245,150,0.3,0.6) · [鳥瞰女生宿舍區](https://ctyangthu.github.io/tunghai-campus-3d/?view=-320,165,140,0.35,0.55)

選擇地標後，可在資料卡查看建築特徵。14 處建物另附 Google Maps 鳥瞰連結，可逐棟比對模型和實景。

網址參數 `?view=x,z,寬度,方位角,仰角` 可直接開啟任意視角，x、z 為場景公尺座標（x 向東、z 向南），方位角與仰角以弧度表示，可省略。

## 建置

執行 `npm ci` 和 `npm run build`，然後以支援 WebGL 2 的瀏覽器開啟 `docs/index.html`（中文）或 `docs/en/index.html`（英文）。直接從磁碟開啟時瀏覽器不會載入圖書館模型，會顯示手工建模的圖書館；要看完整模型，請在 `docs/` 啟動本機伺服器（例如 `python3 -m http.server`）。

`docs/index.html` 與 `docs/en/index.html` 是建置產物，不納入版本控制。GitHub Actions（`.github/workflows/pages.yml`）在每次推送到 `main` 時重新建置，並把 `docs/` 發布到 GitHub Pages；pull request 只建置不發布。儲存庫的 Settings → Pages → Build and deployment 的 Source 須設為「GitHub Actions」。

## 資料產生

`npm run build` 只把 `src/` 與資料檔打包成 `docs/index.html` 與 `docs/en/index.html`，兩頁共用同一份程式，各自以 `__LANG__` 編譯。介面文字在 `src/i18n.js`，地標的英文說明與分區在 `src/places-en.js`；新增地標時須同時補上英文說明，否則建置會失敗。資料檔由 `scripts/` 內的腳本重建，需要 Node.js 22 以上。下載的原始資料暫存在 `.cache/`，不納入版本控制。

| 資料檔 | 指令 | 來源 | 與目前發布版比對 |
| --- | --- | --- | --- |
| `data/terrain.json` | `npm run data:terrain` | Mapzen Terrain Tiles，zoom 14，雙線性取樣 | 逐位元相同 |
| `docs/data/campus-geo.json` | `npm run data:osm` | OpenStreetMap | 校界、315 棟建物、135 塊土地、22 處標籤、樹木皆相同；道路 374 段中 323 段相同 |
| `data/campus-extras.json` | `npm run data:extras` | OpenStreetMap 中未標為建物的設施：學生福音中心、養雞場雞舍、馬場 | 新增 |
| `data/roof-colors.json` | `npm run data:roofs` | 國土測繪中心 2024 年正射影像，逐棟取樣屋頂顏色（需 Python 3 與 Pillow） | 新增 |
| `data/luce-chapel.json` | `npm run chapel:export`、`npm run chapel:import <檔案>` | 教堂模型，經 glTF 編輯 | 匯出再匯入逐位元相同 |

### 地圖資料（OpenStreetMap）

`npm run data:osm` 先以 `scripts/fetch-osm.mjs` 下載校園周邊資料，再以 `scripts/build-geo.mjs` 產生 `docs/data/campus-geo.json`。下載預設使用 Overpass，並以 `scripts/config.mjs` 的 `osmDate` 固定快照日期；無法連線時改用 OSM API，只能取得當下資料。加上 `--latest` 取用 Overpass 最新資料，或以 `--source=api` 指定 OSM API。

取捨規則集中在 `scripts/geo-rules.mjs`，包括：

- 建物與土地的篩選：中心點須在校界內或距校界 8 公尺（土地為 5 公尺）以內，並排除過小的面積。
- 建物高度：有 `building:levels` 時每層 3.25 公尺。其餘依地標高度表、建物類型或占地面積估計；第一教學區的低層校舍為 7 公尺。
- 道路寬度與裁切方式。
- 地標標籤清單。

道路的原始裁切與簡化步驟沒有留下紀錄，腳本以文件化的規則近似。差異集中在校界外緣的裁切位置與少數校內短步道。取代發布版之前，請先比對：

```sh
node scripts/fetch-osm.mjs
node scripts/build-geo.mjs --out=.cache/campus-geo.json
node scripts/compare-geo.mjs docs/data/campus-geo.json .cache/campus-geo.json --verbose
```

地圖資料與地形沿用發布時的兩種等距圓柱投影，兩者在場景邊緣相差約 1.5 公尺，說明見 `scripts/lib/projection.mjs`。若透過 HTTPS proxy 連線，Node.js 22.21 以上需設定 `NODE_USE_ENV_PROXY=1`。

### 路思義教堂模型

`data/luce-chapel.json` 依材質分組，儲存 Float32 頂點、法向量與 Uint16 索引。最初產生這些曲面的程式沒有保留，因此這個 JSON 檔就是模型原始檔。編輯時執行 `npm run chapel:export` 匯出 `.cache/luce-chapel.gltf`，在 Blender 等工具修改後匯出 `.gltf` 或 `.glb`，再執行 `npm run chapel:import <檔案>` 寫回。匯入時會合併同材質的網格、套用節點變換，並為缺少法向量的網格補算。

## 資料來源

- 校園配置與地標名稱參考東海大學。 [校園地圖](https://thupr.thu.edu.tw/traffic.php)
- 道路、建物輪廓與地表配置取自 © OpenStreetMap contributors。這些資料的整理版本 `docs/data/campus-geo.json` 依 ODbL 1.0 開放。 [資料檔](docs/data/campus-geo.json) · [OpenStreetMap 著作權資訊](https://www.openstreetmap.org/copyright) · [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
- 地形使用 Mapzen Terrain Tiles，SRTM 資料由美國地質調查局提供。本場景取樣並略為加強垂直起伏。 [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- 教堂曲面依線稿重建。美術系館的清水混凝土、入口與植生曲面參考建築專文和攝影。建築高度、造型細節與植栽為近似建模。 [臺中市政府建築專文](https://www.taichung.gov.tw/media/271345/5102811383171.pdf) · [Shawn Liu 建築攝影](https://www.shawnliustudio.com/tunghai-university-dept-of-fine-art)
- 省政研究大樓沿用地圖輪廓。紅磚立面、入口雨棚、玻璃格窗及深色坡屋頂參考外觀照與公開空拍。 [外觀照片](https://commons.wikimedia.org/wiki/File:%E7%9C%81%E6%94%BF%E7%A0%94%E7%A9%B6%E5%A4%A7%E6%A8%93.jpg) · [空拍來源，第 6 頁](https://ilabor.ntpc.gov.tw/ckeditor/downloadFile/629301842?serverName=00249f5a-49d5-47e4-9481-f0be739637df)
- 宿舍 32、33 棟保留 OpenStreetMap 輪廓，依建築師公布的地上九層、29.85 公尺重建。 [校方沿革](https://sustainable.thu.edu.tw/public/cat1-1/) · [建築師作品資料](https://www.twarchitect.org.tw/works/東海大學學生宿舍/)
- 楊瑞祥綜合活動大樓以國土測繪中心 2024 年正射影像的施工基礎定位，並參考校方 2026 年外觀照片近似建模。田徑場跑道色澤依校方照片更新。 [國土測繪中心圖資](https://maps.nlsc.gov.tw/S09SOA/pro/Wmts_ajax_main.jsp) · [校方場館照片](https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53630)
- 建物屋頂顏色取自國土測繪中心 2024 年正射影像：`scripts/build-roof-colors.py` 在每棟建物輪廓內取屋頂像素的中位數，略去邊緣、樹冠與陰影。牆面顏色、樓高與屋頂形式仍為近似。依校園地圖逐號比對後，補上地圖資料未標為建物的學生福音中心、養雞場雞舍與馬場，並依影像繪出第二教學區運動場的內野紅土。 [國土測繪中心正射影像](https://maps.nlsc.gov.tw/)
- 地標的名稱、編號與五個分區依東海大學校園地圖（教學行政區、生活機能區、附屬學校區、學生宿舍及教職員宿舍區、其他區），未編號的校門與景點另列一組。校園地圖的 12 號行政大樓為校長室等單位所在的院落，13 號行政中心為教務處、學務處、總務處所在的建築群；OpenStreetMap 將行政中心分為五個翼棟，此處合為一個地標。師資培育中心與銘賢樓的位置依校園地圖推定。 [東海大學校園地圖](https://thupr.thu.edu.tw/traffic.php)
- 中正紀念堂的入口朝東，與圖書館的入口同樣面向文理大道，金色弧形雨棚、柱列與台階設在東側立面。大智慧科技大樓沿用地圖輪廓，系所樓層依各單位公告，立面與樓高為近似。智慧碳中和園區的拱形溫室、棚架與太陽能屋頂建築依 2024 年正射影像配置。 [資訊工程學系樓層圖](https://www.cs.thu.edu.tw/web/page/page.php?lang=zh_tw&scid=18&sid=12) · [圖資處服務台](https://lis.thu.edu.tw/web/page/page.php?lang=zh_tw&scid=57&sid=106) · [智慧碳中和園區](https://sustainable.thu.edu.tw/campus/carbon/)
- 大門（第一教學區校門）依國土測繪中心 2024 年正射影像配置車道與中央分隔島。校門於 2024 年 7 月至 8 月拓寬；從臺灣大道面向大門，右側（西側）的白色校名塔約 15 公尺高，塔頂東西兩面嵌有校名；塔身比例與警衛亭、柵欄機為近似建模。第二教學區校門依同一影像與交通及安全組公告設置車辨柵欄機與繳費機。 [校門拓寬工程公告](https://business.thu.edu.tw/web/news/detail.php?id=151) · [東海大學校門介紹](http://thugo.thu.edu.tw/chinese/04_school/02_detail.php?sdid=3) · [交通及安全組公告](https://tcs.thu.edu.tw/web/news/list.php?page=2)
- 學生宿舍的外觀依正射影像的屋頂色彩、屋脊與太陽能板，並參考臺中市文化資產處「東海大學早期校園」文化景觀照片：早期男生宿舍為清水紅磚牆與灰瓦廡殿頂，女生宿舍為白牆、木作走廊欄杆與灰瓦屋頂，30、72、73 棟為平屋頂的中高層建築。樓層取自 OpenStreetMap，未標註者依住宿輔導組的床位公告估計（30 棟至少 10 層、73 棟 8 層），其餘早期宿舍以兩層建模。 [東海大學早期校園文化景觀](https://www.tchac.taichung.gov.tw/uploads/tchac/files/202105/5ee76a08-09f2-485d-971c-66f35e46a3f0.pdf) · [住宿輔導組公告](https://dorm.thu.edu.tw/upload/dorm/files/115學年度第二階段宿舍申請抽籤最新公告_0413v5.pdf)
- 東海路教職員宿舍分 A House、B House、C House 與學人宿舍四型（src/faculty-housing.js）。型別定義與坪數取自總務處保管組：A、B 為民國 46 年前完工的木構架屋頂獨棟平房（50.40、52.30 坪），C 為民國 68 年 9 月前完工的雙併平房（每戶 35.60 坪，含中庭），學人宿舍為民國 68 年至 81 年完工的加強磚造二層連棟（SA、SC 一層一戶，SB 兩層一戶）。各棟歸類依 OpenStreetMap 的東海路門牌點：一個門牌為獨棟，兩個門牌為雙併，巷號加 A、B 為學人宿舍的上下層。東海路 24 號為 B House（臺中市文化資產處圖說），以長條主屋加側翼的平面為 B 型，平面較寬或呈 T 字、十字者為 A 型，此 A、B 劃分為依正射影像推定。保管組另列的 E 型（雙併，23.17 坪）無公開位置，一併以 C 型呈現。 [教職員宿舍資訊](https://property.thu.edu.tw/web/student/detail.php?id=8) · [東海大學早期校園文化景觀](https://www.tchac.taichung.gov.tw/uploads/tchac/files/202105/5ee76a08-09f2-485d-971c-66f35e46a3f0.pdf)
- 頁首的「校園公車」按鈕顯示平日的兩條校園公車路線（社科院 → 管理學院、管理學院 → 社科院）、停靠站與下一班發車時間；網址加上 `?bus=1` 會直接開啟。發車時刻與停靠站順序取自東海大學校園公車時刻表，`npm run data:bus`（`scripts/build-bus.mjs`）重新擷取並寫入 `data/campus-bus.json`。停靠站位置採用 OpenStreetMap 的公車站點，社科院、農法學院（化材系）與基礎科學館沒有站點，取建物旁的路邊；路線依停靠站順序沿校內道路求最短路徑；社科院 → 管理學院一線依校方標示，改走教堂草坪西側的約農路，再經篤信路過女舍陽光草坪，其餘路段為推定路線。下一班時間依臺灣時間計算，週末顯示下週一的首班。學校的即時公車位置系統以 http 提供，瀏覽器不允許 https 網頁嵌入或讀取，因此以連結另開頁面。 [校園公車時刻表](https://bus.service.thu.edu.tw/)
- 圖書館外觀採用「東海大學校園建築模型」的圖書總館（thu-library-v04，作者依現場照片、俯視圖與斜視影像重建）。`scripts/optimize-library-model.mjs` 把原始 22.6 MB、48.7 萬面的模型精簡為 `docs/models/thu-library.glb`（約 2.5 MB、14.8 萬面）：去除法線與粗糙度貼圖和光電模組鋁框、合併同材質構件、貼圖縮為 512 像素、幾何以 meshopt 壓縮。頁面先畫出校園，再於背景載入模型取代手工建模的圖書館；模型以 OpenStreetMap 屋頂輪廓的中心定位、維持原尺寸，正門朝東。OSM 另繪於圖書館東北角的「二悅蒔室」量體已包含在模型內，載入後隱藏。 [圖書總館模型](https://gis.th-thu.com/models/?building=LIB)
- 小王子玫瑰園的兩朵玫瑰花圃、盤旋到花心的碎石步道、葉片造型花圃與綠籬，依東海大學與古典玫瑰園發布的空拍照描繪（src/rose-garden.js）。國土測繪中心 2024、2025 年正射影像拍攝時花園尚未完成，因此以旋轉與等比縮放把照片配準到 OpenStreetMap 的花園輪廓，東側行道樹、西側湖東路出口與南側空地都與周邊相符，位置與尺寸為近似。花圃依地形起伏高出地面約 0.4 至 0.6 公尺。 [小王子玫瑰園揭幕](https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53364)
- 戶外田徑場的 400 公尺規格和門牌來自場館登錄。東海路 136 號在另一處，三棟教師宿舍沿用 OpenStreetMap 輪廓，樓層依校方配置圖建模，建物高度與外觀為近似。 [全國運動場館資訊網](https://iplay.sports.gov.tw/gyminfo/index/15050) · [教職員宿舍資訊](https://ppms.thu.edu.tw/web/student/detail.php?cid=1&id=8)
- 校友鐘樓的位置採用 OpenStreetMap 節點 2358488959，名稱與位置對照校方導覽。塔身依照片近似建模。文、理、工與大道西段的教學院落沿用 OpenStreetMap 輪廓，雙坡灰瓦、柱梁與磚牆參考建築研究、文資照片和鳥瞰畫面。 [東海大學文理大道空拍](https://thupr.thu.edu.tw/photos/2211074611.png) · [鐘樓照片](https://commons.wikimedia.org/wiki/File:Bell_tower_-_Tunghai_University_-_DSC01614.JPG) · [臺中市文化資產處](https://www.tchac.taichung.gov.tw/historybuilding?pid=252&uid=37) · [羅時瑋建築專文](https://www.tunghai74.org/yearbook/whitewallsinTunghai.htm)
- 社會科學院、圖書館總館與中正紀念堂的屋頂和量體以鳥瞰核對，入口與立面參考校方照片。 [Google Maps 北側鳥瞰](https://www.google.com/maps/@24.177724,120.595837,347a,35y,39.6t/data=!3m1!1e3) · [社會科學院](https://sosc.thu.edu.tw/) · [圖書館格局](https://lis.thu.edu.tw/web/building/page.php?lang=zh_tw&scid=21&sid=35) · [中正紀念堂](https://space.thu.edu.tw/detail/AS/AS3)
- 語文館的平頂中庭、行政大樓與校長室的灰瓦紅磚、宗教中心的琉璃瓦斜牆，分別參考地圖與外觀照。 [臺中市文化資產處早期校園圖照](https://www.tchac.taichung.gov.tw/uploads/tchac/files/202105/5ee76a08-09f2-485d-971c-66f35e46a3f0.pdf) · [宗教中心外觀](https://thupr.thu.edu.tw/photos/22113924419.png)
- 體育館、銘賢堂、舊郵局（路思義文創咖啡館）、男生宿舍餐廳與花園餐廳的屋頂、立面和露台依照片與鳥瞰近似建模。 [臺中市文化局校園建築介紹](https://www.culture.taichung.gov.tw/2061062/2099383/3337384/3338327/3338335/3346548) · [奧柏林廣場](https://sites.google.com/go.thu.edu.tw/oberlin/%E9%A6%96%E9%A0%81) · [舊郵局修復](https://thupr.thu.edu.tw/newsdetail.php?c=60&id=52874) · [東海大學校園餐廳](https://thueat.thu.edu.tw/web/teacher/list.php?lang=zh_tw)
- 康敦樓的白牆、灰瓦與陶管漏牆參考校方修復記錄。衛理樓的前後棟、白牆與高低錯落配置參考文化資產圖照。 [康敦樓整修](https://thupr.thu.edu.tw/newsdetail.php?id=53442) · [東海大學衛理會館](https://www.tchac.taichung.gov.tw/historybuilding?pid=211&uid=34)
