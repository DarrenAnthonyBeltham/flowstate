import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlowState.dev — Developer Routine & Notes',
    short_name: 'FlowState',
    description: 'Developer daily routine tracker, calendar goals, and markdown notes workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060911',
    theme_color: '#060911',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}