let words = [],
  currentIndex = 0,
  sessionScore = 0,
  isFlipped = false;
const STORAGE_KEY = "tango_master_stats";
const fileInput = document.getElementById("file-input");
const wordDisplay = document.getElementById("word-display");
const card = document.getElementById("card");
const controls = document.getElementById("controls");

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    words = event.target.result
      .split(/\r?\n/)
      .filter((line) => {
        const p = line.split(/[;,]/);
        return p.length >= 2 && p[0].trim() !== "" && p[1].trim() !== "";
      })
      .map((line) => {
        const p = line.split(/[;,]/);
        return { en: p[0].trim(), ja: p[1].trim() };
      })
      .sort(() => Math.random() - 0.5);
    if (words.length > 0) startStudy();
  };
  reader.readAsText(file, "UTF-8");
};

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
  document.getElementById("final-score").textContent = Math.round(
    (sessionScore / words.length) * 100,
  );
  document.getElementById("final-stats").textContent =
    `全${words.length}問中、正解は${sessionScore}問でした。`;
}

function resetAllHistory() {
  if (confirm("記録をすべて削除しますか？"))
    localStorage.removeItem(STORAGE_KEY);
}
