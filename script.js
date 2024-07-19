document.addEventListener("DOMContentLoaded", function () {
    var map = L.map('map').setView([35.6895, 139.6917], 5);

    var geojsonLayer;
    var prefectureLayer;

    // 都道府県コードと名前の対応
    const prefectureNames = {
        "01": "北海道",
        "02": "青森県",
        "03": "岩手県",
        "04": "宮城県",
        "05": "秋田県",
        "06": "山形県",
        "07": "福島県",
        "08": "茨城県",
        "09": "栃木県",
        "10": "群馬県",
        "11": "埼玉県",
        "12": "千葉県",
        "13": "東京都",
        "14": "神奈川県",
        "15": "新潟県",
        "16": "富山県",
        "17": "石川県",
        "18": "福井県",
        "19": "山梨県",
        "20": "長野県",
        "21": "岐阜県",
        "22": "静岡県",
        "23": "愛知県",
        "24": "三重県",
        "25": "滋賀県",
        "26": "京都府",
        "27": "大阪府",
        "28": "兵庫県",
        "29": "奈良県",
        "30": "和歌山県",
        "31": "鳥取県",
        "32": "島根県",
        "33": "岡山県",
        "34": "広島県",
        "35": "山口県",
        "36": "徳島県",
        "37": "香川県",
        "38": "愛媛県",
        "39": "高知県",
        "40": "福岡県",
        "41": "佐賀県",
        "42": "長崎県",
        "43": "熊本県",
        "44": "大分県",
        "45": "宮崎県",
        "46": "鹿児島県",
        "47": "沖縄県"
    };

    // 都道府県のGeoJSONデータを読み込み、地図に追加
    fetch('prefectures.geojson')
        .then(response => response.json())
        .then(data => {
            prefectureLayer = L.geoJSON(data, {
                style: function (feature) {
                    return {
                        color: "black",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.1
                    };
                },
                onEachFeature: function (feature, layer) {
                    var prefectureName = feature.properties.N03_001;
                    layer.bindPopup(prefectureName);
                    layer.on('click', function () {
                        // 都道府県をクリックした時の動作
                        map.fitBounds(layer.getBounds());
                        var prefectureCode = getPrefectureCode(prefectureName);
                        if (prefectureCode) {
                            loadMunicipalities(prefectureCode);
                        }
                    });
                }
            }).addTo(map);
        });

    function getPrefectureCode(name) {
        for (const [code, prefecture] of Object.entries(prefectureNames)) {
            if (prefecture == name) {
                console.log(prefecture)
                return code;
            }
        }
        return null;
    }

    function loadMunicipalities(prefectureCode) {
        if (geojsonLayer) {
            map.removeLayer(geojsonLayer);
        }

        // サイドバーまたはパネルをクリア
        var sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '';

        // 市町村のGeoJSONファイルを動的に読み込み
        var fileName = 'polygons/N03-21_' + prefectureCode + '_210101.json';
        fetch(fileName)
            .then(response => response.json())
            .then(data => {
                geojsonLayer = L.geoJSON(data, {
                    style: function (feature) {
                        return {
                            color: "gray",
                            weight: 1,
                            opacity: 0.5,
                            fillOpacity: 0.2
                        };
                    },
                    onEachFeature: function (feature, layer) {
                        layer.on('add', function () {
                            // ウェイポイントがポリゴン内にあるか確認し、色を変更
                            waypoints.forEach(function (waypoint) {
                                if (layer.getBounds().contains(waypoint.getLatLng())) {
                                    layer.setStyle({ color: 'red' });
                                }
                            });
                        });
                        layer.on('click', function () {
                            // 市町村の名称を取得
                            var cityName = feature.properties.N03_004;
                            // ウェイポイントの数をカウント
                            var waypointCount = waypoints.filter(function (waypoint) {
                                return layer.getBounds().contains(waypoint.getLatLng());
                            }).length;
                            // ポップアップで市町村の名称とウェイポイントの数を表示
                            layer.bindPopup(cityName + '\n発見数' + waypointCount).openPopup();
                        });

                        var div = document.createElement('div');
                        div.textContent = feature.properties.N03_004;
                        sidebar.appendChild(div);
                    }
                }).addTo(map);



            })
            .catch(error => console.error('Error loading GeoJSON:', error));
    }

    // GPXデータの読み込みと処理
    var waypoints = [];
    // ウェイポイントを円で表現

    document.getElementById('file-input').addEventListener('change', function (e) {
        var file = e.target.files[0];
        console.log(file);
        if (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var data = e.target.result;
                console.log(data);
                var blob = new Blob([data], {type: 'application/gpx+xml'});
                var url = URL.createObjectURL(blob);

                omnivore.gpx(url)
                    .on('ready', function (event) {
                        var gpxLayer = event.target;
                        gpxLayer.eachLayer(function (layer) {
                            waypoints.push(layer);
                            // layer.setIcon(customIcon);
                            // layer.addTo(map);
                        });
                        waypoints.forEach(function (waypoint) {
                            L.circle(waypoint.getLatLng(), {
                                color: 'transparent',      // 円の境界線の色
                                fillColor: 'red', // 円の塗りつぶし色
                                fillOpacity: 0.5,  // 塗りつぶしの透明度
                                radius: 160        // 半径（メートル）
                            }).addTo(map);
                        });

                        if (geojsonLayer) {
                            geojsonLayer.eachLayer(function (layer) {
                                waypoints.forEach(function (waypoint) {
                                    if (layer.getBounds().contains(waypoint.getLatLng())) {
                                        layer.setStyle({ color: 'red' });
                                    }
                                });
                            });
                        }
                    });
            }
            reader.onerror = function() {
                console.error('ファイルの読み込み中にエラーが発生しました。');
            };
            reader.readAsText(file); // GPXファイルをテキストとして読み込む
            URL.revokeObjectURL(url);
        };
    });
});
