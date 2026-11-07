// Explicitly test-only service. Never deploy this fixture.
import { WorkerEntrypoint } from "cloudflare:workers";
export class FoodAI extends WorkerEntrypoint {
  async recipes(input) {
    if (input.preference === "__test_delay__")
      await new Promise((r) => setTimeout(r, 1500));
    const zh = input.language === "zh-Hant";
    const choices = [
      ...new Set([...(input.priority_ids || []), ...input.selected]),
    ];
    const recipes = Array.from({ length: input.count }, (_, i) => {
      const id = choices[i % choices.length],
        food = input.foods.find((f) => f.id === id);
      return {
        title: (zh ? "測試菜式" : "Test dish") + " " + (i + 1),
        kind: ["auto", "mixed"].includes(input.style)
          ? i
            ? "vegetable"
            : "main"
          : input.style,
        minutes: 15,
        servings: input.servings ?? 2,
        uses: food
          ? [
              {
                food_id: input.preference === "__test_invalid__" ? 999999 : id,
                quantity:
                  typeof food.quantity === "number"
                    ? Math.floor((food.quantity / input.count) * 1000) / 1000
                    : null,
                amount: zh ? "建議用量" : "suggested amount",
              },
            ]
          : [],
        additional:
          input.mode === "plan"
            ? [
                {
                  name: zh ? "馬鈴薯" : "Potato",
                  amount: zh ? "2 個" : "2 pcs",
                },
              ]
            : [],
        steps: zh
          ? ["洗淨食材並切好。", "徹底煮熟後享用。"]
          : ["Wash and prepare the ingredients.", "Cook thoroughly and serve."],
        pairing: zh
          ? "與另一道菜一同上桌。"
          : "Serve together with the other dish.",
        notes: "",
      };
    });
    return { provider: "test-fixture", model: "test-only", data: { recipes } };
  }
  async recognize(input) {
    return {
      provider: "test-fixture",
      model: "test-only",
      data: {
        foods: [
          {
            name: input.language === "zh-Hant" ? "番茄" : "Tomato",
            category: "produce",
            ingredient: "tomato",
            effective_date: "2099-01-01",
          },
          {
            name: input.language === "zh-Hant" ? "雞蛋" : "Egg",
            category: "dairy",
            ingredient: "egg",
          },
        ],
      },
    };
  }
}
export default {
  fetch() {
    return new Response("test fixture only");
  },
};
