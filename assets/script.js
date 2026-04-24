let words = [];
let currentIndex = 0;
let score = 0;
let isFlipped = false;

// DOM要素の取得
const fileInput = document.getElementById("file-input");
const wordDisplay = document.getElementById("word-display");
const controls = document.getElementById("controls");
const setupView = document.getElementById("setup-view");
const studyView = document.getElementById("study-view");
const resultView = document.getElementById("result-view");

// ファイル選択時のイベント
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    // 改行で分割し、カンマを含む行だけ抽出してオブジェクト化
    words = text
      .split(/\r?\n/)
      .filter((line) => line.includes(","))
      .map((line) => {
        const [en, ja] = line.split(",");
        return { en: en.trim(), ja: ja.trim() };
      })
      .sort(() => Math.random() - 0.5); // シャッフル

    if (words.length > 0) {
      startStudy();
    } else {
      alert("有効な単語が見つかりませんでした。形式を確認してください。");
    }
  };
  reader.readAsText(file);
});

function startStudy() {
  setupView.classList.add("hidden");
  studyView.classList.remove("hidden");
  document.getElementById("total-count").textContent = words.length;
  showWord();
}

function showWord() {
  isFlipped = false;
  wordDisplay.textContent = words[currentIndex].en;
  controls.classList.add("hidden");
  document.getElementById("current-idx").textContent = currentIndex + 1;
}

function flipCard() {
  if (isFlipped) return;
  isFlipped = true;
  wordDisplay.textContent = words[currentIndex].ja;
  controls.classList.remove("hidden");
}

function submitAnswer(isCorrect) {
  if (isCorrect) {
    score++;
    document.getElementById("live-score").textContent = score;
  }

  currentIndex++;
  if (currentIndex < words.length) {
    showWord();
  } else {
    showResults();
  }
}

function showResults() {
  studyView.classList.add("hidden");
  resultView.classList.remove("hidden");
  const percent = Math.round((score / words.length) * 100);
  document.getElementById("final-score").textContent = percent;
  document.getElementById("final-stats").textContent =
    `${words.length}問中 ${score}問正解でした！`;
}
