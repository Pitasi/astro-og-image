import * as fs from "fs";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import httpServer from "http-server";

// Port where http-server will be listening
const tmpServerPort = 9099;

// Path to the directory containing the pages to be screenshotted
const srcPagesDir = "og_";

// Path to the output directory where to put generated images (relative to the dist folder).
const outputDir = "assets/og";

export default function astroOGImage(): AstroIntegration {
  return {
    name: "astro-og-image",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        // Creates a directory for the images if it doesn't exist already
        let fullOutputDir = fileURLToPath(new URL(outputDir, dir));
        if (!fs.existsSync(fullOutputDir)) {
          fs.mkdirSync(fullOutputDir);
        }

        const h = httpServer.createServer({
          root: fileURLToPath(new URL(".", dir)),
        });
        h.listen(tmpServerPort, "0.0.0.0");

        const browser = await puppeteer.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        let inputDir = fileURLToPath(new URL(srcPagesDir, dir));
        const inputPaths = fs.readdirSync(inputDir);
        const genPromises = inputPaths.map((route) =>
          makeScreenshot(
            fileURLToPath(new URL(`${outputDir}/${route}.png`, dir)),
            browser,
            route
          )
        );
        await Promise.all(genPromises);

        await browser.close();
        h.close();
      },
    },
  };
}

async function makeScreenshot(
  outputPath: string,
  browser: puppeteer.Browser,
  route: string
) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${tmpServerPort}/${srcPagesDir}/${route}`);
  await page.waitForNetworkIdle();
  await page.setViewport({
    width: 1200,
    height: 630,
  });

  await page.screenshot({
    path: outputPath,
    encoding: "binary",
  });
}
