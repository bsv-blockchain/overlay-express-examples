# Use an official Node.js runtime as the base image
FROM node:22-alpine

# Set working directory inside the container
WORKDIR /app

# Copy overlay-express (pre-built with dist/) and pack it as a tarball
COPY overlay-express /tmp/overlay-express
RUN cd /tmp/overlay-express && npm pack --ignore-scripts --pack-destination /tmp

# Copy package.json and package-lock.json
COPY overlay-express-examples/package*.json ./

# Install the packed overlay-express tarball (overrides file: ref),
# then install remaining dependencies
RUN npm install --ignore-scripts /tmp/bsv-overlay-express-2.1.0.tgz && \
    npm install && \
    rm -rf /tmp/overlay-express /tmp/*.tgz

# Copy the entire application code into the container
COPY overlay-express-examples/ .

# Expose the application port
EXPOSE 8080

RUN npm run build

# Start the application
CMD ["npm", "start"]
