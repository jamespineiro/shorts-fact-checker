#!/bin/sh
# Builds dist/shorts-fact-checker.zip: the extension folder including your
# Gemini key, ready to send to someone (professor, classmates) by email or Drive.
# The ZIP contains the key, so never commit it or upload it to GitHub.
set -e
cd "$(dirname "$0")"

if ! grep -q '"geminiApiKey"' extension/config.json 2>/dev/null || grep -q 'PASTE_' extension/config.json; then
  echo "Put your Gemini key in extension/config.json first (copy config.example.json)." >&2
  exit 1
fi

mkdir -p dist
rm -f dist/shorts-fact-checker.zip
rm -rf dist/shorts-fact-checker
cp -R extension dist/shorts-fact-checker
rm -f dist/shorts-fact-checker/config.example.json
(cd dist && zip -qr shorts-fact-checker.zip shorts-fact-checker -x '*.DS_Store')
rm -rf dist/shorts-fact-checker
echo "Built dist/shorts-fact-checker.zip. Upload it to Google Drive (Anyone with the link) and share that link. Never put it on GitHub."
