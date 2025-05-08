# Location-Based Guestbook SNS

A React-based social network that allows users to create location-based posts with images and text. Users can view posts near their current location on an interactive map.

## Features

- Interactive map interface using Mapbox GL JS
- Location-based post creation with image upload
- View posts near your current location
- Post clustering based on zoom level
- Post popularity visualization (color-coded markers)
- Comments system
- View count tracking

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Supabase account
- Mapbox account

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_MAPBOX_TOKEN=your_mapbox_token
   ```

4. Set up your Supabase database with the following tables:

   ```sql
   -- Posts table
   create table posts (
     id uuid default uuid_generate_v4() primary key,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null,
     user_id uuid references auth.users not null,
     latitude double precision not null,
     longitude double precision not null,
     image_url text not null,
     text text not null,
     views integer default 0
   );

   -- Comments table
   create table comments (
     id uuid default uuid_generate_v4() primary key,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null,
     post_id uuid references posts not null,
     user_id uuid references auth.users not null,
     text text not null
   );
   ```

5. Create a storage bucket named 'post-images' in your Supabase project

6. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Allow location access when prompted
2. The map will center on your current location
3. Click the "Create Post" button to add a new post
4. Upload an image and add text
5. View nearby posts on the map
6. Click on markers to view post details and comments
7. Add comments to posts

## Technologies Used

- React
- TypeScript
- React Router
- Mapbox GL JS
- Supabase
- Tailwind CSS

# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
