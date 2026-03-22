/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        domains: ['localhost'],
    },
    webpack: (config) => {
        // Fix for Three.js in Next.js
        config.externals = [...(config.externals || []), { canvas: 'canvas' }];

        // Raw-load GLSL shader files
        config.module.rules.push({
            test: /\.glsl$/,
            type: 'asset/source',
        });

        return config;
    },
}

module.exports = nextConfig
