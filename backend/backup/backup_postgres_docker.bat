@echo off
setlocal

:: Set PostgreSQL connection details
set CONTAINER_NAME=db-postgres-1
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=ticketing_db
set PGUSER=fredmann
set PGPASSWORD=fredmann

:: Set output file name with timestamp
set "BACKUP_FILE=ticketing_db_backup_%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%.sql"
:: Replace spaces in time with zeros if needed
set "BACKUP_FILE=%BACKUP_FILE: =0%"

:: Check if Docker is installed and running
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: Docker not found. Please ensure Docker is installed and in your PATH.
    pause
    exit /b 1
)

:: Check if the container is running
docker ps -q -f name=%CONTAINER_NAME% >nul
if %ERRORLEVEL% neq 0 (
    echo Error: Container %CONTAINER_NAME% is not running.
    pause
    exit /b 1
)

:: Set PGPASSWORD as environment variable for pg_dump
set "PGPASSWORD=%PGPASSWORD%"

:: Perform the database backup using docker exec with --inserts option
echo Backing up database %PGDATABASE% from container %CONTAINER_NAME% to %BACKUP_FILE%...
docker exec %CONTAINER_NAME% pg_dump -h %PGHOST% -p %PGPORT% -U %PGUSER% --inserts -F p %PGDATABASE% > %BACKUP_FILE%

:: Check if backup was successful
if %ERRORLEVEL% equ 0 (
    echo Backup completed successfully: %BACKUP_FILE%
) else (
    echo Error: Backup failed.
)

:: pause
endlocal