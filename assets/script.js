// --- 定数 ---
const STORAGE_KEY = "tango_master_stats";
const SWIPE_THRESHOLD = 100;
const ROTATE_LIMIT = 15;
const COLORS = {
  default: "#3b82f6",
  correct: "#10b981",
  wrong: "#ef4444",
};

// --- ストレージ管理 ---
const Storage = {
  getStats: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
  saveStats: (stats) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)),

  updateWordStat: (wordEn, isCorrect) => {
    const stats = Storage.getStats();
    // 構造に recentWrong を追加
    if (!stats[wordEn])
      stats[wordEn] = { correct: 0, wrong: 0, recentWrong: 0 };

    if (isCorrect) {
      stats[wordEn].correct++;
      stats[wordEn].recentWrong = 0; // 正解したら直近の未正解リストから除外
    } else {
      stats[wordEn].wrong++;
      stats[wordEn].recentWrong = 1; // 間違えたら直近フラグを立てる
    }
    Storage.saveStats(stats);
  },

  // 直近の苦手フラグだけ全クリア（通算成績は残す）
  clearRecentFlags: () => {
    const stats = Storage.getStats();
    Object.keys(stats).forEach((word) => {
      stats[word].recentWrong = 0;
    });
    Storage.saveStats(stats);
    alert("直近の未正解データをリセットしました（通算成績は維持されます）");
  },

  // データを完全に物理削除
  factoryReset: () => {
    if (confirm("すべての通算成績と設定を完全に消去しますか？")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload(); // アプリをリセット
    }
  },
};

// --- アプリケーションの状態 ---
let state = {
  words: [],
  currentIndex: 0,
  sessionScore: 0,
  mistakenWords: [],
  isFlipped: false,
  isProcessing: false,
  touch: { startX: 0, currentX: 0 },
};

// --- DOM要素 ---
const elements = {
  card: document.getElementById("card"),
  wordDisplay: document.getElementById("word-display"),
  instruction: document.getElementById("instruction"),
  currentIdx: document.getElementById("current-idx"),
  totalCount: document.getElementById("total-count"),
  liveScore: document.getElementById("live-score"),
  historyInfo: document.getElementById("history-info"),
  setupView: document.getElementById("setup-view"),
  studyView: document.getElementById("study-view"),
  resultView: document.getElementById("result-view"),
  finalScore: document.getElementById("final-score"),
  retryBtn: document.getElementById("retry-mistakes-btn"),
};

// --- メインロジック ---

/** セッション開始 */
function startSession(targetWords) {
  state = {
    ...state,
    words: [...targetWords].sort(() => Math.random() - 0.5),
    currentIndex: 0,
    sessionScore: 0,
    mistakenWords: [],
    isFlipped: false,
    isProcessing: false,
  };

  elements.setupView.classList.add("hidden");
  elements.resultView.classList.add("hidden");
  elements.studyView.classList.remove("hidden");
  elements.totalCount.textContent = state.words.length;
  showWord();
}

/** 単語の表示 */
function showWord() {
  const currentWord = state.words[state.currentIndex];
  state.isFlipped = false;
  state.isProcessing = false;

  // カードのリセット
  updateCardStyle({
    x: 0,
    rotate: 0,
    opacity: 1,
    color: COLORS.default,
    transition: "none",
  });

  // テキスト更新
  elements.wordDisplay.textContent = currentWord.en;
  elements.instruction.textContent = "タップで回答を表示";
  elements.currentIdx.textContent = state.currentIndex + 1;
  elements.liveScore.textContent = state.sessionScore;

  // 履歴表示
  const stats = Storage.getStats()[currentWord.en];
  // 表示例: 通算: ×5 / ○12 (直近: 未正解)
  let historyText = "(初登場)";
  if (stats) {
    const recentStatus = stats.recentWrong > 0 ? " [未正解]" : "";
    historyText = `通算: ×${stats.wrong} / ○${stats.correct}${recentStatus}`;
  }
  elements.historyInfo.textContent = historyText;
}

/** スワイプ処理 */
async function handleSwipe(isCorrect) {
  state.isProcessing = true;
  const currentWord = state.words[state.currentIndex];

  // アニメーション
  updateCardStyle({
    x: isCorrect ? 600 : -600,
    rotate: isCorrect ? 20 : -20,
    opacity: 0,
    transition: "transform 0.3s ease-in, opacity 0.3s",
  });

  // データ更新
  Storage.updateWordStat(currentWord.en, isCorrect);
  if (isCorrect) {
    state.sessionScore++;
  } else {
    state.mistakenWords.push(currentWord);
  }

  await new Promise((r) => setTimeout(r, 300));

  state.currentIndex++;
  state.currentIndex < state.words.length ? showWord() : showResult();
}

/** 結果表示 */
function showResult() {
  elements.studyView.classList.add("hidden");
  elements.resultView.classList.remove("hidden");
  elements.finalScore.textContent = Math.round(
    (state.sessionScore / state.words.length) * 100,
  );

  const hasMistakes = state.mistakenWords.length > 0;
  elements.retryBtn.classList.toggle("hidden", !hasMistakes);
  if (hasMistakes) {
    elements.retryBtn.onclick = () => startSession(state.mistakenWords);
  }
}

/** カードのスタイル一括更新用ヘルパー */
function updateCardStyle({ x, rotate, opacity, color, transition }) {
  if (transition !== undefined) elements.card.style.transition = transition;
  if (x !== undefined || rotate !== undefined) {
    elements.card.style.transform = `translate3d(${x || 0}px, 0, 0) rotate(${rotate || 0}deg)`;
  }
  if (opacity !== undefined) elements.card.style.opacity = opacity;
  if (color !== undefined) elements.card.style.borderColor = color;
}

// --- イベントリスナー ---

// カードクリック（裏返し）
elements.card.onclick = () => {
  if (
    state.isFlipped ||
    state.isProcessing ||
    Math.abs(state.touch.currentX) > 5
  )
    return;
  state.isFlipped = true;
  elements.wordDisplay.textContent = state.words[state.currentIndex].ja;
  elements.instruction.textContent = "← 不正解だった / 正解だった →";
};

// タッチイベント
elements.card.addEventListener(
  "touchstart",
  (e) => {
    if (!state.isFlipped || state.isProcessing) return;
    state.touch.startX = e.touches[0].pageX;
    updateCardStyle({ transition: "none" });
  },
  { passive: true },
);

elements.card.addEventListener(
  "touchmove",
  (e) => {
    if (!state.isFlipped || state.isProcessing) return;
    const diff = e.touches[0].pageX - state.touch.startX;
    state.touch.currentX = diff;

    const rotate = Math.min(Math.max(diff / 10, -ROTATE_LIMIT), ROTATE_LIMIT);
    let color = COLORS.default;
    if (diff > 80) color = COLORS.correct;
    else if (diff < -80) color = COLORS.wrong;

    updateCardStyle({ x: diff, rotate, color });
  },
  { passive: true },
);

elements.card.addEventListener("touchend", () => {
  if (!state.isFlipped || state.isProcessing) return;

  if (Math.abs(state.touch.currentX) > SWIPE_THRESHOLD) {
    handleSwipe(state.touch.currentX > 0);
  } else {
    updateCardStyle({
      x: 0,
      rotate: 0,
      color: COLORS.default,
      transition: "transform 0.2s ease-out, border-color 0.2s",
    });
  }
  state.touch.currentX = 0;
});

document.getElementById("file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const rawWords = event.target.result
      .split(/\r?\n/)
      .filter((l) => l.includes(","))
      .map((l) => {
        const [en, ja] = l.split(",");
        return { en: en.trim(), ja: ja.trim() };
      });

    if (rawWords.length === 0) return;

    const stats = Storage.getStats();

    // 仕様変更：直近で間違えた(recentWrong > 0) or 初出(statsなし) を抽出
    const mistakeWords = rawWords.filter((w) => {
      const s = stats[w.en];
      return s ? s.recentWrong > 0 : true;
    });

    const mistakeCount = mistakeWords.length;
    let targetWords = rawWords;

    // 「全件が未正解」の時はメッセージを出さない
    if (mistakeCount > 0 && mistakeCount !== rawWords.length) {
      if (confirm(`未正解の単語が${mistakeCount}件あります。抽出しますか？`)) {
        targetWords = mistakeWords;
      }
    }

    startSession(targetWords);
  };
  reader.readAsText(file, "UTF-8");
};
