// 現在の年をフッタに表示
document.getElementById('year').textContent = new Date().getFullYear();

var pdfUrl = 'RF32_Map.pdf';
var pdfDoc = null;
var pageNum = 1;
var scale = 1.0;
var baseWidth = 0, baseHeight = 0; // scale=1時のPDFのベースサイズ
var panX = 0, panY = 0;
var initialFitScale = 1.0;

var canvas = document.getElementById('pdf-canvas');
var ctx = canvas.getContext('2d');

// 非全画面状態では、キャンバスをcontainerの中心に配置する
function centerCanvas() {
  var container = document.getElementById('pdf-container');
  if (!container.classList.contains('expanded')) {
    var rect = container.getBoundingClientRect();
    panX = (rect.width - baseWidth * scale) / 2;
    panY = (rect.height - baseHeight * scale) / 2;
  }
}

// PDFページの再レンダリング（ズーム・パン状態を反映）
function renderPage(num) {
  pdfDoc.getPage(num).then(function(page) {
    var initialViewport = page.getViewport({ scale: 1 });
    if (!baseWidth) {
      baseWidth = initialViewport.width;
      baseHeight = initialViewport.height;
    }
    var newWidth = baseWidth * scale;
    var newHeight = baseHeight * scale;
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = newWidth + "px";
    canvas.style.height = newHeight + "px";
    canvas.style.transform = `translate(${panX}px, ${panY}px)`;
    var viewport = page.getViewport({ scale: scale });
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderContext);
  });
}

// PDFの読み込みと初期フィットスケールの計算
pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
  pdfDoc = pdf;
  pdfDoc.getPage(pageNum).then(function(page) {
    var initialViewport = page.getViewport({ scale: 1 });
    baseWidth = initialViewport.width;
    baseHeight = initialViewport.height;
    var container = document.getElementById('pdf-container');
    var rect = container.getBoundingClientRect();
    initialFitScale = Math.min(rect.width / baseWidth, rect.height / baseHeight);
    scale = initialFitScale;
    centerCanvas();
    renderPage(pageNum);
  });
});

// PC向け：Ctrl+ホイールでズーム（マウスポインタ基準）
canvas.addEventListener('wheel', function(e) {
  if (e.ctrlKey) {
    e.preventDefault();
    var container = document.getElementById('pdf-container');
    var rect = container.getBoundingClientRect();
    var pointerX = e.clientX - rect.left;
    var pointerY = e.clientY - rect.top;
    var oldScale = scale;
    if (e.deltaY < 0) {
      scale = oldScale * 1.1;
    } else {
      scale = oldScale / 1.1;
    }
    var factor = scale / oldScale;
    panX = pointerX - factor * (pointerX - panX);
    panY = pointerY - factor * (pointerY - panY);
    renderPage(pageNum);
  }
});

// ズームボタンのイベント（表示領域の中心を基準にする）
// 全画面モードの場合はウィンドウ中心、非全画面の場合はcontainer中心
document.getElementById('zoomIn').addEventListener('click', function() {
  var oldScale = scale;
  scale *= 1.2;
  var container = document.getElementById('pdf-container');
  if (container.classList.contains('expanded')) {
    var centerX = window.innerWidth / 2;
    var centerY = window.innerHeight / 2;
    var factor = scale / oldScale;
    panX = centerX - factor * (centerX - panX);
    panY = centerY - factor * (centerY - panY);
  } else {
    var rect = container.getBoundingClientRect();
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;
    var factor = scale / oldScale;
    panX = centerX - factor * (centerX - panX);
    panY = centerY - factor * (centerY - panY);
  }
  renderPage(pageNum);
});
document.getElementById('zoomOut').addEventListener('click', function() {
  var oldScale = scale;
  scale /= 1.2;
  var container = document.getElementById('pdf-container');
  if (container.classList.contains('expanded')) {
    var centerX = window.innerWidth / 2;
    var centerY = window.innerHeight / 2;
    var factor = scale / oldScale;
    panX = centerX - factor * (centerX - panX);
    panY = centerY - factor * (centerY - panY);
  } else {
    var rect = container.getBoundingClientRect();
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;
    var factor = scale / oldScale;
    panX = centerX - factor * (centerX - panX);
    panY = centerY - factor * (centerY - panY);
  }
  renderPage(pageNum);
});

// タッチ向け：Hammer.jsによるピンチ＆ダブルタップ（非全画面はcontainer中心を基準）
var hammer = new Hammer(canvas);
hammer.get('pinch').set({ enable: true });
var hammerInitialScale = scale;
hammer.on('pinchstart', function() {
  hammerInitialScale = scale;
});
hammer.on('pinch', function(ev) {
  scale = hammerInitialScale * ev.scale;
  if (!document.getElementById('pdf-container').classList.contains('expanded')) {
    centerCanvas();
  }
  renderPage(pageNum);
});
hammer.on('doubletap', function() {
  scale = (scale === 1.0) ? 2.0 : 1.0;
  if (!document.getElementById('pdf-container').classList.contains('expanded')) {
    centerCanvas();
  }
  renderPage(pageNum);
});

// パン操作：PC向けマウスドラッグ
var isDragging = false;
var dragOffsetX = 0, dragOffsetY = 0;
canvas.addEventListener('mousedown', function(e) {
  isDragging = true;
  dragOffsetX = e.clientX - panX;
  dragOffsetY = e.clientY - panY;
});
document.addEventListener('mousemove', function(e) {
  if (isDragging) {
    panX = e.clientX - dragOffsetX;
    panY = e.clientY - dragOffsetY;
    canvas.style.transform = `translate(${panX}px, ${panY}px)`;
  }
});
document.addEventListener('mouseup', function(e) {
  isDragging = false;
});

// タッチ向け：Hammer.jsによるパン操作
var hammerPanStartX = 0, hammerPanStartY = 0;
hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
hammer.on('panstart', function(ev) {
  hammerPanStartX = panX;
  hammerPanStartY = panY;
});
hammer.on('pan', function(ev) {
  panX = hammerPanStartX + ev.deltaX;
  panY = hammerPanStartY + ev.deltaY;
  canvas.style.transform = `translate(${panX}px, ${panY}px)`;
});

// 拡大表示モードの切替（解除時は初期フィット状態にリセット）
function toggleExpanded() {
  var container = document.getElementById('pdf-container');
  var btn = document.getElementById('toggleExpanded');
  container.classList.toggle('expanded');
  if (container.classList.contains('expanded')) {
    btn.textContent = '元に戻す';
    // 全画面モードでは、ズームボタンの動作はユーザー操作に任せる
  } else {
    btn.textContent = '全画面表示';
    scale = initialFitScale;
    panX = 0;
    panY = 0;
    canvas.style.transform = `translate(0px, 0px)`;
    renderPage(pageNum);
  }
}
