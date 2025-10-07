# Dockerfile conforme aux exigences : Application Node.js + Nginx dans le même conteneur
FROM node:18-alpine

# Installer Nginx et les outils nécessaires
RUN apk add --no-cache nginx curl supervisor

# Créer les répertoires nécessaires
WORKDIR /usr/src/app

# Copier les fichiers package*.json
COPY package*.json ./

# Installer les dépendances Node.js
RUN npm install --production && npm cache clean --force

# Créer les répertoires de logs avec permissions appropriées
RUN mkdir -p /var/logs/crud /var/log/nginx /run/nginx && \
    chown -R node:node /var/logs/crud && \
    chown -R nginx:nginx /var/log/nginx /run/nginx

# Copier le code source de l'application
COPY --chown=node:node index.js ./

# Copier la configuration Nginx
COPY nginx/nginx-single-container.conf /etc/nginx/nginx.conf

# Créer le script de démarrage qui lance Node.js et Nginx
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Démarrage de l application Node.js..."' >> /start.sh && \
    echo 'node /usr/src/app/index.js &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo 'echo "Démarrage de Nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;" &' >> /start.sh && \
    echo 'NGINX_PID=$!' >> /start.sh && \
    echo 'echo "Services démarrés : Node.js (PID $NODE_PID) et Nginx (PID $NGINX_PID)"' >> /start.sh && \
    echo 'wait $NODE_PID $NGINX_PID' >> /start.sh && \
    chmod +x /start.sh

# Exposer les ports
EXPOSE 80 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Health check sur Nginx qui proxy vers Node.js
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Démarrer avec le script qui lance les deux services
CMD ["/start.sh"]
