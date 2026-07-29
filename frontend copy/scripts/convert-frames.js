import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'public/frames');

// Candidate source directories for raw frames
const candidateDirs = [
  path.resolve(projectRoot, 'raw-frames'),
  path.resolve(projectRoot, 'public/frames'),
  path.resolve(projectRoot, 'public/Frames'),
];

async function convertFrames() {
  let sourceDir = null;
  let files = [];

  for (const candidate of candidateDirs) {
    if (fs.existsSync(candidate)) {
      const candidateFiles = fs.readdirSync(candidate).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
      });
      if (candidateFiles.length > 0) {
        sourceDir = candidate;
        files = candidateFiles;
        break;
      }
    }
  }

  if (!sourceDir || files.length === 0) {
    console.error('Error: Raw frames directory is empty or missing! Expected .jpg or .png frames in ./raw-frames or ./public/frames.');
    process.exit(1);
  }

  console.log(`Found ${files.length} raw frame(s) in: ${sourceDir}`);

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let convertedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const srcPath = path.join(sourceDir, file);
    const baseName = path.parse(file).name;

    const primaryOutPath = path.join(outDir, `${baseName}.webp`);
    const paddedIndex = String(i + 1).padStart(5, '0');
    const standardizedOutPath = path.join(outDir, `frame_${paddedIndex}.webp`);

    try {
      // Lanczos3 high-precision anti-aliased resampling for ultra-smooth rendering
      const processPipeline = () => sharp(srcPath)
        .resize(1920, null, {
          fit: 'inside',
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: true
        })
        .webp({ quality: 95, effort: 6, smartSubsample: true });

      await processPipeline().toFile(primaryOutPath);

      if (primaryOutPath !== standardizedOutPath) {
        await processPipeline().toFile(standardizedOutPath);
      }

      convertedCount++;
      if (convertedCount % 50 === 0 || convertedCount === files.length) {
        console.log(`Converted ${convertedCount}/${files.length} Lanczos3 anti-aliased frames...`);
      }
    } catch (err) {
      console.error(`Error converting ${file}:`, err);
    }
  }

  console.log(`Successfully converted ${convertedCount} Lanczos3 anti-aliased frame(s) to WebP in ${outDir}`);
}

convertFrames();
