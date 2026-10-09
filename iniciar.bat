@echo off
rem Inicia el clon de Netflix en un servidor local (YouTube no reproduce videos desde file://)
cd /d "%~dp0"
start "" http://localhost:8080
python -m http.server 8080
