import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// Global PayPal SDK management to prevent multiple loads
class PayPalSDKManager {
  private static instance: PayPalSDKManager;
  private isLoading = false;
  private isLoaded = false;
  private sdkInstance: any = null;
  private loadPromise: Promise<void> | null = null;

  static getInstance(): PayPalSDKManager {
    if (!PayPalSDKManager.instance) {
      PayPalSDKManager.instance = new PayPalSDKManager();
    }
    return PayPalSDKManager.instance;
  }

  async loadSDK(): Promise<void> {
    // If already loaded, return immediately
    if (this.isLoaded && (window as any).paypal && this.sdkInstance) {
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.doLoadSDK();
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
    }
  }

  private async doLoadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if PayPal is already available
        if ((window as any).paypal) {
          this.initializeSDK().then(resolve).catch(reject);
          return;
        }

        // Load PayPal script
        const script = document.createElement("script");
        script.src = import.meta.env.PROD
          ? "https://www.paypal.com/web-sdk/v6/core"
          : "https://www.sandbox.paypal.com/web-sdk/v6/core";
        script.async = true;
        
        script.onload = () => {
          this.initializeSDK().then(resolve).catch(reject);
        };
        
        script.onerror = () => {
          reject(new Error("Failed to load PayPal SDK"));
        };
        
        document.body.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async initializeSDK(): Promise<void> {
    try {
      const clientToken: string = await fetch("/paypal/setup")
        .then((res) => res.json())
        .then((data) => data.clientToken);
      
      // Configure SDK to prioritize PayPal account login and minimize guest options
      this.sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
        // Enforce minimal guest checkout options and prioritize PayPal account
        config: {
          preferredLoginType: "PAYPAL", // Encourage PayPal login
          landingPage: "LOGIN", // Direct to login page instead of signup
          userAction: "PAY_NOW", // Streamline payment flow
          // Restrict funding sources to PayPal only
          disableFunding: ["card", "credit", "paylater", "venmo", "bancontact", "blik", "eps", "giropay", "ideal", "mercadopago", "mybank", "p24", "sepa", "sofort", "trustly"]
        }
      });
      
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to initialize PayPal SDK:", error);
      throw error;
    }
  }

  getSDKInstance() {
    return this.sdkInstance;
  }

  isSDKReady(): boolean {
    return this.isLoaded && this.sdkInstance !== null;
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
  const sdkManager = PayPalSDKManager.getInstance();

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

  const handleButtonClick = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Ensure SDK is ready
      if (!sdkManager.isSDKReady()) {
        throw new Error("PayPal SDK not ready");
      }

      const sdkInstance = sdkManager.getSDKInstance();
      const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
        onApprove,
        onCancel,
        onError,
        // Additional session configuration to prioritize PayPal account
        style: {
          layout: "vertical", // Vertical layout emphasizes PayPal button
          fundingicons: false, // Hide funding source icons to reduce confusion
          tagline: false // Remove PayPal tagline for cleaner appearance
        }
      });

      const checkoutOptionsPromise = createOrder();
      await paypalCheckout.start(
        { 
          paymentFlow: "checkout", // Use explicit checkout flow (not auto)
          loginType: "PAYPAL" // Encourage PayPal login specifically
        },
        checkoutOptionsPromise,
      );
    } catch (e) {
      console.error("Payment initiation error:", e);
      toast({
        title: "Error",
        description: "Failed to start payment process. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const initializePayPal = async () => {
      try {
        await sdkManager.loadSDK();
        setIsPayPalReady(true);
      } catch (error) {
        console.error("Failed to load PayPal SDK:", error);
        toast({
          title: "PayPal Error",
          description: "Failed to load PayPal. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    initializePayPal();
  }, []);

  return (
    <Button 
      onClick={handleButtonClick}
      disabled={!isPayPalReady || isProcessing}
      className={`w-full ${className}`}
      data-testid={`button-purchase-${tier.toLowerCase()}`}
    >
      {!isPayPalReady 
        ? "Loading PayPal..." 
        : isProcessing 
          ? "Processing..." 
          : `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)} - €${amount}`
      }
    </Button>
  );
}