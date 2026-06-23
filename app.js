const SAMPLE_IMAGE = "samples/presentation-sample.png";
const MAX_SOURCE_SIDE = 2200;
const MAX_AUTO_OUTPUT_SIDE = 1800;

const state = {
  imageCanvas: null,
  imageName: "",
  points: [],
  draggingIndex: -1,
  activeIndex: -1,
  outputReady: false
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  sampleBtn: document.querySelector("#sampleBtn"),
  openBtn: document.querySelector("#openBtn"),
  pasteBtn: document.querySelector("#pasteBtn"),
  captureBtn: document.querySelector("#captureBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  resultCanvas: document.querySelector("#resultCanvas"),
  sourceMeta: document.querySelector("#sourceMeta"),
  resultMeta: document.querySelector("#resultMeta"),
  statusText: document.querySelector("#statusText"),
  pointList: document.querySelector("#pointList"),
  clearPointsBtn: document.querySelector("#clearPointsBtn"),
  autoFrameBtn: document.querySelector("#autoFrameBtn"),
  aspectMode: document.querySelector("#aspectMode"),
  outputWidth: document.querySelector("#outputWidth"),
  outputHeight: document.querySelector("#outputHeight"),
  rectifyBtn: document.querySelector("#rectifyBtn"),
  downloadBtn: document.querySelector("#downloadBtn")
};

const sourceCtx = els.sourceCanvas.getContext("2d", { willReadFrequently: true });
const resultCtx = els.resultCanvas.getContext("2d", { willReadFrequently: true });

function setStatus(message) {
  els.statusText.textContent = message;
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function resizeImageToCanvas(image) {
  const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  return canvas;
}

function loadImageFromUrl(url, name = "image") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ canvas: resizeImageToCanvas(image), name });
    image.onerror = reject;
    image.src = url;
  });
}

async function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const loaded = await loadImageFromUrl(url, file.name || "clipboard-image");
    setImage(loaded.canvas, loaded.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function setImage(canvas, name) {
  state.imageCanvas = canvas;
  state.imageName = name;
  state.points = [];
  state.outputReady = false;

  els.sourceCanvas.width = canvas.width;
  els.sourceCanvas.height = canvas.height;
  els.resultCanvas.width = 1;
  els.resultCanvas.height = 1;
  els.downloadBtn.disabled = true;

  els.sourceMeta.textContent = `${name} · ${canvas.width.toLocaleString("ko-KR")} x ${canvas.height.toLocaleString("ko-KR")}`;
  els.resultMeta.textContent = "대기";

  if (!applySampleFrame()) applyDefaultFrame();
  drawSource();
  updatePointList();
  updateAutoSize();
}

function resetAll() {
  state.imageCanvas = null;
  state.imageName = "";
  state.points = [];
  state.outputReady = false;
  state.draggingIndex = -1;
  state.activeIndex = -1;

  els.sourceCanvas.width = 1;
  els.sourceCanvas.height = 1;
  els.resultCanvas.width = 1;
  els.resultCanvas.height = 1;
  els.sourceMeta.textContent = "이미지 없음";
  els.resultMeta.textContent = "대기";
  els.outputWidth.value = "";
  els.outputHeight.value = "";
  els.downloadBtn.disabled = true;
  setStatus("이미지를 불러오세요.");
  drawSource();
  updatePointList();
}

function applyDefaultFrame() {
  if (!state.imageCanvas) return;
  const { width, height } = state.imageCanvas;
  const insetX = Math.round(width * 0.08);
  const insetY = Math.round(height * 0.08);
  state.points = [
    { x: insetX, y: insetY },
    { x: width - insetX, y: insetY },
    { x: width - insetX, y: height - insetY },
    { x: insetX, y: height - insetY }
  ];
  state.activeIndex = -1;
  setStatus("네 꼭짓점을 슬라이드 모서리에 맞추세요.");
}

function applySampleFrame() {
  if (!state.imageCanvas || state.imageName !== "presentation-sample.png") return false;
  const scaleX = state.imageCanvas.width / 1378;
  const scaleY = state.imageCanvas.height / 864;
  state.points = [
    { x: 143 * scaleX, y: 18 * scaleY },
    { x: 1265 * scaleX, y: 268 * scaleY },
    { x: 1356 * scaleX, y: 837 * scaleY },
    { x: 63 * scaleX, y: 773 * scaleY }
  ];
  state.activeIndex = -1;
  setStatus("샘플 선택 영역 준비됨");
  return true;
}

function clearPoints() {
  state.points = [];
  state.activeIndex = -1;
  state.outputReady = false;
  els.downloadBtn.disabled = true;
  setStatus("원본에서 네 꼭짓점을 선택하세요.");
  drawSource();
  updatePointList();
}

function drawSource() {
  const canvas = els.sourceCanvas;
  sourceCtx.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.imageCanvas) {
    sourceCtx.fillStyle = "#ffffff";
    sourceCtx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  sourceCtx.drawImage(state.imageCanvas, 0, 0);
  drawSelectionOverlay(sourceCtx);
}

function drawSelectionOverlay(ctx) {
  const ordered = state.points.length === 4 ? orderPoints(state.points) : state.points;

  if (ordered.length > 1) {
    ctx.save();
    ctx.lineWidth = Math.max(3, els.sourceCanvas.width * 0.003);
    ctx.strokeStyle = "#ffbf2f";
    ctx.fillStyle = "rgba(255, 191, 47, 0.16)";
    ctx.beginPath();
    ordered.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    if (ordered.length === 4) ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  state.points.forEach((point, index) => {
    const active = index === state.activeIndex;
    const radius = active ? 13 : 10;
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#b35f00" : "#1b6f68";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), point.x, point.y);
    ctx.restore();
  });
}

function canvasPointFromEvent(event) {
  const rect = els.sourceCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (els.sourceCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (els.sourceCanvas.height / rect.height)
  };
}

function clampPoint(point) {
  return {
    x: Math.max(0, Math.min(els.sourceCanvas.width - 1, point.x)),
    y: Math.max(0, Math.min(els.sourceCanvas.height - 1, point.y))
  };
}

function nearestPointIndex(point) {
  let nearest = -1;
  let nearestDistance = Infinity;
  const hitRadius = Math.max(22, Math.max(els.sourceCanvas.width, els.sourceCanvas.height) * 0.018);

  state.points.forEach((candidate, index) => {
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });

  return nearestDistance <= hitRadius ? nearest : -1;
}

function handlePointerDown(event) {
  if (!state.imageCanvas) return;
  const point = clampPoint(canvasPointFromEvent(event));
  const nearest = nearestPointIndex(point);

  if (nearest >= 0) {
    state.draggingIndex = nearest;
    state.activeIndex = nearest;
  } else if (state.points.length < 4) {
    state.points.push(point);
    state.draggingIndex = state.points.length - 1;
    state.activeIndex = state.draggingIndex;
  } else {
    const distances = state.points.map((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y));
    const replaceIndex = distances.indexOf(Math.min(...distances));
    state.points[replaceIndex] = point;
    state.draggingIndex = replaceIndex;
    state.activeIndex = replaceIndex;
  }

  els.sourceCanvas.setPointerCapture(event.pointerId);
  setStatus(state.points.length === 4 ? "선택 영역 준비됨" : `${state.points.length}/4`);
  drawSource();
  updatePointList();
  updateAutoSize();
}

function handlePointerMove(event) {
  if (state.draggingIndex < 0 || !state.imageCanvas) return;
  state.points[state.draggingIndex] = clampPoint(canvasPointFromEvent(event));
  state.outputReady = false;
  els.downloadBtn.disabled = true;
  drawSource();
  updatePointList();
  updateAutoSize();
}

function handlePointerUp(event) {
  if (state.draggingIndex < 0) return;
  state.draggingIndex = -1;
  try {
    els.sourceCanvas.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture can already be released by the browser.
  }
}

function updatePointList() {
  els.pointList.innerHTML = "";

  if (!state.points.length) {
    const empty = document.createElement("div");
    empty.className = "point-empty";
    empty.textContent = "0/4";
    els.pointList.appendChild(empty);
    return;
  }

  state.points.forEach((point, index) => {
    const row = document.createElement("div");
    row.className = "point-row";

    const marker = document.createElement("div");
    marker.className = "point-index";
    marker.textContent = String(index + 1);

    const xInput = document.createElement("input");
    xInput.type = "number";
    xInput.min = "0";
    xInput.max = String(els.sourceCanvas.width);
    xInput.value = String(Math.round(point.x));
    xInput.ariaLabel = `${index + 1}번 X`;

    const yInput = document.createElement("input");
    yInput.type = "number";
    yInput.min = "0";
    yInput.max = String(els.sourceCanvas.height);
    yInput.value = String(Math.round(point.y));
    yInput.ariaLabel = `${index + 1}번 Y`;

    xInput.addEventListener("change", () => {
      point.x = Number(xInput.value) || 0;
      state.activeIndex = index;
      drawSource();
      updateAutoSize();
    });

    yInput.addEventListener("change", () => {
      point.y = Number(yInput.value) || 0;
      state.activeIndex = index;
      drawSource();
      updateAutoSize();
    });

    row.append(marker, xInput, yInput);
    els.pointList.appendChild(row);
  });
}

function orderPoints(points) {
  const sorted = points.map((point) => ({ x: point.x, y: point.y }));
  const bySum = [...sorted].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const byDiff = [...sorted].sort((a, b) => (a.x - a.y) - (b.x - b.y));
  return [
    bySum[0],
    byDiff[byDiff.length - 1],
    bySum[bySum.length - 1],
    byDiff[0]
  ];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getAutoDimensions() {
  if (state.points.length !== 4) return { width: 1280, height: 720 };
  const [tl, tr, br, bl] = orderPoints(state.points);
  let width = Math.max(distance(tl, tr), distance(bl, br));
  let height = Math.max(distance(tl, bl), distance(tr, br));

  if (els.aspectMode.value === "16:9") height = width * 9 / 16;
  if (els.aspectMode.value === "4:3") height = width * 3 / 4;

  const scale = Math.min(1, MAX_AUTO_OUTPUT_SIDE / Math.max(width, height));
  return {
    width: Math.max(64, Math.round(width * scale)),
    height: Math.max(64, Math.round(height * scale))
  };
}

function updateAutoSize() {
  if (els.aspectMode.value === "custom") return;
  const size = getAutoDimensions();
  els.outputWidth.value = String(size.width);
  els.outputHeight.value = String(size.height);
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivotRow][col])) pivotRow = row;
    }

    if (Math.abs(augmented[pivotRow][col]) < 1e-12) {
      throw new Error("Singular perspective matrix");
    }

    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];
    const pivot = augmented[col][col];

    for (let item = col; item <= n; item += 1) augmented[col][item] /= pivot;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let item = col; item <= n; item += 1) {
        augmented[row][item] -= factor * augmented[col][item];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function getHomography(sourcePoints, width, height) {
  const destPoints = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: 0, y: height - 1 }
  ];

  const matrix = [];
  const vector = [];

  destPoints.forEach((dest, index) => {
    const source = sourcePoints[index];
    const u = dest.x;
    const v = dest.y;
    const x = source.x;
    const y = source.y;

    matrix.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
    vector.push(x);
    matrix.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
    vector.push(y);
  });

  const h = solveLinearSystem(matrix, vector);
  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1
  ];
}

function sampleBilinear(data, width, height, x, y) {
  if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) {
    const ix = Math.max(0, Math.min(width - 1, Math.round(x)));
    const iy = Math.max(0, Math.min(height - 1, Math.round(y)));
    const offset = (iy * width + ix) * 4;
    return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const dx = x - x0;
  const dy = y - y0;
  const out = [0, 0, 0, 0];

  const samples = [
    { x: x0, y: y0, weight: (1 - dx) * (1 - dy) },
    { x: x1, y: y0, weight: dx * (1 - dy) },
    { x: x0, y: y1, weight: (1 - dx) * dy },
    { x: x1, y: y1, weight: dx * dy }
  ];

  samples.forEach((sample) => {
    const offset = (sample.y * width + sample.x) * 4;
    out[0] += data[offset] * sample.weight;
    out[1] += data[offset + 1] * sample.weight;
    out[2] += data[offset + 2] * sample.weight;
    out[3] += data[offset + 3] * sample.weight;
  });

  return out;
}

function rectifySelection() {
  if (!state.imageCanvas || state.points.length !== 4) {
    setStatus("네 꼭짓점이 필요합니다.");
    return;
  }

  const width = Math.max(64, Math.min(5000, Number(els.outputWidth.value) || 1280));
  const height = Math.max(64, Math.min(5000, Number(els.outputHeight.value) || 720));
  els.outputWidth.value = String(width);
  els.outputHeight.value = String(height);

  const ordered = orderPoints(state.points);
  const transform = getHomography(ordered, width, height);
  const sourceData = state.imageCanvas.getContext("2d").getImageData(0, 0, state.imageCanvas.width, state.imageCanvas.height);
  const output = resultCtx.createImageData(width, height);

  els.resultCanvas.width = width;
  els.resultCanvas.height = height;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const denom = transform[6] * x + transform[7] * y + transform[8];
      const sourceX = (transform[0] * x + transform[1] * y + transform[2]) / denom;
      const sourceY = (transform[3] * x + transform[4] * y + transform[5]) / denom;
      const color = sampleBilinear(sourceData.data, sourceData.width, sourceData.height, sourceX, sourceY);
      const offset = (y * width + x) * 4;
      output.data[offset] = color[0];
      output.data[offset + 1] = color[1];
      output.data[offset + 2] = color[2];
      output.data[offset + 3] = color[3];
    }
  }

  resultCtx.putImageData(output, 0, 0);
  state.outputReady = true;
  els.downloadBtn.disabled = false;
  els.resultMeta.textContent = `${width.toLocaleString("ko-KR")} x ${height.toLocaleString("ko-KR")}`;
  setStatus("변환 완료");
}

async function pasteImageFromClipboard() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      await loadImageFile(new File([blob], "clipboard-image.png", { type: imageType }));
      return;
    }
    setStatus("클립보드에 이미지가 없습니다.");
  } catch {
    setStatus("붙여넣기 권한을 확인하세요.");
  }
}

async function captureScreenFrame() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    setStatus("이 브라우저는 화면 캡처를 지원하지 않습니다.");
    return;
  }

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    await new Promise((resolve) => {
      if (video.videoWidth) resolve();
      else video.onloadedmetadata = resolve;
    });

    const canvas = createCanvas(video.videoWidth, video.videoHeight);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas, "screen-capture.png");
  } catch {
    setStatus("캡처가 취소되었습니다.");
  } finally {
    if (stream) stream.getTracks().forEach((track) => track.stop());
  }
}

function downloadResult() {
  if (!state.outputReady) return;
  const link = document.createElement("a");
  const baseName = (state.imageName || "rectified-slide")
    .replace(/\.[^.]+$/, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim() || "rectified-slide";
  link.download = `${baseName}-rectified.png`;
  link.href = els.resultCanvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function bindEvents() {
  els.sampleBtn.addEventListener("click", async () => {
    try {
      const loaded = await loadImageFromUrl(SAMPLE_IMAGE, "presentation-sample.png");
      setImage(loaded.canvas, loaded.name);
    } catch {
      setStatus("샘플 이미지를 열 수 없습니다.");
    }
  });

  els.openBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    const [file] = els.fileInput.files;
    if (file) loadImageFile(file);
    els.fileInput.value = "";
  });

  els.pasteBtn.addEventListener("click", pasteImageFromClipboard);
  window.addEventListener("paste", (event) => {
    const [file] = [...event.clipboardData.files].filter((item) => item.type.startsWith("image/"));
    if (file) loadImageFile(file);
  });

  els.captureBtn.addEventListener("click", captureScreenFrame);
  els.resetBtn.addEventListener("click", resetAll);
  els.clearPointsBtn.addEventListener("click", clearPoints);
  els.autoFrameBtn.addEventListener("click", () => {
    applyDefaultFrame();
    drawSource();
    updatePointList();
    updateAutoSize();
  });

  els.aspectMode.addEventListener("change", updateAutoSize);
  els.rectifyBtn.addEventListener("click", rectifySelection);
  els.downloadBtn.addEventListener("click", downloadResult);

  els.sourceCanvas.addEventListener("pointerdown", handlePointerDown);
  els.sourceCanvas.addEventListener("pointermove", handlePointerMove);
  els.sourceCanvas.addEventListener("pointerup", handlePointerUp);
  els.sourceCanvas.addEventListener("pointercancel", handlePointerUp);
}

bindEvents();
resetAll();
