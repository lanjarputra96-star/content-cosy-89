import { createFileRoute } from "@tanstack/react-router";
import { readAsset } from "@/lib/eco-cloud.server";

/** Menyajikan foto yang tersimpan di Cloudflare D1. */
export const Route = createFileRoute("/api/public/asset/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const asset = await readAsset(params.id);
          if (!asset) return new Response("Not found", { status: 404 });
          const blob = new Blob([asset.bytes as BlobPart], { type: asset.mime });
          return new Response(blob, {
            headers: {
              "Content-Type": asset.mime,
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (error) {
          console.error("asset route failed:", error);
          return new Response("Asset unavailable", { status: 503 });
        }
      },
    },
  },
});
