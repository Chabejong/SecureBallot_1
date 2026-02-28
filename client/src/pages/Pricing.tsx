import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import PricingPayPalButton from "@/components/PricingPayPalButton";

const pricingTiers = [
  {
    name: "Free",
    price: "€0",
    period: "month",
    description: "Perfect for trying out Ballot Box",
    participants: "Up to 20 participants",
    pollLimit: "1 poll per month",
    features: [
      "1 poll per month",
      "Up to 20 participants",
      "Basic voting options",
      "Email support"
    ],
    isPopular: false,
    isFree: true,
    amount: "0"
  },
  {
    name: "Basic",
    price: "€5",
    period: "month",
    description: "Great for small teams and communities",
    participants: "Up to 50 participants",
    pollLimit: "Unlimited polls",
    features: [
      "Unlimited polls",
      "Up to 50 participants",
      "Anonymous voting",
      "Real-time results",
      "Email support"
    ],
    isPopular: false,
    isFree: false,
    amount: "5.00"
  },
  {
    name: "Standard",
    price: "€10",
    period: "month",
    description: "Perfect for growing organizations",
    participants: "Up to 100 participants",
    pollLimit: "Unlimited polls",
    features: [
      "Unlimited polls",
      "Up to 100 participants",
      "Anonymous voting",
      "Real-time results",
      "Multiple choice polls",
      "Priority email support"
    ],
    isPopular: true,
    isFree: false,
    amount: "10.00"
  },
  {
    name: "Premium",
    price: "€25",
    period: "month",
    description: "For larger teams and events",
    participants: "Up to 250 participants",
    pollLimit: "Unlimited polls",
    features: [
      "Unlimited polls",
      "Up to 250 participants",
      "Anonymous voting",
      "Real-time results",
      "Multiple choice polls",
      "Poll scheduling",
      "CSV export",
      "Priority support"
    ],
    isPopular: false,
    isFree: false,
    amount: "25.00"
  },
  {
    name: "Professional",
    price: "€50",
    period: "month",
    description: "For large organizations",
    participants: "Up to 500 participants",
    pollLimit: "Unlimited polls",
    features: [
      "Unlimited polls",
      "Up to 500 participants",
      "Anonymous voting",
      "Real-time results",
      "Multiple choice polls",
      "Poll scheduling",
      "CSV export",
      "Custom branding",
      "Phone support"
    ],
    isPopular: false,
    isFree: false,
    amount: "50.00"
  },
  {
    name: "Enterprise",
    price: "€75",
    period: "month",
    description: "For very large organizations",
    participants: "Up to 1000 participants",
    pollLimit: "Unlimited polls",
    features: [
      "Unlimited polls",
      "Up to 1000 participants",
      "Anonymous voting",
      "Real-time results",
      "Multiple choice polls",
      "Poll scheduling",
      "CSV export",
      "Custom branding",
      "Dedicated support",
      "24/7 phone support"
    ],
    isPopular: false,
    isFree: false,
    amount: "75.00"
  },
  {
    name: "Ultimate",
    price: "€100",
    period: "month",
    description: "For unlimited participants",
    participants: "Unlimited participants",
    pollLimit: "Unlimited polls",
    features: [
      "Unlimited polls",
      "Unlimited participants",
      "Anonymous voting",
      "Real-time results",
      "Multiple choice polls",
      "Poll scheduling",
      "CSV export",
      "Custom branding",
      "Dedicated account manager",
      "24/7 phone support",
      "API access"
    ],
    isPopular: false,
    isFree: false,
    amount: "100.00"
  }
];

const invitedPollTiers = [
  { price: "€25", range: "0 - 100 voters", amount: "25.00" },
  { price: "€50", range: "101 - 250 voters", amount: "50.00" },
  { price: "€100", range: "251 - 700 voters", amount: "100.00" },
  { price: "€150", range: "701 - 1000 voters", amount: "150.00" },
  { price: "€200", range: "1001 - 2000 voters", amount: "200.00" },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-pricing">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" data-testid="text-pricing-description">
            Select the perfect plan for your voting needs. Pay securely with PayPal or any major credit/debit card.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={tier.name} 
              className={`relative ${tier.isPopular ? 'ring-2 ring-blue-500 scale-105' : ''} transition-all duration-300 hover:shadow-lg`}
              data-testid={`card-pricing-${tier.name.toLowerCase()}`}
            >
              {tier.isPopular && (
                <Badge 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white"
                  data-testid="badge-popular"
                >
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold" data-testid={`text-tier-name-${tier.name.toLowerCase()}`}>
                  {tier.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white" data-testid={`text-price-${tier.name.toLowerCase()}`}>
                    {tier.price}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">/{tier.period}</span>
                </div>
                <CardDescription className="mt-2" data-testid={`text-description-${tier.name.toLowerCase()}`}>
                  {tier.description}
                </CardDescription>
                
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400" data-testid={`text-participants-${tier.name.toLowerCase()}`}>
                    {tier.participants}
                  </div>
                  <div className="text-sm font-medium text-green-600 dark:text-green-400" data-testid={`text-poll-limit-${tier.name.toLowerCase()}`}>
                    {tier.pollLimit}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center" data-testid={`feature-${tier.name.toLowerCase()}-${featureIndex}`}>
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {tier.isFree ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    data-testid={`button-get-started-${tier.name.toLowerCase()}`}
                  >
                    Get Started Free
                  </Button>
                ) : (
                  <div className="w-full">
                    <PricingPayPalButton
                      amount={tier.amount}
                      tier={tier.name.toLowerCase()}
                      className="w-full"
                    />
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Pricing Tiers for Invited Only
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Cost is based on the number of invited voters
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitedPollTiers.map((tier) => (
              <div
                key={tier.range}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                data-testid={`card-invited-${tier.amount}`}
              >
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-300 mb-2">
                  {tier.price}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm mb-5">
                  {tier.range}
                </div>
                <PricingPayPalButton
                  amount={tier.amount}
                  tier={`invited-${tier.range.replace(/\s+/g, '-')}`}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-payment-info">
            Secure Payment Processing
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto" data-testid="text-payment-description">
            All payments are processed securely through PayPal. You can pay with your PayPal account or any major 
            credit or debit card — no PayPal account required. Your subscription gives you access to unlimited polls 
            for the specified participant count for one month. Cancel anytime.
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
            <div className="px-4 py-2 bg-[#003087] text-white text-sm font-bold rounded-md tracking-wide">PayPal</div>
            <div className="px-4 py-2 bg-[#1a1f71] text-white text-sm font-bold rounded-md tracking-wide">VISA</div>
            <div className="px-4 py-2 bg-[#eb001b] text-white text-sm font-bold rounded-md tracking-wide">Mastercard</div>
            <div className="px-4 py-2 bg-[#2557d6] text-white text-sm font-bold rounded-md tracking-wide">AMEX</div>
            <div className="px-4 py-2 bg-[#FF5F00] text-white text-sm font-bold rounded-md tracking-wide">Discover</div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2" data-testid="text-paypal-label">
              PayPal Account:
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-paypal-email">
              nkwettae@yahoo.com
            </p>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">PayPal &amp; Credit Card Accepted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">No PayPal Account Needed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Cancel Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
