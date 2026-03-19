"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@illuminate/ui/src/components/button";
import { Label } from "@illuminate/ui/src/components/label";
import { Badge } from "@illuminate/ui/src/components/badge";
import { Minus, Plus, ShoppingCart, MessageSquare } from "lucide-react";
import { useCart, type CartConfigOption } from "./cart-provider";

export interface ConfigOption {
  name: string;
  values: string[];
  priceAdjustments?: Record<string, number>;
}

export interface ProductConfiguratorProps {
  productId: string;
  productName: string;
  productSlug: string;
  basePrice: number;
  imageUrl?: string;
  configOptions: ConfigOption[];
  hasAiAddon?: boolean;
}

export function ProductConfigurator({
  productId,
  productName,
  productSlug,
  basePrice,
  imageUrl,
  configOptions,
  hasAiAddon = false,
}: ProductConfiguratorProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      configOptions.forEach((opt) => {
        if (opt.values.length > 0) {
          initial[opt.name] = opt.values[0];
        }
      });
      return initial;
    }
  );
  const [addedToCart, setAddedToCart] = useState(false);

  const totalPrice = useMemo(() => {
    let price = basePrice;
    configOptions.forEach((opt) => {
      const selected = selectedOptions[opt.name];
      if (selected && opt.priceAdjustments?.[selected]) {
        price += opt.priceAdjustments[selected];
      }
    });
    return price;
  }, [basePrice, configOptions, selectedOptions]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  };

  const handleAddToCart = () => {
    const cartConfigOptions: CartConfigOption[] = Object.entries(
      selectedOptions
    ).map(([name, value]) => ({ name, value }));

    addItem({
      productId,
      name: productName,
      slug: productSlug,
      price: totalPrice,
      quantity,
      imageUrl,
      configOptions: cartConfigOptions,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Options */}
      {configOptions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Configure Your Order
          </h3>
          {configOptions.map((option) => (
            <div key={option.name} className="space-y-2">
              <Label className="text-sm font-medium">{option.name}</Label>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const isSelected = selectedOptions[option.name] === value;
                  const adjustment = option.priceAdjustments?.[value];
                  return (
                    <button
                      key={value}
                      onClick={() => handleOptionChange(option.name, value)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {value}
                      {adjustment !== undefined && adjustment !== 0 && (
                        <span className="text-xs text-muted-foreground">
                          {adjustment > 0 ? "+" : ""}${adjustment.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Price */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Price</span>
          <span className="text-2xl font-bold text-foreground">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
        {quantity > 1 && (
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Total ({quantity} items)
            </span>
            <span className="text-lg font-semibold text-foreground">
              ${(totalPrice * quantity).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Quantity</Label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-lg font-semibold">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-5 w-5" />
          {addedToCart ? "Added to Cart!" : "Add to Cart"}
        </Button>

        <Button variant="outline" size="lg" className="w-full gap-2" asChild>
          <a href="/quote">
            <MessageSquare className="h-5 w-5" />
            Request Quote for Bulk Orders
          </a>
        </Button>
      </div>

      {/* AI Configurator Placeholder */}
      {hasAiAddon && (
        <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                AI Product Configurator
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Not sure what to choose? Chat with our AI assistant to get
                personalized recommendations based on your needs.
              </p>
              <Button variant="outline" size="sm" className="mt-3 gap-2">
                <MessageSquare className="h-4 w-4" />
                Start Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {Object.keys(selectedOptions).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Selection
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(selectedOptions).map(([name, value]) => (
              <Badge key={name} variant="secondary" className="text-xs">
                {name}: {value}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
