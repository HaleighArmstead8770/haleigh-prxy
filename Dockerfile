# Используем легкий официальный образ Node.js
FROM node:18-alpine

# Рабочая директория
WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости (их нет, но команда нужна)
RUN npm install --omit=dev

# Копируем исходники
COPY . .

# Railway использует переменную PORT
ENV PORT=3000

# Открываем порт
EXPOSE 3000

# Запуск приложения
CMD ["npm", "start"]
