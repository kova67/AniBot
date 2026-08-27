import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modelsDirectory = path.join(root, "public", "models");
const avatarsDirectory = path.join(root, "public", "avatars");

function readGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.toString("utf8", 0, 4) !== "glTF") {
    throw new Error(`${path.basename(file)} is not a binary glTF/VRM file.`);
  }
  let offset = 12;
  let json = null;
  let binary = null;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.toString("utf8", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "JSON") json = JSON.parse(data.toString("utf8").replace(/\0+$/, ""));
    if (type === "BIN\0") binary = data;
    offset += 8 + length;
  }
  if (!json || !binary) throw new Error(`${path.basename(file)} has no embedded JSON/BIN chunks.`);
  return { binary, json };
}

function thumbnailImageIndex(json) {
  const vrm1 = json.extensions?.VRMC_vrm?.meta?.thumbnailImage;
  if (Number.isInteger(vrm1)) return vrm1;
  const vrm0Texture = json.extensions?.VRM?.meta?.texture;
  if (!Number.isInteger(vrm0Texture)) return null;
  return json.textures?.[vrm0Texture]?.source ?? null;
}

function embeddedImage(json, binary, imageIndex) {
  const image = json.images?.[imageIndex];
  const view = json.bufferViews?.[image?.bufferView];
  if (!image || !view || !Number.isInteger(view.byteLength)) return null;
  const start = view.byteOffset ?? 0;
  return { bytes: binary.subarray(start, start + view.byteLength), mimeType: image.mimeType };
}

fs.mkdirSync(avatarsDirectory, { recursive: true });
let extracted = 0;
for (const filename of fs.readdirSync(modelsDirectory).filter((name) => name.endsWith(".vrm")).sort()) {
  const { binary, json } = readGlb(path.join(modelsDirectory, filename));
  const imageIndex = thumbnailImageIndex(json);
  if (!Number.isInteger(imageIndex)) {
    console.warn(`skip ${filename}: the VRM metadata does not declare a thumbnail`);
    continue;
  }
  const image = embeddedImage(json, binary, imageIndex);
  if (!image) throw new Error(`${filename} points to a thumbnail that is not embedded.`);
  if (image.mimeType !== "image/png") {
    throw new Error(`${filename} uses ${image.mimeType ?? "an unknown image type"}; add an explicit output mapping.`);
  }
  const output = path.join(avatarsDirectory, `${path.basename(filename, ".vrm")}.png`);
  fs.writeFileSync(output, image.bytes);
  extracted += 1;
  console.log(`extracted ${path.relative(root, output)} from VRM metadata image ${imageIndex}`);
}
console.log(`done: ${extracted} metadata thumbnail${extracted === 1 ? "" : "s"} extracted`);
