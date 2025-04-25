# Server Configuration

To configure the server IP address for the frontend, you have several options:

## Option 1: Using Environment Variables

When starting the application, you can set the `SERVER_IP` and `INTERNAL_SERVER_IP` environment variables:

```bash
SERVER_IP=your.server.ip.address INTERNAL_SERVER_IP=your.internal.ip npm run dev
```

Or:

```bash
export SERVER_IP=your.server.ip.address
export INTERNAL_SERVER_IP=your.internal.ip.address
npm run dev
```

## Option 2: Using .env File

Create a file named `.env.local` in the frontend directory with the following content:

```
NEXT_PUBLIC_SERVER_IP=your.server.ip.address
NEXT_PUBLIC_INTERNAL_SERVER_IP=your.internal.ip.address
SERVER_PORT=8888
```

## Option 3: Using start.sh

The included `start.sh` script will automatically use provided arguments:

```bash
chmod +x start.sh  # Make sure the script is executable
./start.sh external_ip internal_ip
```

For example:
```bash
./start.sh 50.19.10.82 172.31.28.157
```

## Environment Configuration File

A centralized environment configuration is available in the codebase at `app/config/env.ts`. This file:

1. Manages all environment variables in one place
2. Provides default values when environment variables are not set
3. Offers helper functions to get API URLs and image URLs

To use this configuration in your components:

```typescript
import { ENV, getApiUrl, getImageUrl } from '../config/env';

// Get the server IP
console.log(ENV.SERVER_IP);

// Get a full API endpoint URL
const apiEndpoint = getApiUrl('/projects');

// Get an image URL
const imageUrl = getImageUrl('/images/project-image-1');
```

## Default Configuration

If no configuration is provided, the application will default to using:

```
SERVER_IP=50.19.10.82
INTERNAL_SERVER_IP=172.31.28.157
SERVER_PORT=8888
``` 