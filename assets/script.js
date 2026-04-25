let allWords = [];
let words = [];
let currentIndex = 0;
let sessionScore = 0;
let isFlipped = false;
let touchStartX = 0;
let isProcessing = false;

const STORAGE_KEY = "tango_master_stats";
const fileInput = document.getElementById("file-input");
const wordDisplay = document.getElementById("word-display");
const card = document.getElementById("card");
const controls = document.getElementById("controls");
const swipeWrapper = document.getElementById("swipe-wrapper");

const threshold = 80;

// --- 1. スワイプイベント ---
swipeWrapper.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
  },
  { passive: true },
);

swipeWrapper.addEventListener(
  "touchend",
  (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;

    // ガード：裏返し前、または移動不足、または次のカードへ移行中
    if (!isFlipped || Math.abs(diff) < threshold || isProcessing) return;

    if (diff > threshold) animateAndSubmit("right", true);
    else if (diff < -threshold) animateAndSubmit("left", false);
  },
  { passive: true },
);

// --- 2. 判定演出とデータ送信 ---
function animateAndSubmit(direction, isCorrect) {
  if (isProcessing) return;
  isProcessing = true; // 次のカードが出るまで操作をロック

  const swipeClass = direction === "right" ? "swipe-right" : "swipe-left";
  card.classList.add(swipeClass);

  // 0.2秒のアニメーション後にデータを更新して次へ
  setTimeout(() => {
    card.classList.remove(swipeClass);
    submitAnswer(isCorrect);
  }, 200);
}

// --- 3. ボタンイベント ---
document.getElementById("btn-correct").onclick = () => {
  if (isFlipped && !isProcessing) animateAndSubmit("right", true);
};

document.getElementById("btn-wrong").onclick = () => {
  if (isFlipped && !isProcessing) animateAndSubmit("left", false);
};

// --- 4. ファイル読み込み ---
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    allWords = event.target.result
      .split(/\r?\n/)
      .filter((line) => {
        const p = line.split(/[;,]/);
        return p.length >= 2 && p[0].trim() !== "" && p[1].trim() !== "";
      })
      .map((line) => {
        const p = line.split(/[;,]/);
        return { en: p[0].trim(), ja: p[1].trim() };
      });

    if (allWords.length > 0) {
      const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const hasHistory = allWords.some(
        (w) => stats[w.en] && stats[w.en].wrong > 0,
      );
      const onlyMistakes = hasHistory
        ? confirm("過去のミスのみ抽出しますか？")
        : false;
      setupSession(onlyMistakes);
    }
  };
  reader.readAsText(file, "UTF-8");
};

// --- 5. セッション管理 ---
function setupSession(filterMistakes) {
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  words = filterMistakes
    ? allWords.filter((w) => stats[w.en] && stats[w.en].wrong > 0)
    : [...allWords];
  if (words.length === 0) words = [...allWords];
  words.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  sessionScore = 0;
  startStudy();
}

function startStudy() {
  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("result-view").classList.add("hidden");
  document.getElementById("study-view").classList.remove("hidden");
  document.getElementById("total-count").textContent = words.length;
  showWord();
}

// --- 6. 単語の表示と登場アニメーション ---
function showWord() {
  isFlipped = false;
  isProcessing = false; // ★ここでロックを解除

  // クラスのリセット
  card.className = "card"; // 一旦標準のクラスのみにする

  wordDisplay.textContent = words[currentIndex].en;
  wordDisplay.style.color = "#333";
  document.getElementById("instruction").textContent = "タップで回答を表示";
  controls.classList.add("hidden");
  document.getElementById("current-idx").textContent = currentIndex + 1;

  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const s = stats[words[currentIndex].en];
  document.getElementById("history-info").textContent = s
    ? `通算: ○${s.correct} / ×${s.wrong}`
    : `(初登場)`;

  // アニメーション適用
  void card.offsetWidth;
  card.classList.add("card-new-appear");
}

// ★最重要：カードのクリックイベント
card.onclick = (e) => {
  // すでに裏返っているか、判定アニメーション中なら無視
  if (isFlipped || isProcessing) return;

  isFlipped = true;
  wordDisplay.textContent = words[currentIndex].ja;
  wordDisplay.style.color = "#007bff";
  document.getElementById("instruction").textContent =
    "スワイプまたはボタンで判定";
  controls.classList.remove("hidden");
};

// --- 7. 回答処理 ---
function submitAnswer(isCorrect) {
  if (currentIndex >= words.length) return;

  let stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const word = words[currentIndex].en;
  if (!stats[word]) stats[word] = { correct: 0, wrong: 0 };

  isCorrect ? stats[word].correct++ : stats[word].wrong++;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));

  if (isCorrect) sessionScore++;
  document.getElementById("live-score").textContent = sessionScore;

  currentIndex++;
  if (currentIndex < words.length) {
    showWord();
  } else {
    showResults();
  }
}

// --- 8. 結果表示 ---
function showResults() {
  document.getElementById("study-view").classList.add("hidden");
  document.getElementById("result-view").classList.remove("hidden");
  document.getElementById("final-score").textContent = Math.round(
    (sessionScore / words.length) * 100,
  );
  document.getElementById("final-stats").textContent =
    `全${words.length}問中、正解は${sessionScore}問でした。`;

  const retryBtn = document.getElementById("retry-mistakes-btn");
  if (sessionScore === words.length) {
    retryBtn.classList.add("hidden");
  } else {
    retryBtn.classList.remove("hidden");
    retryBtn.onclick = () => setupSession(true);
  }
}

function resetAllHistory() {
  if (confirm("記録をすべて削除しますか？")) {
    localStorage.removeItem(STORAGE_KEY);
  }
}
