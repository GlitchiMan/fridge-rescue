import type { Ingredient } from "@/types";

/**
 * Canonical ingredient catalog.
 *
 * - `id` is the stable identifier used everywhere (inventory, recipes, lists).
 * - `aliases` power synonym search ("capsicum" → bell-pepper).
 * - Diet & allergen data is deliberately conservative: when an ingredient
 *   *often* contains gluten (stock cubes, soy sauce, oats) it is "maybe", and
 *   recipes using it are not labelled gluten-free.
 * - `approxGramsPerPiece` is a typical size used only for clearly labelled
 *   approximations, never to silently claim exact amounts.
 */
export const INGREDIENTS: Ingredient[] = [
  // ── Vegetables ──────────────────────────────────────────────────────────
  { id: "onion", name: "Onions", noun: { one: "onion", other: "onions" }, aliases: ["onion", "yellow onion", "brown onion", "white onion"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "pantry", approxGramsPerPiece: 150, quickAdd: true, color: "#E9C98F" },
  { id: "red-onion", name: "Red onions", noun: { one: "red onion", other: "red onions" }, aliases: ["red onion", "purple onion"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "pantry", approxGramsPerPiece: 150, color: "#9B4F78" },
  { id: "garlic", name: "Garlic", noun: { one: "clove", other: "cloves" }, aliases: ["garlic clove", "garlic cloves", "garlic bulb"], category: "vegetables", defaultUnit: "clove", defaultLocation: "pantry", quickAdd: true, color: "#F3E8CF" },
  { id: "potato", name: "Potatoes", noun: { one: "potato", other: "potatoes" }, aliases: ["potato", "potatoes", "spud", "white potato", "russet"], category: "vegetables", defaultUnit: "g", defaultLocation: "pantry", approxGramsPerPiece: 200, quickAdd: true, color: "#D9B47A" },
  { id: "sweet-potato", name: "Sweet potatoes", noun: { one: "sweet potato", other: "sweet potatoes" }, aliases: ["sweet potato", "yam", "kumara"], category: "vegetables", defaultUnit: "g", defaultLocation: "pantry", approxGramsPerPiece: 250, color: "#E0874A" },
  { id: "carrot", name: "Carrots", noun: { one: "carrot", other: "carrots" }, aliases: ["carrot", "carrots"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 80, quickAdd: true, color: "#EE8A3C" },
  { id: "celery", name: "Celery", noun: { one: "stalk", other: "stalks" }, aliases: ["celery stalk", "celery stick"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", allergens: ["celery"], approxGramsPerPiece: 40, color: "#A9C97A" },
  { id: "bell-pepper", name: "Bell peppers", noun: { one: "bell pepper", other: "bell peppers" }, aliases: ["bell pepper", "capsicum", "sweet pepper", "red pepper", "green pepper", "yellow pepper", "paprika pepper"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 160, color: "#E3503E" },
  { id: "tomato", name: "Tomatoes", noun: { one: "tomato", other: "tomatoes" }, aliases: ["tomato", "tomatoes", "fresh tomato", "vine tomatoes"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 120, quickAdd: true, color: "#E0473A" },
  { id: "cherry-tomatoes", name: "Cherry tomatoes", aliases: ["cherry tomato", "grape tomatoes", "baby tomatoes"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#E8553F" },
  { id: "spinach", name: "Spinach", aliases: ["baby spinach", "spinach leaves"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#3F7D4A" },
  { id: "mushrooms", name: "Mushrooms", aliases: ["mushroom", "button mushrooms", "chestnut mushrooms", "cremini", "champignons"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#B89B7C" },
  { id: "zucchini", name: "Zucchini", noun: { one: "zucchini", other: "zucchini" }, aliases: ["courgette", "courgettes", "zucchinis"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 200, color: "#5E9B4F" },
  { id: "broccoli", name: "Broccoli", aliases: ["broccoli florets", "calabrese"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#3E7A3A" },
  { id: "cauliflower", name: "Cauliflower", aliases: ["cauliflower florets"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#F1EBD8" },
  { id: "cucumber", name: "Cucumbers", noun: { one: "cucumber", other: "cucumbers" }, aliases: ["cucumber", "english cucumber"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 300, color: "#7DB36B" },
  { id: "lettuce", name: "Lettuce", aliases: ["romaine", "iceberg", "salad leaves", "mixed greens", "little gem"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#9CCB6E" },
  { id: "cabbage", name: "Cabbage", aliases: ["white cabbage", "green cabbage", "savoy cabbage"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#B9D48F" },
  { id: "spring-onion", name: "Spring onions", noun: { one: "spring onion", other: "spring onions" }, aliases: ["scallion", "scallions", "green onion", "green onions", "spring onion"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 15, color: "#6DAA4E" },
  { id: "ginger", name: "Fresh ginger", aliases: ["ginger", "ginger root"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#D8B575" },
  { id: "chili", name: "Fresh chillies", noun: { one: "chilli", other: "chillies" }, aliases: ["chili", "chilli", "chile", "red chili", "green chili", "jalapeno", "jalapeño"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 15, color: "#C9302C" },
  { id: "kale", name: "Kale", aliases: ["curly kale", "cavolo nero"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#2F6A3E" },
  { id: "leek", name: "Leeks", noun: { one: "leek", other: "leeks" }, aliases: ["leek"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 250, color: "#9FC48A" },
  { id: "avocado", name: "Avocados", noun: { one: "avocado", other: "avocados" }, aliases: ["avocado", "avo"], category: "vegetables", defaultUnit: "pcs", defaultLocation: "pantry", approxGramsPerPiece: 170, color: "#7A9A3A" },
  { id: "green-beans", name: "Green beans", aliases: ["string beans", "french beans"], category: "vegetables", defaultUnit: "g", defaultLocation: "fridge", color: "#4E8C3E" },

  // ── Fruits ──────────────────────────────────────────────────────────────
  { id: "banana", name: "Bananas", noun: { one: "banana", other: "bananas" }, aliases: ["banana", "ripe banana"], category: "fruits", defaultUnit: "pcs", defaultLocation: "pantry", approxGramsPerPiece: 120, quickAdd: true, color: "#F2D35B" },
  { id: "apple", name: "Apples", noun: { one: "apple", other: "apples" }, aliases: ["apple"], category: "fruits", defaultUnit: "pcs", defaultLocation: "fridge", approxGramsPerPiece: 180, color: "#D2463C" },
  { id: "lemon", name: "Lemons", noun: { one: "lemon", other: "lemons" }, aliases: ["lemon"], category: "fruits", defaultUnit: "pcs", defaultLocation: "fridge", color: "#F4DB4E" },
  { id: "lime", name: "Limes", noun: { one: "lime", other: "limes" }, aliases: ["lime"], category: "fruits", defaultUnit: "pcs", defaultLocation: "fridge", color: "#8DBE45" },
  { id: "lemon-juice", name: "Lemon juice", aliases: ["bottled lemon juice"], category: "fruits", defaultUnit: "ml", defaultLocation: "fridge", color: "#F4DB4E" },
  { id: "berries", name: "Berries", aliases: ["blueberries", "strawberries", "raspberries", "mixed berries", "frozen berries"], category: "fruits", defaultUnit: "g", defaultLocation: "fridge", color: "#5A4B9C" },
  { id: "raisins", name: "Raisins", aliases: ["sultanas", "dried fruit"], category: "fruits", defaultUnit: "g", defaultLocation: "pantry", color: "#6B3A2E" },

  // ── Meat & poultry ──────────────────────────────────────────────────────
  { id: "chicken-breast", name: "Chicken breast", aliases: ["chicken", "chicken breasts", "chicken fillet", "boneless chicken"], category: "meat", defaultUnit: "g", defaultLocation: "fridge", animal: "meat", quickAdd: true, color: "#F2C6A8" },
  { id: "chicken-thighs", name: "Chicken thighs", aliases: ["chicken thigh", "boneless thighs"], category: "meat", defaultUnit: "g", defaultLocation: "fridge", animal: "meat", color: "#E8B48F" },
  { id: "cooked-chicken", name: "Cooked chicken", aliases: ["leftover chicken", "roast chicken", "rotisserie chicken", "shredded chicken"], category: "meat", defaultUnit: "g", defaultLocation: "fridge", animal: "meat", color: "#D9A36F" },
  { id: "ground-beef", name: "Ground beef", aliases: ["minced beef", "beef mince", "mince", "hamburger meat"], category: "meat", defaultUnit: "g", defaultLocation: "fridge", animal: "meat", color: "#9C4A3C" },
  { id: "bacon", name: "Bacon", noun: { one: "rasher", other: "rashers" }, aliases: ["bacon rashers", "streaky bacon", "pancetta"], category: "meat", defaultUnit: "slice", defaultLocation: "fridge", animal: "meat", color: "#C0675A" },
  { id: "ham", name: "Ham", aliases: ["sliced ham", "cooked ham", "deli ham"], category: "meat", defaultUnit: "g", defaultLocation: "fridge", animal: "meat", color: "#E59A9A" },
  { id: "sausages", name: "Sausages", noun: { one: "sausage", other: "sausages" }, aliases: ["sausage", "bangers", "chipolatas"], category: "meat", defaultUnit: "pcs", defaultLocation: "fridge", animal: "meat", gluten: "maybe", color: "#A85A43" },

  // ── Fish & seafood ──────────────────────────────────────────────────────
  { id: "salmon", name: "Salmon fillets", noun: { one: "fillet", other: "fillets" }, aliases: ["salmon", "salmon fillet"], category: "fish", defaultUnit: "pcs", defaultLocation: "fridge", animal: "fish", allergens: ["fish"], approxGramsPerPiece: 130, color: "#F08C6A" },
  { id: "shrimp", name: "Shrimp", aliases: ["prawns", "king prawns", "shrimps"], category: "fish", defaultUnit: "g", defaultLocation: "freezer", animal: "fish", allergens: ["shellfish"], color: "#F4A48A" },

  // ── Dairy ───────────────────────────────────────────────────────────────
  { id: "milk", name: "Milk", aliases: ["whole milk", "semi-skimmed milk", "skim milk", "cow's milk", "dairy milk"], category: "dairy", defaultUnit: "ml", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], quickAdd: true, color: "#F7F4EC" },
  { id: "butter", name: "Butter", aliases: ["salted butter", "unsalted butter"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], quickAdd: true, stapleCandidate: true, color: "#F5DA8A" },
  { id: "cheese", name: "Cheese (cheddar-style)", aliases: ["cheese", "cheddar", "gouda", "edam", "emmental", "grated cheese", "red leicester", "monterey jack"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], quickAdd: true, color: "#F2B84B" },
  { id: "mozzarella", name: "Mozzarella", aliases: ["mozzarella cheese", "fresh mozzarella"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#FAF6EA" },
  { id: "parmesan", name: "Parmesan", aliases: ["parmigiano", "parmigiano reggiano", "grana padano", "hard cheese"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#EEDBA0" },
  { id: "feta", name: "Feta", aliases: ["feta cheese", "white cheese"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#F8F5EE" },
  { id: "cream", name: "Cream", aliases: ["heavy cream", "double cream", "whipping cream", "single cream", "cooking cream"], category: "dairy", defaultUnit: "ml", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#FBF3DF" },
  { id: "sour-cream", name: "Sour cream", aliases: ["soured cream", "crème fraîche", "creme fraiche"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#F9F4E8" },
  { id: "greek-yogurt", name: "Greek yogurt", aliases: ["greek yoghurt", "strained yogurt"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#F6F2E6" },
  { id: "yogurt", name: "Plain yogurt", aliases: ["yogurt", "yoghurt", "natural yogurt", "plain yoghurt"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], quickAdd: true, color: "#F4F0E4" },
  { id: "cream-cheese", name: "Cream cheese", aliases: ["soft cheese", "philadelphia"], category: "dairy", defaultUnit: "g", defaultLocation: "fridge", animal: "dairy", allergens: ["milk"], color: "#F7F2E5" },

  // ── Eggs ────────────────────────────────────────────────────────────────
  { id: "egg", name: "Eggs", noun: { one: "egg", other: "eggs" }, aliases: ["egg", "eggs", "hen eggs", "free range eggs"], category: "eggs", defaultUnit: "pcs", defaultLocation: "fridge", animal: "egg", allergens: ["egg"], approxGramsPerPiece: 50, quickAdd: true, color: "#F6C744" },

  // ── Grains & pasta ──────────────────────────────────────────────────────
  { id: "rice", name: "Rice (uncooked)", aliases: ["rice", "white rice", "long grain rice", "basmati", "jasmine rice", "dry rice"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", quickAdd: true, color: "#F4EFE2" },
  { id: "cooked-rice", name: "Cooked rice", aliases: ["leftover rice", "day-old rice", "steamed rice"], category: "grains", defaultUnit: "g", defaultLocation: "fridge", color: "#F7F3E8" },
  { id: "pasta", name: "Pasta", aliases: ["spaghetti", "penne", "fusilli", "macaroni", "linguine", "farfalle", "rigatoni", "dry pasta"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], quickAdd: true, color: "#EBC777" },
  { id: "egg-noodles", name: "Noodles", aliases: ["noodles", "egg noodles", "ramen noodles", "wheat noodles"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", gluten: true, animal: "egg", allergens: ["gluten", "egg"], color: "#E9C46A" },
  { id: "bread", name: "Bread", noun: { one: "slice", other: "slices" }, aliases: ["sliced bread", "loaf", "white bread", "wholemeal bread", "sandwich bread", "toast"], category: "grains", defaultUnit: "slice", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], quickAdd: true, color: "#D9A066" },
  { id: "baguette", name: "Baguette", aliases: ["french bread", "french stick", "ciabatta"], category: "grains", defaultUnit: "pcs", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], approxGramsPerPiece: 250, color: "#D49A5A" },
  { id: "tortillas", name: "Tortillas", noun: { one: "tortilla", other: "tortillas" }, aliases: ["tortilla", "flour tortillas", "wraps", "wrap"], category: "grains", defaultUnit: "pcs", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], color: "#EDD9A8" },
  { id: "oats", name: "Rolled oats", aliases: ["oats", "porridge oats", "oatmeal", "old-fashioned oats"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", gluten: "maybe", color: "#DCC79A" },
  { id: "flour", name: "Plain flour", aliases: ["flour", "all-purpose flour", "wheat flour", "ap flour"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], quickAdd: true, stapleCandidate: true, color: "#F8F4EA" },
  { id: "breadcrumbs", name: "Breadcrumbs", aliases: ["panko", "dried breadcrumbs"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], color: "#D8B47A" },
  { id: "couscous", name: "Couscous", aliases: ["cous cous"], category: "grains", defaultUnit: "g", defaultLocation: "pantry", gluten: true, allergens: ["gluten"], color: "#E9D69E" },

  // ── Beans & legumes ─────────────────────────────────────────────────────
  { id: "chickpeas", name: "Chickpeas (canned)", noun: { one: "can", other: "cans" }, aliases: ["chickpeas", "garbanzo beans", "garbanzos", "canned chickpeas", "chick peas"], category: "legumes", defaultUnit: "can", defaultLocation: "pantry", color: "#E2C285" },
  { id: "black-beans", name: "Black beans (canned)", aliases: ["black beans", "turtle beans", "canned black beans"], category: "legumes", defaultUnit: "can", defaultLocation: "pantry", quickAdd: true, color: "#3A3432" },
  { id: "kidney-beans", name: "Kidney beans (canned)", aliases: ["kidney beans", "red kidney beans", "red beans"], category: "legumes", defaultUnit: "can", defaultLocation: "pantry", color: "#8E3B3B" },
  { id: "red-lentils", name: "Red lentils", aliases: ["lentils", "split red lentils", "masoor dal", "dried lentils"], category: "legumes", defaultUnit: "g", defaultLocation: "pantry", color: "#E08A4E" },

  // ── Canned foods ────────────────────────────────────────────────────────
  { id: "canned-tomatoes", name: "Canned tomatoes", noun: { one: "can", other: "cans" }, aliases: ["chopped tomatoes", "tinned tomatoes", "crushed tomatoes", "diced tomatoes", "plum tomatoes"], category: "canned", defaultUnit: "can", defaultLocation: "pantry", color: "#C9392D" },
  { id: "tomato-paste", name: "Tomato paste", aliases: ["tomato puree", "tomato purée", "concentrated tomato"], category: "canned", defaultUnit: "tbsp", defaultLocation: "pantry", color: "#B32E25" },
  { id: "passata", name: "Passata / tomato sauce", aliases: ["passata", "tomato sauce", "sieved tomatoes", "marinara"], category: "canned", defaultUnit: "ml", defaultLocation: "pantry", color: "#C13A2C" },
  { id: "coconut-milk", name: "Coconut milk", noun: { one: "can", other: "cans" }, aliases: ["canned coconut milk", "coconut cream"], category: "canned", defaultUnit: "can", defaultLocation: "pantry", color: "#F5F1E6" },
  { id: "canned-tuna", name: "Canned tuna", noun: { one: "can", other: "cans" }, aliases: ["tuna", "tinned tuna", "tuna chunks"], category: "canned", defaultUnit: "can", defaultLocation: "pantry", animal: "fish", allergens: ["fish"], color: "#C7A48A" },
  { id: "sweetcorn", name: "Sweetcorn", aliases: ["corn", "canned corn", "frozen corn", "corn kernels"], category: "canned", defaultUnit: "g", defaultLocation: "pantry", color: "#F3D046" },

  // ── Herbs & spices ──────────────────────────────────────────────────────
  { id: "salt", name: "Salt", aliases: ["sea salt", "table salt", "kosher salt"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", stapleCandidate: true, color: "#FFFFFF" },
  { id: "black-pepper", name: "Black pepper", aliases: ["pepper", "ground pepper", "peppercorns"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", stapleCandidate: true, color: "#3B3530" },
  { id: "paprika", name: "Paprika", aliases: ["smoked paprika", "sweet paprika", "pimenton"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#C1442E" },
  { id: "cumin", name: "Ground cumin", aliases: ["cumin", "cumin powder"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#A5793D" },
  { id: "curry-powder", name: "Curry powder", aliases: ["mild curry powder", "madras curry powder"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", allergens: ["mustard"], color: "#D9A12B" },
  { id: "garam-masala", name: "Garam masala", aliases: ["garam masala powder"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#8A5A35" },
  { id: "turmeric", name: "Ground turmeric", aliases: ["turmeric"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#E3A51C" },
  { id: "chili-flakes", name: "Chilli flakes", aliases: ["chili flakes", "red pepper flakes", "crushed red pepper"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#B73A26" },
  { id: "dried-oregano", name: "Dried oregano", aliases: ["oregano", "italian herbs", "mixed herbs", "dried herbs"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#6E7D3E" },
  { id: "dried-thyme", name: "Dried thyme", aliases: ["thyme"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#6C7A4A" },
  { id: "cinnamon", name: "Ground cinnamon", aliases: ["cinnamon"], category: "herbs-spices", defaultUnit: "tsp", defaultLocation: "pantry", color: "#9A5B32" },
  { id: "parsley", name: "Fresh parsley", aliases: ["parsley", "flat-leaf parsley", "italian parsley"], category: "herbs-spices", defaultUnit: "g", defaultLocation: "fridge", color: "#3D8B3D" },
  { id: "basil", name: "Fresh basil", aliases: ["basil", "basil leaves"], category: "herbs-spices", defaultUnit: "g", defaultLocation: "pantry", color: "#2F7A3A" },
  { id: "cilantro", name: "Fresh coriander", aliases: ["cilantro", "coriander leaves", "fresh cilantro", "coriander"], category: "herbs-spices", defaultUnit: "g", defaultLocation: "fridge", color: "#3C8A43" },

  // ── Sauces & oils ───────────────────────────────────────────────────────
  { id: "cooking-oil", name: "Cooking oil", aliases: ["vegetable oil", "sunflower oil", "canola oil", "rapeseed oil", "neutral oil", "oil"], category: "sauces-oils", defaultUnit: "ml", defaultLocation: "pantry", stapleCandidate: true, color: "#F2D98A" },
  { id: "olive-oil", name: "Olive oil", aliases: ["extra virgin olive oil", "evoo"], category: "sauces-oils", defaultUnit: "ml", defaultLocation: "pantry", stapleCandidate: true, color: "#B9B44A" },
  { id: "sesame-oil", name: "Sesame oil", aliases: ["toasted sesame oil"], category: "sauces-oils", defaultUnit: "ml", defaultLocation: "pantry", allergens: ["sesame"], color: "#B9853E" },
  { id: "soy-sauce", name: "Soy sauce", aliases: ["light soy sauce", "dark soy sauce", "shoyu", "tamari"], category: "sauces-oils", defaultUnit: "tbsp", defaultLocation: "pantry", gluten: "maybe", allergens: ["soy"], color: "#4A2E22" },
  { id: "vinegar", name: "Vinegar", aliases: ["white wine vinegar", "cider vinegar", "apple cider vinegar", "red wine vinegar"], category: "sauces-oils", defaultUnit: "tbsp", defaultLocation: "pantry", color: "#EFE4C2" },
  { id: "mayonnaise", name: "Mayonnaise", aliases: ["mayo"], category: "sauces-oils", defaultUnit: "tbsp", defaultLocation: "fridge", animal: "egg", allergens: ["egg"], color: "#F7EFD2" },
  { id: "mustard", name: "Mustard", aliases: ["dijon mustard", "wholegrain mustard", "yellow mustard"], category: "sauces-oils", defaultUnit: "tsp", defaultLocation: "fridge", allergens: ["mustard"], color: "#D9B030" },
  { id: "hot-sauce", name: "Hot sauce", aliases: ["chili sauce", "sriracha", "tabasco"], category: "sauces-oils", defaultUnit: "tsp", defaultLocation: "fridge", color: "#C8361F" },
  { id: "salsa", name: "Salsa", aliases: ["tomato salsa", "jarred salsa", "pico de gallo"], category: "sauces-oils", defaultUnit: "tbsp", defaultLocation: "fridge", color: "#C9452F" },
  { id: "stock", name: "Stock (vegetable)", aliases: ["vegetable stock", "vegetable broth", "stock cube", "bouillon", "broth", "veg stock"], category: "sauces-oils", defaultUnit: "ml", defaultLocation: "pantry", gluten: "maybe", allergens: ["celery"], color: "#D7B56A" },
  { id: "chicken-stock", name: "Chicken stock", aliases: ["chicken broth", "chicken bouillon", "chicken stock cube"], category: "sauces-oils", defaultUnit: "ml", defaultLocation: "pantry", animal: "meat", gluten: "maybe", allergens: ["celery"], color: "#D9B163" },
  { id: "peanut-butter", name: "Peanut butter", aliases: ["smooth peanut butter", "crunchy peanut butter"], category: "sauces-oils", defaultUnit: "tbsp", defaultLocation: "pantry", allergens: ["peanuts"], color: "#B9803F" },

  // ── Frozen ──────────────────────────────────────────────────────────────
  { id: "peas", name: "Frozen peas", aliases: ["peas", "garden peas", "petits pois", "green peas"], category: "frozen", defaultUnit: "g", defaultLocation: "freezer", color: "#6BAA45" },
  { id: "frozen-mixed-veg", name: "Frozen mixed vegetables", aliases: ["mixed vegetables", "frozen veg", "stir fry vegetables", "mixed veg"], category: "frozen", defaultUnit: "g", defaultLocation: "freezer", color: "#8EB85A" },

  // ── Other ───────────────────────────────────────────────────────────────
  { id: "water", name: "Water", aliases: ["tap water"], category: "other", defaultUnit: "ml", defaultLocation: "other", stapleCandidate: true, color: "#D5E8F0" },
  { id: "sugar", name: "Sugar", aliases: ["white sugar", "caster sugar", "granulated sugar"], category: "other", defaultUnit: "g", defaultLocation: "pantry", stapleCandidate: true, color: "#FBFBF8" },
  { id: "brown-sugar", name: "Brown sugar", aliases: ["light brown sugar", "soft brown sugar", "demerara"], category: "other", defaultUnit: "g", defaultLocation: "pantry", color: "#B5824A" },
  { id: "honey", name: "Honey", aliases: ["runny honey"], category: "other", defaultUnit: "tbsp", defaultLocation: "pantry", animal: "honey", color: "#E8A92E" },
  { id: "maple-syrup", name: "Maple syrup", aliases: ["syrup", "pancake syrup"], category: "other", defaultUnit: "tbsp", defaultLocation: "pantry", color: "#B8742E" },
  { id: "baking-powder", name: "Baking powder", aliases: ["baking powder"], category: "other", defaultUnit: "tsp", defaultLocation: "pantry", gluten: "maybe", color: "#F4F4F0" },
  { id: "baking-soda", name: "Baking soda", aliases: ["bicarbonate of soda", "bicarb", "sodium bicarbonate"], category: "other", defaultUnit: "tsp", defaultLocation: "pantry", color: "#F4F4F0" },
  { id: "vanilla", name: "Vanilla extract", aliases: ["vanilla", "vanilla essence"], category: "other", defaultUnit: "tsp", defaultLocation: "pantry", color: "#5A3A22" },
  { id: "plant-milk", name: "Plant milk", aliases: ["oat milk", "soy milk", "almond milk", "non-dairy milk", "dairy-free milk"], category: "other", defaultUnit: "ml", defaultLocation: "fridge", gluten: "maybe", color: "#EFE7D3" },
  { id: "walnuts", name: "Walnuts", aliases: ["walnut", "chopped walnuts", "pecans"], category: "other", defaultUnit: "g", defaultLocation: "pantry", allergens: ["tree-nuts"], color: "#8A5E3B" },
];

const BY_ID = new Map<string, Ingredient>(INGREDIENTS.map((i) => [i.id, i]));

export function getIngredient(id: string): Ingredient | undefined {
  return BY_ID.get(id);
}

export function requireIngredient(id: string): Ingredient {
  const ing = BY_ID.get(id);
  if (!ing) throw new Error(`Unknown ingredient id: ${id}`);
  return ing;
}

export const QUICK_ADD_IDS = [
  "egg", "milk", "rice", "pasta", "chicken-breast", "cheese", "potato", "tomato",
  "onion", "garlic", "bread", "butter", "carrot", "yogurt", "flour", "black-beans",
] as const;

export const CATEGORY_LABELS: Record<Ingredient["category"], string> = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  meat: "Meat & poultry",
  fish: "Fish & seafood",
  dairy: "Dairy",
  eggs: "Eggs",
  grains: "Grains & pasta",
  legumes: "Beans & legumes",
  canned: "Canned foods",
  "herbs-spices": "Herbs & spices",
  "sauces-oils": "Sauces & oils",
  frozen: "Frozen food",
  other: "Other",
};
