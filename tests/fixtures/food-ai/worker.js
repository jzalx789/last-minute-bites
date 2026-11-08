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
      const group = input.use_all
        ? choices.filter((_, j) => j % input.count === i)
        : [choices[i % choices.length]];
      if (!group.length && choices.length)
        group.push(choices[i % choices.length]);
      let title = (zh ? "測試菜式" : "Test dish") + " " + (i + 1);
      if (input.exclude_titles) {
        let n = 1;
        do {
          title = (zh ? "替換菜式" : "Alternative dish") + " " + n++;
        } while (input.exclude_titles.includes(title));
      }
      const kinds = ["main", "vegetable", "soup", "cold"].filter(
        (k) => !(input.excluded_kinds || []).includes(k),
      );
      return {
        title,
        kind: ["auto", "mixed"].includes(input.style)
          ? kinds[i % kinds.length]
          : input.style,
        minutes: 15,
        servings: input.servings ?? 2,
        uses: group
          .filter((id) => input.foods.some((f) => f.id === id))
          .map((id) => {
            const food = input.foods.find((f) => f.id === id);
            return {
              food_id: input.preference === "__test_invalid__" ? 999999 : id,
              quantity:
                typeof food.quantity === "number"
                  ? Math.floor((food.quantity / input.count) * 1000) / 1000
                  : null,
              amount: zh ? "建議用量" : "suggested amount",
            };
          }),
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
  async classify(input) {
    if (input.name === "Delayed Skyr") {
      await new Promise((r) => setTimeout(r, 700));
      return {
        provider: "test-fixture",
        data: {
          status: "food",
          confidence: "high",
          category: "dairy",
          ingredient: "",
        },
      };
    }
    if (input.name === "Skyr")
      return {
        provider: "test-fixture",
        data: {
          status: "food",
          confidence: "high",
          category: "dairy",
          ingredient: "",
        },
      };
    if (input.name === "榫卯夾具")
      return {
        provider: "test-fixture",
        data: {
          status: "non_food",
          confidence: "high",
          category: "other",
          ingredient: "",
        },
      };
    if (input.name === "Unavailable food")
      return { provider: "test-fixture", error: "ai_unavailable" };
    return {
      provider: "test-fixture",
      data: {
        status: "uncertain",
        confidence: "low",
        category: "other",
        ingredient: "",
      },
    };
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

export class PushTransport extends WorkerEntrypoint {
  async send(input) {
    return {
      status: input.endpoint.includes("/gone-")
        ? 410
        : input.endpoint.includes("/retry-")
          ? 429
          : 201,
      retryAfter: 3600,
    };
  }
}
