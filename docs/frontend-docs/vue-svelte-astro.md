# Vue, Svelte, and Astro Frontend Notes

Vue:

- Use single-file components with clear `<template>`, `<script setup>`, and `<style>` sections.
- Prefer computed values for derived state and props for parent-controlled data.
- Keep reusable UI components small and named after their domain role.

Svelte:

- Use reactive declarations for derived values.
- Keep component state local unless stores are needed.
- Use transitions and motion sparingly, with reduced-motion considerations.

Astro:

- Astro is strong for content sites, portfolios, landing pages, and static storefront sections.
- Use islands only where interactivity is required.
- Keep content components semantic and fast by default.

Shared UI guidance:

- Build mobile-first layouts.
- Make forms accessible and keyboard-friendly.
- Use consistent spacing tokens.
- Keep image dimensions stable with aspect ratios.
- Avoid layout shifts when content loads.
