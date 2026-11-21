# 東海大學 3D 校園

互動導覽涵蓋臺中東海大學的第一、第二教學區，可旋轉、縮放並選取 21 處地標。

- [開啟 3D 校園](https://ctyangthu.github.io/tunghai-campus-3d/)
- [近看美術系館](https://ctyangthu.github.io/tunghai-campus-3d/?place=w367198636)

## 建置

執行 `npm ci` 和 `npm run build`，然後以支援 WebGL 2 的瀏覽器開啟 `docs/index.html`。GitHub Pages 從 `main` 分支的 `docs/` 發布。

## 資料來源

- 校園配置與地標名稱參考東海大學。 [校園地圖](https://thupr.thu.edu.tw/traffic.php)
- 道路、建物輪廓與地表配置取自 © OpenStreetMap contributors。這些資料的整理版本 `docs/data/campus-geo.json` 依 ODbL 1.0 開放。 [資料檔](docs/data/campus-geo.json) · [OpenStreetMap 著作權資訊](https://www.openstreetmap.org/copyright) · [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)
- 地形使用 Mapzen Terrain Tiles，SRTM 資料由美國地質調查局提供。本場景取樣並略為加強垂直起伏。 [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- 教堂曲面依線稿重建。美術系館的清水混凝土、入口與植生曲面參考建築專文和攝影。建築高度、造型細節與植栽為近似建模。 [臺中市政府建築專文](https://www.taichung.gov.tw/media/271345/5102811383171.pdf) · [Shawn Liu 建築攝影](https://www.shawnliustudio.com/tunghai-university-dept-of-fine-art)
