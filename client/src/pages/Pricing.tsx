import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import PayPalButton from "@/components/PayPalButton";

const pricingTiers = [
  {
    name: "Free",
    price: "€0",
    period: "month",
    description: "Perfect for trying out The Ballot Box",
    participants: "Up to 10 participants",
    pollLimit: "1 poll per month",
    features: [
      "Create 1 poll per month",
      "Up to 10 participants",
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
    participants: "51-100 participants",
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
    name: "Pro",
    price: "€25",
    period: "month",
    description: "For larger teams and events",
    participants: "101-250 participants",
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
    name: "Premium",
    price: "€50",
    period: "month",
    description: "For large organizations",
    participants: "251-500 participants",
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
    price: "€100",
    period: "month",
    description: "For massive events and organizations",
    participants: "751-1000 participants",
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
      "Dedicated account manager",
      "24/7 phone support"
    ],
    isPopular: false,
    isFree: false,
    amount: "100.00"
  }
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
            Select the perfect plan for your voting needs. All payments are processed securely via PayPal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <PayPalButton
                      amount={tier.amount}
                      currency="EUR"
                      intent="subscription"
                    />
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-payment-info">
            Secure Payment Processing
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto" data-testid="text-payment-description">
            All payments are processed securely through PayPal. Your subscription gives you access to unlimited polls 
            for the specified participant count for one month. Cancel anytime.
          </p>
          
          <div className="mt-8 flex justify-center items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Secure PayPal Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
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