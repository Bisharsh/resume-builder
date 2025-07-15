# Use a base image that includes Node.js

FROM node:20-slim

# Install LaTeX (TeX Live in this case) and other necessary packages
# We're installing a slim version of TeX Live to keep the image size down.
# texlive-full is very large, so we're selecting common packages.
# You might need to add more packages here later if your LaTeX template requires them.
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-pictures \
    texlive-science \
    latexmk \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "server.js"]