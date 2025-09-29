import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Coffee, Star } from "lucide-react";
import { useState } from "react";
import PayPalButton from "@/components/PayPalButton";

const predefinedAmounts = [
  { amount: "5.00", label: "€5", icon: Coffee, description: "Buy us a coffee" },
  { amount: "15.00", label: "€15", icon: Heart, description: "Show some love" },
  { amount: "25.00", label: "€25", icon: Star, description: "Super supporter" },
];

export default function Donate() {
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState("5.00");
  const [isCustom, setIsCustom] = useState(false);

  const handlePredefinedSelect = (amount: string) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(value);
    setIsCustom(true);
  };

  const getCurrentAmount = () => {
    if (isCustom && customAmount) {
      const amount = parseFloat(customAmount);
      return amount > 0 ? amount.toFixed(2) : "5.00";
    }
    return selectedAmount;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-donate">
            Support The Ballot Box
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto" data-testid="text-donate-description">
            Help us keep The Ballot Box running and improve our services. Your donation supports 
            server costs, development, and new features for the community.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Donation Card */}
          <Card className="h-fit">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2" data-testid="text-donation-title">
                <Heart className="h-6 w-6 text-red-500" />
                Make a Donation
              </CardTitle>
              <CardDescription data-testid="text-donation-subtitle">
                Choose an amount to support our mission
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Predefined Amounts */}
              <div className="grid grid-cols-3 gap-3">
                {predefinedAmounts.map((preset) => (
                  <Button
                    key={preset.amount}
                    variant={selectedAmount === preset.amount && !isCustom ? "default" : "outline"}
                    className="h-20 flex flex-col items-center justify-center space-y-1"
                    onClick={() => handlePredefinedSelect(preset.amount)}
                    data-testid={`button-preset-${preset.amount.replace('.', '_')}`}
                  >
                    <preset.icon className="h-5 w-5" />
                    <span className="font-semibold">{preset.label}</span>
                  </Button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="space-y-2">
                <Label htmlFor="custom-amount" data-testid="label-custom-amount">
                  Custom Amount (€)
                </Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  min="1"
                  step="0.01"
                  data-testid="input-custom-amount"
                />
              </div>

              {/* Selected Amount Display */}
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-donation-amount-label">
                  Donation Amount:
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-selected-amount">
                  €{getCurrentAmount()}
                </p>
              </div>

              {/* PayPal Button */}
              <div className="w-full">
                <PayPalButton
                  amount={getCurrentAmount()}
                  currency="EUR"
                  intent="capture"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center" data-testid="text-payment-security">
                🔒 Secure payment processing via PayPal
              </p>
            </CardContent>
          </Card>

          {/* Impact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold" data-testid="text-impact-title">
                Your Impact
              </CardTitle>
              <CardDescription data-testid="text-impact-subtitle">
                How your donation helps us grow
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3" data-testid="impact-item-hosting">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Coffee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Server Hosting</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Keep our servers running fast and reliable for all users
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3" data-testid="impact-item-features">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">New Features</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Fund development of new polling features and improvements
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3" data-testid="impact-item-support">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Community Support</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Better customer support and community resources
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-thank-you-title">
                  Thank You!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300" data-testid="text-thank-you-message">
                  Every donation, no matter the size, helps us continue building the best 
                  voting platform for communities worldwide. We're grateful for your support!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-why-donate">
            Why Donate?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center" data-testid="reason-opensource">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Open Source</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                The Ballot Box is built with transparency and community in mind
              </p>
            </div>
            
            <div className="text-center" data-testid="reason-privacy">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Privacy First</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                We prioritize user privacy and secure voting without tracking
              </p>
            </div>
            
            <div className="text-center" data-testid="reason-community">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <Coffee className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Community Driven</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Features and improvements based on community feedback
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}