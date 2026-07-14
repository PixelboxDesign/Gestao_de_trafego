# Dockerfile com Tailscale para conectar ao VPS
FROM node:18-alpine

# Instalar Tailscale
RUN apk add --no-cache ca-certificates iptables ip6tables && \
    wget https://pkgs.tailscale.com/stable/tailscale_1.56.1_amd64.tgz && \
    tar xzf tailscale_1.56.1_amd64.tgz --strip-components=1 -C /usr/local/bin

# Criar diretório do app
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código do backend
COPY backend ./backend

# Expor porta
EXPOSE 10000

# Script de inicialização
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
