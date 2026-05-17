$ServerAlias = "fenge-server"
$RemotePath = "/root/fenge_upload_service"

Write-Host "Checking SSH connection..."
ssh -q $ServerAlias exit
if (!$?) {
    Write-Host "SSH connection failed."
    exit 1
}

Write-Host "Zipping..."
if (Test-Path deploy.zip) { Remove-Item deploy.zip }
Compress-Archive -Path ./* -DestinationPath deploy.zip -Update

Write-Host "Creating remote dir..."
ssh $ServerAlias "mkdir -p $RemotePath"

Write-Host "Uploading..."
scp deploy.zip "$($ServerAlias):$RemotePath/"

Write-Host "Deploying..."
$Cmd = "cd $RemotePath; unzip -o deploy.zip; docker rm -f fenge_uploader fenge_nginx || true; docker-compose down; docker-compose up -d --build"
ssh $ServerAlias $Cmd

Remove-Item deploy.zip
Write-Host "Done! Visit http://47.121.114.176:3000/upload" -ForegroundColor Green
