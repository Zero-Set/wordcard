let allWords = [];
let words = [];
let currentIndex = 0;
let sessionScore = 0;
let isFlipped = false;
let touchStartX = 0;

const STORAGE_KEY = "tango_master_stats";
const fileInput = document.getElementById("file-input");
const wordDisplay = document.getElementById("word-display");
const card = document.getElementById("card");
const controls = document.getElementById("controls");
const swipeWrapper = document.getElementById("swipe-wrapper");

const threshold = 80;

// --- スワイプイベント ---
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

    // 裏返し前、または移動距離が短い場合は無視
    if (!isFlipped || Math.abs(diff) < threshold) return;

    if (diff > threshold) {
      animateAndSubmit("right", true); // 右 = 正解
    } else {
      animateAndSubmit("left", false); // 左 = 不正解
    }
  },
  { passive: true },
);

function animateAndSubmit(direction, isCorrect) {
  // CSSで定義したクラスを付与
  const swipeClass = direction === "right" ? "swipe-right" : "swipe-left";
  card.classList.add(swipeClass);

  // アニメーション完了(0.2s)後に次へ
  setTimeout(() => {
    card.classList.remove(swipeClass);
    submitAnswer(isCorrect);
  }, 200);
}

// --- 基本ロジック ---
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

function showWord() {
  isFlipped = false;
  wordDisplay.textContent = words[currentIndex].en;
  wordDisplay.style.color = "#333";
  document.getElementById("instruction").textContent = "タップして回答を表示";
  controls.classList.add("hidden");
  document.getElementById("current-idx").textContent = currentIndex + 1;

  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const s = stats[words[currentIndex].en];
  document.getElementById("history-info").textContent = s
    ? `通算: ○${s.correct} / ×${s.wrong}`
    : `(初登場)`;
}

card.onclick = () => {
  if (isFlipped) return;
  isFlipped = true;
  wordDisplay.textContent = words[currentIndex].ja;
  wordDisplay.style.color = "#007bff";
  document.getElementById("instruction").textContent =
    "スワイプで判定 (右:○ / 左:×)";
  controls.classList.remove("hidden");
};

function submitAnswer(isCorrect) {
  let stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const word = words[currentIndex].en;
  if (!stats[word]) stats[word] = { correct: 0, wrong: 0 };
  isCorrect ? stats[word].correct++ : stats[word].wrong++;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));

  if (isCorrect) sessionScore++;
  document.getElementById("live-score").textContent = sessionScore;

  currentIndex++;
  if (currentIndex < words.length) showWord();
  else showResults();
}

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
  if (confirm("記録をすべて削除しますか？"))
    localStorage.removeItem(STORAGE_KEY);
}
