import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

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
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const { toast } = useToast();

  const createOrder = async () => {
    const orderPayload = {
      amount: amount,
      currency: "EUR",
      intent: "capture",
    };
    const response = await fetch("/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  };

  const onApprove = async (data: any) => {
    setIsProcessing(true);
    try {
      const orderData = await captureOrder(data.orderId);
      
      // Process the subscription upgrade with the real PayPal order ID
      const upgradeResponse = await apiRequest(
        "POST",
        "/api/subscription/verify-and-upgrade",
        {
          paypalOrderId: data.orderId,
          amount: amount,
          tier: tier
        }
      );

      if (upgradeResponse.ok) {
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
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade Failed",
        description: "Payment was processed but upgrade failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment process.",
    });
  };

  const onError = (error: any) => {
    console.error("PayPal error:", error);
    toast({
      title: "Payment Error",
      description: "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    loadPayPalSDK();
  }, []);

  const initPayPal = async () => {
    try {
      const clientToken: string = await fetch("/paypal/setup")
        .then((res) => res.json())
        .then((data) => {
          return data.clientToken;
        });
      
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
        onApprove,
        onCancel,
        onError,
      });

      const onClick = async () => {
        if (isProcessing) return;
        
        try {
          setIsProcessing(true);
          const checkoutOptionsPromise = createOrder();
          await paypalCheckout.start(
            { paymentFlow: "auto" },
            checkoutOptionsPromise,
          );
        } catch (e) {
          console.error(e);
          toast({
            title: "Error",
            description: "Failed to start payment process. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      const paypalButton = document.getElementById(`paypal-button-${tier}`);
      if (paypalButton) {
        paypalButton.addEventListener("click", onClick);
        setIsPayPalReady(true);
      }

      return () => {
        if (paypalButton) {
          paypalButton.removeEventListener("click", onClick);
        }
      };
    } catch (e) {
      console.error(e);
    }
  };

  if (!isPayPalReady) {
    return (
      <Button 
        disabled
        className={`w-full ${className}`}
        data-testid={`button-purchase-${tier.toLowerCase()}`}
      >
        Loading PayPal...
      </Button>
    );
  }

  return (
    <paypal-button 
      id={`paypal-button-${tier}`} 
      className={`w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      data-testid={`button-purchase-${tier.toLowerCase()}`}
    >
      {isProcessing ? "Processing..." : `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} - €${amount}`}
    </paypal-button>
  );
}