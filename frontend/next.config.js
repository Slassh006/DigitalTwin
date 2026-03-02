/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['localhost'],
    },
    output: 'standalone',

    webpack: (config) => {
        // Fix for Three.js in Next.js
        config.externals = [...(config.externals || []), { canvas: 'canvas' }];

        // Raw-load GLSL shader files
        config.module.rules.push({
            test: /\.glsl$/,
            type: 'asset/source',
        });

        // VTK.js Worker Loader setup
        config.module.rules.push({
            test: /\.worker\.(js|ts)$/,
            use: [
                {
                    loader: 'worker-loader',
                    options: { inline: 'no-fallback' }
                }
            ]
        });

        return config;
    },
}

module.exports = nextConfig
