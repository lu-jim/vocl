# Vocali

Vocali is a take-home project for an audio transcription platform built with a serverless AWS backend and a Nuxt frontend.

## Project goals

The platform is intended to support:

- user registration
- user authentication
- logout
- audio file transcription for files up to 20 MB
- real-time transcription from the computer microphone
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

```/dev/null/tree.txt#L1-24
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
│   │   │   └── download/
│   │   └── libs/
│   └── tests/
├── frontend/
│   ├── app/
│   ├── nuxt.config.ts
│   └── package.json
├── package.json
└── README.md
```


## Requirements

- Node.js 20+
- npm 10+ recommended
- AWS credentials configured locally if you want to deploy the backend

## Installation

From the project root:

```/dev/null/install.sh#L1-2
npm install
```

## Workspace commands

From the project root:

### Format
```/dev/null/format.sh#L1-1
npm run format
```

### Check formatting
```/dev/null/format-check.sh#L1-1
npm run format:check
```

### Lint everything
```/dev/null/lint.sh#L1-1
npm run lint
```

### Run backend tests
```/dev/null/test.sh#L1-1
npm run test
```

### Typecheck all workspaces
```/dev/null/typecheck.sh#L1-1
npm run typecheck
```

## How to run the project manually right now

At the current stage, the frontend and backend can be worked on separately.

## Frontend

Start the Nuxt dev server:

```/dev/null/frontend-dev.sh#L1-1
npm run dev --workspace=frontend
```

Then open:

```/dev/null/frontend-url.txt#L1-1
http://localhost:3000
```

## Backend

### Validate the backend code
Run:

```/dev/null/backend-lint.sh#L1-1
npm run lint --workspace=backend
```

```/dev/null/backend-typecheck.sh#L1-1
npm run typecheck --workspace=backend
```

```/dev/null/backend-test.sh#L1-1
npm run test --workspace=backend
```

### Package the backend
This verifies the Serverless configuration bundles correctly:

```/dev/null/backend-package.sh#L1-1
npm --workspace=backend exec serverless package
```

### Invoke the example function locally
The existing template `hello` function can be invoked locally with:

```/dev/null/backend-invoke-hello.sh#L1-1
npm --workspace=backend exec serverless invoke local -f hello --path src/functions/hello/mock.json
```
