export interface CostBreakdown {
  vision_api_cost: number;
  perplexity_api_cost: number;
  openai_api_cost: number;
  total_cost: number;
}

export class CostTracker {
  private costs: CostBreakdown;

  constructor() {
    this.costs = {
      vision_api_cost: 0,
      perplexity_api_cost: 0,
      openai_api_cost: 0,
      total_cost: 0,
    };
  }

  addVisionCost(imageCount: number): number {
    const costPerImage = 1.5;
    const cost = imageCount * costPerImage;
    this.costs.vision_api_cost += cost;
    this.costs.total_cost += cost;
    return cost;
  }

  addPerplexityCost(tokens: number): number {
    const costPer1kTokens = 0.2;
    const cost = (tokens / 1000) * costPer1kTokens;
    this.costs.perplexity_api_cost += cost;
    this.costs.total_cost += cost;
    return cost;
  }

  addOpenAICost(promptTokens: number, completionTokens: number, model: string = 'gpt-4o'): number {
    let cost = 0;

    if (model === 'gpt-4o') {
      const inputCostPer1M = 2.50;
      const outputCostPer1M = 10.00;
      cost = (promptTokens / 1000000) * inputCostPer1M + (completionTokens / 1000000) * outputCostPer1M;
    }

    this.costs.openai_api_cost += cost;
    this.costs.total_cost += cost;
    return cost;
  }

  getCosts(): CostBreakdown {
    return { ...this.costs };
  }

  getCostsInCents(): CostBreakdown {
    return {
      vision_api_cost: Math.round(this.costs.vision_api_cost * 100),
      perplexity_api_cost: Math.round(this.costs.perplexity_api_cost * 100),
      openai_api_cost: Math.round(this.costs.openai_api_cost * 100),
      total_cost: Math.round(this.costs.total_cost * 100),
    };
  }

  reset() {
    this.costs = {
      vision_api_cost: 0,
      perplexity_api_cost: 0,
      openai_api_cost: 0,
      total_cost: 0,
    };
  }
}
