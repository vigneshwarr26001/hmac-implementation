FROM node:22-alpine AS build
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "tsconfig.json", "./"]
RUN npm ci --silent
COPY src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci --omit=dev --silent
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
RUN chown -R node /usr/src/app
USER node
CMD ["node", "dist/server.js"]
