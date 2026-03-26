#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
npm run build
go build -o bloomberg-terminal .
exec ./bloomberg-terminal
