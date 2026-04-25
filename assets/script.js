let words = [],
  currentIndex = 0,
  sessionScore = 0;
let isFlipped = false,
  touchStartX = 0,
  currentX = 0,
  isProcessing = false;

const card = document.getElementById("card");
const wordDisplay = document.getElementById("word-display");

// --- スワイプ制御 ---
card.addEventListener(
  "touchstart",
  (e) => {
    if (!isFlipped || isProcessing) return;
    touchStartX = e.touches[0].pageX;
    card.style.transition = "none";
  },
  { passive: true },
);

card.addEventListener(
  "touchmove",
  (e) => {
    if (!isFlipped || isProcessing) return;
    currentX = e.touches[0].pageX - touchStartX;

    // 15度の回転を適用
    const rotate = Math.min(Math.max(currentX / 10, -15), 15);
    card.style.transform = `translate3d(${currentX}px, 0, 0) rotate(${rotate}deg)`;

    if (currentX > 80) card.style.borderColor = "#10b981";
    else if (currentX < -80) card.style.borderColor = "#ef4444";
    else card.style.borderColor = "#3b82f6";
  },
  { passive: true },
);

card.addEventListener("touchend", () => {
  if (!isFlipped || isProcessing) return;
  if (Math.abs(currentX) > 100) {
    handleSwipe(currentX > 0);
  } else {
    card.style.transition = "transform 0.2s ease-out, border-color 0.2s";
    card.style.transform = "translate3d(0, 0, 0)";
    card.style.borderColor = "#007bff";
  }
  currentX = 0;
});

async function handleSwipe(isCorrect) {
  isProcessing = true;
  card.style.transition = "transform 0.3s ease-in, opacity 0.3s";
  card.style.transform = `translate3d(${isCorrect ? 600 : -600}px, 0, 0)`;
  card.style.opacity = "0";

  await new Promise((r) => setTimeout(r, 300));

  if (isCorrect) sessionScore++;
  currentIndex++;

  if (currentIndex < words.length) showWord();
  else showResult();
}

function showWord() {
  const msg = "タップで回答を表示";
  document.getElementById("instruction").textContent = msg;

  isFlipped = false;
  isProcessing = false;
  card.style.transition = "none";
  card.style.transform = "translate3d(0, 0, 0)";
  card.style.opacity = "1";
  card.style.borderColor = "#007bff";

  const word = words[currentIndex];
  wordDisplay.textContent = word.en;
  document.getElementById("current-idx").textContent = currentIndex + 1;
  document.getElementById("live-score").textContent = sessionScore;
}

card.onclick = () => {
  // すでに反転しているか、スワイプ中（遊びの5px以上）なら何もしない
  if (isFlipped || isProcessing || Math.abs(currentX) > 5) return;

  isFlipped = true;
  wordDisplay.textContent = words[currentIndex].ja;

  // ★反転後のスワイプ説明に切り替え
  document.getElementById("instruction").textContent =
    "← 不正解だった (スワイプしてください) 正解だった →";
};

// --- CSV読み込み ---
document.getElementById("file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    words = event.target.result
      .split(/\r?\n/)
      .filter((l) => l.includes(","))
      .map((l) => {
        const p = l.split(",");
        return { en: p[0].trim(), ja: p[1].trim() };
      })
      .sort(() => Math.random() - 0.5);

    document.getElementById("setup-view").classList.add("hidden");
    document.getElementById("study-view").classList.remove("hidden");
    document.getElementById("total-count").textContent = words.length;
    showWord();
  };
  reader.readAsText(file, "UTF-8");
};

function showResult() {
  document.getElementById("study-view").classList.add("hidden");
  document.getElementById("result-view").classList.remove("hidden");
  document.getElementById("final-score").textContent = Math.round(
    (sessionScore / words.length) * 100,
  );
}

function resetAllHistory() {
  if (confirm("リセット？")) localStorage.clear();
}
