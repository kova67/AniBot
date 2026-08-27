export const DEFAULT_AVATAR = {
  id: "airi",
  model: process.env.NEXT_PUBLIC_VRM_MODEL_URL?.trim() || "/models/avatar.vrm",
  name: "Airi",
  thumbnail: "/avatars/airi.png",
} as const;
