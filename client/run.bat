@echo off
echo Starting INTERVEXA...

wt -w 0 ^
  new-tab --title "OmniRoute" cmd /k "cd /d C:\Users\heman\mockAi && omniRoute" ^
  ; new-tab --title "Backend" cmd /k "cd /d C:\Users\heman\mockAi\server && node index.js" ^
  ; new-tab --title "Frontend" cmd /k "cd /d C:\Users\heman\mockAi\client && npm run dev"

timeout /t 7 /nobreak > nul

start "" "http://localhost:5173"