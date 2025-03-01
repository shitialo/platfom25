# Windows User Guide for Deployment

Since you're developing on Windows but deploying to an Ubuntu VPS, here are some additional instructions to help with the deployment process.

## Local Development

To run the application locally for development on Windows:

```powershell
docker-compose up
```

## Preparing for VPS Deployment

When you're ready to deploy to your Ubuntu VPS, follow these steps:

1. Make sure Git is configured to use LF line endings for the shell scripts:

```powershell
git config --global core.autocrlf input
```

2. If you've already cloned the repository, you may need to reset the line endings:

```powershell
git rm --cached -r .
git reset --hard
```

## Deploying to the VPS

1. Connect to your VPS using SSH:

```powershell
ssh user@209.38.149.106
```

2. Clone your repository on the VPS:

```bash
git clone <your-repository-url> ~/app
cd ~/app
```

3. Make the scripts executable on the VPS:

```bash
chmod +x setup_vps.sh deploy.sh
```

4. Run the setup script:

```bash
./setup_vps.sh
```

5. Run the deployment script:

```bash
./deploy.sh
```

## Troubleshooting Line Endings

If you encounter issues with script execution on the VPS due to Windows line endings (CRLF), you can fix them directly on the VPS:

```bash
sudo apt-get install -y dos2unix
dos2unix setup_vps.sh deploy.sh
chmod +x setup_vps.sh deploy.sh
```

## Remote Development with VS Code (Optional)

You can also use VS Code's Remote SSH extension to develop directly on the VPS:

1. Install the Remote SSH extension in VS Code
2. Connect to your VPS using the Remote SSH extension
3. Open the project folder on the VPS
4. Make changes and run commands directly on the VPS

This can be helpful for debugging deployment issues. 