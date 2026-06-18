# AWS Photo Album

AWS Photo Album is a serverless media gallery project built with React and Vite on the frontend and deployed on AWS. The app lets users upload images and videos, stores media in Amazon S3, and loads gallery content through an AWS-backed API.

Live site: https://main.d3j7afbd1ic77m.amplifyapp.com

## Project Overview

This project is designed as a cloud-based photo album where users can:

- upload image and video files from the browser
- request a pre-signed upload URL from the backend
- send files directly to Amazon S3
- load and display stored media through an API
- access the frontend through an AWS deployment

The frontend in this repository connects to an AWS serverless backend using a deployed API Gateway endpoint.

## AWS Architecture

The project follows a simple serverless AWS architecture:

- `AWS Amplify` hosts and deploys the frontend
- `Amazon API Gateway` exposes backend endpoints such as `POST /upload-url` and `GET /media`
- `AWS Lambda` handles backend logic for generating upload URLs and returning media metadata
- `Amazon S3` stores uploaded images and videos

Application flow:

1. The user selects an image or video in the frontend.
2. The frontend sends a request to API Gateway for a pre-signed S3 upload URL.
3. The backend returns a signed URL.
4. The file is uploaded directly from the browser to Amazon S3.
5. The frontend calls the media endpoint to refresh and display the updated gallery.

## Frontend Stack

- `React`
- `Vite`
- `JavaScript`
- `CSS`

## API Integration

This frontend is currently configured to use:

- `https://441juhjk0b.execute-api.us-east-1.amazonaws.com/prod`

Main endpoints used by the app:

- `POST /upload-url`
- `GET /media`

## Run Locally

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

## Notes

- `node_modules` is excluded from version control
- build output such as `dist` is also ignored
- this repository contains the frontend for the AWS Photo Album experience
