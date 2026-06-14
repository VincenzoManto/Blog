// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';


// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://vincenzomanto.github.io',
  integrations: [mdx(), sitemap()],
  output: 'static',
    markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  base: '/Blog/', // Cambia 'Blog' con il nome del repo se diverso
});