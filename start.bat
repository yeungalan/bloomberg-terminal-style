@echo off
cd /d "%~dp0"
call npm run build || exit /b 1
go build -o bloomberg-terminal.exe . || exit /b 1
bloomberg-terminal.exe
