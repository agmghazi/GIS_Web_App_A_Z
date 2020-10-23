//public variable
let mapview;
let map;
let layer;
var Request;
const DEFAULTPageCount = 10;
var LayerID;
let Graphic;
let MapLayer;
const DEFAULT_SET_PAGE_SIZE = 10;
let ServiceURL =
  "http://localhost:6080/arcgis/rest/services/GeoData/MapServer/";
let LegnendServiceURL =
  "http://localhost:6080/arcgis/rest/services/GeoData/MapServer/legend?f=pjson";

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/request",
  "esri/layers/MapImageLayer",
  "esri/Graphic",
  "esri/widgets/BasemapToggle",
  "esri/widgets/ScaleBar",
], function (
  Map,
  MapView,
  EsriRequest,
  MapLayerEsri,
  GraphicClass,
  BasemapToggle,
  ScaleBar
) {
  Request = EsriRequest;
  Graphic = GraphicClass;
  MapLayer = MapLayerEsri;

  // #region create basic map
  map = new Map({ basemap: "topo" });

  mapview = new MapView({
    container: "mapView",
    map: map,
    center: [43.89804072836892, 26.387530533942073],
    zoom: 15,
  });
  // #endregion create basic map

  // #region create wedjets
  let basemapToggle = new BasemapToggle({
    view: mapview,
    nextBasemap: "satellite",
  });
  mapview.ui.add(basemapToggle, "top-right");

  let scaleBar = new ScaleBar({
    view: mapview,
    style: "ruler",
    unit: "metric",
  });
  mapview.ui.add(scaleBar, {
    position: "bottom-left",
  });
  // #endregion create wedjets

  // #region  buttons events
  let closeToc = document.querySelector(".closeToc");
  closeToc.addEventListener("click", function () {
    let TableDiv = document.querySelector(".TableDiv");
    TableDiv.classList.add("hidden");
    let closeToc = document.querySelector(".closeToc");
    closeToc.classList.add("hidden");
  });
  // #endregion buttons events

  // create map layers fire on app run
  onChangeServiceMap(1, true, true);

  // #region add progress bar for Transparency
  let progressBar = document.querySelector("#app");
  progressBar.onchange = function () {
    progressBars = progressBar.value;
    onChangeServiceMap(parseFloat(progressBar.value), false, false);
  };
  // #endregion add progress bar for Transparency

  // #region init map layers
  function onChangeServiceMap(progressValue, poolGoTo, createToc) {
    layer = new MapLayer({
      url: ServiceURL,
    });
    layer.opacity = progressValue;

    map.removeAll();
    map.add(layer);
    layer.when(() => {
      //populate layer in list
      if (createToc == true) {
        let toc = document.getElementById("toc");

        while (toc.firstChild) {
          toc.removeChild(toc.firstChild);
        }

        let layerList = document.createElement("ul");
        layerList.classList.add("ulToggle");
        toc.appendChild(layerList);

        populateLayerRecursive(layer, layerList);
      }
      if (poolGoTo == "GO") {
        mapview.goTo(layer.fullExtent);
      }
    });
  }
});
// #endregion init map layers

// #region on layers changes
function onChangeFeatureService(layerIDs) {
  let layerFeature = new MapLayer({
    url: ServiceURL,
    sublayers: [
      {
        id: layerIDs,
      },
    ],
  });
  map.add(layerFeature);
}
// #endregion on layers changes

// #region get count of layers
function getCount(LayerID, el, labelHover) {
  let queryUrl = ServiceURL + LayerID + "/query";

  let queryOption = {
    responseType: "json",
    query: {
      f: "json",
      where: "1=1",
      returnCountOnly: true,
    },
  };

  Request(queryUrl, queryOption).then(
    function (response) {
      if (response.data.count) {
        labelHover.FeatureCount = response.data.count;
        labelHover.style.cursor = "pointer";
      }
      el.textContent = " " + response.data.count;
    },
    (response) => (el.style.visibility = "hidden")
  );
}
// #endregion get count of layers

// #region populate layers and mapservice
let layerItem;
let LegendItem;
function populateLayerRecursive(thislayer, layerList) {
  let chk = document.createElement("input");
  chk.type = "checkbox";
  chk.value = thislayer.id;
  LayerID = thislayer.id;
  chk.checked = thislayer.visible;

  chk.addEventListener("click", (e) => {
    thislayer.visible = e.target.checked;
  });

  let lbl = document.createElement("label");
  lbl.textContent = thislayer.title;

  let lblCount = document.createElement("label");
  lblCount.classList.add("lblCount");

  let pdfView = document.createElement("input");
  pdfView.type = "image";
  pdfView.id = thislayer.id;
  pdfView.src = "https://img.icons8.com/wired/23/000000/pdf-2.png";

  let openPDF = document.createElement("a");
  openPDF.href = `/PDF_Files/${thislayer.id}.pdf`;
  openPDF.target = "_blank";

  pdfView.addEventListener("click", function () {
    openPDF.click();
  });

  let spaceSpan = document.createElement("span");
  spaceSpan.innerHTML = "..";
  spaceSpan.classList.add("spanHidden");

  getCount(thislayer.id, lblCount, lbl);
  lbl.layerId = thislayer.id;

  layerItem = document.createElement("li");
  layerItem.appendChild(chk);
  layerItem.appendChild(lbl);
  layerList.appendChild(layerItem);
  layerItem.appendChild(lblCount);
  layerItem.appendChild(spaceSpan);
  layerItem.appendChild(pdfView);
  layerItem.appendChild(openPDF);

  //generate legend
  GenerateLegend(thislayer.id, layerItem);

  //on click, open attribut table
  lbl.addEventListener("click", function (e) {
    let TableDiv = document.querySelector(".TableDiv");
    TableDiv.classList.remove("hidden");
    let closeToc = document.querySelector(".closeToc");
    closeToc.classList.remove("hidden");

    populateAtributeTable(e.target.layerId, e.target.FeatureCount, 1);
    if (e.target.FeatureCount === undefined) {
      console.log("not found any data");
      let PaginationCleaner = document.querySelector("#PageCounter");

      while (PaginationCleaner.firstChild) {
        PaginationCleaner.removeChild(PaginationCleaner.firstChild);
      }
    } else {
      populatePageCount(e.target.layerId, e.target.FeatureCount);
      onChangeFeatureService(e.target.layerId);
    }
  });

  if (thislayer.sublayers != null && thislayer.sublayers.items.length > 0) {
    let newList = document.createElement("ul");

    newList.classList.add("ulToggle");

    layerList.appendChild(newList);

    if (lbl.textContent == "A MapService") {
      lbl.innerHTML = "ممتلكات الوزارة العامة للرياضة";
    }
    if (document.querySelector(".lblCount")[0] == undefined)
      lblCount.style.visibility = "hidden";
    pdfView.style.visibility = "hidden";

    for (let i = 0; i < thislayer.sublayers.length; i++) {
      populateLayerRecursive(thislayer.sublayers.items[i], newList);
    }
  }
}
// #endregion populate layers and mapservice

// #region generate legend
function GenerateLegend(layerIds, layerItem) {
  let requestOptionss = {
    responseType: "json",
  };
  Request(LegnendServiceURL, requestOptionss).then(function (responses) {
    let resultss = responses.data;
    for (let i = 0; i < resultss.layers.length; i++) {
      for (let j = 0; j < resultss.layers[i].legend.length; j++) {
        if (layerIds === resultss.layers[i].layerId) {
          LegendItem = document.createElement("ul");
          let LegendImg = document.createElement("img");
          LegendItem.appendChild(LegendImg);
          LegendImg.src = `data:${resultss.layers[i].legend[j].contentType};base64,${resultss.layers[i].legend[j].imageData}`;
          LegendImg.alt = resultss.layers[i].layerName;
          LegendImg.width = resultss.layers[i].legend[j].height;
          LegendImg.height = resultss.layers[i].legend[j].width;
          layerItem.appendChild(LegendItem);
        }
      }
    }
  });
}
// #endregion generate legend

// #region draw geometry
function drawGeometry(geometry, cleanup = true) {
  let g;
  let s;
  if (geometry.paths != undefined) {
    g = {
      type: "polyline",
      paths: geometry.paths,
    };
    s = {
      type: "simple-line",
      cap: "round",
      color: [255, 0, 0, 0.5],
      width: 7,
      style: "solid", //short-dot
    };
  } // it is a polygon
  else if (geometry.rings != undefined) {
    g = {
      type: "polygon",
      rings: geometry.rings,
    };
    s = {
      type: "simple-fill",
      color: [255, 0, 0, 0.5],
      style: "backward-diagonal",
      outline: {
        width: 5,
        color: [0, 0, 255, 0.7],
        style: "solid",
      },
    };
  } // it is a point
  else {
    g = {
      type: "point",
      longitude: geometry.x,
      latitude: geometry.y,
    };
    s = {
      type: "simple-marker",
      color: [255, 0, 0, 0.5],
      size: 20,
    };
  }

  if (cleanup === true) mapview.graphics = [];

  let graphic = new Graphic({ geometry: g, symbol: s });
  mapview.graphics.add(graphic);
  mapview.goTo(graphic);
}
// #endregion draw geometry

// #region zoom to layers
function ZooomToFeature(e) {
  let oLayerID = ServiceURL + e.target.eLayerID + "/query";

  let oid = e.target.oid;

  let queryOption = {
    responseType: "json",
    query: {
      f: "json",
      objectIds: oid,
      returnGeometry: true,
      outSR: 4326,
    },
  };
  Request(oLayerID, queryOption)
    .then((response) => {
      drawGeometry(response.data.features[0].geometry);
    })
    .catch((err) => console.log("ERRor"));
}
// #endregion zoom to layers

// #region populate the attribute of a given layer
function populateAtributeTable(LayerID, FeatureCount, page) {
  //create buttons

  let attributeTable = document.getElementById("attributeTable");
  // attributeTable.innerHTML = "";
  while (attributeTable.firstChild) {
    attributeTable.removeChild(attributeTable.firstChild);
  }

  let queryUrl = ServiceURL + LayerID + "/query";
  let queryOption = {
    responseType: "json",
    query: {
      f: "json",
      where: "1=1",
      returnCountOnly: false,
      outFields: "*",
      resultOffset: (page - 1) * DEFAULTPageCount,
      resultRecordCount: DEFAULTPageCount,
    },
  };

  Request(queryUrl, queryOption).then(
    (response) => {
      //alert(response.data.fields.length);
      let table = document.createElement("table");
      table.border = 2;
      let header = document.createElement("tr");
      let ZoomHeader = document.createElement("th");
      ZoomHeader.textContent = "";

      table.appendChild(header);

      table.id = "tableAttribute";
      //populate the fileds / columns
      for (let i = 0; i < response.data.fields.length; i++) {
        // for create head (fields)
        let column = document.createElement("th");
        column.textContent = response.data.fields[i].alias;
        header.appendChild(column);
      }
      header.appendChild(ZoomHeader);

      //loop through all features
      for (let j = 0; j < response.data.features.length; j++) {
        let feature = response.data.features[j];
        let row = document.createElement("tr");
        let zoomColumn = document.createElement("td");

        let img = document.createElement("img");
        img.style.width = "32px";
        img.style.height = "32px";
        img.src = "images/zoom.png";
        img.eLayerID = LayerID;
        img.addEventListener("click", ZooomToFeature);
        zoomColumn.appendChild(img);
        table.appendChild(row);

        for (let i = 0; i < response.data.fields.length; i++) {
          let field = response.data.fields[i];

          let column = document.createElement("td");

          if (field.type == "esriFieldTypeOID") {
            img.oid = feature.attributes[field.name];
          }
          if (field.type == "esriFieldTypeDate") {
            let date = new Date(feature.attributes[field.name]);
            column.textContent = date.toLocaleDateString("en-US");
          } else {
            column.textContent = feature.attributes[field.name];
          }
          row.appendChild(column);
          row.appendChild(zoomColumn);
        }
      }

      attributeTable.appendChild(table);
    },
    (response) => console.log("can not get attribute for group layer")
  );
}
// #endregion populate the attribute of a given layer

// #region Pagination
//rest buttonPages color
var buttonPages = [];
function resetPages() {
  buttonPages.forEach((v) => {
    v.style.color = "black";
  });
}
let page;
function populatePageCount(LayerID, feaureCount, initPage = 1, initSet = 0) {
  let pageCount = Math.ceil(feaureCount / DEFAULTPageCount);
  let pageCountDiv = document.getElementById("PageCounter");
  let feaureCountLBL = document.createElement("label");
  feaureCountLBL.textContent = " العدد الإجمالى: " + feaureCount;
  feaureCountLBL.id = "feaureCountLBL";

  while (pageCountDiv.firstChild) {
    pageCountDiv.removeChild(pageCountDiv.firstChild);
  }

  let pageToDraw = DEFAULT_SET_PAGE_SIZE;
  if (pageCount - initSet < DEFAULT_SET_PAGE_SIZE) {
    pageToDraw = pageCount - initSet;
  }

  for (let i = initSet; i < initSet + pageToDraw; i++) {
    page = document.createElement("button");
    page.textContent = i + 1;
    buttonPages.push(page);
    page.pageNumber = i + 1;
    page.featureCount = feaureCount;

    page.addEventListener("click", function (e) {
      resetPages();
      e.target.style.color = "red";
      populateAtributeTable(LayerID, feaureCount, i + 1);
    });
    if (i + 1 === initPage) {
      page.style.color = "red";
    }
    pageCountDiv.appendChild(page);
    pageCountDiv.appendChild(feaureCountLBL);
  }

  // this for make next more pages
  let nextSet = document.createElement("button");
  nextSet.textContent = "Next";
  nextSet.disabled = pageCount - initSet < DEFAULT_SET_PAGE_SIZE;
  nextSet.addEventListener("click", function (e) {
    page.click();
    resetPages();
    populatePageCount(
      LayerID,
      feaureCount,
      initSet + DEFAULT_SET_PAGE_SIZE + 1,
      initSet + DEFAULT_SET_PAGE_SIZE
    );
  });
  pageCountDiv.appendChild(nextSet);

  // this for make Previous more pages
  let PreviousSet = document.createElement("button");
  PreviousSet.textContent = "Previous";
  if (initSet < DEFAULT_SET_PAGE_SIZE) {
    PreviousSet.disabled = true;
  } else if (pageCount + initSet > DEFAULT_SET_PAGE_SIZE) {
    PreviousSet.disabled = false;
  }

  PreviousSet.addEventListener("click", function () {
    page.addEventListener("click", function (e) {
      resetPages();
      e.target.style.color = "red";
      populateAtributeTable(LayerID, feaureCount, i - 1);
    });

    page.click();
    resetPages();
    populatePageCount(
      LayerID,
      feaureCount,
      initSet - DEFAULT_SET_PAGE_SIZE + 1,
      initSet - DEFAULT_SET_PAGE_SIZE
    );
  });
  pageCountDiv.appendChild(PreviousSet);
}
// #endregion

// #region jquery code
$(document).on("click", ".ulToggle > li ", function () {
  $(this).next("ul").toggle();
});

$(".openLayers").click(function () {
  $(".TocDiv").toggleClass("hidden");
});
// #endregion jquery code
