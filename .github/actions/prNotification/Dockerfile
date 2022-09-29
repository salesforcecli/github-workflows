FROM node:current-alpine

WORKDIR /usr/app/
RUN npm install node-fetch@^3 --production
COPY notification.js ./
RUN chmod +x ./notification.js

ENTRYPOINT ["node", "./notification.js"]
