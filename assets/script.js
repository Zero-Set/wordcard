let allWords = []; // CSVから読み込んだ全データを保持
let words = []; // 今回のセッションで実際に解く単語リスト
let currentIndex = 0,
  sessionScore = 0,
  isFlipped = false;
((touchStartX = 0), (touchEndX = 0));

const STORAGE_KEY = "tango_master_stats";
const fileInput = document.getElementById("file-input");
const wordDisplay = document.getElementById("word-display");
const card = document.getElementById("card");
const controls = document.getElementById("controls");

// ファイル選択時の処理
fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    // ① まず全データをパースして allWords に格納
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

      // CSV内の単語のうち、一つでも過去に間違えた記録があるかチェック
      const hasHistory = allWords.some(
        (w) => stats[w.en] && stats[w.en].wrong > 0,
      );

      if (hasHistory) {
        // 過去のミス記録がある場合のみ、選択肢を出す
        const onlyMistakes = confirm(
          "過去に間違えた単語が残っています。間違いのみを抽出しますか？",
        );
        setupSession(onlyMistakes);
      } else {
        // 初回（またはミス記録なし）なら、確認なしで全件開始
        setupSession(false);
      }
    }
  };
  reader.readAsText(file, "UTF-8");
};

// セッション開始の共通処理
function setupSession(filterMistakes) {
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

  if (filterMistakes) {
    // 「過去に一度でも間違えたことがある（wrong > 0）」単語をフィルタリング
    words = allWords.filter((w) => stats[w.en] && stats[w.en].wrong > 0);

    if (words.length === 0) {
      alert("過去に間違えた単語データがありません。全件で開始します。");
      words = [...allWords];
    }
  } else {
    // 全件で開始
    words = [...allWords];
  }

  // シャッフルして開始
  words.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  sessionScore = 0;
  startStudy(); // 画面を切り替えて1問目を表示
}

function startStudy() {
  document.getElementById("setup-view").classList.add("hidden");
  document.getElementById("study-view").classList.remove("hidden");
  document.getElementById("total-count").textContent = words.length;
  showWord();
}

function showWord() {
  isFlipped = false;
  wordDisplay.textContent = words[currentIndex].en;
  wordDisplay.style.color = "#333";
  document.getElementById("instruction").classList.remove("hidden");
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
  document.getElementById("instruction").classList.add("hidden");
  controls.classList.remove("hidden");
};

document.getElementById("btn-correct").onclick = () => submitAnswer(true);
document.getElementById("btn-wrong").onclick = () => submitAnswer(false);

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

  const percent = Math.round((sessionScore / words.length) * 100);
  document.getElementById("final-score").textContent = percent;
  document.getElementById("final-stats").textContent =
    `全${words.length}問中、正解は${sessionScore}問でした。`;

  // ★追加：ボタンの挙動をセット
  const retryBtn = document.getElementById("retry-mistakes-btn");

  // もし全問正解なら、間違い直しボタンを隠す
  if (sessionScore === words.length) {
    retryBtn.classList.add("hidden");
  } else {
    retryBtn.classList.remove("hidden");
    retryBtn.onclick = () => {
      setupSession(true); // 間違いフィルタをONにして再開
    };
  }
}

function resetAllHistory() {
  if (confirm("記録をすべて削除しますか？"))
    localStorage.removeItem(STORAGE_KEY);
}

// カードにタッチイベントを登録
card.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
  },
  false,
);

card.addEventListener(
  "touchend",
  (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  },
  false,
);

function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  const threshold = 100; // 100px以上の移動で判定

  // 答えを表示している（isFlipped）時だけスワイプ判定を有効にする
  if (!isFlipped) return;

  if (swipeDistance > threshold) {
    // 右スワイプ = 正解
    card.classList.add("swipe-right");
    setTimeout(() => {
      card.classList.remove("swipe-right");
      submitAnswer(true);
    }, 300);
  } else if (swipeDistance < -threshold) {
    // 左スワイプ = 不正解
    card.classList.add("swipe-left");
    setTimeout(() => {
      card.classList.remove("swipe-left");
      submitAnswer(false);
    }, 300);
  }
}
