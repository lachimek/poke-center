This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

Set these in `.env`:

- `DATABASE_URL`
- `AUTH_SECRET`
- `BETTER_AUTH_SECRET`
- `NEXTAUTH_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `CARD_DETECTOR_URL` (for example `http://localhost:8787`)

## Image Upload Flow

Save-to-account uploads now use a two-step direct upload pipeline:

1. Client requests presigned upload URLs from `POST /api/uploads/create`.
2. Client uploads images directly to R2 with `PUT`.
3. Client finalizes card save via `POST /api/cards/finalize`.

This avoids large server-action payloads and prevents production `413` request size issues.

## Upload Validation and Security

- Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`.
- Max size: 10 MB per image.
- Required variants: `front_raw`, `front_processed`, `back_raw`, `back_processed`.
- Finalize endpoint validates uploaded object keys belong to the authenticated user namespace.

For private buckets, frontend display uses short-lived signed GET URLs generated on the backend.
