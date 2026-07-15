import subprocess
import os

os.chdir(r'F:\luna_cosmeticos\trafego_luna_cosmeticos')

# Pegar o token do gh
result = subprocess.run(['gh', 'auth', 'token'], capture_output=True, text=True)
token = result.stdout.strip()

# Configurar o remote com o token
remote_url = f'https://{token}@github.com/PixelboxDesign/Gestao_de_trafego.git'
subprocess.run(['git', 'remote', 'set-url', 'origin', remote_url])

# Fazer o push
result = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)

print("\n✅ PUSH CONCLUÍDO!")
