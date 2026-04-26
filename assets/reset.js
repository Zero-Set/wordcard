function resetAllHistory() {
  if (confirm("記録をすべて削除しますか？")) {
    localStorage.removeItem(STORAGE_KEY);
    alert("記録を削除しました。");
    location.reload();
  }
}
