@echo off
title PACE - Comprobador Supabase
color 0A

echo ======================================
echo        PACE PROJECT CHECK
echo ======================================
echo.

if not exist package.json (
    echo ERROR: No se encuentra package.json
    echo Ejecuta este archivo dentro del proyecto.
    pause
    exit
)

echo OK: Proyecto encontrado
echo.


echo Comprobando Supabase SDK...

findstr /C:"@supabase/supabase-js" package.json >nul

if %errorlevel%==0 (
    echo OK: Supabase instalado
) else (
    echo FALTA: Instalando Supabase...
    npm install @supabase/supabase-js
)

echo.


echo Comprobando cliente Supabase...

if exist src\lib\supabase.ts (
    echo OK: src/lib/supabase.ts existe
) else (

    echo CREANDO src/lib/supabase.ts

    if not exist src\lib mkdir src\lib

    (
    echo import { createClient } from "@supabase/supabase-js";
    echo.
    echo export const supabase = createClient(
    echo   import.meta.env.VITE_SUPABASE_URL,
    echo   import.meta.env.VITE_SUPABASE_ANON_KEY
    echo );
    ) > src\lib\supabase.ts
)


echo.


echo Comprobando datos demo...

if exist src\lib\pace-data.ts (
    echo OK: pace-data.ts existe
) else (
    echo AVISO: No existe pace-data.ts
    echo Crea un fallback para evitar pantallas vacias.
)


echo.


echo Comprobando variables Supabase...


if exist .env (
    findstr /C:"VITE_SUPABASE_URL" .env >nul

    if %errorlevel%==0 (
        echo OK: URL Supabase encontrada
    ) else (
        echo FALTA VITE_SUPABASE_URL
    )

    findstr /C:"VITE_SUPABASE_ANON_KEY" .env >nul

    if %errorlevel%==0 (
        echo OK: ANON KEY encontrada
    ) else (
        echo FALTA VITE_SUPABASE_ANON_KEY
    )

) else (
    echo FALTA archivo .env
)


echo.
echo ======================================
echo CHECK TERMINADO
echo ======================================

pause