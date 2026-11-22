# 東海大學 3D 校園

互動導覽涵蓋臺中東海大學的第一、第二教學區，可旋轉、縮放並選取 25 處地標。

- [開啟 3D 校園](https://ctyangthu.github.io/tunghai-campus-3d/)
- [近看美術系館](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367198636)
- [近看省政研究大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=w226831045)
- [近看新建學生宿舍](https://ctyangthu.github.io/tunghai-campus-3d/?place=w1344753003)
- [近看楊瑞祥綜合活動大樓](https://ctyangthu.github.io/tunghai-campus-3d/?place=yang-activity-center)

## 建置

執行 `npm ci` 和 `npm run build`，然後以支援 WebGL 2 的瀏覽器開啟 `docs/index.html`。GitHub Pages 從 `main` 分支的 `docs/` 發布。

## 資料來源

- 校園配置與地標名稱參考東海大學。 [校園地圖](https://thupr.thu.edu.tw/traffic.php)
- 道路、建物輪廓與地表配置取自 © OpenStreetMap contributors。這些資料的整理版本 `docs/data/campus-geo.json` 依 ODbL 1.0 開放。 [資料檔](docs/data/campus-geo.json) · [OpenStreetMap 著作權資訊](https://www.openstreetmap.org/copyright) · [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
- 地形使用 Mapzen Terrain Tiles，SRTM 資料由美國地質調查局提供。本場景取樣並略為加強垂直起伏。 [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- 教堂曲面依線稿重建。美術系館的清水混凝土、入口與植生曲面參考建築專文和攝影。建築高度、造型細節與植栽為近似建模。 [臺中市政府建築專文](https://www.taichung.gov.tw/media/271345/5102811383171.pdf) · [Shawn Liu 建築攝影](https://www.shawnliustudio.com/tunghai-university-dept-of-fine-art)
- 省政研究大樓沿用地圖輪廓。紅磚立面、入口雨棚、玻璃格窗及深色坡屋頂參考外觀照與公開空拍。 [外觀照片](https://commons.wikimedia.org/wiki/File:%E7%9C%81%E6%94%BF%E7%A0%94%E7%A9%B6%E5%A4%A7%E6%A8%93.jpg) · [空拍來源，第 6 頁](https://ilabor.ntpc.gov.tw/ckeditor/downloadFile/629301842?serverName=00249f5a-49d5-47e4-9481-f0be739637df)
- 宿舍 32、33 棟保留 OpenStreetMap 輪廓，依建築師公布的地上九層、29.85 公尺重建。 [校方沿革](https://sustainable.thu.edu.tw/public/cat1-1/) · [建築師作品資料](https://www.twarchitect.org.tw/works/東海大學學生宿舍/)
- 楊瑞祥綜合活動大樓以國土測繪中心 2024 年正射影像的施工基礎定位，並參考校方 2026 年外觀照片近似建模。田徑場跑道色澤依校方照片更新。 [國土測繪中心圖資](https://maps.nlsc.gov.tw/S09SOA/pro/Wmts_ajax_main.jsp) · [校方場館照片](https://thupr.thu.edu.tw/newsdetail.php?c=60&id=53630)
- 牧場南側的智慧碳中和園區由開放地景與分散設施組成。導覽已移除園區邊界誤生成的整塊建物量體。 [校方園區介紹](https://sustainable.thu.edu.tw/campus/carbon/)
