FROM apify/actor-node:24

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
 && npm install --only=prod --no-optional

COPY --chown=myuser:myuser . ./

RUN npm run build  # This creates the .next directory

CMD npm start
