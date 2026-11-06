# Liga o sistema ao banco do Supabase.
# Uso (no PowerShell, dentro da pasta do sistema):
#   powershell -ExecutionPolicy Bypass -File .\configurar-supabase.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== Configurar o banco no Supabase ===" -ForegroundColor Cyan
Write-Host "1. No supabase.com, abra o projeto e clique em 'Connect' (no topo)."
Write-Host "2. Em 'Connection String', escolha Method = 'Session pooler' e copie o texto (URI)."
Write-Host ""
$uri = (Read-Host "Cole aqui o texto copiado").Trim()
if ($uri -notmatch '^postgres(ql)?://') { Write-Host "Isso nao parece a connection string (deve comecar com postgresql://)." -ForegroundColor Red; exit 1 }
if ($uri -notmatch '\[YOUR-PASSWORD\]') { Write-Host "Nao achei [YOUR-PASSWORD] no texto. Copie de novo, sem trocar nada." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Agora a SENHA DO BANCO (a que voce definiu ao criar o projeto)."
Write-Host "Se nao lembrar: Project Settings > Database > Reset database password."
$sec = Read-Host "Senha do banco (nao aparece enquanto digita)" -AsSecureString
$senha = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
if (-not $senha) { Write-Host "Senha vazia." -ForegroundColor Red; exit 1 }
$url = $uri.Replace("[YOUR-PASSWORD]", [uri]::EscapeDataString($senha))

# guarda o .env atual e grava o novo
if (Test-Path .env) { Copy-Item .env ".env.backup-$(Get-Date -Format yyyyMMdd-HHmmss)" }
$linhas = @()
if (Test-Path .env) { $linhas = Get-Content .env | Where-Object { $_ -notmatch '^\s*DATABASE_URL=' } }
elseif (Test-Path .env.example) { $linhas = Get-Content .env.example | Where-Object { $_ -notmatch '^\s*DATABASE_URL=' } }
$linhas = @("DATABASE_URL=$url") + $linhas
[IO.File]::WriteAllLines((Join-Path $PSScriptRoot ".env"), $linhas)
Write-Host ".env atualizado (o anterior ficou salvo como .env.backup-...)." -ForegroundColor Green

Write-Host ""
Write-Host "Criando as tabelas e carregando os dados no Supabase..." -ForegroundColor Cyan
npm run setup
if ($LASTEXITCODE -ne 0) { Write-Host "O setup falhou. Leia a mensagem acima." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Agora o seu usuario de administrador." -ForegroundColor Cyan
$email = (Read-Host "Seu e-mail").Trim()
$nome = (Read-Host "Seu nome").Trim()
if ($email -and $nome) {
  node server/scripts/criar-usuario.js $email $nome admin
}

Write-Host ""
Write-Host "Pronto! Para usar: npm start  e abra http://localhost:3000" -ForegroundColor Green
