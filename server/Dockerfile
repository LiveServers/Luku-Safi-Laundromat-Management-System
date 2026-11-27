FROM node:24-alpine
WORKDIR /workspace/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY shared/schemas/staff-account-schema.js /workspace/shared/schemas/staff-account-schema.js
EXPOSE 5000
CMD ["npm", "start"]
