# Vocali

Vocali is a transcription platform prototype built with a serverless AWS backend and a Nuxt frontend.

## Project goals

The platform currently supports:

- user registration
- user authentication
- logout
- audio file transcription for files up to 20 MB
- real-time transcription from the computer microphone
- saving finalized live transcript text into history
- transcription history with pagination
- transcription download

## Tech stack

### Backend
- Node.js
- TypeScript
- Serverless Framework
- AWS Lambda
- AWS Cognito
- DynamoDB
- S3
- Jest

### Frontend
- Nuxt 4
- TypeScript
- Tailwind CSS
- ESLint

## Repository structure

```text
vocl/
├── backend/
│   ├── serverless.ts
│   ├── package.json
│   ├── src/
│   │   ├── functions/
│   │   │   ├── hello/
│   │   │   ├── upload/
│   │   │   ├── transcribe/
│   │   │   ├── history/
│   │   │   ├── download/
│   │   │   ├── realtime-token/
│   │   │   └── realtime-save/
│   │   └── libs/
│   └── tests/
├── frontend/
│   ├── app.vue
│   ├── components/
│   │   ├── AudioUploader.vue
│   │   └── RealtimeRecorder.vue
│   ├── pages/
│   │   ├── dashboard.vue
│   │   └── history.vue
│   ├── nuxt.config.ts
│   └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
└── README.md
```


## Requirements

- Node.js 20+
- npm 10+ recommended
- AWS credentials configured locally if you want to deploy the backend

## Installation

From the project root:

```bash
npm install
```

## Workspace commands

From the project root:

### Format
```bash
npm run format
```

### Check formatting
```bash
npm run format:check
```

### Lint everything
```bash
npm run lint
```

### Run backend tests
```bash
npm run test
```

### Typecheck all workspaces
```bash
npm run typecheck
```

## CI

GitHub Actions runs the baseline validation workflow in `.github/workflows/ci.yml` on pushes to `main` and on pull requests.

The workflow currently runs:

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run typecheck`

This gives automated coverage for:

- backend unit tests under `backend/tests/unit`
- backend and frontend linting
- backend TypeScript checks and Nuxt frontend typechecking

Current gaps:

- no frontend component/unit test harness yet
- no E2E/browser test suite yet
- no deploy job in CI

## How to run the project manually right now

At the current stage, the frontend and backend can be worked on separately.

## Frontend

Start the Nuxt dev server:

```bash
npm run dev --workspace=frontend
```

Then open:

```text
http://localhost:3000
```

## Backend

### Validate the backend code
Run:

```bash
npm run lint --workspace=backend
```

```bash
npm run typecheck --workspace=backend
```

```bash
npm run test --workspace=backend
```

### Package the backend
This verifies the Serverless configuration bundles correctly:

```bash
npm --workspace=backend exec serverless package
```

### Invoke the example function locally
The existing template `hello` function can be invoked locally with:

```bash
npm --workspace=backend exec serverless invoke local -f hello --path src/functions/hello/mock.json
```
