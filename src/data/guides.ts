export interface Guide {
  slug: string;
  title: string;
  description: string;
  intro: string[];
  sections: { heading: string; paragraphs: string[]; tips?: string[] }[];
  recipeSlugs: string[];
  /** Ingredients a reader can pre-fill into the finder. */
  keyIngredients: string[];
}

/**
 * Hand-written guides. Each one answers a real question and links to recipes
 * that genuinely fit – kept deliberately few to avoid thin pages.
 */
export const GUIDES: Guide[] = [
  {
    slug: "what-to-make-with-eggs-and-potatoes",
    title: "What to make with eggs and potatoes",
    description: "Five dependable meals from two of the cheapest ingredients in your kitchen, plus tips for cooking potatoes so they're crisp, fluffy or creamy.",
    intro: [
      "Eggs and potatoes might be the most useful pairing in home cooking. Both are cheap, keep for a while, and together they make breakfast, lunch or a proper dinner. If you also have an onion and a little cheese, you have options for the whole week.",
    ],
    sections: [
      {
        heading: "Pick the potato texture you want",
        paragraphs: [
          "The way you cook the potato decides the dish. Diced and fried, potatoes go crisp and golden – perfect under a fried egg in a skillet. Sliced thin and cooked gently in oil, they turn meltingly soft, which is the secret of a Spanish-style tortilla. Grated and squeezed dry, they fry into lacy pancakes.",
          "Floury potatoes make the fluffiest mash and the crispiest roast edges; waxy potatoes hold their shape in slices and salads. If you don't know which you have, most all-rounder potatoes work for every recipe below.",
        ],
        tips: [
          "Cut potatoes into even pieces so they finish cooking at the same time.",
          "Covering the pan for the first ten minutes steams diced potato through before it crisps.",
          "Leftover boiled or roasted potatoes are a head start – skip straight to browning.",
        ],
      },
      {
        heading: "How many eggs per person?",
        paragraphs: [
          "As a main meal, plan on two eggs per person alongside about 200 g of potato. For a tortilla, a ratio of roughly six eggs to 500 g potato gives a firm but tender slice. If you're cooking for anyone pregnant, very young, elderly or unwell, cook eggs until both whites and yolks are firm.",
        ],
      },
    ],
    recipeSlugs: ["potato-and-egg-skillet", "spanish-style-potato-tortilla", "potato-pancakes", "breakfast-burrito", "classic-cheese-omelette"],
    keyIngredients: ["egg", "potato", "onion"],
  },
  {
    slug: "easy-meals-with-leftover-rice",
    title: "Easy meals with leftover rice",
    description: "How to store cooked rice safely and turn it into fried rice, bowls and more – with the food-safety basics that matter.",
    intro: [
      "Cooked rice is one of the most common leftovers – and one of the best. Day-old rice has dried out slightly, which is exactly what makes fried rice taste like it came from a wok rather than a steamer.",
    ],
    sections: [
      {
        heading: "Store leftover rice the right way",
        paragraphs: [
          "Rice needs more care than most leftovers. Spores of bacteria that survive cooking can multiply if cooked rice sits warm, so cool it quickly – spread it on a tray – and get it into the fridge within about an hour. Use it within a day, reheat it until piping hot all the way through, and only reheat it once.",
          "If rice has been left out at room temperature for a long time, the safest choice is to throw it away. Reheating doesn't reliably make it safe again.",
        ],
      },
      {
        heading: "Why chilled rice fries better",
        paragraphs: [
          "Freshly cooked rice is full of steam; in a hot pan it clumps and turns soft. Chilled rice has firmed up and lost surface moisture, so the grains separate, toast in the oil and pick up flavour. Break up clumps with your fingers before it hits the pan, and keep the heat high.",
        ],
        tips: [
          "No leftovers? Cook rice, spread it out to cool quickly, then refrigerate before frying.",
          "Scramble eggs first and set them aside so they stay fluffy.",
          "Frozen peas or mixed vegetables go straight into the pan – no thawing needed.",
        ],
      },
    ],
    recipeSlugs: ["egg-fried-rice", "simple-fried-rice", "chicken-fried-rice", "bean-and-rice-bowl"],
    keyIngredients: ["cooked-rice", "egg", "peas"],
  },
  {
    slug: "quick-dinners-with-chicken-and-rice",
    title: "Quick dinners with chicken and rice",
    description: "Weeknight chicken and rice dinners in about 30 minutes, plus how to cook rice by absorption and keep chicken juicy.",
    intro: [
      "Chicken and rice is a weeknight classic for a reason: it's filling, it suits almost any flavour, and both ingredients are easy to keep on hand. With a few spices and a vegetable or two, you can have dinner on the table in about half an hour.",
    ],
    sections: [
      {
        heading: "Rice without the guesswork",
        paragraphs: [
          "For fluffy long-grain rice, rinse it, then simmer it covered in roughly twice its weight of water over the lowest heat for about 12 minutes. Turn off the heat and leave the lid on for five more minutes. The resting time finishes the cooking and stops the bottom catching.",
        ],
      },
      {
        heading: "Keeping chicken juicy",
        paragraphs: [
          "Cut chicken breast into bite-sized pieces or thin slices so it cooks quickly and evenly; long cooking is what dries it out. It's done when it's cooked through with no pink in the middle – a food thermometer is the most reliable check, using the target temperature from your local food safety guidance. Boneless thighs are more forgiving if you have them.",
          "Leftover cooked chicken is a gift for quick meals: add it at the end of cooking and heat until piping hot. Only use leftovers that were cooled and refrigerated promptly.",
        ],
      },
    ],
    recipeSlugs: ["chicken-and-rice-bowl", "chicken-fried-rice", "creamy-chicken-pasta", "chicken-noodle-soup"],
    keyIngredients: ["chicken-breast", "rice"],
  },
  {
    slug: "what-to-cook-with-tomatoes",
    title: "What to cook with tomatoes",
    description: "Fresh, cherry or canned – how to get the most from tomatoes, with easy recipes for soups, eggs and pasta.",
    intro: [
      "Tomatoes turn up in almost every kitchen, fresh or canned. Fresh ones are best when they're ripe and fragrant; canned tomatoes are picked ripe and give dependable flavour all year, which makes them ideal for sauces and soups.",
    ],
    sections: [
      {
        heading: "Fresh or canned?",
        paragraphs: [
          "Use fresh tomatoes where you want brightness and juice: tossed into salads, folded into scrambled eggs, or cooked briefly. Reach for a can when you want a rich sauce that simmers for 15 minutes or more. A pinch of sugar and a small knob of butter both soften the acidity of canned tomatoes.",
          "Soft, over-ripe tomatoes that aren't great raw are perfect for cooking – as long as they aren't mouldy or leaking. Store whole tomatoes at room temperature for best flavour, and refrigerate once cut.",
        ],
      },
      {
        heading: "Swaps that work",
        paragraphs: [
          "About four fresh tomatoes can stand in for one can in most sauces – simmer a little longer. Passata makes a smoother result. Cherry tomatoes can replace regular ones by weight.",
        ],
      },
    ],
    recipeSlugs: ["tomato-scrambled-eggs", "tomato-soup", "tomato-pasta", "shakshuka-style-baked-eggs", "chickpea-salad"],
    keyIngredients: ["tomato", "canned-tomatoes", "onion"],
  },
  {
    slug: "meals-when-the-fridge-is-almost-empty",
    title: "Simple meals when the fridge is almost empty",
    description: "Pantry-first meals you can make from a few staples – pasta, rice, eggs, cans and spices – before the next shop.",
    intro: [
      "An almost-empty fridge doesn't have to mean takeaway. Most kitchens have a few long-life staples – pasta, rice, a can or two, an onion, some spices – and those are enough for a satisfying meal.",
    ],
    sections: [
      {
        heading: "The five-item pantry that rescues dinner",
        paragraphs: [
          "If you keep pasta or rice, canned tomatoes, a can of beans or chickpeas, an onion and garlic, you're never more than 30 minutes from a proper meal. Add eggs and a hard cheese and you can make almost anything on this list.",
        ],
        tips: [
          "Garlic, butter and pasta water make a real sauce in ten minutes.",
          "Two cans of chickpeas plus one of tomatoes and some spices make a curry for three.",
          "Red lentils cook from dry in about 20 minutes with no soaking.",
        ],
      },
      {
        heading: "Use the bits and pieces too",
        paragraphs: [
          "Half a pepper, a handful of spinach or the end of a bag of frozen peas can almost always be added to fried rice, a soup or an omelette. That's the heart of fridge rescue: use what's there before buying more.",
        ],
      },
    ],
    recipeSlugs: ["garlic-butter-pasta", "chickpea-curry", "red-lentil-curry", "tomato-pasta", "classic-cheese-omelette"],
    keyIngredients: ["pasta", "canned-tomatoes", "garlic", "chickpeas"],
  },
  {
    slug: "budget-student-dinners",
    title: "Budget-friendly student dinners",
    description: "Cheap, filling dinners that need little equipment – plus how to plan a week of meals around a short shopping list.",
    intro: [
      "Cooking on a student budget is mostly about planning: buy versatile ingredients, use them across several meals, and cook enough to have lunch the next day. None of the recipes below need special equipment beyond a pan and a hob.",
    ],
    sections: [
      {
        heading: "Shop for the week, not the recipe",
        paragraphs: [
          "Choose two or three recipes that share ingredients. A bag of onions, a few cans of tomatoes and chickpeas, eggs, rice and pasta will cover tomato pasta, a chickpea curry, egg fried rice and a shakshuka-style breakfast. The meal planner can add only what's missing to your shopping list.",
          "Cooking a big pot of curry or soup and refrigerating portions saves time and money – just cool leftovers quickly and reheat until piping hot.",
        ],
      },
      {
        heading: "Small kitchen? No problem",
        paragraphs: [
          "Every recipe in this list is a one-pan or one-pot job. If you only have a microwave and a kettle, overnight oats need neither, and the tuna and egg sandwiches are no-fuss lunches.",
        ],
      },
    ],
    recipeSlugs: ["tuna-pasta", "egg-fried-rice", "chickpea-curry", "bean-and-rice-bowl", "overnight-oats", "vegetable-quesadilla"],
    keyIngredients: ["pasta", "rice", "egg", "canned-tuna"],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
