# Welcome to your cufire-arena project

## Project info

**URL**: https://github.com/agrdev85/cufire-arena/tree/main

## How can I edit this code?

There are several ways of editing your application.

**Use cufire-arena**

Simply visit the [cufire-arena Project](https://github.com/agrdev85/cufire-arena/tree/main) and start prompting.

Changes made via cufire-arena will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in cufire-arena.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [cufire-arena](https://github.com/agrdev85/cufire-arena/tree/main) and click on Share -> Publish.

## Can I connect a custom domain to my cufire-arena project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.cufire-arena.dev/tips-tricks/custom-domain#step-by-step-guide)


## Instalar Backend
    cd server && npm install
    Crear .env con tu PostgreSQL local

# First, generate the Prisma client
npm run db:generate

# Then, push the schema to your PostgreSQL database
npm run db:push

# Optional: seed with demo data
npm run db:seed

# Now start the server
npm run dev  
(backend puerto 4000)

Frontend ya configurado para http://localhost:4000
