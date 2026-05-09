FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

COPY . .

EXPOSE 3000

CMD ["npm", "start"]