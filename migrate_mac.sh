#!/bin/bash

# ask the user for the project path
read -p "Enter the absolute path to your project: " projectPath
read -p "Enter the migration name: " migrationName

# set the PYTHONPATH environment variable for this command
export PYTHONPATH="$projectPath"

# run alembic revision
alembic revision --autogenerate -m "$migrationName"
