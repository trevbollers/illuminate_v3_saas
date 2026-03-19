"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, ImagePlus } from "lucide-react";
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
  Badge,
  Separator,
} from "@illuminate/ui";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.string().min(1, "Base price is required"),
  unit: z.string().min(1, "Unit is required"),
  wholesalePrice: z.string().optional(),
  bulkTiers: z.array(
    z.object({
      minQty: z.string().min(1),
      price: z.string().min(1),
    })
  ),
  isConfigurable: z.boolean(),
  configOptions: z.array(
    z.object({
      name: z.string().min(1),
      values: z.string().min(1),
    })
  ),
  recipeId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const categories = ["Beef", "Pork", "Lamb", "Poultry", "Prepared", "Specialty"];
const units = ["lb", "oz", "kg", "each", "pack", "case"];

export default function NewProductPage() {
  const [isConfigurable, setIsConfigurable] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      subcategory: "",
      description: "",
      basePrice: "",
      unit: "lb",
      wholesalePrice: "",
      bulkTiers: [],
      isConfigurable: false,
      configOptions: [],
      recipeId: "",
    },
  });

  const {
    fields: bulkFields,
    append: appendBulk,
    remove: removeBulk,
  } = useFieldArray({ control, name: "bulkTiers" });

  const {
    fields: configFields,
    append: appendConfig,
    remove: removeConfig,
  } = useFieldArray({ control, name: "configOptions" });

  const onSubmit = (data: ProductFormValues, isDraft: boolean) => {
    console.log("Product data:", { ...data, status: isDraft ? "draft" : "active" });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Product
          </h1>
          <p className="text-muted-foreground">
            Add a new product to your catalog.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((data) => onSubmit(data, false))}
        className="space-y-6"
      >
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Core product details and identification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Ribeye Steak (Prime)"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sku"
                  placeholder="e.g., BF-RIB-001"
                  {...register("sku")}
                />
                {errors.sku && (
                  <p className="text-xs text-destructive">
                    {errors.sku.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(val) => setValue("category", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
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
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  placeholder="e.g., Steaks"
                  {...register("subcategory")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your product..."
                rows={4}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>
              Set base pricing and wholesale/bulk tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="basePrice">
                  Base Price <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="basePrice"
                    placeholder="0.00"
                    className="pl-7"
                    {...register("basePrice")}
                  />
                </div>
                {errors.basePrice && (
                  <p className="text-xs text-destructive">
                    {errors.basePrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Unit <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue="lb"
                  onValueChange={(val) => setValue("unit", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u} value={u}>
                        per {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wholesalePrice">Wholesale Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="wholesalePrice"
                    placeholder="0.00"
                    className="pl-7"
                    {...register("wholesalePrice")}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Bulk Pricing Tiers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendBulk({ minQty: "", price: "" })}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Tier
                </Button>
              </div>
              {bulkFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Min Quantity</Label>
                    <Input
                      placeholder="e.g., 50"
                      {...register(`bulkTiers.${index}.minQty`)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <Input
                        placeholder="0.00"
                        className="pl-7"
                        {...register(`bulkTiers.${index}.price`)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeBulk(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {bulkFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No bulk pricing tiers configured.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configuration Options</CardTitle>
                <CardDescription>
                  Make this product configurable with custom options.
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isConfigurable}
                  onChange={(e) => {
                    setIsConfigurable(e.target.checked);
                    setValue("isConfigurable", e.target.checked);
                  }}
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                <span className="text-sm font-medium">Configurable</span>
              </label>
            </div>
          </CardHeader>
          {isConfigurable && (
            <CardContent className="space-y-3">
              {configFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Option Name</Label>
                    <Input
                      placeholder="e.g., Thickness"
                      {...register(`configOptions.${index}.name`)}
                    />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <Label className="text-xs">
                      Values (comma separated)
                    </Label>
                    <Input
                      placeholder='e.g., 1", 1.5", 2"'
                      {...register(`configOptions.${index}.values`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeConfig(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendConfig({ name: "", values: "" })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Option
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              Upload product images. The first image will be used as the
              thumbnail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <button
                type="button"
                className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="mt-2 text-xs font-medium">Add Image</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Link */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Link</CardTitle>
            <CardDescription>
              Link this product to a recipe for cost tracking and production
              planning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(val) => setValue("recipeId", val)}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a recipe (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="r-1">Smoked Brisket Recipe</SelectItem>
                <SelectItem value="r-2">Italian Sausage Mix</SelectItem>
                <SelectItem value="r-3">Original Beef Jerky</SelectItem>
                <SelectItem value="r-4">Maple Bacon Cure</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" asChild>
            <Link href="/products">Cancel</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSubmit((data) => onSubmit(data, true))}
          >
            Save as Draft
          </Button>
          <Button type="submit">Publish Product</Button>
        </div>
      </form>
    </div>
  );
}
