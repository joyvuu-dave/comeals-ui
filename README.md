Front end for Comeals.

## Prerequisites

- Node.js >= 22
- npm >= 10

Install dependencies:

```
npm install
```

## Development

Start the Vite dev server with hot module replacement:

```
npm start
```

The app will be available at `http://localhost:3001`. API requests to `/api` are proxied to `http://localhost:3000`, so the backend should be running there.

## Production

Build the app and serve it with the Express server:

```
npm run build
node server.js
```

This compiles the app into the `build/` directory, then serves it on port 3001 (override with the `PORT` environment variable). API requests are proxied to `http://localhost:3000` (override with the `API_URL` environment variable).
