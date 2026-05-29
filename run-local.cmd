@echo off
cd /d "%~dp0"
set NEXT_DIST_DIR=.next-local
node node_modules\next\dist\bin\next dev -p 3000
