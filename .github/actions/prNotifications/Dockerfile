FROM node:current-alpine

RUN npm install node-fetch@^3 --production
ADD notification.js /
RUN chmod +x /notification.js

ENTRYPOINT ["node", "/notification.js"]
