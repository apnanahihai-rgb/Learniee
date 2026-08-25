# Learniee

Learniee is an online learning platform built with Next.js, Firebase, and Razorpay for payments. This is the official repository for development.

## Tech Stack

- **Frontend:** React, Next.js (App Router), Tailwind CSS, shadcn/ui
- **State:** Zustand, React Query
- **Backend / Hosting:** Firebase (Auth, Firestore, Storage, Cloud Functions, App Hosting)
- **Payments:** Razorpay
- **Meetings:** Zoho Meeting API
- **SMS / OTP:** Fast2SMS
- **Push Notifications:** Firebase Cloud Messaging
- **DNS:** Cloudflare
- **Domain Registrar:** GoDaddy
- **CI/CD:** GitHub → Firebase App Hosting

## Setup

1. Clone the repository
```bash
git clone https://github.com/Urjatalents/learniee.git
```
2. Move to project directory
```bash
cd learniee
```
3. Install the dependencies
```bash
npm install
```
4. Run the dev server
```bash
npm run dev
```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

This project needs a `.env.local` file in the root directory for Firebase, Razorpay, Zoho, and Fast2SMS credentials. This file is gitignored and should never be committed.

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Zoho Meeting
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=

# Fast2SMS
FAST2SMS_API_KEY=

# AWS S3 (teacher document + child photo uploads)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
```

Fill these in locally after setting up each service. For production, set the same values as Firebase App Hosting secrets rather than committing them anywhere.

### S3 bucket setup (teacher documents + child photos)

Uploads (teacher DOB/address/qualification proofs in onboarding step 3,
child photos in parent onboarding step 2) go straight from the browser to
S3 using short-lived presigned URLs, so files never pass through our
server. See `src/lib/s3.ts` and `/api/upload/presign`.

One-time bucket setup:

```bash
aws s3api create-bucket \
  --bucket <your-bucket-name> \
  --region <your-region> \
  --create-bucket-configuration LocationConstraint=<your-region>

# Keep the bucket fully private - we only ever access it via
# presigned URLs, never a public bucket policy.
aws s3api put-public-access-block \
  --bucket <your-bucket-name> \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Allow the browser to PUT files directly from our app's origin(s)
aws s3api put-bucket-cors \
  --bucket <your-bucket-name> \
  --cors-configuration file://infra/s3-cors.json
```

The IAM user/role the app runs as needs at least `s3:PutObject` and
`s3:GetObject` on `arn:aws:s3:::<your-bucket-name>/*` — see
`infra/s3-iam-policy.json`.

## Guidelines

1. Always pull the latest changes from `master` before you start working (see Precaution below).
2. Run `npm run lint` before pushing code.
3. Run `npm install` again if you hit a dependency error.
4. Keep components inside `src/components`, and add new shadcn components with:
```bash
npx shadcn@latest add <component-name>
```

## Precaution

Before you start coding, always make sure you have the latest code:
```bash
git checkout master
git pull origin master
```

## Contributing

1. Create a new branch (only once per person):
```bash
git checkout -b <your-name>
```
If you already have a branch, switch to it instead:
```bash
git checkout <your-name>
```
2. Stage your changes
```bash
git add .
```
3. Commit your changes
```bash
git commit -m "your message"
```
4. Push your changes
```bash
git push origin <your-name>
```
5. Create a Pull Request (PR)
   - Go to the GitHub repository page.
   - Click the "Compare & pull request" button.
   - Submit your PR against the `master` branch.
   - Wait for review and merge.

## Project Structure

```
learniee/
├── src/
│   ├── app/            # App Router pages and layouts
│   ├── components/
│   │   └── ui/         # shadcn/ui components
│   └── lib/             # Utilities, Firebase config, helpers
├── public/              # Static assets
├── components.json      # shadcn/ui config
└── next.config.ts
```

## License

Private and unlicensed. All rights reserved.
