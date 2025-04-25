# Clear specific environment variables that might be set elsewhere
Remove-Item -Path "Env:REDIS_URL" -ErrorAction SilentlyContinue

# Display current environment for verification
Write-Host "Environment after clearing (should be empty):"
if (Test-Path Env:REDIS_URL) {
    Write-Host "REDIS_URL: $env:REDIS_URL"
} else {
    Write-Host "REDIS_URL: Not set"
}

# Run the application with only .env values
Write-Host "Starting application with .env values only..."
npm run start:env-only 