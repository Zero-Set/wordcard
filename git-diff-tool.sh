#!/bin/zsh

# --- 設定 ---
BASE_BRANCH="develop"
OUTPUT_FILE="diff.txt"

usage() {
    echo "Usage: $(basename "$0") [options] [branch-name]"
    echo ""
    echo "Description:"
    echo "  ${BASE_BRANCH} との差分を ${OUTPUT_FILE} に書き出します。"
    echo "  実行のたびにファイルは上書きされます。"
    exit 1
}

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

# 引数がオプション（-で始まる）でない場合はベースブランチとして扱う
if [[ -n "$1" && "$1" != -* ]]; then
    BASE_BRANCH=$1
    shift
fi

# 実行
echo "Comparing: ${BASE_BRANCH}..HEAD -> ${OUTPUT_FILE}"

# > で上書き出力。標準エラーも拾う場合は 2>&1 を足してください。
git diff "${BASE_BRANCH}..HEAD" "$@" > "$OUTPUT_FILE"

echo "Done. 差分を ${OUTPUT_FILE} に保存しました。"