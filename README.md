# 東海大學 3D 校園

互動導覽涵蓋臺中東海大學的第一、第二教學區，可旋轉、縮放並選取 45 處地標。

- [開啟 3D 校園](https://ctyangthu.github.io/tunghai-campus-3d/)
- [近看文理大道](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367700897)
- [近看校友鐘樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=n2358488959)
- [近看美術系館](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367198636)
- [近看省政研究大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w226831045)
- [近看新建學生宿舍](https://ctyangthu.github.io/tunghai-campus-3d/?place=w1344753003)
- [近看楊瑞祥綜合活動大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=yang-activity-center)
- [近看 400 公尺田徑場](https://ctyangthu.github.io/tunghai-campus-3d/?place=r5467507)
- [近看東海路 136 號教師宿舍](https://ctyangthu.github.io/tunghai-campus-3d/?place=faculty-residence-136)
- [近看圖書館總館](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367196899)
- [近看康敦樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w227124380)
- [近看中正紀念堂入口](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367195941) · [近看大智慧科技大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w1302996436) · [近看行政大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=administration-building)
- [近看第一教學區校門與校名塔](https://ctyangthu.github.io/tunghai-campus-3d/?place=n5439892666)
- [近看第二教學區校門](https://ctyangthu.github.io/tunghai-campus-3d/?place=second-teaching-area-gate)
- [鳥瞰男生宿舍區](https://ctyangthu.github.io/tunghai-campus-3d/?view=-470,-245,150,0.3,0.6) · [鳥瞰女生宿舍區](https://ctyangthu.github.io/tunghai-campus-3d/?view=-320,165,140,0.35,0.55)

選擇地標後，可在資料卡查看建築特徵。14 處建物另附 Google Maps 鳥瞰連結，可逐棟比對模型和實景。

網址參數 `?view=x,z,寬度,方位角,仰角` 可直接開啟任意視角，x、z 為場景公尺座標（x 向東、z 向南），方位角與仰角以弧度表示，可省略。

## 建置

執行 `npm ci` 和 `npm run build`，然後以支援 WebGL 2 的瀏覽器開啟 `docs/index.html`。

`docs/index.html` 是建置產物，不納入版本控制。GitHub Actions（`.github/workflows/pages.yml`）在每次推送到 `main` 時重新建置，並把 `docs/` 發布到 GitHub Pages；pull request 只建置不發布。儲存庫的 Settings → Pages → Build and deployment 的 Source 須設為「GitHub Actions」。

## 資料產生

`npm run build` 只把 `src/` 與三個資料檔打包成 `docs/index.html`。資料檔由 `scripts/` 內的腳本重建，需要 Node.js 22 以上。下載的原始資料暫存在 `.cache/`，不納入版本控制。

| 資料檔 | 指令 | 來源 | 與目前發布版比對 |
| --- | --- | --- | --- |
| `data/terrain.json` | `npm run data:terrain` | Mapzen Terrain Tiles，zoom 14，雙線性取樣 | 逐位元相同 |
| `docs/data/campus-geo.json` | `npm run data:osm` | OpenStreetMap | 校界、315 棟建物、135 塊土地、22 處標籤、樹木皆相同；道路 374 段中 323 段相同 |
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
- 牧場南側的智慧碳中和園區由開放地景與分散設施組成。導覽已移除園區邊界誤生成的整塊建物量體。 [校方園區介紹](https://sustainable.thu.edu.tw/campus/carbon/)
- 中正紀念堂的入口朝東，與圖書館總館的入口同樣面向文理大道，金色弧形雨棚、柱列與台階設在東側立面。行政大樓指校長室對面、總務處與學務處等單位所在的建築群，OpenStreetMap 分為五個翼棟（並將校長室院落的草地標為「行政大樓」），此處合為一個地標。大智慧科技大樓沿用地圖輪廓，系所樓層依各單位公告，立面與樓高為近似。 [資訊工程學系樓層圖](https://www.cs.thu.edu.tw/web/page/page.php?lang=zh_tw&scid=18&sid=12) · [圖資處服務台](https://lis.thu.edu.tw/web/page/page.php?lang=zh_tw&scid=57&sid=106)
- 第一教學區校門依國土測繪中心 2024 年正射影像配置車道、中央分隔島與東側廣場。校門於 2024 年 7 月至 8 月拓寬，左前方的白色校名塔約 15 公尺高，塔頂東西兩面嵌有校名；塔身比例與警衛亭、柵欄機為近似建模。第二教學區校門依同一影像與交通及安全組公告設置車辨柵欄機與繳費機。 [校門拓寬工程公告](https://business.thu.edu.tw/web/news/detail.php?id=151) · [東海大學校門介紹](http://thugo.thu.edu.tw/chinese/04_school/02_detail.php?sdid=3) · [交通及安全組公告](https://tcs.thu.edu.tw/web/news/list.php?page=2)
- 學生宿舍的外觀依正射影像的屋頂色彩、屋脊與太陽能板，並參考臺中市文化資產處「東海大學早期校園」文化景觀照片：早期男生宿舍為清水紅磚牆與灰瓦廡殿頂，女生宿舍為白牆、木作走廊欄杆與灰瓦屋頂，30、72、73 棟為平屋頂的中高層建築。樓層取自 OpenStreetMap，未標註者依住宿輔導組的床位公告估計（30 棟至少 10 層、73 棟 8 層），其餘早期宿舍以兩層建模。 [東海大學早期校園文化景觀](https://www.tchac.taichung.gov.tw/uploads/tchac/files/202105/5ee76a08-09f2-485d-971c-66f35e46a3f0.pdf) · [住宿輔導組公告](https://dorm.thu.edu.tw/upload/dorm/files/115學年度第二階段宿舍申請抽籤最新公告_0413v5.pdf)
- 戶外田徑場的 400 公尺規格和門牌來自場館登錄。東海路 136 號在另一處，三棟教師宿舍沿用 OpenStreetMap 輪廓，樓層依校方配置圖建模，建物高度與外觀為近似。 [全國運動場館資訊網](https://iplay.sports.gov.tw/gyminfo/index/15050) · [教職員宿舍資訊](https://ppms.thu.edu.tw/web/student/detail.php?cid=1&id=8)
- 校友鐘樓的位置採用 OpenStreetMap 節點 2358488959，名稱與位置對照校方導覽。塔身依照片近似建模。文、理、工與大道西段的教學院落沿用 OpenStreetMap 輪廓，雙坡灰瓦、柱梁與磚牆參考建築研究、文資照片和鳥瞰畫面。 [東海大學文理大道空拍](https://thupr.thu.edu.tw/photos/2211074611.png) · [鐘樓照片](https://commons.wikimedia.org/wiki/File:Bell_tower_-_Tunghai_University_-_DSC01614.JPG) · [臺中市文化資產處](https://www.tchac.taichung.gov.tw/historybuilding?pid=252&uid=37) · [羅時瑋建築專文](https://www.tunghai74.org/yearbook/whitewallsinTunghai.htm)
- 社會科學院、圖書館總館與中正紀念堂的屋頂和量體以鳥瞰核對，入口與立面參考校方照片。 [Google Maps 北側鳥瞰](https://www.google.com/maps/@24.177724,120.595837,347a,35y,39.6t/data=!3m1!1e3) · [社會科學院](https://sosc.thu.edu.tw/) · [圖書館格局](https://lis.thu.edu.tw/web/building/page.php?lang=zh_tw&scid=21&sid=35) · [中正紀念堂](https://space.thu.edu.tw/detail/AS/AS3)
- 語文館的平頂中庭、行政大樓與校長室的灰瓦紅磚、宗教中心的琉璃瓦斜牆，分別參考地圖與外觀照。 [臺中市文化資產處早期校園圖照](https://www.tchac.taichung.gov.tw/uploads/tchac/files/202105/5ee76a08-09f2-485d-971c-66f35e46a3f0.pdf) · [宗教中心外觀](https://thupr.thu.edu.tw/photos/22113924419.png)
- 體育館、銘賢堂、舊郵局（路思義文創咖啡館）、男生宿舍餐廳與花園餐廳的屋頂、立面和露台依照片與鳥瞰近似建模。 [臺中市文化局校園建築介紹](https://www.culture.taichung.gov.tw/2061062/2099383/3337384/3338327/3338335/3346548) · [奧柏林廣場](https://sites.google.com/go.thu.edu.tw/oberlin/%E9%A6%96%E9%A0%81) · [舊郵局修復](https://thupr.thu.edu.tw/newsdetail.php?c=60&id=52874) · [東海大學校園餐廳](https://thueat.thu.edu.tw/web/teacher/list.php?lang=zh_tw)
- 康敦樓的白牆、灰瓦與陶管漏牆參考校方修復記錄。衛理樓的前後棟、白牆與高低錯落配置參考文化資產圖照。 [康敦樓整修](https://thupr.thu.edu.tw/newsdetail.php?id=53442) · [東海大學衛理會館](https://www.tchac.taichung.gov.tw/historybuilding?pid=211&uid=34)
