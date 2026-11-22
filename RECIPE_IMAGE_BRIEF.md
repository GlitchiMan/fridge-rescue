# Fridge Rescue – Recipe Image Brief (Higgsfield)

The 12 recipes that matter most for the homepage and recipe browsing: the hand-picked
favourites, the recipes people with common fridge ingredients (eggs, potatoes, rice,
pasta, tomatoes, cheese) are matched to most often, and a spread of meal types.

**5 already have photos. 7 are still needed.**

## How images are connected

Save each file in `public/images/recipes/` using the exact filename below, then run:

```
npm run images:sync
```

The site matches each image to its recipe by filename (the recipe slug). There's nothing else
to configure. `.jpg`, `.png`, `.webp` and `.avif` all work, and large files are fine because
Next.js resizes and compresses them automatically.

## Shared photography style (use for every image)

Paste this after each dish prompt so the whole set looks like one shoot:

> Premium editorial food photography, photorealistic, natural soft daylight from a window on the
> left, gentle shadows, warm-neutral palette, matte handmade ceramic plate or bowl in off-white or
> stone grey, light oak or pale limestone table, a folded natural linen napkin, at most one or two
> small props (fork, spoon, a few raw ingredients from the recipe), shot at a 40–45° angle with a
> 50 mm lens, shallow depth of field, dish centred with generous space around it, realistic
> textures and natural steam where appropriate, appetising but not over-styled, high resolution.

**Format:** 4:3 landscape, at least 2048 × 1536 px. Keep the whole dish well inside the frame, because cards crop to 3:2 and recipe pages to 5:4.

**Avoid (negative prompt):** text, logos, watermarks, hands, people, cutlery stuck into food,
garnishes or ingredients that aren't in the recipe, neon or heavy colour grading, plastic look,
extreme close-up, top-down flat-lay, dark moody backgrounds, duplicated food.

**Important:** show the dish as the recipe actually makes it. Only use garnishes listed in the recipe.

---

## Still needed (7)

### 1. Potato and Egg Skillet
- **Slug:** `potato-and-egg-skillet`
- **Filename:** `public/images/recipes/potato-and-egg-skillet.jpg`
- **Prompt:**
  > A black cast-iron skillet of golden, crispy diced potatoes (1.5 cm cubes) with softened diced
  > onion, two sunny eggs cooked on top with set whites and glossy runny yolks, a light dusting of
  > paprika and a little melted grated cheese, cracked black pepper. Skillet resting on a linen
  > napkin, a fork beside it.

### 2. Egg Fried Rice
- **Slug:** `egg-fried-rice`
- **Filename:** `public/images/recipes/egg-fried-rice.jpg`
- **Prompt:**
  > A shallow stoneware bowl of egg fried rice: separate, lightly golden grains of rice tossed with
  > fluffy ribbons of scrambled egg, green peas and sliced spring onion (white and green), glossy
  > with a little soy sauce. Chopsticks resting on the bowl rim, a small dish of soy sauce nearby.

### 3. Red Lentil & Spinach Curry
- **Slug:** `red-lentil-curry`
- **Filename:** `public/images/recipes/red-lentil-curry.jpg`
- **Prompt:**
  > A deep ceramic bowl of thick, creamy golden-orange red lentil dal made with coconut milk and
  > tomatoes, wilted dark-green spinach folded through, a swirl of coconut milk on top, steam
  > rising. A small bowl of fluffy white rice beside it, a spoon on the napkin.

### 4. Shakshuka-Style Baked Eggs
- **Slug:** `shakshuka-style-baked-eggs`
- **Filename:** `public/images/recipes/shakshuka-style-baked-eggs.jpg`
- **Prompt:**
  > A wide frying pan of rich red tomato and sliced red-pepper sauce with soft onion, spiced with
  > cumin and paprika, four eggs gently poached in wells in the sauce: whites just set, yolks
  > glossy and runny. Shot at a 45° angle so the eggs are clearly visible; a slice of crusty bread
  > beside the pan.

### 5. Simple Tomato Pasta
- **Slug:** `tomato-pasta`
- **Filename:** `public/images/recipes/tomato-pasta.jpg`
- **Prompt:**
  > A shallow pasta bowl of spaghetti twirled into a neat nest, coated in a glossy, rich
  > tomato sauce, topped with a few torn fresh basil leaves and a light snowfall of finely grated
  > parmesan. A fork resting on the rim, a small piece of parmesan on the table.

### 6. Golden Grilled Cheese
- **Slug:** `grilled-cheese-sandwich`
- **Filename:** `public/images/recipes/grilled-cheese-sandwich.jpg`
- **Prompt:**
  > A grilled cheese sandwich on white sandwich bread, buttery and evenly golden-brown, cut
  > diagonally, the halves slightly apart to show molten cheddar stretching between them. On a
  > small plate on a wooden board, a few crumbs, no other fillings.

### 7. One-Bowl Banana Bread
- **Slug:** `banana-bread`
- **Filename:** `public/images/recipes/banana-bread.jpg`
- **Prompt:**
  > A loaf of moist banana bread with a dark golden, slightly cracked domed top, two thick slices
  > cut and leaning in front showing a tender, moist crumb with flecks of banana and a few chopped
  > walnuts. On a wooden board, one ripe spotty banana beside it.

---

## Already done (5): no action needed

| Recipe | Slug | File |
| --- | --- | --- |
| Classic Cheese Omelette | `classic-cheese-omelette` | `public/images/recipes/classic-cheese-omelette.jpg` |
| Creamy Mushroom Pasta | `creamy-mushroom-pasta` | `public/images/recipes/creamy-mushroom-pasta.jpg` |
| Fluffy Basic Pancakes | `basic-pancakes` | `public/images/recipes/basic-pancakes.jpg` |
| Leftover Chicken Fried Rice | `chicken-fried-rice` | `public/images/recipes/chicken-fried-rice.jpg` (only 700 px – a 2048 px version would look sharper on large screens) |
| Easy Tomato Soup | `tomato-soup` | `public/images/recipes/tomato-soup.jpg` |

## Next priority (optional, same style)

These come up often in results once the 12 above are done:

| Recipe | Slug |
| --- | --- |
| Spanish-Style Potato Tortilla | `spanish-style-potato-tortilla` |
| Quick Chickpea Curry | `chickpea-curry` |
| Garlic Butter Pasta | `garlic-butter-pasta` |
| Tomato Scrambled Eggs | `tomato-scrambled-eggs` |
| Crunchy Vegetable Stir-Fry | `vegetable-stir-fry` |
| Homemade Potato Wedges (skin-on wedges with paprika) | `potato-wedges` |
| Cheesy Mashed Potatoes | `cheesy-mashed-potatoes` |
| Veggie Quesadillas | `vegetable-quesadilla` |

> Note: the roasted baby potatoes with rosemary photo you shared doesn't match any current recipe
> (the wedges recipe uses paprika wedges, not halved potatoes with rosemary), so it wasn't used.
