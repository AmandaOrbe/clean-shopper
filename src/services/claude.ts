import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface ProductResearchResult {
  summary: string;
  ingredients: string[];
  concerns: string[];
  rating: "clean" | "moderate" | "avoid";
  alternatives: string[];
}

export async function researchProduct(
  productName: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: `You are Clean Shopper, an expert AI assistant specializing in analyzing home and personal care products for safety and toxicity.
You help users identify harmful ingredients, understand safety ratings, and find cleaner alternatives.
When analyzing products, consider:
- EWG (Environmental Working Group) hazard scores
- Common harmful ingredients (parabens, phthalates, sulfates, artificial fragrances, etc.)
- Certifications (EWG Verified, USDA Organic, Leaping Bunny, etc.)
- Third-party safety databases
Be concise, evidence-based, and practical.`,
    messages: [
      {
        role: "user",
        content: `Research this product and provide a safety analysis: ${productName}`,
      },
    ],
  });

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onChunk?.(event.delta.text);
    }
  }

  return fullText;
}
