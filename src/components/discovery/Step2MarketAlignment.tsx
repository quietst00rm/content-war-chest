import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TargetMarket, PrimaryOutcome, UserStrategy, getOutcomesForMarket, isOutcomeValidForMarket } from "@/hooks/use-user-strategy";
import { Heart, DollarSign, Users } from "lucide-react";

interface MarketOption {
  id: TargetMarket;
  title: string;
  description: string;
  icon: typeof Heart;
  color: string;
  bgColor: string;
}

interface OutcomeOption {
  id: PrimaryOutcome;
  title: string;
  description: string;
}

const MARKETS: MarketOption[] = [
  {
    id: "health",
    title: "Health",
    description: "Make me healthier, fitter, more attractive",
    icon: Heart,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  {
    id: "wealth",
    title: "Wealth",
    description: "Make me wealthier, save me money, save me time",
    icon: DollarSign,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "relationships",
    title: "Relationships",
    description: "Help me form better relationships, feel belonging",
    icon: Users,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
];

const OUTCOMES: OutcomeOption[] = [
  { id: "make_money", title: "Make Money", description: "Help them earn more income or revenue" },
  { id: "save_money", title: "Save Money", description: "Help them reduce costs or expenses" },
  { id: "save_time", title: "Save Time", description: "Help them be more efficient and productive" },
  { id: "health_fitness", title: "Health & Fitness", description: "Help them get healthier and fitter" },
  { id: "attractiveness", title: "Attractiveness", description: "Help them look and feel more attractive" },
  { id: "peace_of_mind", title: "Peace of Mind", description: "Help them feel calmer and more secure" },
];

interface Step2MarketAlignmentProps {
  strategy: UserStrategy | null;
  onUpdate: (updates: Partial<UserStrategy>) => Promise<void>;
  onValidChange: (isValid: boolean) => void;
}

export function Step2MarketAlignment({
  strategy,
  onUpdate,
  onValidChange,
}: Step2MarketAlignmentProps) {
  const [selectedMarket, setSelectedMarket] = useState<TargetMarket | null>(
    strategy?.target_market || null
  );
  const [selectedOutcome, setSelectedOutcome] = useState<PrimaryOutcome | null>(
    strategy?.primary_outcome || null
  );

  // Get available outcomes for selected market
  const availableOutcomes = selectedMarket
    ? OUTCOMES.filter((o) => getOutcomesForMarket(selectedMarket).includes(o.id))
    : [];

  // Validate on state changes
  useEffect(() => {
    const isValid = !!selectedMarket && !!selectedOutcome;
    onValidChange(isValid);
  }, [selectedMarket, selectedOutcome, onValidChange]);

  // Sync from strategy when it changes
  useEffect(() => {
    if (strategy) {
      setSelectedMarket(strategy.target_market);
      setSelectedOutcome(strategy.primary_outcome);
    }
  }, [strategy?.id]);

  const handleMarketSelect = async (market: TargetMarket) => {
    setSelectedMarket(market);

    // Clear outcome if it's not valid for the new market
    const updates: Partial<UserStrategy> = { target_market: market };
    if (selectedOutcome && !isOutcomeValidForMarket(selectedOutcome, market)) {
      setSelectedOutcome(null);
      updates.primary_outcome = null;
    }

    await onUpdate(updates);
  };

  const handleOutcomeSelect = async (outcome: PrimaryOutcome) => {
    setSelectedOutcome(outcome);
    await onUpdate({ primary_outcome: outcome });
  };

  // Get market color for selected market
  const getMarketColor = () => {
    const market = MARKETS.find((m) => m.id === selectedMarket);
    return market?.color || "";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Which market does your expertise serve?
        </h2>
        <p className="text-muted-foreground mt-2">
          All successful businesses serve one of these three fundamental markets
        </p>
      </div>

      {/* Market Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {MARKETS.map((market) => {
          const Icon = market.icon;
          const isSelected = selectedMarket === market.id;

          return (
            <Card
              key={market.id}
              onClick={() => handleMarketSelect(market.id)}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-center">
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      isSelected ? market.bgColor : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        isSelected ? market.color : "text-muted-foreground"
                      )}
                    />
                  </div>
                </div>
                <CardTitle
                  className={cn(
                    "text-lg text-center",
                    isSelected && market.color
                  )}
                >
                  {market.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {market.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Outcome Selection - Only visible when market is selected */}
      {selectedMarket && (
        <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-lg">
              What primary outcome do you deliver?
            </CardTitle>
            <CardDescription>
              Choose the main benefit your customers receive
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableOutcomes.map((outcome) => {
                const isSelected = selectedOutcome === outcome.id;

                return (
                  <div
                    key={outcome.id}
                    onClick={() => handleOutcomeSelect(outcome.id)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border"
                    )}
                  >
                    <div className="font-medium">{outcome.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {outcome.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
