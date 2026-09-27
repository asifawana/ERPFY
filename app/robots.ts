import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login'],
        disallow: ['/account/', '/c/', '/api/', '/store/'],
      },
    ],
    sitemap: 'https://erpfy.net/sitemap.xml',
  };
}
