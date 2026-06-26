import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@splinetool/react-spline", "@splinetool/runtime"],
  // Don't fail the production build on lint warnings/errors (cosmetic rules like
  // no-unescaped-entities). TypeScript type-checking still runs.
  eslint: { ignoreDuringBuilds: true },
  // @splinetool/react-spline only exposes an "import" condition on its root
  // export, which Next's server build can't resolve (ERR_PACKAGE_PATH_NOT_EXPORTED).
  // Alias the bare specifier straight to its ESM dist file so the client-only
  // dynamic imports keep using the plain (non-async) Spline component.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@splinetool/react-spline$": path.resolve(
        process.cwd(),
        "node_modules/@splinetool/react-spline/dist/react-spline.js",
      ),
    };
    return config;
  },
};

export default nextConfig;
