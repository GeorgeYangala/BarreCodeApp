import axios from "axios";
import Quagga from "@ericblade/quagga2";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const API_URL = import.meta.env.VITE_API_URL;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const renderPdfFirstPageToDataUrl = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toDataURL("image/png");
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const addWhitePaddingAndScale = async (src, scale = 2) => {
  const img = await loadImage(src);

  const padding = 80;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width * scale + padding * 2;
  canvas.height = img.height * scale + padding * 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    padding,
    padding,
    img.width * scale,
    img.height * scale
  );

  return canvas.toDataURL("image/png");
};

const toHighContrast = async (src) => {
  const img = await loadImage(src);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = gray > 180 ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
};

const tryBarcodeDetector = async (src) => {
  if (!("BarcodeDetector" in window)) {
    throw new Error("BarcodeDetector non disponible");
  }

  const detector = new window.BarcodeDetector({
    formats: ["ean_13"],
  });

  const img = await loadImage(src);
  const results = await detector.detect(img);

  if (!results.length || !results[0].rawValue) {
    throw new Error("BarcodeDetector n'a rien trouvé");
  }

  return results[0].rawValue;
};

const tryQuagga = (src, locate = true) =>
  new Promise((resolve, reject) => {
    Quagga.decodeSingle(
      {
        src,
        numOfWorkers: 0,
        locate,
        inputStream: {
          size: 1600,
        },
        decoder: {
          readers: ["ean_reader"],
        },
      },
      (result) => {
        if (result?.codeResult?.code) {
          resolve(result.codeResult.code);
        } else {
          reject(new Error("Quagga n'a rien trouvé"));
        }
      }
    );
  });

const decodeEan13Robust = async (src) => {
  const variants = [];

  variants.push(src);
  variants.push(await addWhitePaddingAndScale(src, 2));
  variants.push(await addWhitePaddingAndScale(src, 3));
  variants.push(await toHighContrast(await addWhitePaddingAndScale(src, 2)));

  for (const variant of variants) {
    try {
      const code = await tryBarcodeDetector(variant);
      if (code) return code;
    } catch (_) {}

    try {
      const code = await tryQuagga(variant, true);
      if (code) return code;
    } catch (_) {}

    try {
      const code = await tryQuagga(variant, false);
      if (code) return code;
    } catch (_) {}
  }

  throw new Error(
    "Aucun code EAN-13 détecté. Utilise de préférence l'image PNG originale du code-barres plutôt qu'une capture d'écran."
  );
};

export const extractBarcodeFromFile = async (file) => {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  const imageSrc = isPdf
    ? await renderPdfFirstPageToDataUrl(file)
    : await fileToDataUrl(file);

  const code = await decodeEan13Robust(imageSrc);

  return {
    code,
    previewSrc: imageSrc,
  };
};

export const scanImportedBarcode = async (code_barre13) => {
  const response = await axios.post(`${API_URL}/scan`, { code_barre13 });
  return response.data;
};