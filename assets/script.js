// --- 音声認識の初期化と制御 ---
let recognition = null;
let isRecognitionManualStop = false;

function ensureSpeechInitialized() {
  if (recognition) return recognition;

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("SpeechRecognition is NOT available in this browser.");
    alert(
      "音声認識がサポートされていません。Safari（iOS）等を使用してください。",
    );
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    if (state.isFlipped) return; // 回答済みの場合は無視

    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript = event.results[i][0].transcript;
      }
    }
    if (transcript) {
      state.lastTranscript = transcript;
      handleFlip(); // 判定ロジックへ
    }
  };

  recognition.onstart = () => {
    const statusEl = document.getElementById("mic-status");
    const reconnectBtn = document.getElementById("mic-reconnect");
    if (statusEl) {
      statusEl.textContent = "🎙️ Listening...";
      statusEl.classList.add("active");
      statusEl.style.color = "#2ecc71"; // 稼働中は緑色
    }
    if (reconnectBtn) reconnectBtn.style.display = "none"; // ボタンを隠す
  };

  recognition.onend = () => {
    const statusEl = document.getElementById("mic-status");
    const reconnectBtn = document.getElementById("mic-reconnect");

    if (statusEl) {
      statusEl.textContent = "❌ 停止中";
      statusEl.className = "error";
      if (reconnectBtn) reconnectBtn.style.display = "inline-block";
    }
  };

  return recognition;
}

// ボタンから呼ばれる手動復旧関数
function handleMicReconnect() {
  isRecognitionManualStop = false;
  safeStartRecognition();
}

function safeStartRecognition() {
  if (!recognition) return;
  try {
    recognition.start();
  } catch (e) {
    console.log("Recognition already started or failed:", e);
  }
}

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
    if (!stats[wordEn]) {
      stats[wordEn] = { correct: 0, wrong: 0, recentWrong: 0 };
    }

    if (isCorrect) {
      stats[wordEn].correct++;
      // 【ロジック変更】復習を確実にするため、ここでは recentWrong を 0 に固定せず、
      // ユーザーが「クリア」を選択するか、特定の条件を満たすまで保持する設計も検討。
      // 今回はシンプルに 0 に戻しますが、タイミングを startSession 直後に移すのが安全です。
      stats[wordEn].recentWrong = 0;
    } else {
      stats[wordEn].wrong++;
      stats[wordEn].recentWrong = 1;
    }
    Storage.saveStats(stats);
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
  elements.wordDisplay.textContent = currentWord.problem;
  elements.instruction.textContent = "タップで回答を表示";
  elements.currentIdx.textContent = state.currentIndex + 1;
  elements.liveScore.textContent = state.sessionScore;

  // 履歴表示
  const stats = Storage.getStats()[currentWord.id];
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
  Storage.updateWordStat(currentWord.id, isCorrect);
  if (isCorrect) {
    state.sessionScore++;
  } else {
    state.mistakenWords.push(currentWord);
  }

  await new Promise((r) => setTimeout(r, 300));

  state.currentIndex++;
  state.currentIndex < state.words.length ? showWord() : showResult();
}

/**
 * 表面を表示する時
 */
function showWord() {
  const current = state.words[state.currentIndex];
  state.isFlipped = false;
  state.isProcessing = false;
  state.lastTranscript = ""; // 音声バッファをクリア

  // --- スコア表示の同期 ---
  document.getElementById("live-score").textContent = state.sessionScore;
  document.getElementById("current-idx").textContent = state.currentIndex + 1;
  document.getElementById("total-count").textContent = state.words.length;

  const wd = document.getElementById("word-display");

  // 1. 裏面用のクラスとデータ属性を完全に掃除
  wd.classList.remove("is-flipped");
  delete wd.dataset.problem;
  delete wd.dataset.transcript;

  wd.textContent = current.problem; // まずは普通に問題を表示

  // 3. カードの座標と透明度を「瞬間的」に戻す（transition: none）
  updateCardStyle({
    x: 0,
    rotate: 0,
    opacity: 1,
    color: COLORS.default,
    transition: "none",
  });

  document.getElementById("instruction").textContent =
    "タップまたは発話で回答を表示";
  document.getElementById("current-idx").textContent = state.currentIndex + 1;

  // 履歴の更新
  const stats = Storage.getStats()[current.id];
  document.getElementById("history-info").textContent = stats
    ? `通算: ×${stats.wrong} / ○${stats.correct}${stats.recentWrong ? " [未正解]" : ""}`
    : "(初登場)";
}

/**
 * 裏返す時（handleFlip）
 */
function handleFlip() {
  const current = state.words[state.currentIndex];
  const wd = document.getElementById("word-display");
  const instruction = document.getElementById("instruction");

  if (state.isFlipped) return;
  state.isFlipped = true;

  // 表面の文字（current.problem）を属性に退避
  wd.dataset.problem = current.problem;

  // 音声テキストを属性に退避
  if (state.lastTranscript) {
    wd.dataset.transcript = state.lastTranscript;
  }

  // メイン表示を「回答」に切り替え
  wd.textContent = current.answer;
  wd.classList.add("is-flipped");

  if (instruction) {
    instruction.textContent = "← 不正解 (n) / 正解 (y) →";
  }
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
  elements.wordDisplay.textContent = state.words[state.currentIndex].answer;
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

  // --- 【修正】ここではまだ start() しない！初期化(ensure)だけに留める ---
  ensureSpeechInitialized();
  try {
    if (recognition) {
      recognition.start();
      console.log("マイク起動命令を送信しました");
    }
  } catch (err) {
    console.log("マイクはすでに動いているか、許可待ちです");
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      // 1. CSVパース
      const rawWords = event.target.result
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.split(",").length >= 3)
        .map((line) => {
          const parts = line.split(",");
          const id = parts[0].trim();
          const answer = parts[parts.length - 1].trim();
          const hasSupp = parts.length >= 4;
          const supplement = hasSupp ? parts[parts.length - 2].trim() : "";
          const problem = parts
            .slice(1, parts.length - (hasSupp ? 2 : 1))
            .join(",")
            .trim();
          return { id, problem, answer, supplement };
        });

      if (rawWords.length === 0) return;

      // 2. 未正解抽出
      const stats = Storage.getStats();
      const mistakeWords = rawWords.filter((w) => {
        // 統計データを参照する
        const s = stats[w.id];
        return s ? s.recentWrong > 0 : true;
      });

      let targetWords = rawWords;
      if (mistakeWords.length > 0 && mistakeWords.length !== rawWords.length) {
        // --- 【iPhone対策2】confirmがブロックされる可能性を考慮し、処理を止めない ---
        if (
          window.confirm(
            `未正解の単語が${mistakeWords.length}件あります。抽出しますか？`,
          )
        ) {
          targetWords = mistakeWords;
        }
      }

      // 3. セッション開始
      startSession(targetWords);
    } catch (error) {
      console.error("Parse Error:", error);
    }
  };

  reader.readAsText(file, "UTF-8");
};
