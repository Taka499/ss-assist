import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as cheerio from "cheerio";
import sharp from "sharp";
import { ICON_SIZE, WIKIRU_BASE_URL, WIKIRU_DELAY_MS } from "./config.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface IconFetchResult {
  fetched: string[];
  failed: string[];
  warnings: string[];
}

/**
 * Fetch character icon from wikiru and save as resized PNG.
 * Returns true if successful, false if failed.
 *
 * Wikiru uses lazy-loaded images: the `src` attribute is a base64 placeholder
 * GIF, while the real image URL lives in `data-src` pointing to `attach2/`.
 *
 * We prefer the square icon image (~192x192) found in the date/table sections,
 * identified by: alt="{charName}", data-src containing "696D67_" (shared "img"
 * page prefix) and "5F69636F6E" (hex "_icon"). Falls back to the full-body
 * portrait (alt="{charName}.png") if the icon isn't found.
 */
async function fetchIcon(
  nameJa: string,
  outputPath: string,
  warnings: string[]
): Promise<boolean> {
  try {
    // Datamine uses fullwidth parentheses （） but wikiru uses ASCII ()
    const normalized = nameJa.replace(/\uff08/g, "(").replace(/\uff09/g, ")");
    const pageUrl = `${WIKIRU_BASE_URL}/?${encodeURIComponent(normalized)}`;
    const res = await fetch(pageUrl);
    if (!res.ok) {
      warnings.push(
        `Icon fetch failed for ${nameJa}: HTTP ${res.status} from ${pageUrl}`
      );
      return false;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let imgUrl: string | null = null;

    // Strategy 1 (preferred): Square icon image (~192x192) from the date
    // section. These are shared images on the "img" wiki page with filenames
    // like "{charName}_icon.png". Identified by:
    //   - alt exactly matches the character name (no .png suffix)
    //   - data-src contains "696D67_" (hex "img" page prefix)
    //   - data-src contains "5F69636F6E" (hex "_icon")
    $("img").each((_, el) => {
      if (imgUrl) return;
      const alt = $(el).attr("alt") || "";
      if (alt === normalized) {
        const dataSrc = $(el).attr("data-src") || "";
        if (dataSrc.includes("696D67_") && dataSrc.includes("5F69636F6E")) {
          imgUrl = dataSrc;
        }
      }
    });

    // Strategy 2 (fallback): Full-body portrait from the character info
    // section. Identified by alt="{charName}.png".
    if (!imgUrl) {
      const portraitAlt = `${normalized}.png`;
      $("img").each((_, el) => {
        if (imgUrl) return;
        const alt = $(el).attr("alt") || "";
        if (alt === portraitAlt) {
          const dataSrc = $(el).attr("data-src") || "";
          if (dataSrc.includes("attach2/")) {
            imgUrl = dataSrc;
          }
        }
      });
    }

    if (!imgUrl) {
      warnings.push(
        `Icon not found on wikiru page for ${nameJa}: no suitable image at ${pageUrl}`
      );
      return false;
    }

    // Resolve relative URLs
    if (imgUrl.startsWith("/")) {
      imgUrl = `${WIKIRU_BASE_URL}${imgUrl}`;
    } else if (!imgUrl.startsWith("http")) {
      imgUrl = `${WIKIRU_BASE_URL}/${imgUrl}`;
    }

    // Download the image
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      warnings.push(
        `Icon download failed for ${nameJa}: HTTP ${imgRes.status} from ${imgUrl}`
      );
      return false;
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    // Resize to 164x164 and save as PNG
    await sharp(imgBuffer)
      .resize(ICON_SIZE.width, ICON_SIZE.height, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toFile(outputPath);

    return true;
  } catch (error) {
    warnings.push(
      `Icon fetch error for ${nameJa}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Create a placeholder PNG for characters whose icons couldn't be fetched.
 */
function createPlaceholder(outputPath: string): void {
  // Create a simple 164x164 gray PNG placeholder
  const buf = sharp({
    create: {
      width: ICON_SIZE.width,
      height: ICON_SIZE.height,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer()
    .then((data) => writeFileSync(outputPath, data));
}

/**
 * Fetch icons for new characters from wikiru.
 */
export async function fetchNewIcons(
  newCharacters: Array<{ id: string; name_ja: string }>,
  iconsDir: string,
  dryRun: boolean
): Promise<IconFetchResult> {
  const result: IconFetchResult = {
    fetched: [],
    failed: [],
    warnings: [],
  };

  if (newCharacters.length === 0) return result;

  // Ensure icons directory exists
  if (!dryRun && !existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  for (const char of newCharacters) {
    const outputPath = resolve(iconsDir, `${char.id}.png`);

    if (dryRun) {
      console.log(`  (dry-run) Would fetch icon for ${char.name_ja} → ${outputPath}`);
      continue;
    }

    console.log(`  Fetching icon for ${char.name_ja}...`);

    // Variant characters have the base name for wikiru lookup
    // e.g., ラール（聖夜） → ラール（聖夜） (use full name, wikiru has variant pages)
    const success = await fetchIcon(char.name_ja, outputPath, result.warnings);

    if (success) {
      result.fetched.push(char.id);
      console.log(`    Saved: ${outputPath}`);
    } else {
      result.failed.push(char.id);
      console.log(`    Failed — creating placeholder`);
      await createPlaceholder(outputPath);
    }

    // Politeness delay between requests
    if (newCharacters.indexOf(char) < newCharacters.length - 1) {
      await sleep(WIKIRU_DELAY_MS);
    }
  }

  return result;
}
