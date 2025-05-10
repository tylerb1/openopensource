# Open Open Source

## About The Project

Open Open Source is a visual browser for open source projects that anyone can edit.

### Built With

- [Svelte](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [D3](https://d3js.org/)
- [Vite](https://vitejs.dev/)
- [Netlify](https://www.netlify.com/)
- [Supabase](https://supabase.io/)

The UI was adapted from [this example](https://svend3r.dev/charts/circlePack).

## Getting Started

### Installation

1. Clone the repo and navigate to it

```
git clone https://github.com/tylerb1/openopensource.git <your-repo-name>
cd <your-repo-name>
```

2. Install packages

```
pnpm install
```

3. [Set up a Netlify project](https://docs.netlify.com/get-started/).

4. [Set up a Supabase database](https://supabase.com/docs/guides/getting-started).

5. Copy following project keys to `.env` file.

```
VITE_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
VITE_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-project-anon-key>
```

### Development

To start the development server alone, run:

`pnpm run dev`

## License

Distributed under the GPL v2 license.

