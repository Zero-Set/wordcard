let words = [],
  currentIndex = 0,
  sessionScore = 0,
  mistakenWords = [];
let isFlipped = false,
  touchStartX = 0,
  currentX = 0,
  isProcessing = false;

const STORAGE_KEY = "tango_master_stats";
const card = document.getElementById("card");
const wordDisplay = document.getElementById("word-display");

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
    card.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
    card.style.borderColor = "#3b82f6";
  }
  currentX = 0;
});

async function handleSwipe(isCorrect) {
  isProcessing = true;
  card.style.transition = "transform 0.3s ease-in, opacity 0.3s";
  const finalRotate = isCorrect ? 20 : -20;
  card.style.transform = `translate3d(${isCorrect ? 600 : -600}px, 0, 0) rotate(${finalRotate}deg)`;
  card.style.opacity = "0";

  let stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const wordEn = words[currentIndex].en;
  if (!stats[wordEn]) stats[wordEn] = { correct: 0, wrong: 0 };

  if (isCorrect) {
    sessionScore++;
    stats[wordEn].correct++;
  } else {
    mistakenWords.push(words[currentIndex]);
    stats[wordEn].wrong++;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));

  await new Promise((r) => setTimeout(r, 300));

  currentIndex++;
  if (currentIndex < words.length) showWord();
  else showResult();
}

function showWord() {
  isFlipped = false;
  isProcessing = false;
  card.style.transition = "none";
  card.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
  card.style.opacity = "1";
  card.style.borderColor = "#3b82f6";

  const currentWord = words[currentIndex];
  wordDisplay.textContent = currentWord.en;

  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const s = stats[currentWord.en];
  document.getElementById("history-info").textContent = s
    ? `通算: ○${s.correct} / ×${s.wrong}`
    : `(初登場)`;

  document.getElementById("instruction").textContent = "タップで回答を表示";
  document.getElementById("current-idx").textContent = currentIndex + 1;
  document.getElementById("live-score").textContent = sessionScore;
}

card.onclick = () => {
  if (isFlipped || isProcessing || Math.abs(currentX) > 5) return;
  isFlipped = true;
  wordDisplay.textContent = words[currentIndex].ja;
  document.getElementById("instruction").textContent =
    "← 不正解だった / 正解だった →";
};

document.getElementById("file-input").onchange = (e) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const rawWords = event.target.result
      .split(/\r?\n/)
      .filter((l) => l.includes(","))
      .map((l) => {
        const p = l.split(",");
        return { en: p[0].trim(), ja: p[1].trim() };
      });

    const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const hasHistory = rawWords.some(
      (w) => stats[w.en] && stats[w.en].wrong > 0,
    );
    const onlyMistakes =
      hasHistory && confirm("過去のミスのみ抽出しますか？") ? true : false;

    const targetWords = onlyMistakes
      ? rawWords.filter((w) => stats[w.en] && stats[w.en].wrong > 0)
      : rawWords;

    startSession(targetWords);
  };
  reader.readAsText(e.target.files[0], "UTF-8");
};

function startSession(targetWords) {
  words = [...targetWords].sort(() => Math.random() - 0.5);
  currentIndex = 0;
  sessionScore = 0;
  mistakenWords = [];
  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("result-view").classList.add("hidden");
  document.getElementById("study-view").classList.remove("hidden");
  document.getElementById("total-count").textContent = words.length;
  showWord();
}

function showResult() {
  document.getElementById("study-view").classList.add("hidden");
  document.getElementById("result-view").classList.remove("hidden");
  document.getElementById("final-score").textContent = Math.round(
    (sessionScore / words.length) * 100,
  );

  // ミスした単語の解き直しボタンを有効化
  const retryBtn = document.getElementById("retry-mistakes-btn");
  if (mistakenWords.length > 0) {
    retryBtn.classList.remove("hidden");
    retryBtn.onclick = () => startSession(mistakenWords);
  } else {
    retryBtn.classList.add("hidden");
  }
}
