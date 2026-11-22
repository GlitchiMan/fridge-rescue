import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/my-fridge", "/shopping-list", "/meal-planner", "/saved", "/preferences", "/offline"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
