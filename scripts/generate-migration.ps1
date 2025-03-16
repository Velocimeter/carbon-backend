# Ensure we're in the project root directory
$projectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $projectRoot

# Build the project first
Write-Host "Building project..."
npm run build

# Prompt for migration name
$migrationName = Read-Host -Prompt 'Enter migration name'

# Check if migration name is empty
if ([string]::IsNullOrWhiteSpace($migrationName)) {
    Write-Error 'Error: Migration name is required!'
    exit 1
}

# Generate the migration using ts-node
Write-Host "Generating migration..."
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate "./src/migrations/$migrationName" -d "./src/typeorm.config.ts" 