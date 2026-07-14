#!/bin/sh

# Iniciar Tailscale em segundo plano
tailscaled --tun=userspace-networking --socks5-server=localhost:1055 &

# Aguardar Tailscale iniciar
sleep 2

# Conectar ao Tailscale usando authkey
tailscale up --authkey=${TAILSCALE_AUTHKEY} --hostname=render-backend

# Aguardar conexão
sleep 3

# Configurar proxy SOCKS5 para todas conexões
export ALL_PROXY=socks5://localhost:1055/

# Iniciar aplicação Node.js
node backend/server.js
