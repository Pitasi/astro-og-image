import * as fs from "fs";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, RouteData } from "astro";
import httpServer from "http-server";

export default function astroOGImage({
  config,
}: {
  config: { path: string };
}): AstroIntegration {
  return {
    name: "astro-og-image",
    hooks: {
      "astro:build:done": async ({ dir, routes }) => {
        // Creates a directory for the images if it doesn't exist already
        let outputDir = fileURLToPath(new URL(`./assets/og`, dir));
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir);
        }

        let inputDir = fileURLToPath(new URL(`./og_`, dir));
        const inputPaths = fs.readdirSync(inputDir);
        const h = httpServer.createServer({
          root: fileURLToPath(new URL(".", dir)),
        });
        h.listen(9099, "0.0.0.0");

        const browser = await puppeteer.launch();

        const genPromises = inputPaths.map((route) => gen(dir, browser, route));
        await Promise.all(genPromises);

        await browser.close();
        h.close();
      },
    },
  };
}

async function gen(dir: URL, browser: puppeteer.Browser, route: string) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:9099/og_/${route}`);
  await page.waitForNetworkIdle();
  await page.setViewport({
    width: 1200,
    height: 630,
  });

  await page.screenshot({
    path: fileURLToPath(new URL(`./assets/og/${route}.png`, dir)),
    encoding: "binary",
  });
}
