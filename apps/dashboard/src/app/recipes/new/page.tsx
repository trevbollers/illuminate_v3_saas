"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
} from "@illuminate/ui";

const recipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1, "Select an ingredient"),
        quantity: z.string().min(1, "Quantity is required"),
        unit: z.string().min(1, "Unit is required"),
      })
    )
    .min(1, "At least one ingredient is required"),
  instructions: z.array(
    z.object({
      description: z.string().min(1, "Step description is required"),
      duration: z.string().optional(),
      temperature: z.string().optional(),
    })
  ),
  yieldAmount: z.string().min(1, "Yield amount is required"),
  yieldUnit: z.string().min(1, "Yield unit is required"),
});

type RecipeFormValues = z.infer<typeof recipeSchema>;

const availableIngredients = [
  { id: "ing-1", name: "Beef Brisket (Whole)", costPerUnit: 6.5, unit: "lb" },
  { id: "ing-2", name: "Sea Salt", costPerUnit: 0.8, unit: "lb" },
  { id: "ing-3", name: "Black Pepper (Ground)", costPerUnit: 12.0, unit: "lb" },
  { id: "ing-4", name: "Garlic Powder", costPerUnit: 8.5, unit: "lb" },
  { id: "ing-5", name: "Onion Powder", costPerUnit: 7.0, unit: "lb" },
  { id: "ing-6", name: "Paprika (Smoked)", costPerUnit: 14.0, unit: "lb" },
  { id: "ing-7", name: "Brown Sugar", costPerUnit: 2.5, unit: "lb" },
  { id: "ing-8", name: "Pork Shoulder", costPerUnit: 4.2, unit: "lb" },
  { id: "ing-9", name: "Hickory Wood Chips", costPerUnit: 3.0, unit: "bag" },
  { id: "ing-10", name: "Curing Salt #1", costPerUnit: 5.0, unit: "lb" },
];

const recipeCategories = ["Smoking", "Sausage", "Curing", "Roasting", "Marinating"];
const ingredientUnits = ["lb", "oz", "g", "kg", "tsp", "tbsp", "cup", "each", "bag"];

export default function NewRecipePage() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      ingredients: [{ ingredientId: "", quantity: "", unit: "lb" }],
      instructions: [{ description: "", duration: "", temperature: "" }],
      yieldAmount: "",
      yieldUnit: "lb",
    },
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({ control, name: "ingredients" });

  const {
    fields: instructionFields,
    append: appendInstruction,
    remove: removeInstruction,
  } = useFieldArray({ control, name: "instructions" });

  const watchedIngredients = watch("ingredients");
  const watchedYield = watch("yieldAmount");

  const totalCost = useMemo(() => {
    let cost = 0;
    for (const ing of watchedIngredients) {
      const found = availableIngredients.find(
        (a) => a.id === ing.ingredientId
      );
      if (found && ing.quantity) {
        cost += found.costPerUnit * parseFloat(ing.quantity || "0");
      }
    }
    return cost;
  }, [watchedIngredients]);

  const costPerUnit = useMemo(() => {
    const yieldNum = parseFloat(watchedYield || "0");
    if (yieldNum <= 0) return 0;
    return totalCost / yieldNum;
  }, [totalCost, watchedYield]);

  const onSubmit = (data: RecipeFormValues) => {
    console.log("Recipe data:", data);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/recipes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Recipe</h1>
          <p className="text-muted-foreground">
            Define a new processing recipe with ingredients and instructions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Recipe Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Smoked Brisket"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(val) => setValue("category", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipeCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the recipe process..."
                rows={3}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>
                  Add all ingredients needed for this recipe.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendIngredient({
                    ingredientId: "",
                    quantity: "",
                    unit: "lb",
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Ingredient
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredientFields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-3">
                <div className="flex-[3] space-y-1">
                  <Label className="text-xs">Ingredient</Label>
                  <Select
                    onValueChange={(val) =>
                      setValue(`ingredients.${index}.ingredientId`, val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} (${ing.costPerUnit}/{ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    placeholder="0"
                    {...register(`ingredients.${index}.quantity`)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Select
                    defaultValue="lb"
                    onValueChange={(val) =>
                      setValue(`ingredients.${index}.unit`, val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientUnits.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredientFields.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {errors.ingredients && (
              <p className="text-xs text-destructive">
                {typeof errors.ingredients.message === "string"
                  ? errors.ingredients.message
                  : "Please check ingredient entries."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>
                  Step-by-step processing instructions.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendInstruction({
                    description: "",
                    duration: "",
                    temperature: "",
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {instructionFields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold mt-6">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      placeholder="Describe this step..."
                      rows={2}
                      {...register(`instructions.${index}.description`)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Duration</Label>
                      <Input
                        placeholder="e.g., 12 hours"
                        {...register(`instructions.${index}.duration`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Temperature</Label>
                      <Input
                        placeholder="e.g., 225°F"
                        {...register(`instructions.${index}.temperature`)}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mt-6"
                  onClick={() => removeInstruction(index)}
                  disabled={instructionFields.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Yield & Cost */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Yield & Cost Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yieldAmount">
                  Yield Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="yieldAmount"
                  placeholder="e.g., 12"
                  {...register("yieldAmount")}
                />
                {errors.yieldAmount && (
                  <p className="text-xs text-destructive">
                    {errors.yieldAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Yield Unit <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue="lb"
                  onValueChange={(val) => setValue("yieldUnit", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredientUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="mt-1 text-2xl font-bold">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Cost per Unit</p>
                <p className="mt-1 text-2xl font-bold">
                  ${costPerUnit.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">Ingredients</p>
                <p className="mt-1 text-2xl font-bold">
                  {ingredientFields.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" asChild>
            <Link href="/recipes">Cancel</Link>
          </Button>
          <Button type="submit">Save Recipe</Button>
        </div>
      </form>
    </div>
  );
}
