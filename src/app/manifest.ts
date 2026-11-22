import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fridge Rescue",
    short_name: "Fridge Rescue",
    description: "Turn what's in your fridge into something delicious.",
    start_url: "/my-fridge",
    scope: "/",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#F7F5F0",
    categories: ["food", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My Fridge", url: "/my-fridge" },
      { name: "Shopping list", url: "/shopping-list" },
      { name: "Meal planner", url: "/meal-planner" },
    ],
  };
}
