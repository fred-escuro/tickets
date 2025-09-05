@echo off
setlocal

:: Set PostgreSQL connection details
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=ticketing_db
set PGUSER=fredmann
set PGPASSWORD=fredmann

:: Set output file name with timestamp
set "BACKUP_FILE=ticketing_db_backup_%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%.sql"
:: Replace spaces in time with zeros if needed
set "BACKUP_FILE=%BACKUP_FILE: =0%"

:: Set path to pg_dump (modify this if PostgreSQL bin folder is not in PATH)
:: Example: set "PGDUMP=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
set PGDUMP=pg_dump.exe

:: Check if pg_dump exists
where %PGDUMP% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: pg_dump not found. Please ensure PostgreSQL is installed and pg_dump is in your PATH.
    pause
    exit /b 1
)

:: Set PGPASSWORD as environment variable for pg_dump
set "PGPASSWORD=%PGPASSWORD%"

:: Perform the database backup with --inserts option
echo Backing up database %PGDATABASE% to %BACKUP_FILE%...
%PGDUMP% -h %PGHOST% -p %PGPORT% -U %PGUSER% --inserts -F p -f %BACKUP_FILE% %PGDATABASE%

:: Check if backup was successful
if %ERRORLEVEL% equ 0 (
    echo Backup completed successfully: %BACKUP_FILE%
) else (
    echo Error: Backup failed.
)

:: pause
endlocal