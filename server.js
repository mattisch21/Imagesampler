// server.js

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Replicate from "replicate";
import { promisify } from "util";
import { pipeline } from "stream";

const app = express();
const port = 3000;
const upload = multer({ dest: "uploads/" });
const streamPipeline = promisify(pipeline);

// 💡 API-Key aus Umgebungsvariable
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 📁 Statische Ordner für HTML und Output
app.use("/output", express.static("output"));
app.use(express.static("public"));

// 🔄 POST-Endpunkt für Dateiupload
app.post("/upload", upload.single("image"), async (req, res) => {
  const filePath = req.file.path;

  try {
  const base64Image = fs.readFileSync(filePath, { encoding: "base64" });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg"; // oder WebP erweitern
  const imageInput = `data:${mimeType};base64,${base64Image}`;


const rawDescription = await replicate.run("yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb", {
  input: {
    image: imageInput,
    prompt: "List 5 adjectives that describe the mood or atmosphere of this image. Respond with only single words, comma-separated. No sentences.",
  },
});
const description = Array.isArray(rawDescription)
  ? rawDescription.join("")
  : rawDescription;


    console.log("Beschreibung:", description);
    const fullPrompt = `Create a sustained C4 tone using a soft, pad-like sound based on these adjectives: ${description}. Do not include rhythm or percussion.`;


    const musicStream = await replicate.run(
      "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      {
        input: {
          prompt: fullPrompt,
          duration: 4,
        },
      }
    );

    // 💾 Ausgabe speichern
    const outputPath = "output/output.mp3";
    const outStream = fs.createWriteStream(outputPath);
    await streamPipeline(musicStream, outStream);

    res.json({ success: true });
  } catch (err) {
    console.error("Fehler bei Verarbeitung:", err);
    res.status(500).json({ error: "Verarbeitung fehlgeschlagen." });
  } finally {
    fs.unlinkSync(filePath); // temporäre Datei löschen
  }
});

// 🔊 Server starten
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});

// 🔧 Stelle sicher, dass diese Ordner existieren
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("output")) fs.mkdirSync("output");
