type IngestRequest = {
  chain: string;
};

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (request: Request) => {
  try {
    const { ingestChainOffers } = await import("../_shared/offers.ts");
    const body = (await request.json().catch(() => ({}))) as Partial<IngestRequest>;
    const chain = body.chain?.toLowerCase();

    if (!chain) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing chain",
      }), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    if (["kaufland", "albert", "lidl", "billa", "penny"].includes(chain)) {
      const result = await ingestChainOffers(chain);

      return new Response(JSON.stringify({
        ok: true,
        chain,
        ingested: result.count,
        persisted: result.persisted,
        preview: result.offers.slice(0, 5),
      }), {
        headers: {
          "content-type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({
      ok: false,
      chain,
      error: "Unsupported chain",
    }), {
      status: 400,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);

    return new Response(JSON.stringify({
      ok: false,
      error: message,
    }), {
      status: 500,
      headers: {
        "content-type": "application/json",
      },
    });
  }
});
