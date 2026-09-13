import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Pink Room | Page Turning ASMR Creator Studio',
    short_name: 'The Pink Room',
    description: 'Record original faceless page-turning ASMR videos and earn $50 USD per approved video with reliable payouts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDF0F5',
    theme_color: '#141417',
    icons: [
      {
        src: '/the-pink-room-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
