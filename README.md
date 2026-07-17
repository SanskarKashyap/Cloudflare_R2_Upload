# Cloudflare R2 Upload

## Introduction

A small TypeScript app for uploading files to Cloudflare R2, built on `@aws-sdk/client-s3`.

Two ways to upload:
- **Web UI** — a local server with a one-page upload form: pick a file, click Upload, it lands in your R2 bucket instantly.
- **Batch CLI** — drop files into the `uploads` folder and run a command to push all of them at once.

**Note:** Uploads using signed URLs are not covered in this project.

## Getting Started

Install NodeJS: https://nodejs.org/en/download/ or https://github.com/coreybutler/nvm-windows _(not required, but useful to manage multiple NodeJS versions on the same system)_

Minimum NodeJS Version: **18**

Clone the repository:
```bash
git clone https://github.com/Karbust/Cloudflare_R2_Upload.git
```
Install the dependencies:

```bash
npm install
```

Follow these instructions to get the necessary information about the API Tokens: https://developers.cloudflare.com/r2/data-access/s3-api/tokens/

Rename `.env.sample` to `.env` and edit with your own values:

```text
R2_ACCOUNT_ID=
R2_BUCKET_NAME=
R2_S3_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=
```

`R2_S3_ENDPOINT` and `R2_PUBLIC_BASE_URL` are optional — the S3 endpoint is derived from `R2_ACCOUNT_ID` if omitted, and the public URL is only used to display a link back to the uploaded file.

## Available Commands

| Command               | Purpose                                                                      |
|------------------------|-------------------------------------------------------------------------------|
| `npm run dev`          | Starts the web upload server (with auto-restart on file changes).             |
| `npm run build`        | Compiles the TypeScript project to `build/`.                                  |
| `npm run upload:batch` | Uploads every file in the `uploads` folder to R2 (one-off, no dev server).    |

## Using the web UI

```bash
npm run dev
```

Then open **http://localhost:3000** in your browser. Click the box to pick a file (or drag one in), click **Upload**, and it's sent straight to your R2 bucket — the page shows a link to the uploaded file on success.

The port defaults to `3000`; set `PORT` in `.env` to change it.

## Using the batch CLI

Place the files you want to upload inside the `uploads` folder. \
Run `npm run upload:batch` — every file inside `uploads` will be uploaded to the Cloudflare R2 bucket, and the folder's hierarchical structure will be kept.

## Duplicate uploads

Both the web UI and the batch CLI use the file's MD5 hash as the [conditional header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests) [`If-None-Match`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match), so re-uploading an identical file is a no-op rather than a duplicate object.

## Error Messages

If you get an error message like this:

```text
Status Code: 412 - At least one of the pre-conditions you specified did not hold.
```

That means the file already exists with the same ETag (aka MD5 Hash) in the Cloudflare R2 Storage. The web UI surfaces this as "This file already exists in the bucket (identical content)."

Other error messages are not caught and debug may be in order to figure them out individually.
