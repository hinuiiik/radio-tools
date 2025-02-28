# Use an official Node.js runtime as a parent image
FROM node:latest

# Install dependencies
RUN apt-get update && apt-get install -y \
    trustedqsl \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy tqsl folder from local machine to ~/.tqsl inside the container
RUN mkdir -p /root/.tqsl
COPY tqsl /root/.tqsl

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory in the container
WORKDIR /usr/src/app

# Install app dependencies using pnpm
COPY package*.json ./
RUN pnpm install

# Copy source files
COPY . .

# Build your Next.js app for production using pnpm
RUN pnpm build

# Set up Xvfb and start the application
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & DISPLAY=:99 pnpm start"]

