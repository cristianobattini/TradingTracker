# ask the user for the project path
$projectPath = Read-Host "Enter the absolute path to your project"
$migrationName = Read-Host "Enter the migration name"

# set the PYTHONPATH environment variable for this session
$env:PYTHONPATH = $projectPath

# run alembic revision
alembic revision --autogenerate -m $migrationName
