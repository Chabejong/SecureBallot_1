import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface PricingPayPalButtonProps {
  amount: string;
  tier: string;
  className?: string;
}

export default function PricingPayPalButton({
  amount,
  tier,
  className = "",
}: PricingPayPalButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    setIsProcessing(true);
    
    try {
      // For demonstration purposes, simulate a successful PayPal payment
      // In production, this would integrate with the full PayPal SDK approval flow
      
      // Simulate a small delay to show processing state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a mock PayPal order ID for the upgrade
      const mockOrderId = `DEMO_ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Directly call the subscription upgrade endpoint with mock data
      const upgradeResponse = await apiRequest(
        "POST",
        "/api/subscription/verify-and-upgrade",
        {
          paypalOrderId: mockOrderId,
          amount: amount,
          tier: tier
        }
      );

      if (upgradeResponse.ok) {
        const result = await upgradeResponse.json();
        
        // Invalidate user data to refresh subscription status
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Subscription Upgraded!",
          description: `You've successfully upgraded to the ${tier} plan. You now have unlimited poll creation!`,
        });
      } else {
        throw new Error("Failed to upgrade subscription");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Purchase Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handlePurchase}
      disabled={isProcessing}
      className={`w-full ${className}`} 
      data-testid={`button-purchase-${tier.toLowerCase()}`}
    >
      {isProcessing ? "Processing..." : `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} - €${amount}`}
    </Button>
  );
}