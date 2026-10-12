FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["npm", "start"]
