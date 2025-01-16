FROM node:alpine AS build
WORKDIR /app
COPY ./package.json /app/package.json
RUN yarn
COPY . /app
RUN sed -i 's/http:\/\/localhost:8000//g' /app/src/stores/AppStaticOptions.js
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/conf.d
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]