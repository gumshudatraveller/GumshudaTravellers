FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY shared ./shared
RUN mkdir -p /app/storage/data /app/storage/uploads && chown -R node:node /app/storage
ENV NODE_ENV=production PORT=3001 DATA_DIR=/app/storage/data UPLOAD_DIR=/app/storage/uploads
USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
